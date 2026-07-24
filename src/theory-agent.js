'use strict'

const { digestValue, isSha256Digest } = require('./artifact-digest.js')
const { validateEvidenceLedger } = require('./evidence-ledger.js')
const {
  mapTheories,
  validateTheoryMapping,
  validateTheoryProvenance,
} = require('./theory-mapper.js')
const {
  buildClaimResolution,
  finalizeTheorySystem,
  validateEvidenceReview,
  validateTheorySystem,
} = require('./theory-system.js')

const THEORY_AGENT_RUN_SCHEMA_VERSION = 'theory-agent-run/1.0'
const THEORY_AUDIT_SCHEMA_VERSION = 'theory-audit/1.0'
const THEORY_GAP_SCHEMA_VERSION = 'theory-gap-report/1.0'
const MAX_MAPPING_ATTEMPTS = 2
const STATES = new Set([
  'AWAITING_HUMAN',
  'REVISION_REQUESTED',
  'APPROVED',
  'REJECTED',
  'BLOCKED_CATALOG_GAP',
  'READY_FOR_COMPILATION',
])
const REVIEW_FIELDS = new Set([
  'schemaVersion', 'targetDigest', 'decision', 'mappingDecisions', 'reviewer', 'reviewedAt', 'feedback',
])
const REVIEW_DECISION_FIELDS = new Set(['mappingId', 'decision', 'reasonCodes'])
const STORED_REVIEW_FIELDS = new Set([...REVIEW_FIELDS, 'id'])
const RUN_FIELDS = new Set([
  'schemaVersion', 'runId', 'state', 'revision', 'attempt', 'maxAttempts', 'inputDigests',
  'mapping', 'audit', 'checkpoint', 'review', 'reviews', 'catalogGap', 'theorySystem',
  'events', 'capabilities',
])
const INPUT_DIGEST_KEYS = Object.freeze([
  'approvedExtractions', 'evidenceReview', 'ledger', 'theoryCatalog',
])
const EVENT_FIELDS = new Set(['revision', 'state', 'at', 'summary', 'artifactDigests'])
const AUDIT_FIELDS = new Set([
  'schemaVersion', 'status', 'mappingDigest', 'mappedClaimProposalIds',
  'unmappedClaimProposalIds', 'errors', 'warnings',
])
const CHECKPOINT_FIELDS = new Set(['targetDigest', 'auditDigest', 'allowedDecisions'])
const CAPABILITY_FIELDS = new Set(['realModelUsed', 'humanApprovalRequired', 'autoCatalogExpansion'])
const CATALOG_GAP_FIELDS = new Set([
  'schemaVersion', 'mappingDigest', 'unmappedClaimProposalIds', 'reason',
  'canAutoExpandCatalog', 'nextAction',
])
const INITIAL_STATES = new Set(['AWAITING_HUMAN', 'BLOCKED_CATALOG_GAP'])
const STATE_TRANSITIONS = Object.freeze({
  AWAITING_HUMAN: new Set(['APPROVED', 'REVISION_REQUESTED', 'REJECTED']),
  REVISION_REQUESTED: new Set(['AWAITING_HUMAN', 'BLOCKED_CATALOG_GAP']),
  APPROVED: new Set(['READY_FOR_COMPILATION']),
  REJECTED: new Set(),
  BLOCKED_CATALOG_GAP: new Set(),
  READY_FOR_COMPILATION: new Set(),
})

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function requireNoUnknownFields(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`)
  const unknown = Object.keys(value).filter((field) => !allowed.has(field))
  if (unknown.length > 0) throw new TypeError(`${label} contains unknown field: ${unknown.join(', ')}`)
}

function collectUnknownFields(value, allowed, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object`)
    return false
  }
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) errors.push(`${label} contains unknown field: ${field}`)
  }
  return true
}

function parseTimestamp(value, label, errors) {
  if (!isNonEmptyString(value) || !Number.isFinite(Date.parse(value))) {
    errors.push(`${label} requires a valid timestamp`)
    return null
  }
  return Date.parse(value)
}

function latestInputTimestamp(inputs, errors) {
  if (!inputs) return null
  const timestamps = []
  const add = (value, label) => {
    const parsed = parseTimestamp(value, label, errors)
    if (parsed !== null) timestamps.push(parsed)
  }
  add(inputs.ledger?.updatedAt, 'Evidence ledger updatedAt')
  add(inputs.evidenceReview?.reviewedAt, 'Evidence review reviewedAt')
  for (const extraction of inputs.approvedExtractions || []) {
    add(extraction?.review?.reviewedAt, `Extraction ${extraction?.sourceId || ''} reviewedAt`.trim())
  }
  return timestamps.length > 0 ? Math.max(...timestamps) : null
}

