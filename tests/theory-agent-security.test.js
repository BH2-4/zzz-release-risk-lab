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

const approvedExtractions = require('../data/evidence/extractions/zzz-1-4-fade-approved.json')
const evidenceReview = require('../data/evidence/reviews/zzz-1-4-fade-evidence-review.json')
const ledger = require('../data/evidence/ledger.json')
const theoryCatalog = require('../data/evidence/theory-catalog.json')
const fixtureMapping = require('../data/theory-agent/zzz-1-4-fade-mapping-fixture.json')

const inputs = { approvedExtractions, evidenceReview, ledger, theoryCatalog }

function provider() {
  return {
    async generateObject() {
      return {
        object: structuredClone(fixtureMapping),
        provenance: {
          mode: 'deterministic-fixture',
          provider: 'test-fixture',
          model: null,
          requestId: null,
          fixturePath: 'data/theory-agent/zzz-1-4-fade-mapping-fixture.json',
          fixtureDigest: digestValue(fixtureMapping),
        },
      }
    },
  }
}

function approvingReview(pending, reviewedAt = '2026-07-24T14:01:00+08:00') {
  return {
    schemaVersion: 'theory-review/1.0',
    targetDigest: pending.checkpoint.targetDigest,
    decision: 'approve',
    mappingDecisions: pending.mapping.mappings.map((mapping) => ({
      mappingId: mapping.id,
      decision: 'approve',
      reasonCodes: ['TEST_REVIEWED'],
    })),
    reviewer: 'security-test-reviewer',
    reviewedAt,
    feedback: [],
  }
}

async function readyRun() {
  const pending = await startTheoryAgent({
    ...inputs,
    provider: provider(),
    runId: 'security-ready-run',
    now: '2026-07-24T14:00:00+08:00',
  })
  const approved = applyTheoryReview({ run: pending, review: approvingReview(pending) })
  return resumeTheoryAgent({
    ...inputs,
    run: approved,
    now: '2026-07-24T14:02:00+08:00',
  })
}

test('ready runs require exact input digests and complete approval lineage', async () => {
  const ready = await readyRun()
  assert.deepEqual(validateTheoryAgentRun(ready, inputs), { valid: true, errors: [] })

  const stripped = structuredClone(ready)
  stripped.inputDigests = {}
  stripped.events = [{}]
  stripped.reviews = []
  stripped.review = null
  stripped.mapping = null
  stripped.audit = null

  const validation = validateTheoryAgentRun(stripped, inputs)
  assert.equal(validation.valid, false)
  assert.match(validation.errors.join('; '), /input digest|mapping|audit|review|event/i)
})

test('resume rejects a forged approved state before finalizing a Theory System', async () => {
  const ready = await readyRun()
  const forged = structuredClone(ready)
  forged.state = 'APPROVED'
  forged.revision = 2
  forged.theorySystem = null
  forged.inputDigests = {}
  forged.events = [{ revision: 2, state: 'APPROVED' }]
  forged.reviews = []

  await assert.rejects(
    () => resumeTheoryAgent({ ...inputs, run: forged, now: '2026-07-24T14:03:00+08:00' }),
    /run failed validation|input digest|event|review/i,
  )
})

test('review and system digests must resolve to the current mapping', async () => {
  const ready = await readyRun()
  const tampered = structuredClone(ready)
  tampered.mapping.mappings[0].mechanism = 'Changed after review.'

  const validation = validateTheoryAgentRun(tampered, inputs)
  assert.equal(validation.valid, false)
  assert.match(validation.errors.join('; '), /mapping digest|review target|theory system/i)
})

test('run events must form a complete monotonic state transition history', async () => {
  const ready = await readyRun()
  const tampered = structuredClone(ready)
  tampered.events[1].revision = 7
  tampered.events[1].at = '2026-07-24T13:59:00+08:00'

  const validation = validateTheoryAgentRun(tampered, inputs)
  assert.equal(validation.valid, false)
  assert.match(validation.errors.join('; '), /event revision|event time|transition/i)
})

test('a run cannot start before its reviewed inputs exist', async () => {
  await assert.rejects(
    () => startTheoryAgent({
      ...inputs,
      provider: provider(),
      runId: 'security-time-run',
      now: '2026-07-24T01:46:00+08:00',
    }),
    /predates|timestamp|input review/i,
  )
})

test('a review timestamp cannot move backwards from the pending event', async () => {
  const pending = await startTheoryAgent({
    ...inputs,
    provider: provider(),
    runId: 'security-review-time-run',
    now: '2026-07-24T14:00:00+08:00',
  })

  assert.throws(
    () => applyTheoryReview({ run: pending, review: approvingReview(pending, '2026-07-24T13:59:00+08:00') }),
    /timestamp|event time|before/i,
  )
})
