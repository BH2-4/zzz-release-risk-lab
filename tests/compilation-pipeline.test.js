'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const ledger = require('../data/evidence/ledger.json')
const theoryCatalog = require('../data/evidence/theory-catalog.json')
const approvedExtractions = require('../data/evidence/extractions/zzz-1-4-fade-approved.json')
const evidenceReview = require('../data/evidence/reviews/zzz-1-4-fade-evidence-review.json')
const theoryRun = require('../experiments/output/theory/zzz-1-4-fade-run.json')
const verticalSlice = require('../data/scenarios/zzz-tv-mode-vertical-slice.json')
const fixedVerticalSlice = require('../data/scenarios/zzz-3-1-fade-risk-vertical-slice.json')
const { digestValue } = require('../src/artifact-digest.js')
const {
  prepareScenarioCompilation,
  runScenarioCompilation,
  validateFixedCompilationArtifact,
} = require('../src/compilation-pipeline.js')

const FIXED_THEORY_SYSTEM_ID = 'theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912'
const FIXED_SOURCE_DIGESTS = Object.freeze({
  approvedExtractions: 'sha256:f9a216da460893abc01de40844295e51a2f638f89a292056420bb24f87ea1ec1',
  evidenceReview: 'sha256:493e99eaf49090ee48211fed824a91d78af8d922db3f6c3e456656e5da1762d8',
  ledger: 'sha256:f3c80f1881c2e75583a0cd76c20ba5df6f5e603de926361ceb6b1e6ba6690e05',
  theoryCatalog: 'sha256:9296e439d7a610302bc7e0ae19afc7c95697af99d4a85265cb2f73ca9b93f3e6',
  theoryRun: 'sha256:8358bbc0d1f1526911f58e69b72dfd99a3bcd7def3afbbb666ba66e4e87ac758',
  verticalSlice: 'sha256:e8ca8fad4e2a45ec4ac19a0b9b1f4bc7efc52f6178bb1c2bfbe4bb92b0b8f987',
  theorySystem: 'sha256:98f5cc12b66944d0326c255c7a73d7482a47846ab9e7ddd74610a093ba338fdc',
})

function fixedInputs() {
  return {
    approvedExtractions,
    evidenceReview,
    ledger,
    theoryCatalog,
    theoryRun,
    theorySystem: theoryRun.theorySystem,
    verticalSlice: fixedVerticalSlice,
  }
}

function fixedCompiledObject() {
  const compiled = {
    schemaVersion: 'compiled-scenario/1.0',
    id: fixedVerticalSlice.id,
    title: 'Synthetic Version 3.1 fade-risk stress test',
    environment: 'zenless-zone-zero',
    kind: 'synthetic-counterfactual',
    languages: ['zh-CN', 'en', 'ja'],
    scenario: {
      id: fixedVerticalSlice.id,
      label: '合成 3.1 角色展示异常压力测试',
      eventDay: 1,
      controllability: 0.9,
      priorCrisis: 0.6,
      triggers: { economic: 0.6, political: 0.05, cultural: 0.2, social: 0.8, internet: 0.85 },
      regionFactors: {
        'east-asia': 1,
        'north-america': 1,
        europe: 1,
        'southeast-asia': 1,
        'latin-america': 1,
      },
    },
    strategies: {
      baseline: {
        id: 'delayed-ambiguous', delayDays: 7, transparency: 0.2, participation: 0.1,
        restitution: 0.1, localization: 0.3, correctiveAction: 0.2,
      },
      candidate: {
        id: 'rapid-bounded-correction', delayDays: 1, transparency: 0.9, participation: 0.5,
        restitution: 0.6, localization: 0.9, correctiveAction: 0.95,
      },
    },
    stakeholderArchetypes: [{
      id: 'invested-players',
      label: '已获取角色内容的合成代表者',
      goals: ['content-access', 'procedural-fairness'],
      initialStance: -0.2,
      publicExpression: { propensity: 0.65, channels: ['community', 'video'] },
      memorySeeds: [{ claimId: 'claim-zzz-1-4-player-ownership-frame', salience: 0.75 }],
    }],
    theoryMappings: theoryRun.theorySystem.approvedMappings.map((mapping) => ({
      theoryId: mapping.theoryId,
      claimIds: [...mapping.claimIds],
      mechanism: mapping.mechanism,
      parameterPaths: [...mapping.parameterPaths],
    })),
    assumptions: [],
    parameterBindings: [],
    citations: [...fixedVerticalSlice.evidenceClaimIds],
    limitations: [...fixedVerticalSlice.boundaries],
  }
  const numericPaths = [
    'scenario.eventDay',
    'scenario.controllability',
    'scenario.priorCrisis',
    'scenario.triggers.economic',
    'scenario.triggers.political',
    'scenario.triggers.cultural',
    'scenario.triggers.social',
    'scenario.triggers.internet',
    'strategies.baseline.delayDays',
    'strategies.baseline.transparency',
    'strategies.baseline.participation',
    'strategies.baseline.restitution',
    'strategies.baseline.localization',
    'strategies.baseline.correctiveAction',
    'strategies.candidate.delayDays',
    'strategies.candidate.transparency',
    'strategies.candidate.participation',
    'strategies.candidate.restitution',
    'strategies.candidate.localization',
    'strategies.candidate.correctiveAction',
    'stakeholderArchetypes.0.initialStance',
    'stakeholderArchetypes.0.publicExpression.propensity',
    'stakeholderArchetypes.0.memorySeeds.0.salience',
  ]
  for (const [index, path] of numericPaths.entries()) {
    const value = path.split('.').reduce((current, key) => current[key], compiled)
    const assumptionId = `fixed-assumption-${index + 1}`
    compiled.assumptions.push({
      id: assumptionId,
      path,
      value,
      synthetic: true,
      rationale: 'Bounded synthetic stress-test parameter; not an observed effect size.',
    })
    compiled.parameterBindings.push({ path, basis: 'synthetic-assumption', assumptionId })
  }
  return compiled
}

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

