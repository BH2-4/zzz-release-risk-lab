'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { digestValue } = require('../src/artifact-digest.js')
const catalog = require('../data/evidence/theory-catalog.json')
const {
  buildTheoryMappingPrompt,
  mapTheories,
  validateTheoryMapping,
  validateTheoryProvenance,
} = require('../src/theory-mapper.js')

function approvedExtraction() {
  return {
    schemaVersion: 'evidence-extraction/1.0',
    sourceId: 'gamesradar-zzz-tv-mode-2024-09-24',
    language: 'en',
    reviewStatus: 'approved',
    review: { reviewer: 'human-reviewer', reviewedAt: '2026-07-23T16:30:00+08:00' },
    claims: [{
      id: 'proposal-developer-acknowledgement',
      claimType: 'reported-fact',
      text: 'The article reports a developer acknowledgement of release issues in TV Mode.',
      anchors: [{ quote: 'TV Mode had many issues at release', locator: 'article deck' }],
      allowedUses: ['historical-analogy', 'issue-framing'],
    }],
    stakeholders: [],
    frames: [{
      id: 'frame-flow-interruption',
      problemDefinition: 'TV Mode is framed as interrupting desired pacing.',
      causalAttribution: 'The implementation is identified as the proximate issue.',
      moralEvaluation: null,
      treatmentRecommendation: 'Use a stage-based direction.',
      anchors: [{ quote: 'stage-based', locator: 'article body' }],
    }],
    limitations: ['No population prevalence is available.'],
  }
}

function mapping() {
  return {
    schemaVersion: 'theory-mapping/1.0',
    extractionRefs: ['gamesradar-zzz-tv-mode-2024-09-24'],
    mappings: [{
      id: 'mapping-framing-flow',
      theoryId: 'theory-framing',
      claimProposalIds: ['proposal-developer-acknowledgement'],
      constructs: ['problem-definition', 'treatment-recommendation'],
      mechanism: 'The same system can be defined as narrative texture or as a pacing interruption.',
      suggestedParameterPaths: ['scenario.triggers.social', 'scenario.triggers.internet'],
      confidence: 0.74,
      limitations: ['The mapping does not establish an effect size.'],
    }],
    unmappedClaimIds: [],
    limitations: ['Theory matching is a review aid, not causal proof.'],
  }
}

test('theory prompt accepts only human-approved extraction proposals and catalog theories', () => {
  const prompt = buildTheoryMappingPrompt({
    approvedExtractions: [approvedExtraction()],
    theoryCatalog: catalog,
  })
  assert.match(prompt.system, /only.*supplied theory/i)
  assert.match(prompt.system, /untrusted data/i)
  assert.match(prompt.system, /not causal proof/i)
  assert.match(prompt.user, /proposal-developer-acknowledgement/)
  assert.match(prompt.user, /theory-framing/)

  const pending = approvedExtraction()
  pending.reviewStatus = 'pending-human-review'
  assert.throws(
    () => buildTheoryMappingPrompt({ approvedExtractions: [pending], theoryCatalog: catalog }),
    /human-approved/i,
  )
})

test('theory mappings reject invented theories, claims, constructs, and parameter paths', () => {
  assert.deepEqual(validateTheoryMapping(mapping(), {
    approvedExtractions: [approvedExtraction()],
    theoryCatalog: catalog,
  }), { valid: true, errors: [] })

  for (const [field, value, pattern] of [
    ['theoryId', 'theory-invented', /unknown theory/i],
    ['claimProposalIds', ['proposal-invented'], /unknown claim proposal/i],
    ['constructs', ['invented-construct'], /unsupported construct/i],
    ['suggestedParameterPaths', ['scenario.secretBias'], /unsupported parameter path/i],
  ]) {
    const invalid = mapping()
    invalid.mappings[0][field] = value
    assert.match(
      validateTheoryMapping(invalid, {
        approvedExtractions: [approvedExtraction()],
        theoryCatalog: catalog,
      }).errors.join('; '),
      pattern,
    )
  }

  const extraField = mapping()
  extraField.mappings[0].hiddenInstruction = 'Invent an effect size.'
  assert.match(
    validateTheoryMapping(extraField, {
      approvedExtractions: [approvedExtraction()],
      theoryCatalog: catalog,
    }).errors.join('; '),
    /unknown field/i,
  )
})