function validateStoredReview(review, mapping, errors, label = 'Theory review') {
  if (!collectUnknownFields(review, STORED_REVIEW_FIELDS, label, errors)) return null
  const unsigned = structuredClone(review)
  delete unsigned.id
  let normalized
  try {
    normalized = normalizeReview(unsigned, mapping)
  } catch (error) {
    errors.push(`${label} is invalid: ${error.message}`)
    return null
  }
  if (review.id !== normalized.id) errors.push(`${label} content digest mismatch`)
  return normalized
}

function inputDigests({ approvedExtractions, evidenceReview, ledger, theoryCatalog }) {
  return {
    approvedExtractions: digestValue(approvedExtractions),
    evidenceReview: digestValue(evidenceReview),
    ledger: digestValue(ledger),
    theoryCatalog: digestValue(theoryCatalog),
  }
}

function validateAgentInputs({ approvedExtractions, evidenceReview, ledger, theoryCatalog }) {
  const errors = []
  const ledgerValidation = validateEvidenceLedger(ledger)
  if (!ledgerValidation.valid) errors.push(...ledgerValidation.errors)
  const evidenceValidation = validateEvidenceReview(evidenceReview, { approvedExtractions, ledger })
  if (!evidenceValidation.valid) errors.push(...evidenceValidation.errors)
  if (theoryCatalog?.schemaVersion !== 'theory-catalog/1.0' || !Array.isArray(theoryCatalog.theories) || theoryCatalog.theories.length === 0) {
    errors.push('A versioned theory catalog is required')
  } else {
    const theoryIds = new Set()
    const claimsById = new Map((ledger?.claims || []).map((claim) => [claim.id, claim]))
    for (const theory of theoryCatalog.theories) {
      if (!isNonEmptyString(theory?.id) || theoryIds.has(theory.id)) errors.push(`Theory id must be unique: ${theory?.id || ''}`.trim())
      theoryIds.add(theory?.id)
      const sourceClaim = claimsById.get(theory?.sourceClaimId)
      if (!sourceClaim || sourceClaim.claimType !== 'academic-construct' || sourceClaim.evidenceStatus !== 'verified') {
        errors.push(`Theory ${theory?.id || ''} must resolve to a verified academic claim`.trim())
      }
    }
  }
  return errors
}

function auditTheoryMapping(mapping, inputs) {
  const errors = validateAgentInputs(inputs)
  const mappingValidation = validateTheoryMapping(mapping, inputs)
  errors.push(...mappingValidation.errors)
  const claimResolution = buildClaimResolution(inputs.evidenceReview)
  for (const item of mapping?.mappings || []) {
    for (const proposalId of item.claimProposalIds || []) {
      if (!claimResolution.has(proposalId)) errors.push(`Theory mapping ${item.id} references a claim proposal not approved into the ledger: ${proposalId}`)
    }
  }
  const unmapped = [...(mapping?.unmappedClaimIds || [])]
  return {
    schemaVersion: THEORY_AUDIT_SCHEMA_VERSION,
    status: errors.length > 0 ? 'error' : (unmapped.length > 0 ? 'catalog-gap' : 'pass'),
    mappingDigest: digestValue(mapping),
    mappedClaimProposalIds: [...new Set((mapping?.mappings || []).flatMap((item) => item.claimProposalIds || []))].sort(),
    unmappedClaimProposalIds: unmapped.sort(),
    errors,
    warnings: [
      'A valid theory mapping establishes a bounded mechanism hypothesis, not an effect size or causal proof.',
    ],
  }
}

function event(state, at, summary, artifactDigests = []) {
  return { revision: null, state, at, summary, artifactDigests }
}

