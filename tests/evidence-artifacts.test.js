'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const ledger = require('../data/evidence/ledger.json')
const theoryCatalog = require('../data/evidence/theory-catalog.json')
const verticalSlice = require('../data/scenarios/zzz-3-1-fade-risk-vertical-slice.json')
const legacyVerticalSlice = require('../data/scenarios/zzz-tv-mode-vertical-slice.json')
const { buildEvidencePack, validateEvidenceLedger } = require('../src/evidence-ledger.js')

test('checked-in evidence ledger is valid, public, and spans the target languages', () => {
  assert.deepEqual(validateEvidenceLedger(ledger), { valid: true, errors: [] })
  assert.deepEqual(
    [...new Set(ledger.sources.map((source) => source.language))].sort(),
    ['en', 'ja', 'zh-CN'],
  )
  assert.equal(ledger.sources.some((source) => source.url.includes('example.com')), false)
  assert.equal(ledger.sources.every((source) => source.url.startsWith('http')), true)
})

test('theory catalog points to verified academic claims in the evidence ledger', () => {
  assert.equal(theoryCatalog.schemaVersion, 'theory-catalog/1.0')
  assert.equal(theoryCatalog.theories.length, 11)
  assert.deepEqual(
    theoryCatalog.theories.filter((theory) => theory.role === 'core').map((theory) => theory.id).sort(),
    ['theory-framing', 'theory-sarf', 'theory-scct', 'theory-smcc', 'theory-stops', 'theory-threshold'],
  )
  const claimsById = new Map(ledger.claims.map((claim) => [claim.id, claim]))
  const sourcesById = new Map(ledger.sources.map((source) => [source.id, source]))

  for (const theory of theoryCatalog.theories) {
    const claim = claimsById.get(theory.sourceClaimId)
    assert.equal(claim.evidenceStatus, 'verified')
    assert.equal(claim.claimType, 'academic-construct')
    for (const ref of claim.sourceRefs) assert.equal(sourcesById.get(ref.sourceId).grade, 'A')
    assert.ok(['core', 'conditional'].includes(theory.role))
    assert.ok(theory.activationCriteria.length > 0)
    assert.ok(theory.observableSignals.length > 0)
    assert.ok(theory.forbiddenClaims.length > 0)
    assert.match(theory.parameterization, /./)
  }
})

test('default 3.1 fade-risk vertical slice compiles only reviewed public evidence', () => {
  const pack = buildEvidencePack(ledger, { claimIds: verticalSlice.evidenceClaimIds })
  assert.equal(pack.provenance.candidateClaimsIncluded, false)
  assert.deepEqual(pack.languages, ['en', 'zh-CN'])
  assert.equal(pack.claims.every((claim) => ['verified', 'reported'].includes(claim.evidenceStatus)), true)
  assert.equal(pack.sources.every((source) => ['A', 'B'].includes(source.grade)), true)
  const outfitClaim = pack.claims.find((claim) => claim.id === 'claim-zzz-3-1-lucy-outfit-official')
  assert.equal(outfitClaim.evidenceStatus, 'verified')
  assert.equal(outfitClaim.sourceRefs[0].sourceId, 'hoyoverse-zzz-3-1-benefits-2026-07-17')
  assert.equal(pack.sources.find((source) => source.id === outfitClaim.sourceRefs[0].sourceId).grade, 'A')
  assert.equal(verticalSlice.scope.targetLanguages.length, 3)
  assert.equal(verticalSlice.scope.scenarioType, 'synthetic-counterfactual')
  assert.match(verticalSlice.boundaries.join(' '), /not a forecast/i)
})

test('legacy TV Mode slice remains available but is not the default evidence fixture', () => {
  const pack = buildEvidencePack(ledger, { claimIds: legacyVerticalSlice.evidenceClaimIds })
  assert.equal(legacyVerticalSlice.id, 'zzz-tv-mode-release-path-v1')
  assert.equal(pack.provenance.candidateClaimsIncluded, false)
  assert.notEqual(legacyVerticalSlice.id, verticalSlice.id)
})

test('unverified official and Japanese leads remain visible but cannot silently enter the default pack', () => {
  const candidateIds = ledger.claims
    .filter((claim) => claim.evidenceStatus === 'candidate')
    .map((claim) => claim.id)
  assert.ok(candidateIds.length >= 2)
  for (const claimId of candidateIds) {
    assert.throws(() => buildEvidencePack(ledger, { claimIds: [claimId] }), /candidate evidence/i)
  }
})