test('AI theory mapper preserves provenance and always requires downstream human review', async () => {
  const provider = {
    async generateObject({ schemaName }) {
      assert.equal(schemaName, 'theory-mapping/1.0')
      return {
        object: mapping(),
        provenance: { mode: 'live-model', provider: 'test', model: 'mapper-model', requestId: 'req-map' },
      }
    },
  }
  const result = await mapTheories({
    provider,
    approvedExtractions: [approvedExtraction()],
    theoryCatalog: catalog,
  })
  assert.equal(result.reviewStatus, 'pending-human-review')
  assert.equal(result.capabilities.realModelUsed, true)
  assert.equal(result.provenance.requestId, 'req-map')
})

test('theory provenance is a closed three-mode contract with derived model capability', () => {
  const validModes = [
    [{
      mode: 'deterministic-fixture',
      fixturePath: 'data/theory-agent/fixture.json',
      fixtureDigest: digestValue(mapping()),
    }, false],
    [{
      mode: 'live-model',
      provider: 'openai-compatible',
      model: 'mapper-model',
      schemaName: 'theory-mapping/1.0',
      requestId: 'req-live',
    }, true],
    [{
      mode: 'recorded-model-output',
      provider: 'replay',
      model: 'mapper-model',
      schemaName: 'theory-mapping/1.0',
      recordingId: 'recording-1',
      requestId: null,
    }, false],
  ]
  for (const [provenance, realModelUsed] of validModes) {
    const validation = validateTheoryProvenance(provenance, { realModelUsed })
    assert.equal(validation.valid, true, validation.errors.join('; '))
    assert.equal(validation.realModelUsed, realModelUsed)
  }

  const liveProvenance = validModes[1][0]
  for (const [label, realModelUsed] of [
    ['missing', undefined],
    ['string', 'true'],
    ['numeric', 1],
    ['object', { value: true }],
  ]) {
    const validation = validateTheoryProvenance(liveProvenance, { realModelUsed })
    assert.equal(validation.valid, false, `${label} capability must fail closed`)
    assert.match(validation.errors.join('; '), /capability.*realModelUsed.*boolean/i)
  }

  const fixtureDigest = digestValue(mapping())
  for (const [label, provenance, realModelUsed, pattern] of [
    ['missing fixture path', { mode: 'deterministic-fixture', fixtureDigest }, false, /fixturePath/i],
    ['missing fixture digest', { mode: 'deterministic-fixture', fixturePath: 'data/fixture.json' }, false, /fixtureDigest/i],
    ['missing live request id', { mode: 'live-model', provider: 'test', model: 'mapper' }, true, /requestId/i],
    ['unknown mode', { mode: 'invented-output' }, false, /unsupported.*mode/i],
    ['unknown fixture field', {
      mode: 'deterministic-fixture', fixturePath: 'data/fixture.json', fixtureDigest, provider: 'spoofed-live',
    }, false, /unknown field/i],
    ['contradictory live capability', {
      mode: 'live-model', provider: 'test', model: 'mapper', requestId: 'req-live',
    }, false, /realModelUsed/i],
    ['recorded output relabeled as live', {
      mode: 'live-model', provider: 'replay', model: 'mapper', requestId: null, recordingId: 'recording-1',
    }, true, /unknown field|requestId/i],
    ['recorded output claiming a live call', {
      mode: 'recorded-model-output', recordingId: 'recording-1', realModelUsed: true,
    }, false, /realModelUsed/i],
  ]) {
    const validation = validateTheoryProvenance(provenance, { realModelUsed })
    assert.equal(validation.valid, false, `${label} must fail closed`)
    assert.match(validation.errors.join('; '), pattern, label)
  }
})