function makePendingRun({ runId, now, attempt, digests, mapping, audit, previous }) {
  const revision = (previous?.revision || 0) + 1
  const nextEvent = event('AWAITING_HUMAN', now, 'Deterministic audit passed; human theory review is required.', [
    digestValue(mapping), digestValue(audit),
  ])
  nextEvent.revision = revision
  const run = {
    schemaVersion: THEORY_AGENT_RUN_SCHEMA_VERSION,
    runId,
    state: 'AWAITING_HUMAN',
    revision,
    attempt,
    maxAttempts: MAX_MAPPING_ATTEMPTS,
    inputDigests: digests,
    mapping,
    audit,
    checkpoint: {
      targetDigest: digestValue(mapping),
      auditDigest: digestValue(audit),
      allowedDecisions: ['approve', 'revise', 'reject'],
    },
    review: null,
    reviews: [...(previous?.reviews || [])],
    catalogGap: null,
    theorySystem: null,
    events: [...(previous?.events || []), nextEvent],
    capabilities: {
      realModelUsed: mapping.capabilities?.realModelUsed === true,
      humanApprovalRequired: true,
      autoCatalogExpansion: false,
    },
  }
  return run
}

function makeCatalogGapRun({ runId, now, attempt, digests, mapping, audit, previous }) {
  const revision = (previous?.revision || 0) + 1
  const catalogGap = {
    schemaVersion: THEORY_GAP_SCHEMA_VERSION,
    mappingDigest: digestValue(mapping),
    unmappedClaimProposalIds: [...audit.unmappedClaimProposalIds],
    reason: 'The closed theory catalog did not provide a responsible mapping for every approved claim.',
    canAutoExpandCatalog: false,
    nextAction: 'A human researcher must add and verify an academic theory before starting a new run.',
  }
  const nextEvent = event('BLOCKED_CATALOG_GAP', now, 'Theory catalog gap requires human research.', [digestValue(catalogGap)])
  nextEvent.revision = revision
  return {
    schemaVersion: THEORY_AGENT_RUN_SCHEMA_VERSION,
    runId,
    state: 'BLOCKED_CATALOG_GAP',
    revision,
    attempt,
    maxAttempts: MAX_MAPPING_ATTEMPTS,
    inputDigests: digests,
    mapping,
    audit,
    checkpoint: null,
    review: null,
    reviews: [...(previous?.reviews || [])],
    catalogGap,
    theorySystem: null,
    events: [...(previous?.events || []), nextEvent],
    capabilities: {
      realModelUsed: mapping.capabilities?.realModelUsed === true,
      humanApprovalRequired: true,
      autoCatalogExpansion: false,
    },
  }
}

async function proposeAndAudit({ provider, approvedExtractions, evidenceReview, ledger, theoryCatalog, reviewFeedback = [] }) {
  const mapping = await mapTheories({ provider, approvedExtractions, theoryCatalog, reviewFeedback })
  const audit = auditTheoryMapping(mapping, { approvedExtractions, evidenceReview, ledger, theoryCatalog })
  if (audit.errors.length > 0) throw new TypeError(`Theory mapping audit failed: ${audit.errors.join('; ')}`)
  return { mapping, audit }
}

async function startTheoryAgent({
  provider, approvedExtractions, evidenceReview, ledger, theoryCatalog, runId, now = new Date().toISOString(),
} = {}) {
  if (!isNonEmptyString(runId)) throw new TypeError('Theory agent runId is required')
  if (!isNonEmptyString(now)) throw new TypeError('Theory agent timestamp is required')
  const inputs = { approvedExtractions, evidenceReview, ledger, theoryCatalog }
  const errors = validateAgentInputs(inputs)
  if (errors.length > 0) throw new TypeError(`Theory agent inputs failed validation: ${errors.join('; ')}`)
  const digests = inputDigests(inputs)
  const { mapping, audit } = await proposeAndAudit({ provider, ...inputs })
  const run = audit.status === 'catalog-gap'
    ? makeCatalogGapRun({ runId, now, attempt: 1, digests, mapping, audit })
    : makePendingRun({ runId, now, attempt: 1, digests, mapping, audit })
  const validation = validateTheoryAgentRun(run, inputs)
  if (!validation.valid) throw new TypeError(`Theory agent run failed validation: ${validation.errors.join('; ')}`)
  return run
}

