'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { digestValue } = require('../src/artifact-digest.js')
const {
  applyTheoryReview,
  resumeTheoryAgent,
  startTheoryAgent,
  validateTheoryAgentRun,
} = require('../src/theory-agent.js')
const {
  finalizeTheorySystem,
  validateEvidenceReview,
  validateTheorySystem,
} = require('../src/theory-system.js')

const verticalSliceExtractions = require('../data/evidence/extractions/zzz-1-4-fade-approved.json')
const verticalSliceEvidenceReview = require('../data/evidence/reviews/zzz-1-4-fade-evidence-review.json')
const verticalSliceLedger = require('../data/evidence/ledger.json')

function fixtures() {
  const approvedExtraction = {
    schemaVersion: 'evidence-extraction/1.0',
    sourceId: 'source-event-report',
    language: 'zh-CN',
    reviewStatus: 'approved',
    review: { reviewer: 'evidence-editor', reviewedAt: '2026-07-24T09:00:00+08:00' },
    claims: [{
      id: 'proposal-fade-response',
      claimType: 'reported-fact',
      text: 'The report records a camera fade adjustment and a same-day corrective response.',
      anchors: [{ quote: 'camera fade adjustment', locator: 'paragraph 2' }],
      allowedUses: ['historical-analogy', 'response-design', 'issue-framing'],
    }],
    stakeholders: [],
    frames: [],
    limitations: ['The source does not measure opinion prevalence.'],
  }
  const ledger = {
    schemaVersion: 'evidence-ledger/1.0',
    ledgerId: 'theory-agent-fixture',
    updatedAt: '2026-07-24T09:00:00+08:00',
    sources: [
      {
        id: 'source-event-report', kind: 'professional-media', grade: 'B',
        title: 'Event report', publisher: 'Fixture Media', url: 'https://example.com/event',
        publishedAt: '2024-12-18', accessedAt: '2026-07-24T09:00:00+08:00', language: 'zh-CN',
        verification: { status: 'direct', method: 'publisher-page', checkedAt: '2026-07-24T09:00:00+08:00' },
      },
      {
        id: 'source-framing-paper', kind: 'academic', grade: 'A',
        title: 'Framing paper', publisher: 'Fixture Journal', url: 'https://doi.org/10.1111/j.1460-2466.1993.tb01304.x',
        publishedAt: '1993-12-01', accessedAt: '2026-07-24T09:00:00+08:00', language: 'en',
        verification: { status: 'metadata', method: 'crossref-doi-metadata', checkedAt: '2026-07-24T09:00:00+08:00' },
      },
    ],
    claims: [
      {
        id: 'claim-fade-response', claimType: 'reported-fact', evidenceStatus: 'reported',
        text: 'A directly checked report records the adjustment and response.', language: 'zh-CN',
        sourceRefs: [{ sourceId: 'source-event-report', locator: 'paragraph 2' }],
        allowedUses: ['historical-analogy', 'response-design', 'issue-framing'],
      },
      {
        id: 'claim-theory-framing', claimType: 'academic-construct', evidenceStatus: 'verified',
        text: 'Framing separates problem definition and treatment recommendation.', language: 'en',
        sourceRefs: [{ sourceId: 'source-framing-paper', locator: 'DOI metadata and construct' }],
        allowedUses: ['theory-definition', 'scenario-mapping'],
      },
    ],
  }
  const theoryCatalog = {
    schemaVersion: 'theory-catalog/1.0',
    theories: [{
      id: 'theory-framing', name: 'Framing', role: 'core', sourceClaimId: 'claim-theory-framing',
      constructs: ['problem-definition', 'treatment-recommendation'],
      allowedParameterPaths: ['scenario.triggers.social', 'scenario.triggers.internet'],
      activationCriteria: ['A public text defines a problem or recommends treatment.'],
      observableSignals: ['problem definition', 'response recommendation'],
      forbiddenClaims: ['A frame label proves audience acceptance or effect size.'],
      limitations: ['A frame label is not a population prevalence estimate.'],
    }],
  }
  const evidenceReview = {
    schemaVersion: 'evidence-review/1.0',
    id: 'review-event-evidence-v1',
    extractionRefs: [{
      sourceId: approvedExtraction.sourceId,
      digest: digestValue(approvedExtraction),
    }],
    claimReviews: [{
      sourceId: approvedExtraction.sourceId,
      proposalId: 'proposal-fade-response',
      decision: 'approved',
      ledgerClaimId: 'claim-fade-response',
    }],
    reviewer: 'evidence-editor',
    reviewedAt: '2026-07-24T09:05:00+08:00',
  }
  return { approvedExtractions: [approvedExtraction], evidenceReview, ledger, theoryCatalog }
}

