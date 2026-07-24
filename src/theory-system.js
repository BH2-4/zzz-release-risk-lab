'use strict'

const { digestValue, isSha256Digest } = require('./artifact-digest.js')
const { validateEvidenceLedger } = require('./evidence-ledger.js')
const { validateTheoryProvenance } = require('./theory-mapper.js')

const THEORY_SYSTEM_SCHEMA_VERSION = 'theory-system/1.0'
const THEORY_REVIEW_SCHEMA_VERSION = 'theory-review/1.0'
const EVIDENCE_REVIEW_SCHEMA_VERSION = 'evidence-review/1.0'

const SYSTEM_FIELDS = new Set([
  'schemaVersion', 'id', 'status', 'catalogDigest', 'ledgerDigest', 'evidenceReviewDigest',
  'mappingDigest', 'approvedMappings', 'unmappedClaimIds', 'coverage', 'limitations',
  'review', 'provenance',
])
const APPROVED_MAPPING_FIELDS = new Set([
  'id', 'theoryId', 'claimIds', 'constructs', 'mechanism', 'parameterPaths', 'limitations',
])

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function unknownFields(value, allowed, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object`)
    return
  }
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) errors.push(`${label} contains unknown field: ${field}`)
  }
}

function validateEvidenceReview(evidenceReview, { approvedExtractions, ledger } = {}) {
  const errors = []
  if (!evidenceReview || typeof evidenceReview !== 'object') return { valid: false, errors: ['Evidence review is required'] }
  if (evidenceReview.schemaVersion !== EVIDENCE_REVIEW_SCHEMA_VERSION) errors.push('Unsupported evidence review schema')
  if (!isNonEmptyString(evidenceReview.id)) errors.push('Evidence review requires id')
  if (!isNonEmptyString(evidenceReview.reviewer) || !isNonEmptyString(evidenceReview.reviewedAt)) {
    errors.push('Evidence review requires reviewer and reviewedAt')
  }

  const extractionsBySource = new Map((approvedExtractions || []).map((extraction) => [extraction.sourceId, extraction]))
  const referencedSources = new Set()
  if (!Array.isArray(evidenceReview.extractionRefs) || evidenceReview.extractionRefs.length === 0) {
    errors.push('Evidence review requires extractionRefs')
  } else {
    for (const ref of evidenceReview.extractionRefs) {
      if (!isNonEmptyString(ref?.sourceId) || referencedSources.has(ref.sourceId)) {
        errors.push(`Evidence review extraction source must be unique: ${ref?.sourceId || ''}`.trim())
      }
      referencedSources.add(ref?.sourceId)
      if (!isSha256Digest(ref?.digest)) errors.push(`Evidence review extraction ${ref?.sourceId || ''} requires SHA-256 digest`.trim())
      const extraction = extractionsBySource.get(ref?.sourceId)
      if (!extraction) errors.push(`Evidence review references unknown extraction: ${ref?.sourceId || ''}`.trim())
      if (extraction && ref.digest !== digestValue(extraction)) errors.push(`Evidence review extraction digest mismatch: ${ref.sourceId}`)
    }
  }
  for (const sourceId of extractionsBySource.keys()) {
    if (!referencedSources.has(sourceId)) errors.push(`Evidence review is missing extraction: ${sourceId}`)
  }

  const proposals = new Map()
  const proposalIds = new Set()
  for (const extraction of approvedExtractions || []) {
    for (const claim of extraction.claims || []) {
      const proposalId = claim?.id
      if (isNonEmptyString(proposalId) && proposalIds.has(proposalId)) {
        errors.push(`Evidence review proposal id must be globally unique: ${proposalId}`)
      }
      if (isNonEmptyString(proposalId)) proposalIds.add(proposalId)
      proposals.set(`${extraction.sourceId}:${proposalId}`, { claim, extraction })
    }
  }
  const ledgerClaims = new Map((ledger?.claims || []).map((claim) => [claim.id, claim]))
  const reviewedProposals = new Set()
  const ledgerClaimIds = new Set()
  if (!Array.isArray(evidenceReview.claimReviews) || evidenceReview.claimReviews.length === 0) {
    errors.push('Evidence review requires claimReviews')
  } else {
    for (const item of evidenceReview.claimReviews) {
      const key = `${item?.sourceId || ''}:${item?.proposalId || ''}`
      const proposalRecord = proposals.get(key)
      if (!proposalRecord) errors.push(`Evidence review references unknown claim proposal: ${key}`)
      if (reviewedProposals.has(key)) errors.push(`Evidence review duplicates claim proposal: ${key}`)
      reviewedProposals.add(key)
      if (!['approved', 'rejected'].includes(item?.decision)) errors.push(`Evidence review ${key} has unsupported decision`)
      if (item?.decision === 'approved') {
        const ledgerClaim = ledgerClaims.get(item?.ledgerClaimId)
        if (!isNonEmptyString(item?.ledgerClaimId) || !ledgerClaim) {
          errors.push(`Evidence review ${key} requires a known ledgerClaimId`)
        }
        if (ledgerClaimIds.has(item?.ledgerClaimId)) errors.push(`Evidence review reuses ledger claim: ${item.ledgerClaimId}`)
        ledgerClaimIds.add(item?.ledgerClaimId)
        if (proposalRecord && ledgerClaim) {
          const { claim: proposal, extraction } = proposalRecord
          const sourceRefs = Array.isArray(ledgerClaim.sourceRefs) ? ledgerClaim.sourceRefs : []
          if (!sourceRefs.some((ref) => ref?.sourceId === item.sourceId)) {
            errors.push(`Evidence review ${key} ledger claim sourceRefs do not include review source: ${item.sourceId}`)
          }
          if (ledgerClaim.claimType !== proposal.claimType) {
            errors.push(`Evidence review ${key} ledger claimType does not match proposal claimType`)
          }
          if (ledgerClaim.language !== extraction.language) {
            errors.push(`Evidence review ${key} ledger claim language does not match extraction language`)
          }
          const ledgerAllowedUses = Array.isArray(ledgerClaim.allowedUses) ? ledgerClaim.allowedUses : []
          const proposalAllowedUses = new Set(Array.isArray(proposal.allowedUses) ? proposal.allowedUses : [])
          if (!Array.isArray(proposal.allowedUses)) {
            errors.push(`Evidence review ${key} proposal requires an allowedUses array`)
          }
          const expandedUses = ledgerAllowedUses.filter((use) => !proposalAllowedUses.has(use))
          if (expandedUses.length > 0) {
            errors.push(`Evidence review ${key} ledger allowedUses exceed proposal allowedUses: ${expandedUses.join(', ')}`)
          }
        }
      } else if ('ledgerClaimId' in (item || {})) {
        errors.push(`Rejected evidence review ${key} must not include ledgerClaimId`)
      }
    }
  }
  for (const key of proposals.keys()) {
    if (!reviewedProposals.has(key)) errors.push(`Evidence review is missing claim proposal: ${key}`)
  }
  return { valid: errors.length === 0, errors }
}

function buildClaimResolution(evidenceReview) {
  return new Map(
    evidenceReview.claimReviews
      .filter((item) => item.decision === 'approved')
      .map((item) => [item.proposalId, item.ledgerClaimId]),
  )
}

function finalizeTheorySystem({ mapping, review, approvedExtractions, evidenceReview, ledger, theoryCatalog } = {}) {
  const ledgerValidation = validateEvidenceLedger(ledger)
  if (!ledgerValidation.valid) throw new TypeError(`Evidence ledger failed validation: ${ledgerValidation.errors.join('; ')}`)
  const evidenceValidation = validateEvidenceReview(evidenceReview, { approvedExtractions, ledger })
  if (!evidenceValidation.valid) throw new TypeError(`Evidence review failed validation: ${evidenceValidation.errors.join('; ')}`)
  if (review?.schemaVersion !== THEORY_REVIEW_SCHEMA_VERSION || review?.decision !== 'approve') {
    throw new TypeError('Theory system requires an approving human review')
  }
  const mappingDigest = digestValue(mapping)
  if (review.targetDigest !== mappingDigest) throw new TypeError('Theory review target digest does not match the mapping')

  const decisions = new Map((review.mappingDecisions || []).map((item) => [item.mappingId, item]))
  const claimResolution = buildClaimResolution(evidenceReview)
  const approvedMappings = (mapping.mappings || []).map((item) => {
    if (decisions.get(item.id)?.decision !== 'approve') throw new TypeError(`Theory mapping ${item.id} lacks human approval`)
    const claimIds = item.claimProposalIds.map((proposalId) => {
      const claimId = claimResolution.get(proposalId)
      if (!claimId) throw new TypeError(`Theory mapping ${item.id} references an unapproved claim proposal: ${proposalId}`)
      return claimId
    })
    return {
      id: item.id,
      theoryId: item.theoryId,
      claimIds,
      constructs: [...item.constructs],
      mechanism: item.mechanism,
      parameterPaths: [...item.suggestedParameterPaths],
      limitations: [...item.limitations],
    }
  })
  if ((mapping.unmappedClaimIds || []).length > 0) throw new TypeError('Theory system cannot finalize with unresolved catalog gaps')

  const mappedClaimIds = new Set(approvedMappings.flatMap((item) => item.claimIds))
  const approvedClaimIds = new Set(
    evidenceReview.claimReviews.filter((item) => item.decision === 'approved').map((item) => item.ledgerClaimId),
  )
  if ([...approvedClaimIds].some((claimId) => !mappedClaimIds.has(claimId))) {
    throw new TypeError('Theory system requires every approved evidence claim to be mapped')
  }
  if (typeof mapping.capabilities?.realModelUsed !== 'boolean') {
    throw new TypeError('Theory mapping capabilities require boolean realModelUsed')
  }
  const provenance = {
    ...structuredClone(mapping.provenance),
    realModelUsed: mapping.capabilities.realModelUsed,
  }
  const provenanceValidation = validateTheoryProvenance(provenance, {
    realModelUsed: mapping.capabilities?.realModelUsed,
    requireRealModelUsed: true,
  })
  if (!provenanceValidation.valid) {
    throw new TypeError(`Theory provenance failed validation: ${provenanceValidation.errors.join('; ')}`)
  }
  const unsigned = {
    schemaVersion: THEORY_SYSTEM_SCHEMA_VERSION,
    status: 'approved',
    catalogDigest: digestValue(theoryCatalog),
    ledgerDigest: digestValue(ledger),
    evidenceReviewDigest: digestValue(evidenceReview),
    mappingDigest,
    approvedMappings,
    unmappedClaimIds: [],
    coverage: {
      mappedClaims: mappedClaimIds.size,
      totalClaims: approvedClaimIds.size,
      ratio: approvedClaimIds.size === 0 ? 0 : mappedClaimIds.size / approvedClaimIds.size,
    },
    limitations: [...new Set([
      ...(mapping.limitations || []),
      'Theory matching supports a synthetic stress test; it is not causal proof or a real-world probability estimate.',
    ])],
    review: {
      schemaVersion: review.schemaVersion,
      targetDigest: review.targetDigest,
      decision: review.decision,
      reviewer: review.reviewer,
      reviewedAt: review.reviewedAt,
    },
    provenance,
  }
  const system = { ...unsigned, id: `theory-system:${digestValue(unsigned)}` }
  const validation = validateTheorySystem(system, { approvedExtractions, evidenceReview, ledger, theoryCatalog })
  if (!validation.valid) throw new TypeError(`Theory system failed validation: ${validation.errors.join('; ')}`)
  return system
}

function validateTheorySystem(system, { approvedExtractions, evidenceReview, ledger, theoryCatalog } = {}) {
  const errors = []
  if (!system || typeof system !== 'object') return { valid: false, errors: ['Theory system is required'] }
  unknownFields(system, SYSTEM_FIELDS, 'Theory system', errors)
  if (system.schemaVersion !== THEORY_SYSTEM_SCHEMA_VERSION) errors.push('Unsupported theory system schema')
  if (system.status !== 'approved') errors.push('Compilation requires an approved theory system')
  const provenanceValidation = validateTheoryProvenance(system.provenance, {
    realModelUsed: system.provenance?.realModelUsed,
    requireRealModelUsed: true,
  })
  if (!provenanceValidation.valid) errors.push(...provenanceValidation.errors)
  if (!isSha256Digest(system.catalogDigest) || !isSha256Digest(system.ledgerDigest) ||
      !isSha256Digest(system.evidenceReviewDigest) || !isSha256Digest(system.mappingDigest)) {
    errors.push('Theory system requires SHA-256 input digests')
  }
  if (theoryCatalog && system.catalogDigest !== digestValue(theoryCatalog)) errors.push('Theory system catalog digest mismatch')
  if (ledger && system.ledgerDigest !== digestValue(ledger)) errors.push('Theory system ledger digest mismatch')
  if (evidenceReview && system.evidenceReviewDigest !== digestValue(evidenceReview)) errors.push('Theory system evidence review digest mismatch')

  const unsigned = structuredClone(system)
  delete unsigned.id
  if (system.id !== `theory-system:${digestValue(unsigned)}`) errors.push('Theory system content digest mismatch')

  const theoriesById = new Map((theoryCatalog?.theories || []).map((theory) => [theory.id, theory]))
  const claimsById = new Map((ledger?.claims || []).map((claim) => [claim.id, claim]))
  const mappingIds = new Set()
  const mappedClaimIds = new Set()
  if (!Array.isArray(system.approvedMappings) || system.approvedMappings.length === 0) {
    errors.push('Theory system requires approvedMappings')
  } else {
    for (const mapping of system.approvedMappings) {
      const label = `Approved theory mapping ${mapping?.id || ''}`.trim()
      unknownFields(mapping, APPROVED_MAPPING_FIELDS, label, errors)
      if (!isNonEmptyString(mapping?.id) || mappingIds.has(mapping.id)) errors.push(`${label} requires a unique id`)
      mappingIds.add(mapping?.id)
      const theory = theoriesById.get(mapping?.theoryId)
      if (!theory) errors.push(`${label} references unknown theory: ${mapping?.theoryId || ''}`.trim())
      if (!Array.isArray(mapping?.claimIds) || mapping.claimIds.length === 0) errors.push(`${label} requires claimIds`)
      for (const claimId of mapping?.claimIds || []) {
        mappedClaimIds.add(claimId)
        const claim = claimsById.get(claimId)
        if (!claim) errors.push(`${label} references unknown ledger claim: ${claimId}`)
        if (claim && !['verified', 'reported'].includes(claim.evidenceStatus)) {
          errors.push(`${label} references inadmissible ledger claim: ${claimId}`)
        }
      }
      if (!Array.isArray(mapping?.constructs) || mapping.constructs.length === 0) errors.push(`${label} requires constructs`)
      for (const construct of mapping?.constructs || []) {
        if (theory && !theory.constructs.includes(construct)) errors.push(`${label} uses unsupported construct: ${construct}`)
      }
      if (!isNonEmptyString(mapping?.mechanism)) errors.push(`${label} requires mechanism`)
      if (!Array.isArray(mapping?.parameterPaths)) errors.push(`${label} requires parameterPaths`)
      for (const path of mapping?.parameterPaths || []) {
        if (theory && !theory.allowedParameterPaths.includes(path)) errors.push(`${label} uses unsupported parameter path: ${path}`)
      }
      if (!Array.isArray(mapping?.limitations) || mapping.limitations.length === 0) errors.push(`${label} requires limitations`)
    }
  }
  if (!Array.isArray(system.unmappedClaimIds) || system.unmappedClaimIds.length > 0) {
    errors.push('Approved theory system must have no unresolved unmapped claims')
  }
  if (!Number.isInteger(system.coverage?.mappedClaims) || !Number.isInteger(system.coverage?.totalClaims) ||
      system.coverage?.mappedClaims !== mappedClaimIds.size || system.coverage?.ratio !== 1) {
    errors.push('Theory system requires complete, internally consistent claim coverage')
  }
  if (evidenceReview) {
    const evidenceValidation = validateEvidenceReview(evidenceReview, { approvedExtractions, ledger })
    if (!evidenceValidation.valid) errors.push(...evidenceValidation.errors)
    const approvedClaimIds = new Set(
      evidenceReview.claimReviews.filter((item) => item.decision === 'approved').map((item) => item.ledgerClaimId),
    )
    if (system.coverage?.totalClaims !== approvedClaimIds.size || [...approvedClaimIds].some((id) => !mappedClaimIds.has(id))) {
      errors.push('Theory system coverage does not match the approved evidence review')
    }
  }
  if (system.review?.schemaVersion !== THEORY_REVIEW_SCHEMA_VERSION || system.review?.decision !== 'approve' ||
      !isNonEmptyString(system.review?.reviewer) || !isNonEmptyString(system.review?.reviewedAt)) {
    errors.push('Theory system requires an approving human review')
  }
  if (system.review?.targetDigest !== system.mappingDigest) errors.push('Theory system review target digest mismatch')
  if (!Array.isArray(system.limitations) || system.limitations.length === 0) errors.push('Theory system requires limitations')
  return { valid: errors.length === 0, errors }
}

module.exports = {
  EVIDENCE_REVIEW_SCHEMA_VERSION,
  THEORY_REVIEW_SCHEMA_VERSION,
  THEORY_SYSTEM_SCHEMA_VERSION,
  buildClaimResolution,
  finalizeTheorySystem,
  validateEvidenceReview,
  validateTheorySystem,
}
