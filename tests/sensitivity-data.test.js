const test = require('node:test')
const assert = require('node:assert/strict')

const { runPairedEnsemble } = require('../src/model.js')
const {
  SENSITIVITY_BUNDLE_SCHEMA_VERSION,
  createSensitivityBundle,
  decodeSensitivityDay,
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

test('sensitivity bundle exposes compact daily bands and explicit future channel boundaries', () => {
  const bundle = createFixture()

  assert.equal(bundle.schemaVersion, SENSITIVITY_BUNDLE_SCHEMA_VERSION)
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