function normalizeReview(review, mapping) {
  requireNoUnknownFields(review, REVIEW_FIELDS, 'Theory review')
  if (review.schemaVersion !== 'theory-review/1.0') throw new TypeError('Unsupported theory review schema')
  if (!['approve', 'revise', 'reject'].includes(review.decision)) throw new TypeError('Theory review has unsupported decision')
  if (!isSha256Digest(review.targetDigest)) throw new TypeError('Theory review requires a SHA-256 target digest')
  if (!isNonEmptyString(review.reviewer) || !isNonEmptyString(review.reviewedAt)) {
    throw new TypeError('Theory review requires reviewer and reviewedAt')
  }
  if (!Array.isArray(review.feedback) || review.feedback.some((item) => !isNonEmptyString(item))) {
    throw new TypeError('Theory review feedback must be an array of text')
  }
  if (!Array.isArray(review.mappingDecisions)) throw new TypeError('Theory review requires mappingDecisions')
  const knownMappings = mapping
    ? new Set((mapping.mappings || []).map((item) => item.id))
    : null
  const decisions = new Map()
  for (const item of review.mappingDecisions) {
    requireNoUnknownFields(item, REVIEW_DECISION_FIELDS, 'Theory mapping review decision')
    if (!isNonEmptyString(item.mappingId)) throw new TypeError('Theory mapping review decision requires mappingId')
    if (knownMappings && !knownMappings.has(item.mappingId)) throw new TypeError(`Theory review references unknown mapping: ${item.mappingId}`)
    if (decisions.has(item.mappingId)) throw new TypeError(`Theory review duplicates mapping decision: ${item.mappingId}`)
    if (!['approve', 'revise', 'reject'].includes(item.decision)) throw new TypeError(`Theory review has unsupported mapping decision: ${item.decision}`)
    if (!Array.isArray(item.reasonCodes) || item.reasonCodes.length === 0 || item.reasonCodes.some((code) => !isNonEmptyString(code))) {
      throw new TypeError(`Theory review mapping ${item.mappingId} requires reasonCodes`)
    }
    decisions.set(item.mappingId, item)
  }
  if (review.decision !== 'reject' && decisions.size === 0) {
    throw new TypeError('Theory review must include mapping decisions')
  }
  if (knownMappings && review.decision !== 'reject' && [...knownMappings].some((id) => !decisions.has(id))) {
    throw new TypeError('Theory review must decide every proposed mapping')
  }
  if (review.decision === 'approve' && [...decisions.values()].some((item) => item.decision !== 'approve')) {
    throw new TypeError('Approving review requires every mapping decision to approve')
  }
  if (review.decision === 'revise' && (![...decisions.values()].some((item) => item.decision === 'revise') || review.feedback.length === 0)) {
    throw new TypeError('Revision review requires a revise decision and feedback')
  }
  const unsigned = structuredClone(review)
  return { ...unsigned, id: `theory-review:${digestValue(unsigned)}` }
}

function applyTheoryReview({
  run, review, approvedExtractions, evidenceReview, ledger, theoryCatalog,
} = {}) {
  const inputs = { approvedExtractions, evidenceReview, ledger, theoryCatalog }
  const currentValidation = validateTheoryAgentRun(run, inputs)
  if (!currentValidation.valid) throw new TypeError(`Theory agent run failed validation: ${currentValidation.errors.join('; ')}`)
  if (run?.state !== 'AWAITING_HUMAN') throw new TypeError('Theory review can only be applied at AWAITING_HUMAN')
  if (review?.targetDigest !== run.checkpoint?.targetDigest) throw new TypeError('Theory review target digest does not match the pending mapping')
  const normalized = normalizeReview(review, run.mapping)
  const next = structuredClone(run)
  next.review = normalized
  next.reviews.push(normalized)
  next.state = review.decision === 'approve' ? 'APPROVED' : (review.decision === 'revise' ? 'REVISION_REQUESTED' : 'REJECTED')
  next.revision += 1
  const nextEvent = event(next.state, review.reviewedAt, `Human review decision: ${review.decision}.`, [digestValue(normalized)])
  nextEvent.revision = next.revision
  next.events.push(nextEvent)
  const validation = validateTheoryAgentRun(next, inputs)
  if (!validation.valid) throw new TypeError(`Theory agent run failed validation: ${validation.errors.join('; ')}`)
  return next
}

function assertInputsUnchanged(run, inputs) {
  const current = inputDigests(inputs)
  for (const name of INPUT_DIGEST_KEYS) {
    if (current[name] !== run.inputDigests?.[name]) throw new TypeError(`Theory agent input digest changed: ${name}`)
  }
}