function mapping({ unmapped = false, suffix = '' } = {}) {
  return {
    schemaVersion: 'theory-mapping/1.0',
    extractionRefs: ['source-event-report'],
    mappings: unmapped ? [] : [{
      id: `mapping-framing-fade${suffix}`,
      theoryId: 'theory-framing',
      claimProposalIds: ['proposal-fade-response'],
      constructs: ['problem-definition', 'treatment-recommendation'],
      mechanism: 'Players can define the same camera behavior as defect correction or access restriction.',
      suggestedParameterPaths: ['scenario.triggers.social', 'scenario.triggers.internet'],
      confidence: 0.7,
      limitations: ['This mapping supplies no effect size or population prevalence.'],
    }],
    unmappedClaimIds: unmapped ? ['proposal-fade-response'] : [],
    limitations: ['Theory matching is a review aid, not causal proof.'],
  }
}

function providerFor(objects) {
  let index = 0
  return {
    async generateObject() {
      const object = objects[Math.min(index, objects.length - 1)]
      index += 1
      return {
        object: structuredClone(object),
        provenance: {
          mode: 'live-model', provider: 'fixture', model: 'mapping-model', requestId: `req-${index}`,
        },
      }
    },
  }
}

test('evidence review binds each approved proposal to its source, type, language, and allowed uses', () => {
  const mutations = [
    {
      label: 'source',
      mutate(claim) { claim.sourceRefs = [{ sourceId: 'source-framing-paper', locator: 'wrong source' }] },
      expected: /source/i,
    },
    {
      label: 'claim type',
      mutate(claim) { claim.claimType = 'fact' },
      expected: /claimType/i,
    },
    {
      label: 'language',
      mutate(claim) { claim.language = 'en' },
      expected: /language/i,
    },
    {
      label: 'allowed uses',
      mutate(claim) { claim.allowedUses.push('real-world-probability') },
      expected: /allowedUses/i,
    },
  ]

  for (const { label, mutate, expected } of mutations) {
    const input = fixtures()
    mutate(input.ledger.claims[0])
    const validation = validateEvidenceReview(input.evidenceReview, input)
    assert.equal(validation.valid, false, `${label} mismatch must be rejected`)
    assert.match(validation.errors.join('; '), expected)
  }
})

test('evidence review permits a reviewer to narrow proposal uses without granting new uses', () => {
  const input = fixtures()
  input.ledger.claims[0].allowedUses = ['historical-analogy']

  const validation = validateEvidenceReview(input.evidenceReview, input)

  assert.deepEqual(validation, { valid: true, errors: [] })
})

test('evidence review rejects swapped official 1.4 and 3.1 ledger claims', () => {
  const evidenceReview = structuredClone(verticalSliceEvidenceReview)
  const fade = evidenceReview.claimReviews.find((item) => item.proposalId === 'proposal-fade-adjustment-fix')
  const outfit = evidenceReview.claimReviews.find((item) => item.proposalId === 'proposal-3-1-lucy-outfit-official')
  const fadeLedgerClaimId = fade.ledgerClaimId
  fade.ledgerClaimId = outfit.ledgerClaimId
  outfit.ledgerClaimId = fadeLedgerClaimId

  const validation = validateEvidenceReview(evidenceReview, {
    approvedExtractions: verticalSliceExtractions,
    ledger: verticalSliceLedger,
  })

  assert.equal(validation.valid, false)
  assert.match(validation.errors.join('; '), /source|language|allowedUses/i)
})