test('fixed preparation pins every canonical source value before provider generation', () => {
  const prepared = prepareScenarioCompilation(fixedInputs())

  assert.equal(prepared.verticalSliceId, 'zzz-3-1-fade-risk-v1')
  assert.equal(prepared.theorySystemId, FIXED_THEORY_SYSTEM_ID)
  assert.deepEqual(prepared.sourceDigests, FIXED_SOURCE_DIGESTS)
  assert.deepEqual(prepared.evidenceLanguageBoundary.reviewLanguages, ['zh-CN', 'en', 'ja'])
  const outfit = prepared.evidenceLanguageBoundary.claims.find(
    (claim) => claim.claimId === 'claim-zzz-3-1-lucy-outfit-official',
  )
  assert.deepEqual(outfit, {
    claimId: 'claim-zzz-3-1-lucy-outfit-official',
    directLanguages: ['zh-CN'],
    unavailableDirectLanguages: ['en', 'ja'],
  })
  const english = prepared.evidenceLanguageBoundary.claims.find(
    (claim) => claim.claimId === 'claim-zzz-1-4-fade-adjustment-fix',
  )
  assert.deepEqual(english.directLanguages, ['en'])
  assert.deepEqual(english.unavailableDirectLanguages, ['zh-CN', 'ja'])

  for (const [label, mutate] of [
    ['vertical slice', (input) => { input.verticalSlice.title += ' tampered' }],
    ['Theory System', (input) => { input.theorySystem.id = `theory-system:sha256:${'0'.repeat(64)}` }],
    ['approved extractions', (input) => { input.approvedExtractions[0].id = 'tampered-extraction' }],
    ['evidence review', (input) => { input.evidenceReview.schemaVersion = 'tampered' }],
    ['ledger', (input) => { input.ledger.updatedAt = '2099-01-01T00:00:00Z' }],
    ['theory catalog', (input) => { input.theoryCatalog.schemaVersion = 'tampered' }],
    ['Theory Agent run', (input) => { input.theoryRun.revision += 1 }],
  ]) {
    const input = structuredClone(fixedInputs())
    mutate(input)
    assert.throws(() => prepareScenarioCompilation(input), new RegExp(label, 'i'), label)
  }
})

test('mocked MiniMax output crosses the fixed pipeline once and gains only local authority fields', async () => {
  let generateCount = 0
  let promptPayload
  const provider = {
    async generateObject({ user }) {
      generateCount += 1
      promptPayload = JSON.parse(user)
      const object = fixedCompiledObject()
      object.sourceDigests = { verticalSlice: 'model-invented' }
      object.evidenceLanguageBoundary = { claims: [] }
      object.validation = { status: 'model-claimed-pass' }
      return {
        object,
        provenance: {
          mode: 'live-model',
          provider: 'minimax',
          model: 'MiniMax-M2.7',
          schemaName: 'compiled-scenario/1.0',
          requestId: 'body-request-id',
          traceId: 'actual-trace-id',
        },
      }
    },
  }
  const result = await runScenarioCompilation({ provider, ...fixedInputs() })

  assert.equal(generateCount, 1)
  assert.equal(promptPayload.fixedSemanticContract.numericBindingBasis, 'synthetic-assumption')
  assert.deepEqual(promptPayload.fixedSemanticContract.limitations, fixedVerticalSlice.boundaries)
  assert.deepEqual(result.sourceDigests, FIXED_SOURCE_DIGESTS)
  assert.equal(result.validation.schemaVersion, 'fixed-compilation-validation/1.0')
  assert.equal(result.validation.status, 'passed')
  assert.equal(result.provenance.requestId, 'body-request-id')
  assert.equal(result.provenance.traceId, 'actual-trace-id')
  assert.equal(result.capabilities.realModelUsed, true)
  assert.equal(validateFixedCompilationArtifact(result, fixedInputs()).valid, true)
})