async function resumeTheoryAgent({
  run, provider, approvedExtractions, evidenceReview, ledger, theoryCatalog, now = new Date().toISOString(),
} = {}) {
  const inputs = { approvedExtractions, evidenceReview, ledger, theoryCatalog }
  const currentValidation = validateTheoryAgentRun(run, inputs)
  if (!currentValidation.valid) throw new TypeError(`Theory agent run failed validation: ${currentValidation.errors.join('; ')}`)
  assertInputsUnchanged(run, inputs)
  if (run.state === 'APPROVED') {
    const theorySystem = finalizeTheorySystem({
      mapping: run.mapping,
      review: run.review,
      ...inputs,
    })
    const next = structuredClone(run)
    next.state = 'READY_FOR_COMPILATION'
    next.revision += 1
    next.theorySystem = theorySystem
    next.checkpoint = null
    const nextEvent = event(next.state, now, 'Approved mapping finalized for scenario compilation.', [digestValue(theorySystem)])
    nextEvent.revision = next.revision
    next.events.push(nextEvent)
    const validation = validateTheoryAgentRun(next, inputs)
    if (!validation.valid) throw new TypeError(`Theory agent run failed validation: ${validation.errors.join('; ')}`)
    return next
  }
  if (run.state === 'REVISION_REQUESTED') {
    if (run.attempt >= run.maxAttempts) throw new TypeError(`Theory agent reached the maximum of ${run.maxAttempts} mapping attempts`)
    const { mapping, audit } = await proposeAndAudit({
      provider,
      ...inputs,
      reviewFeedback: run.review.feedback,
    })
    const next = audit.status === 'catalog-gap'
      ? makeCatalogGapRun({
        runId: run.runId, now, attempt: run.attempt + 1, digests: run.inputDigests, mapping, audit, previous: run,
      })
      : makePendingRun({
        runId: run.runId, now, attempt: run.attempt + 1, digests: run.inputDigests, mapping, audit, previous: run,
      })
    const validation = validateTheoryAgentRun(next, inputs)
    if (!validation.valid) throw new TypeError(`Theory agent run failed validation: ${validation.errors.join('; ')}`)
    return next
  }
  throw new TypeError(`Theory agent cannot resume from state ${run?.state || 'unknown'}`)
}