test('evidence review rejects proposal ids duplicated across extractions', () => {
  const input = fixtures()
  const duplicateExtraction = structuredClone(input.approvedExtractions[0])
  duplicateExtraction.sourceId = 'source-second-event-report'
  input.approvedExtractions.push(duplicateExtraction)
  input.evidenceReview.extractionRefs.push({
    sourceId: duplicateExtraction.sourceId,
    digest: digestValue(duplicateExtraction),
  })
  input.evidenceReview.claimReviews.push({
    sourceId: duplicateExtraction.sourceId,
    proposalId: 'proposal-fade-response',
    decision: 'rejected',
  })

  const validation = validateEvidenceReview(input.evidenceReview, input)

  assert.equal(validation.valid, false)
  assert.match(validation.errors.join('; '), /proposal id.*unique|duplicate.*proposal/i)
})

test('theory agent pauses for a human and cannot self-approve model output', async () => {
  const input = fixtures()
  const run = await startTheoryAgent({
    ...input,
    provider: providerFor([mapping()]),
    runId: 'run-human-gate',
    now: '2026-07-24T10:00:00+08:00',
  })

  assert.equal(run.state, 'AWAITING_HUMAN')
  assert.equal(run.mapping.reviewStatus, 'pending-human-review')
  assert.match(run.checkpoint.targetDigest, /^sha256:[0-9a-f]{64}$/)
  assert.equal(run.theorySystem, null)
  assert.deepEqual(validateTheoryAgentRun(run), { valid: true, errors: [] })
})

test('approved mapping resumes into a content-addressed theory system', async () => {
  const input = fixtures()
  const pending = await startTheoryAgent({
    ...input,
    provider: providerFor([mapping()]),
    runId: 'run-approved',
    now: '2026-07-24T10:00:00+08:00',
  })
  const approved = applyTheoryReview({
    ...input,
    run: pending,
    review: {
      schemaVersion: 'theory-review/1.0',
      targetDigest: pending.checkpoint.targetDigest,
      decision: 'approve',
      mappingDecisions: [{ mappingId: 'mapping-framing-fade', decision: 'approve', reasonCodes: ['MECHANISM_PLAUSIBLE'] }],
      reviewer: 'release-researcher',
      reviewedAt: '2026-07-24T10:05:00+08:00',
      feedback: [],
    },
  })
  assert.equal(approved.state, 'APPROVED')

  const ready = await resumeTheoryAgent({
    ...input,
    run: approved,
    now: '2026-07-24T10:06:00+08:00',
  })
  assert.equal(ready.state, 'READY_FOR_COMPILATION')
  assert.match(ready.theorySystem.id, /^theory-system:sha256:[0-9a-f]{64}$/)
  assert.deepEqual(ready.theorySystem.approvedMappings[0].claimIds, ['claim-fade-response'])
  assert.deepEqual(validateTheorySystem(ready.theorySystem, input), { valid: true, errors: [] })

  const tampered = structuredClone(ready.theorySystem)
  tampered.approvedMappings[0].mechanism = 'Tampered mechanism.'
  assert.match(validateTheorySystem(tampered, input).errors.join('; '), /digest/i)
})

test('direct Theory System finalization rejects missing or non-boolean model capability', () => {
  const input = fixtures()
  const completeMapping = {
    ...mapping(),
    reviewStatus: 'pending-human-review',
    provenance: {
      mode: 'live-model',
      provider: 'test',
      model: 'mapping-model',
      requestId: 'req-direct-finalize',
    },
    capabilities: {
      realModelUsed: true,
      closedTheoryCatalog: true,
      causalProof: false,
    },
  }

  for (const [label, capability] of [
    ['missing', undefined],
    ['string', 'true'],
    ['numeric', 1],
    ['object', { value: true }],
  ]) {
    const invalidMapping = structuredClone(completeMapping)
    if (capability === undefined) delete invalidMapping.capabilities.realModelUsed
    else invalidMapping.capabilities.realModelUsed = capability
    const review = {
      schemaVersion: 'theory-review/1.0',
      targetDigest: digestValue(invalidMapping),
      decision: 'approve',
      mappingDecisions: [{
        mappingId: 'mapping-framing-fade',
        decision: 'approve',
        reasonCodes: ['DIRECT_FINALIZATION_TEST'],
      }],
      reviewer: 'release-researcher',
      reviewedAt: '2026-07-24T10:05:00+08:00',
      feedback: [],
    }

    assert.throws(
      () => finalizeTheorySystem({ mapping: invalidMapping, review, ...input }),
      /capabilities.*boolean realModelUsed/i,
      label,
    )
  }
})