test('fixed artifact validation rejects altered authority, bindings, language, provenance, and regions', async () => {
  const provider = {
    async generateObject() {
      return {
        object: fixedCompiledObject(),
        provenance: {
          mode: 'live-model', provider: 'minimax', model: 'MiniMax-M2.7',
          schemaName: 'compiled-scenario/1.0', requestId: 'body-request-id',
        },
      }
    },
  }
  const accepted = await runScenarioCompilation({ provider, ...fixedInputs() })
  const cases = [
    ['source digest', (value) => { value.sourceDigests.verticalSlice = `sha256:${'0'.repeat(64)}` }],
    ['language boundary', (value) => {
      value.evidenceLanguageBoundary.claims.find(
        (claim) => claim.claimId === 'claim-zzz-3-1-lucy-outfit-official',
      ).directLanguages.push('en')
    }],
    ['validation', (value) => { value.validation.status = 'failed' }],
    ['citation', (value) => { value.citations.push('claim-invented') }],
    ['theory mapping', (value) => { value.theoryMappings[0].mechanism = 'Invented mechanism.' }],
    ['parameter binding', (value) => { value.parameterBindings.pop() }],
    ['numeric evidence binding', (value) => {
      const binding = value.parameterBindings[0]
      value.assumptions = value.assumptions.filter((assumption) => assumption.id !== binding.assumptionId)
      delete binding.assumptionId
      binding.basis = 'evidence-derived'
      binding.claimId = 'claim-zzz-1-4-fade-adjustment-fix'
      value.scenario.eventDay = 2
    }],
    ['regional factor', (value) => {
      value.scenario.regionFactors.europe = 1.1
      value.parameterBindings.push({
        path: 'scenario.regionFactors.europe',
        basis: 'evidence-derived',
        claimId: 'claim-zzz-1-4-fade-adjustment-fix',
      })
    }],
    ['provenance', (value) => { value.provenance.rawResponse = 'not allowed' }],
    ['provenance', (value) => { value.provenance.evidencePackId = 'evidence-pack:tampered' }],
    ['provenance', (value) => { value.provenance.theorySystemId = `theory-system:sha256:${'0'.repeat(64)}` }],
    ['provenance', (value) => { value.provenance.recordingId = 'cross-mode-recording' }],
    ['request', (value) => { value.provenance.requestId = null; value.capabilities.realModelUsed = false }],
    ['languages', (value) => { value.languages.push('fr') }],
    ['title semantic contract', (value) => { value.title = 'Version 3.1 official fade event' }],
    ['scenario label semantic contract', (value) => { value.scenario.label = 'Official released incident' }],
    ['stakeholder goal semantic contract', (value) => { value.stakeholderArchetypes[0].goals.push('claim-prevalence') }],
    ['channel semantic contract', (value) => { value.stakeholderArchetypes[0].publicExpression.channels.push('private-reasoning') }],
    ['limitation semantic contract', (value) => { value.limitations.push('The event has a 70% real-world probability.') }],
    ['assumption rationale semantic contract', (value) => { value.assumptions[0].rationale = '<think>hidden reasoning</think>' }],
  ]
  for (const [label, mutate] of cases) {
    const value = structuredClone(accepted)
    mutate(value)
    const validation = validateFixedCompilationArtifact(value, fixedInputs())
    assert.equal(validation.valid, false, label)
    assert.match(validation.errors.join('; '), new RegExp(label, 'i'), label)
  }
})

test('recorded fixed compilation remains explicitly non-live and cannot satisfy AI-01', async () => {
  const provider = {
    async generateObject() {
      return {
        object: fixedCompiledObject(),
        provenance: {
          mode: 'recorded-model-output',
          provider: 'replay',
          model: 'recorded-minimax-output',
          schemaName: 'compiled-scenario/1.0',
          recordingId: 'offline-recording-1',
          requestId: null,
        },
      }
    },
  }
  const result = await runScenarioCompilation({ provider, ...fixedInputs() })
  assert.equal(result.capabilities.realModelUsed, false)
  assert.equal(result.capabilities.recordedModelOutput, true)
  assert.equal(validateFixedCompilationArtifact(result, fixedInputs()).valid, true)

  for (const [label, mutate] of [
    ['recorded evidence authority', (value) => { value.provenance.evidencePackId = 'tampered' }],
    ['recorded theory authority', (value) => { value.provenance.theorySystemId = `theory-system:sha256:${'0'.repeat(64)}` }],
    ['recorded trace field', (value) => { value.provenance.traceId = 'cross-mode-trace' }],
  ]) {
    const value = structuredClone(result)
    mutate(value)
    const validation = validateFixedCompilationArtifact(value, fixedInputs())
    assert.equal(validation.valid, false, label)
    assert.match(validation.errors.join('; '), /provenance/i, label)
  }
})
