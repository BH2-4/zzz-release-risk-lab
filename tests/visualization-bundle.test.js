const test = require('node:test')
const assert = require('node:assert/strict')

const { createPopulation, runSimulationTrace } = require('../src/model.js')
const { createVisualComparison } = require('../src/visualization-data.js')
const {
  VISUAL_BUNDLE_SCHEMA_VERSION,
  createVisualBundle,
  decodeVisualFrame,
} = require('../src/visualization-bundle.js')

const scenario = {
  id: 'visual-bundle-fixture',
  label: '视觉数据包夹具',
  eventDay: 12,
  controllability: 0.8,
  priorCrisis: 0.45,
  triggers: {
    economic: 0.7,
    political: 0.2,
    cultural: 0.6,
    social: 0.75,
    internet: 0.9,
  },
}

const baselineResponse = { id: 'silence', delayDays: 8 }
const candidateResponse = {
  id: 'fast-correction',
  delayDays: 2,
  transparency: 0.8,
  participation: 0.5,
  restitution: 0.7,
  localization: 0.6,
  correctiveAction: 0.9,
}

function createFixture() {
  const population = createPopulation({ size: 125, seed: 101 })
  const baselineSimulation = runSimulationTrace({
    scenario,
    response: baselineResponse,
    population,
    seed: 303,
    includeDrivers: true,
  })
  const candidateSimulation = runSimulationTrace({
    scenario,
    response: candidateResponse,
    population,
    seed: 303,
    includeDrivers: true,
  })
  const comparison = createVisualComparison({ baselineSimulation, candidateSimulation, population })
  const events = [
    { day: 12, type: 'scenario-event', label: scenario.label, strategy: null },
    { day: 14, type: 'response-start', label: '候选策略开始', strategy: 'candidate' },
  ]
  return { comparison, bundle: createVisualBundle({ comparison, events }) }
}

test('visual bundle uses fixed-width compact frames and preserves unavailable channels', () => {
  const { comparison, bundle } = createFixture()

  assert.equal(bundle.schemaVersion, VISUAL_BUNDLE_SCHEMA_VERSION)
  assert.equal(bundle.encoding.layout, 'frame-agent-field')
  assert.equal(bundle.encoding.agentOrder.length, 125)
  assert.equal(bundle.timeline.dayCount, 42)
  assert.equal(bundle.timeline.baseline.frames.length, 42)
  assert.equal(bundle.timeline.candidate.frames.length, 42)
  assert.equal(bundle.timeline.delta.frames.length, 42)
  assert.equal(
    bundle.timeline.candidate.frames[0].front.length,
    125 * bundle.encoding.front.fields.length,
  )
  assert.equal(
    bundle.timeline.candidate.frames[0].drivers.length,
    125 * bundle.encoding.drivers.fields.length,
  )
  assert.equal(bundle.channels.reverseVoice.status, 'unavailable')
  assert.equal(bundle.channels.relationEdges.status, 'unavailable')
  assert.equal(bundle.events[0].type, 'scenario-event')
  assert.ok(JSON.stringify(bundle).length < JSON.stringify(comparison).length * 0.55)
})

test('decoder reconstructs candidate and delta frames by day without simulation logic', () => {
  const { comparison, bundle } = createFixture()
  const candidate = decodeVisualFrame(bundle, { view: 'candidate', day: 42 })
  const delta = decodeVisualFrame(bundle, { view: 'delta', day: 42 })
  const sourceCandidate = comparison.strategies.candidate.frames[41]
  const sourceDelta = comparison.deltaFrames[41]

  assert.equal(candidate.day, 42)
  assert.equal(candidate.agents.length, 125)
  assert.equal(candidate.agents[0].id, sourceCandidate.agents[0].id)
  assert.equal(candidate.agents[0].front.risk, sourceCandidate.agents[0].front.risk)
  assert.equal(candidate.agents[0].front.drivers.domain, sourceCandidate.agents[0].front.drivers.domain)
  assert.deepEqual(candidate.agents[0].reverse, {
    voice: null,
    heat: null,
    status: 'unavailable',
  })
  assert.equal(delta.aggregateRiskDelta, sourceDelta.aggregateRiskDelta)
  assert.equal(delta.agents[0].front.riskDelta, sourceDelta.agents[0].front.riskDelta)
  assert.equal(
    delta.agents[0].front.driverDeltas.response,
    sourceDelta.agents[0].front.driverDeltas.response,
  )
})

test('visual bundle validates events, views, days, schemas, and frame width', () => {
  const { comparison, bundle } = createFixture()

  assert.throws(
    () => createVisualBundle({ comparison, events: [{ day: 43, type: 'bad', label: 'bad' }] }),
    /event day/i,
  )
  assert.throws(() => decodeVisualFrame(bundle, { view: 'other', day: 1 }), /view/i)
  assert.throws(() => decodeVisualFrame(bundle, { view: 'candidate', day: 0 }), /day/i)
  assert.throws(
    () => decodeVisualFrame({ ...bundle, schemaVersion: 'visual-bundle/9.0' }, { view: 'candidate', day: 1 }),
    /schema/i,
  )
  const corrupted = JSON.parse(JSON.stringify(bundle))
  corrupted.timeline.candidate.frames[0].front.pop()
  assert.throws(() => decodeVisualFrame(corrupted, { view: 'candidate', day: 1 }), /width/i)
})