test('catalog gaps block instead of forcing an inappropriate theory', async () => {
  const input = fixtures()
  const run = await startTheoryAgent({
    ...input,
    provider: providerFor([mapping({ unmapped: true })]),
    runId: 'run-catalog-gap',
    now: '2026-07-24T10:00:00+08:00',
  })

  assert.equal(run.state, 'BLOCKED_CATALOG_GAP')
  assert.deepEqual(run.catalogGap.unmappedClaimProposalIds, ['proposal-fade-response'])
  assert.equal(run.catalogGap.canAutoExpandCatalog, false)
  assert.equal(run.theorySystem, null)
})

test('one structured revision is allowed but a third mapping attempt is refused', async () => {
  const input = fixtures()
  const provider = providerFor([mapping(), mapping({ suffix: '-revised' })])
  const pending = await startTheoryAgent({
    ...input, provider, runId: 'run-revision', now: '2026-07-24T10:00:00+08:00',
  })
  const revisionRequested = applyTheoryReview({
    ...input,
    run: pending,
    review: {
      schemaVersion: 'theory-review/1.0', targetDigest: pending.checkpoint.targetDigest,
      decision: 'revise', mappingDecisions: [{ mappingId: 'mapping-framing-fade', decision: 'revise', reasonCodes: ['CAUSAL_OVERCLAIM'] }],
      reviewer: 'release-researcher', reviewedAt: '2026-07-24T10:05:00+08:00',
      feedback: ['Remove causal wording and retain the observable framing distinction only.'],
    },
  })
  const revised = await resumeTheoryAgent({
    ...input, provider, run: revisionRequested, now: '2026-07-24T10:06:00+08:00',
  })
  assert.equal(revised.state, 'AWAITING_HUMAN')
  assert.equal(revised.attempt, 2)
  assert.equal(revised.mapping.mappings[0].id, 'mapping-framing-fade-revised')

  const secondRevision = applyTheoryReview({
    ...input,
    run: revised,
    review: {
      schemaVersion: 'theory-review/1.0', targetDigest: revised.checkpoint.targetDigest,
      decision: 'revise', mappingDecisions: [{ mappingId: 'mapping-framing-fade-revised', decision: 'revise', reasonCodes: ['INSUFFICIENT_BOUNDARY'] }],
      reviewer: 'release-researcher', reviewedAt: '2026-07-24T10:10:00+08:00', feedback: ['Revise again.'],
    },
  })
  await assert.rejects(
    () => resumeTheoryAgent({ ...input, provider, run: secondRevision, now: '2026-07-24T10:11:00+08:00' }),
    /maximum.*mapping attempts/i,
  )
})

test('human review rejects stale target digests and model-invented theory ids', async () => {
  const input = fixtures()
  const pending = await startTheoryAgent({
    ...input, provider: providerFor([mapping()]), runId: 'run-integrity', now: '2026-07-24T10:00:00+08:00',
  })
  assert.throws(
    () => applyTheoryReview({
      ...input,
      run: pending,
      review: {
        schemaVersion: 'theory-review/1.0', targetDigest: `sha256:${'0'.repeat(64)}`,
        decision: 'approve', mappingDecisions: [], reviewer: 'release-researcher',
        reviewedAt: '2026-07-24T10:05:00+08:00', feedback: [],
      },
    }),
    /target digest/i,
  )

  const invented = mapping()
  invented.mappings[0].theoryId = 'theory-invented'
  await assert.rejects(
    () => startTheoryAgent({
      ...input, provider: providerFor([invented]), runId: 'run-invented', now: '2026-07-24T10:00:00+08:00',
    }),
    /unknown theory/i,
  )
})
