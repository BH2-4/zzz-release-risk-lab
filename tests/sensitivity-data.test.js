const test = require('node:test')
const assert = require('node:assert/strict')

const { runPairedEnsemble } = require('../src/model.js')
const {
  SENSITIVITY_BUNDLE_SCHEMA_VERSION,
  createSensitivityBundle,
  decodeSensitivityDay,
  decodeSensitivitySegmentDay,
  decodeSensitivitySegments,
} = require('../src/sensitivity-data.js')
const {
  baselineResponse,
  candidateResponse,
  scenario,
} = require('../experiments/fixtures/reward-gap.js')

const evidence = {
  caseId: 'C1',
  grade: 'B',
  title: '角色技能问题修复后回退、补偿 1600 原石',
  site: 'IT之家',
  url: 'https://www.ithome.com/0/782/509.htm',
  publishedAt: '2024-07-18',
  historicalEnvironment: 'Genshin Impact 4.8',
  applicationEnvironment: 'Zenless Zone Zero scenario fixture',
  parameterStatus: 'researcher-assumption',
}

function createFixture() {
  const ensemble = runPairedEnsemble({
    scenario,
    baselineResponse,
    candidateResponse,
    runs: 12,
    populationSize: 125,
    seed: 41,
  })
  return createSensitivityBundle({ ensemble, evidence })
}

function createEvolutionFixture() {
  const ensemble = runPairedEnsemble({
    scenario,
    baselineResponse,
    candidateResponse,
    runs: 12,
    populationSize: 125,
    seed: 41,
    includeSegmentTimeline: true,
  })
  return createSensitivityBundle({ ensemble, evidence })
}

test('sensitivity bundle exposes compact daily bands and explicit future channel boundaries', () => {
  const bundle = createFixture()

  assert.equal(bundle.schemaVersion, 'sensitivity-bundle/1.0')
  assert.equal(bundle.timeline.dayCount, 42)
  assert.equal(bundle.timeline.candidate.risk.p50.length, 42)
  assert.equal(bundle.segments.axes.level.order.length, 5)
  assert.equal(bundle.capabilities.dailyAggregateBands, true)
  assert.equal(bundle.capabilities.finalSegmentBands, true)
  assert.equal(bundle.capabilities.pairedStrategyDelta, true)
  assert.equal(bundle.capabilities.perAgentBands, false)
  assert.equal(bundle.capabilities.relationEdges, false)
  assert.equal(bundle.capabilities.reverseVoice, false)
  assert.equal(bundle.evidence.parameterStatus, 'researcher-assumption')
  assert.match(bundle.disclaimer, /不是现实概率|不是统计置信区间/)
})

test('sensitivity decoder supports daily and segment random access for future front ends', () => {
  const bundle = createFixture()
  const day42 = decodeSensitivityDay(bundle, { view: 'delta', day: 42 })
  const domains = decodeSensitivitySegments(bundle, { view: 'candidate', axis: 'domain' })

  assert.equal(day42.day, 42)
  assert.equal(day42.view, 'delta')
  assert.ok(day42.risk.p10 <= day42.risk.p50)
  assert.ok(day42.risk.p50 <= day42.risk.p90)
  assert.ok(day42.risk.p50 < 0)
  assert.equal(domains.length, 5)
  assert.deepEqual(Object.keys(domains[0]), ['key', 'p10', 'p50', 'p90'])
})

test('sensitivity bundle 1.1 packs and decodes daily macro and micro segment bands', () => {
  const bundle = createEvolutionFixture()
  const day25 = decodeSensitivitySegmentDay(bundle, {
    view: 'candidate',
    axis: 'level',
    day: 25,
  })
  const day42 = decodeSensitivitySegmentDay(bundle, {
    view: 'candidate',
    axis: 'domain',
    day: 42,
  })
  const finalDomains = decodeSensitivitySegments(bundle, { view: 'candidate', axis: 'domain' })

  assert.equal(bundle.schemaVersion, 'sensitivity-bundle/1.1')
  assert.equal(bundle.capabilities.dailySegmentBands, true)
  assert.equal(bundle.segments.axes.level.timeline.candidate.p50.length, 42 * 5)
  assert.equal(day25.length, 5)
  assert.deepEqual(Object.keys(day25[0]), ['key', 'p10', 'p50', 'p90'])
  assert.deepEqual(day42, finalDomains)
})

test('daily segment decoder preserves Beta 0.3 compatibility and validates selectors', () => {
  const legacy = createFixture()
  const current = createEvolutionFixture()

  assert.equal(legacy.schemaVersion, 'sensitivity-bundle/1.0')
  assert.throws(
    () => decodeSensitivitySegmentDay(legacy, { view: 'candidate', axis: 'level', day: 1 }),
    /unavailable/i,
  )
  assert.throws(
    () => decodeSensitivitySegmentDay(current, { view: 'candidate', axis: 'level', day: 0 }),
    /day/i,
  )
  assert.throws(
    () => decodeSensitivitySegmentDay(current, { view: 'candidate', axis: 'language', day: 1 }),
    /axis/i,
  )

  const invalidWidth = structuredClone(current)
  invalidWidth.segments.axes.level.timeline.candidate.p10.pop()
  assert.throws(
    () => decodeSensitivitySegmentDay(invalidWidth, { view: 'candidate', axis: 'level', day: 1 }),
    /width/i,
  )
})

test('sensitivity adapter rejects incomplete evidence and decoder rejects invalid selectors', () => {
  const ensemble = runPairedEnsemble({
    scenario,
    baselineResponse,
    candidateResponse,
    runs: 6,
    populationSize: 125,
    seed: 41,
  })
  assert.throws(() => createSensitivityBundle({ ensemble, evidence: { grade: 'B' } }), /evidence/i)

  const bundle = createSensitivityBundle({ ensemble, evidence })
  assert.throws(() => decodeSensitivityDay(bundle, { view: 'other', day: 1 }), /view/i)
  assert.throws(() => decodeSensitivityDay(bundle, { view: 'candidate', day: 43 }), /day/i)
  assert.throws(
    () => decodeSensitivitySegments(bundle, { view: 'candidate', axis: 'language' }),
    /axis/i,
  )
})

test('sensitivity adapter rejects daily segment order that diverges from final segments', () => {
  const ensemble = runPairedEnsemble({
    scenario,
    baselineResponse,
    candidateResponse,
    runs: 6,
    populationSize: 125,
    seed: 41,
    includeSegmentTimeline: true,
  })
  ensemble.segmentTimeline.axes.level.order.reverse()

  assert.throws(() => createSensitivityBundle({ ensemble, evidence }), /order/i)
})
