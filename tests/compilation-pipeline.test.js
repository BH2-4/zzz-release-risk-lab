'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const ledger = require('../data/evidence/ledger.json')
const theoryCatalog = require('../data/evidence/theory-catalog.json')
const verticalSlice = require('../data/scenarios/zzz-tv-mode-vertical-slice.json')
const { digestValue } = require('../src/artifact-digest.js')
const { prepareScenarioCompilation } = require('../src/compilation-pipeline.js')

function theorySystemFixture() {
  const approvedMappings = verticalSlice.theoryIds.map((theoryId, index) => {
    const theory = theoryCatalog.theories.find((candidate) => candidate.id === theoryId)
    return {
      id: `approved-mapping-${index + 1}`,
      theoryId,
      claimIds: [...verticalSlice.evidenceClaimIds],
      constructs: [theory.constructs[0]],
      mechanism: `Bounded fixture mechanism for ${theoryId}.`,
      parameterPaths: [],
      limitations: ['Test fixture only; no effect size is asserted.'],
    }
  })
  const mappingDigest = digestValue(approvedMappings)
  const unsigned = {
    schemaVersion: 'theory-system/1.0',
    status: 'approved',
    catalogDigest: digestValue(theoryCatalog),
    ledgerDigest: digestValue(ledger),
    evidenceReviewDigest: `sha256:${'1'.repeat(64)}`,
    mappingDigest,
    approvedMappings,
    unmappedClaimIds: [],
    coverage: {
      mappedClaims: verticalSlice.evidenceClaimIds.length,
      totalClaims: verticalSlice.evidenceClaimIds.length,
      ratio: 1,
    },
    limitations: ['Human-approved test fixture; not a forecast.'],
    review: {
      schemaVersion: 'theory-review/1.0',
      targetDigest: mappingDigest,
      decision: 'approve',
      reviewer: 'test-reviewer',
      reviewedAt: '2026-07-24T10:00:00+08:00',
    },
    provenance: {
      mode: 'deterministic-fixture',
      fixturePath: 'tests/compilation-pipeline.test.js',
      fixtureDigest: mappingDigest,
      realModelUsed: false,
    },
  }
  return { ...unsigned, id: `theory-system:${digestValue(unsigned)}` }
}

test('prepares the checked-in vertical slice as a bounded AI compilation request', () => {
  const theorySystem = theorySystemFixture()
  const prepared = prepareScenarioCompilation({ ledger, theoryCatalog, theorySystem, verticalSlice })

  assert.equal(prepared.verticalSliceId, 'zzz-tv-mode-release-path-v1')
  assert.deepEqual(prepared.evidencePack.claims.map((claim) => claim.id), verticalSlice.evidenceClaimIds)
  assert.deepEqual(prepared.theoryCatalog.theories.map((theory) => theory.id), theorySystem.approvedMappings.map((mapping) => mapping.theoryId))
  assert.equal(prepared.theorySystemId, theorySystem.id)
  assert.deepEqual(prepared.targetLanguages, ['zh-CN', 'en', 'ja'])
  assert.match(prepared.brief, /fictional next-version ZZZ scenario/i)
})

test('preparation rejects unapproved, tampered, and unknown theory systems', () => {
  const pending = theorySystemFixture()
  pending.status = 'pending-human-review'
  assert.throws(
    () => prepareScenarioCompilation({ ledger, theoryCatalog, theorySystem: pending, verticalSlice }),
    /approved theory system/i,
  )

  const tampered = theorySystemFixture()
  tampered.approvedMappings[0].mechanism = 'Changed after approval.'
  assert.throws(
    () => prepareScenarioCompilation({ ledger, theoryCatalog, theorySystem: tampered, verticalSlice }),
    /digest/i,
  )

  const unknownTheory = theorySystemFixture()
  unknownTheory.approvedMappings[0].theoryId = 'theory-invented'
  const unsigned = structuredClone(unknownTheory)
  delete unsigned.id
  unknownTheory.id = `theory-system:${digestValue(unsigned)}`
  assert.throws(
    () => prepareScenarioCompilation({ ledger, theoryCatalog, theorySystem: unknownTheory, verticalSlice }),
    /unknown theory/i,
  )
})

test('preparation rejects candidate evidence even with an approved theory system', () => {
  const theorySystem = theorySystemFixture()

  const candidateEvidence = structuredClone(verticalSlice)
  candidateEvidence.evidenceClaimIds = ['claim-zzz-1-4-official-update-lead']
  assert.throws(
    () => prepareScenarioCompilation({ ledger, theoryCatalog, theorySystem, verticalSlice: candidateEvidence }),
    /candidate evidence/i,
  )
})

test('preparation requires the 42-day, 125-agent, three-language MVP scope', () => {
  const theorySystem = theorySystemFixture()
  for (const [field, value] of [['cycleDays', 41], ['populationSize', 25]]) {
    const invalid = structuredClone(verticalSlice)
    invalid.scope[field] = value
    assert.throws(
      () => prepareScenarioCompilation({ ledger, theoryCatalog, theorySystem, verticalSlice: invalid }),
      new RegExp(field, 'i'),
    )
  }

  const missingLanguage = structuredClone(verticalSlice)
  missingLanguage.scope.targetLanguages = ['zh-CN', 'en']
  assert.throws(
    () => prepareScenarioCompilation({ ledger, theoryCatalog, theorySystem, verticalSlice: missingLanguage }),
    /target languages/i,
  )
})