function validateTheoryAgentRun(run, inputs) {
  const errors = []
  if (!run || typeof run !== 'object') return { valid: false, errors: ['Theory agent run is required'] }
  collectUnknownFields(run, RUN_FIELDS, 'Theory agent run', errors)
  if (run.schemaVersion !== THEORY_AGENT_RUN_SCHEMA_VERSION) errors.push('Unsupported theory agent run schema')
  if (!isNonEmptyString(run.runId)) errors.push('Theory agent run requires runId')
  if (!STATES.has(run.state)) errors.push(`Unsupported theory agent state: ${run.state}`)
  if (!Number.isInteger(run.revision) || run.revision < 1) errors.push('Theory agent run requires a positive revision')
  if (!Number.isInteger(run.attempt) || run.attempt < 1 || run.attempt > MAX_MAPPING_ATTEMPTS) errors.push('Theory agent run has invalid attempt')
  if (run.maxAttempts !== MAX_MAPPING_ATTEMPTS) errors.push('Theory agent run has invalid maxAttempts')
  const digestFields = run.inputDigests && typeof run.inputDigests === 'object' && !Array.isArray(run.inputDigests)
    ? Object.keys(run.inputDigests)
    : []
  if (
    digestFields.length !== INPUT_DIGEST_KEYS.length ||
    INPUT_DIGEST_KEYS.some((name) => !isSha256Digest(run.inputDigests?.[name])) ||
    digestFields.some((name) => !INPUT_DIGEST_KEYS.includes(name))
  ) {
    errors.push(`Theory agent run requires exactly these SHA-256 input digests: ${INPUT_DIGEST_KEYS.join(', ')}`)
  }
  if (inputs) {
    const inputErrors = validateAgentInputs(inputs)
    if (inputErrors.length > 0) errors.push(...inputErrors.map((error) => `Theory agent input is invalid: ${error}`))
    const currentDigests = inputDigests(inputs)
    for (const name of INPUT_DIGEST_KEYS) {
      if (run.inputDigests?.[name] !== currentDigests[name]) errors.push(`Theory agent input digest mismatch: ${name}`)
    }
  }

  const eventTimes = []
  if (!Array.isArray(run.events) || run.events.length === 0) {
    errors.push('Theory agent run requires events')
  } else {
    if (run.events.length !== run.revision) errors.push('Theory agent event count must equal revision')
    for (const [index, item] of run.events.entries()) {
      const label = `Theory agent event ${index + 1}`
      collectUnknownFields(item, EVENT_FIELDS, label, errors)
      if (item?.revision !== index + 1) errors.push(`${label} revision must be ${index + 1}`)
      if (!STATES.has(item?.state)) errors.push(`${label} has unsupported state`)
      if (!isNonEmptyString(item?.summary)) errors.push(`${label} requires summary`)
      if (!Array.isArray(item?.artifactDigests) || item.artifactDigests.length === 0 ||
          item.artifactDigests.some((digest) => !isSha256Digest(digest))) {
        errors.push(`${label} requires SHA-256 artifact digests`)
      }
      const timestamp = parseTimestamp(item?.at, `${label} at`, errors)
      eventTimes.push(timestamp)
      if (index === 0 && !INITIAL_STATES.has(item?.state)) errors.push(`${label} has invalid initial state`)
      if (index > 0 && !STATE_TRANSITIONS[run.events[index - 1]?.state]?.has(item?.state)) {
        errors.push(`${label} has invalid state transition from ${run.events[index - 1]?.state || 'UNKNOWN'} to ${item?.state || 'UNKNOWN'}`)
      }
      if (index > 0 && timestamp !== null && eventTimes[index - 1] !== null && timestamp < eventTimes[index - 1]) {
        errors.push(`${label} event time moves backwards`)
      }
    }
    const finalEvent = run.events[run.events.length - 1]
    if (finalEvent?.revision !== run.revision || finalEvent?.state !== run.state) {
      errors.push('Theory agent final event must match the current revision and state')
    }
    const proposalEvents = run.events.filter((item) => ['AWAITING_HUMAN', 'BLOCKED_CATALOG_GAP'].includes(item?.state)).length
    if (proposalEvents !== run.attempt) errors.push('Theory agent attempt must match the number of mapping proposal events')
    const requiredInputTime = latestInputTimestamp(inputs, errors)
    if (requiredInputTime !== null && eventTimes[0] !== null && eventTimes[0] < requiredInputTime) {
      errors.push('Theory agent start timestamp predates an input review or ledger update')
    }
  }

  if (!Array.isArray(run.reviews)) errors.push('Theory agent run requires review history')
  const reviews = Array.isArray(run.reviews) ? run.reviews : []
  const normalizedReviews = reviews.map((review, index) => {
    const label = `Theory review history ${index + 1}`
    parseTimestamp(review?.reviewedAt, `${label} reviewedAt`, errors)
    return validateStoredReview(review, undefined, errors, label)
  })
  const reviewEvents = Array.isArray(run.events)
    ? run.events.filter((item) => ['APPROVED', 'REVISION_REQUESTED', 'REJECTED'].includes(item?.state))
    : []
  if (reviews.length !== reviewEvents.length) errors.push('Theory review history must match review events')
  const reviewStates = new Map([
    ['approve', 'APPROVED'], ['revise', 'REVISION_REQUESTED'], ['reject', 'REJECTED'],
  ])
  for (const [index, review] of reviews.entries()) {
    const reviewEvent = reviewEvents[index]
    const normalized = normalizedReviews[index]
    if (reviewEvent?.at !== review.reviewedAt || reviewEvent?.artifactDigests?.length !== 1 ||
        reviewEvent.artifactDigests[0] !== digestValue(review)) {
      errors.push(`Theory review history ${index + 1} does not match its event artifact`)
    }
    if (normalized && reviewEvent?.state !== reviewStates.get(normalized.decision)) {
      errors.push(`Theory review history ${index + 1} review decision does not match its event state`)
    }
    const reviewEventIndex = Array.isArray(run.events) ? run.events.indexOf(reviewEvent) : -1
    const proposalEvent = reviewEventIndex > 0 ? run.events[reviewEventIndex - 1] : null
    if (proposalEvent?.state !== 'AWAITING_HUMAN' || !proposalEvent?.artifactDigests?.includes(review.targetDigest)) {
      errors.push(`Theory review history ${index + 1} target digest is not bound by its proposal event`)
    }
  }

  const mappingDigest = run.mapping && typeof run.mapping === 'object' ? digestValue(run.mapping) : null
  if (!run.mapping || typeof run.mapping !== 'object' || Array.isArray(run.mapping)) {
    errors.push('Theory agent run requires a mapping artifact')
  } else {
    if (run.mapping.reviewStatus !== 'pending-human-review') errors.push('Theory mapping must retain pending-human-review provenance')
    const provenanceValidation = validateTheoryProvenance(run.mapping.provenance, {
      realModelUsed: run.mapping.capabilities?.realModelUsed,
    })
    if (!provenanceValidation.valid) {
      errors.push(...provenanceValidation.errors.map((error) => `Theory mapping provenance is invalid: ${error}`))
    }
    if (typeof run.mapping.capabilities?.realModelUsed !== 'boolean') {
      errors.push('Theory mapping capabilities require realModelUsed')
    }
    if (inputs) {
      const mappingValidation = validateTheoryMapping(run.mapping, inputs)
      if (!mappingValidation.valid) errors.push(...mappingValidation.errors.map((error) => `Theory mapping is invalid: ${error}`))
    }
  }
  if (!collectUnknownFields(run.audit, AUDIT_FIELDS, 'Theory audit', errors)) {
    errors.push('Theory agent run requires an audit artifact')
  } else {
    if (run.audit.schemaVersion !== THEORY_AUDIT_SCHEMA_VERSION) errors.push('Theory audit has unsupported schema')
    if (!['pass', 'catalog-gap'].includes(run.audit.status)) errors.push('Theory audit has unsupported status')
    if (run.audit.mappingDigest !== mappingDigest) errors.push('Theory audit mapping digest mismatch')
    if (!Array.isArray(run.audit.errors) || run.audit.errors.length > 0) errors.push('Persisted Theory audit must contain no errors')
    if (!Array.isArray(run.audit.unmappedClaimProposalIds)) errors.push('Theory audit requires unmapped claim proposals')
    if (inputs && run.mapping && typeof run.mapping === 'object' && !Array.isArray(run.mapping)) {
      const rebuiltAudit = auditTheoryMapping(run.mapping, inputs)
      if (digestValue(run.audit) !== digestValue(rebuiltAudit)) {
        errors.push('Theory audit does not match the canonical mapping audit for current inputs')
      }
    }
  }
  if (!collectUnknownFields(run.capabilities, CAPABILITY_FIELDS, 'Theory agent capabilities', errors)) {
    errors.push('Theory agent run requires capabilities')
  } else {
    if (run.capabilities.humanApprovalRequired !== true || run.capabilities.autoCatalogExpansion !== false) {
      errors.push('Theory agent capabilities must require human approval and disable catalog expansion')
    }
    if (run.capabilities.realModelUsed !== (run.mapping?.capabilities?.realModelUsed === true)) {
      errors.push('Theory agent realModelUsed capability must match mapping provenance')
    }
  }

  const currentReviewStates = new Map([
    ['APPROVED', 'approve'], ['REVISION_REQUESTED', 'revise'], ['REJECTED', 'reject'], ['READY_FOR_COMPILATION', 'approve'],
  ])
  if (currentReviewStates.has(run.state)) {
    const normalized = validateStoredReview(run.review, run.mapping, errors)
    if (normalized && run.review.decision !== currentReviewStates.get(run.state)) {
      errors.push(`Theory review decision does not match state ${run.state}`)
    }
    if (run.review?.targetDigest !== mappingDigest) errors.push('Theory review target digest does not match the current mapping')
    if (reviews.at(-1)?.id !== run.review?.id) errors.push('Current Theory review must be the latest review history item')
  } else if (run.review !== null) {
    errors.push(`Theory agent state ${run.state} must not retain a current review`)
  }

  if (run.state === 'AWAITING_HUMAN') {
    if (run.mapping?.reviewStatus !== 'pending-human-review') errors.push('Pending theory mapping must require human review')
    collectUnknownFields(run.checkpoint, CHECKPOINT_FIELDS, 'Theory agent checkpoint', errors)
    if (run.checkpoint?.targetDigest !== mappingDigest) errors.push('Theory agent checkpoint target digest mismatch')
    if (run.checkpoint?.auditDigest !== digestValue(run.audit)) errors.push('Theory agent checkpoint audit digest mismatch')
    if (run.audit?.status !== 'pass' || run.audit?.unmappedClaimProposalIds?.length > 0) errors.push('Pending Theory audit must pass without catalog gaps')
    const pendingEvent = run.events?.at(-1)
    if (!pendingEvent?.artifactDigests?.includes(mappingDigest) || !pendingEvent?.artifactDigests?.includes(digestValue(run.audit))) {
      errors.push('Pending Theory event must bind the mapping and audit artifacts')
    }
    if (run.theorySystem !== null) errors.push('Pending theory agent run cannot contain a theory system')
    if (run.catalogGap !== null) errors.push('Pending theory agent run cannot contain a catalog gap')
  }
  if (['APPROVED', 'REVISION_REQUESTED', 'REJECTED'].includes(run.state)) {
    collectUnknownFields(run.checkpoint, CHECKPOINT_FIELDS, 'Theory agent checkpoint', errors)
    if (run.checkpoint?.targetDigest !== mappingDigest || run.checkpoint?.auditDigest !== digestValue(run.audit)) {
      errors.push('Reviewed Theory checkpoint must still bind the current mapping and audit')
    }
    if (run.audit?.status !== 'pass') errors.push('Reviewed Theory audit must pass')
    if (run.theorySystem !== null) errors.push('Reviewed Theory state cannot contain a theory system before resume')
    if (run.catalogGap !== null) errors.push('Reviewed Theory state cannot contain a catalog gap')
  }
  if (run.state === 'BLOCKED_CATALOG_GAP') {
    collectUnknownFields(run.catalogGap, CATALOG_GAP_FIELDS, 'Theory catalog gap', errors)
    if (run.audit?.status !== 'catalog-gap' || run.audit?.unmappedClaimProposalIds?.length === 0) {
      errors.push('Blocked Theory run requires an audited catalog gap')
    }
    if (run.catalogGap?.mappingDigest !== mappingDigest) errors.push('Theory catalog gap mapping digest mismatch')
    if (run.catalogGap?.canAutoExpandCatalog !== false) errors.push('Theory catalog gap must disable automatic catalog expansion')
    if (run.checkpoint !== null || run.review !== null || run.theorySystem !== null) {
      errors.push('Blocked Theory run cannot contain checkpoint, current review, or Theory System')
    }
    if (!run.events?.at(-1)?.artifactDigests?.includes(digestValue(run.catalogGap))) {
      errors.push('Catalog-gap event must bind the gap artifact')
    }
  }
  if (run.state === 'READY_FOR_COMPILATION') {
    if (run.checkpoint !== null || run.catalogGap !== null) errors.push('Ready Theory run cannot retain checkpoint or catalog gap')
    if (run.theorySystem?.status !== 'approved') {
      errors.push('Ready theory agent run requires an approved theory system')
    } else {
      if (run.theorySystem.mappingDigest !== mappingDigest) errors.push('Ready Theory System mapping digest mismatch')
      if (run.theorySystem.review?.targetDigest !== run.review?.targetDigest ||
          run.theorySystem.review?.reviewer !== run.review?.reviewer ||
          run.theorySystem.review?.reviewedAt !== run.review?.reviewedAt) {
        errors.push('Ready Theory System review does not match the approved run review')
      }
      if (run.theorySystem.provenance?.realModelUsed !== run.capabilities?.realModelUsed) {
        errors.push('Ready Theory System provenance does not match run capabilities')
      }
      const expectedProvenance = {
        ...structuredClone(run.mapping?.provenance),
        realModelUsed: run.mapping?.capabilities?.realModelUsed === true,
      }
      if (digestValue(run.theorySystem.provenance) !== digestValue(expectedProvenance)) {
        errors.push('Ready Theory System provenance does not match the approved mapping provenance')
      }
      const unsignedSystem = structuredClone(run.theorySystem)
      delete unsignedSystem.id
      if (run.theorySystem.id !== `theory-system:${digestValue(unsignedSystem)}`) errors.push('Ready Theory System content digest mismatch')
      if (!run.events?.at(-1)?.artifactDigests?.includes(digestValue(run.theorySystem))) {
        errors.push('Ready Theory event must bind the Theory System artifact')
      }
      if (inputs) {
        const systemValidation = validateTheorySystem(run.theorySystem, inputs)
        if (!systemValidation.valid) errors.push(...systemValidation.errors.map((error) => `Theory System is invalid: ${error}`))
        try {
          const rebuiltSystem = finalizeTheorySystem({
            mapping: run.mapping,
            review: run.review,
            ...inputs,
          })
          if (digestValue(rebuiltSystem) !== digestValue(run.theorySystem)) {
            errors.push('Ready Theory System does not match canonical reconstruction from the approved mapping')
          }
        } catch {
          errors.push('Ready Theory System canonical reconstruction failed')
        }
      }
    }
  }
  if (run.state !== 'READY_FOR_COMPILATION' && run.theorySystem !== null) {
    errors.push('Only a ready theory agent run may contain a theory system')
  }
  return { valid: errors.length === 0, errors }
}

module.exports = {
  MAX_MAPPING_ATTEMPTS,
  THEORY_AGENT_RUN_SCHEMA_VERSION,
  applyTheoryReview,
  auditTheoryMapping,
  resumeTheoryAgent,
  startTheoryAgent,
  validateTheoryAgentRun,
}
