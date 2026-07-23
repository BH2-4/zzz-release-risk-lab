const test = require('node:test')
const assert = require('node:assert/strict')

const { createPopulation, runSimulationTrace } = require('../src/model.js')
const {
  VISUAL_REPLAY_SCHEMA_VERSION,
  VISUAL_COMPARISON_SCHEMA_VERSION,
  createVisualComparison,
  createVisualReplay,
} = require('../src/visualization-data.js')

const scenario = {
  id: 'visual-contract-fixture',
  label: '视觉数据契约夹具',
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

const response = {
  id: 'fast-correction',
  delayDays: 2,
  transparency: 0.8,
  participation: 0.5,
  restitution: 0.7,
  localization: 0.6,
  correctiveAction: 0.9,
}

function createReplay() {
  const population = createPopulation({ size: 125, seed: 101 })
  const simulation = runSimulationTrace({ scenario, response, population, seed: 303 })
  return {
    population,
    replay: createVisualReplay({ simulation, population }),
  }
}

test('visual replay maps the 5 x 5 x 5 population into stable board slots', () => {
  const { replay } = createReplay()

  assert.equal(replay.schemaVersion, VISUAL_REPLAY_SCHEMA_VERSION)
  assert.equal(replay.identities.length, 125)
  assert.deepEqual(replay.board.axes, {
    rows: 'level',
    columns: 'domain',
    slots: 'region',
  })

  const cells = new Map()
  for (const identity of replay.identities) {
    const key = `${identity.board.row}:${identity.board.column}`
    cells.set(key, (cells.get(key) || 0) + 1)
    assert.ok(identity.board.slot >= 0 && identity.board.slot < 5)
    assert.match(identity.archetype, /^level-/)
  }
  assert.equal(cells.size, 25)
  assert.ok([...cells.values()].every((count) => count === 5))
})

test('visual replay exposes 42 renderer-neutral frames without inventing Reverse voice', () => {
  const { replay } = createReplay()

  assert.equal(replay.frames.length, 42)
  assert.equal(replay.channels.reverseVoice.status, 'unavailable')
  assert.equal(replay.channels.reverseHeat.status, 'unavailable')
  assert.match(replay.disclaimer, /未建模/)

  for (const frame of replay.frames) {
    assert.equal(frame.agents.length, 125)
    for (const agent of frame.agents) {
      assert.equal(agent.reverse.voice, null)
      assert.equal(agent.reverse.heat, null)
      assert.equal(agent.reverse.status, 'unavailable')
      assert.ok(agent.front.integrity >= 0.2 && agent.front.integrity <= 1)
      assert.ok(agent.front.dissolve >= 0 && agent.front.dissolve <= 0.8)
    }
  }
})

test('higher residual risk maps to lower integrity without changing model values', () => {
  const { replay } = createReplay()
  const agents = replay.frames.at(-1).agents
  const lowest = [...agents].sort((a, b) => a.front.risk - b.front.risk)[0]
  const highest = [...agents].sort((a, b) => b.front.risk - a.front.risk)[0]

  assert.ok(highest.front.risk >= lowest.front.risk)
  assert.ok(highest.front.integrity <= lowest.front.integrity)
})

test('visual replay rejects aggregate-only or mismatched simulation inputs', () => {
  const population = createPopulation({ size: 125, seed: 101 })
  const simulation = runSimulationTrace({ scenario, response, population, seed: 303 })

  assert.throws(
    () => createVisualReplay({ simulation: { ...simulation, agentTimeline: undefined }, population }),
    /agent trace/i,
  )
  assert.throws(
    () => createVisualReplay({ simulation, population: population.slice(1) }),
    /population/i,
  )

  const tamperedPopulation = population.map((agent, index) => (
    index === 0 ? { ...agent, influence: agent.influence + 0.01 } : agent
  ))
  assert.throws(
    () => createVisualReplay({ simulation, population: tamperedPopulation }),
    /fingerprint/i,
  )

  const corruptedSimulation = JSON.parse(JSON.stringify(simulation))
  corruptedSimulation.agentTimeline[0].agents[0] = corruptedSimulation.agentTimeline[0].agents[1]
  assert.throws(
    () => createVisualReplay({ simulation: corruptedSimulation, population }),
    /frame IDs/i,
  )

  const invalidDaySimulation = JSON.parse(JSON.stringify(simulation))
  invalidDaySimulation.agentTimeline[1].day = 1
  assert.throws(
    () => createVisualReplay({ simulation: invalidDaySimulation, population }),
    /sequential days/i,
  )

  const invalidRiskSimulation = JSON.parse(JSON.stringify(simulation))
  invalidRiskSimulation.agentTimeline[0].agents[0].risk = Number.NaN
  assert.throws(
    () => createVisualReplay({ simulation: invalidRiskSimulation, population }),
    /finite number/i,
  )

  const duplicateSlotPopulation = population.map((agent, index) => (
    index === 0 ? { ...agent, level: population[1].level } : agent
  ))
  const duplicateSlotSimulation = runSimulationTrace({
    scenario,
    response,
    population: duplicateSlotPopulation,
    seed: 303,
  })
  assert.throws(
    () => createVisualReplay({ simulation: duplicateSlotSimulation, population: duplicateSlotPopulation }),
    /unique Agent/i,
  )
})

test('visual comparison aligns baseline, candidate, and per-agent delta frames', () => {
  const population = createPopulation({ size: 125, seed: 101 })
  const baselineSimulation = runSimulationTrace({
    scenario,
    response: {
      id: 'silence',
      delayDays: 8,
      transparency: 0,
      participation: 0,
      restitution: 0,
      localization: 0,
      correctiveAction: 0,
    },
    population,
    seed: 303,
  })
  const candidateSimulation = runSimulationTrace({ scenario, response, population, seed: 303 })
  const comparison = createVisualComparison({ baselineSimulation, candidateSimulation, population })

  assert.equal(comparison.schemaVersion, VISUAL_COMPARISON_SCHEMA_VERSION)
  assert.equal(comparison.identities.length, 125)
  assert.equal(comparison.strategies.baseline.frames.length, 42)
  assert.equal(comparison.strategies.candidate.frames.length, 42)
  assert.equal(comparison.deltaFrames.length, 42)

  const day42 = comparison.deltaFrames.at(-1)
  const baselineDay42 = comparison.strategies.baseline.frames.at(-1)
  const candidateDay42 = comparison.strategies.candidate.frames.at(-1)
  assert.equal(
    day42.aggregateRiskDelta,
    Math.round((candidateDay42.aggregateRisk - baselineDay42.aggregateRisk) * 10000) / 10000,
  )
  assert.equal(day42.agents.length, 125)
  assert.equal(day42.agents[0].reverse.status, 'unavailable')
  assert.ok(day42.aggregateRiskDelta < 0)
})

test('visual comparison requires matching scenario, seed, and cycle', () => {
  const population = createPopulation({ size: 125, seed: 101 })
  const baselineSimulation = runSimulationTrace({ scenario, response, population, seed: 303 })
  const candidateSimulation = runSimulationTrace({ scenario, response, population, seed: 304 })

  assert.throws(
    () => createVisualComparison({ baselineSimulation, candidateSimulation, population }),
    /seed/i,
  )
})

test('explainable visual comparison exposes driver values and deltas but no invented relation edges', () => {
  const population = createPopulation({ size: 125, seed: 101 })
  const baselineSimulation = runSimulationTrace({
    scenario,
    response: { id: 'silence', delayDays: 8 },
    population,
    seed: 303,
    includeDrivers: true,
  })
  const candidateSimulation = runSimulationTrace({
    scenario,
    response,
    population,
    seed: 303,
    includeDrivers: true,
  })
  const comparison = createVisualComparison({ baselineSimulation, candidateSimulation, population })

  assert.equal(comparison.channels.frontDrivers.status, 'available')
  assert.equal(comparison.channels.relationEdges.status, 'unavailable')
  assert.deepEqual(
    Object.keys(comparison.strategies.candidate.frames[0].agents[0].front.drivers),
    candidateSimulation.driverFields,
  )
  const day42Delta = comparison.deltaFrames.at(-1).agents[0].front.driverDeltas
  assert.deepEqual(Object.keys(day42Delta), candidateSimulation.driverFields)
  assert.equal(
    day42Delta.response,
    Math.round((
      comparison.strategies.candidate.frames.at(-1).agents[0].front.drivers.response -
      comparison.strategies.baseline.frames.at(-1).agents[0].front.drivers.response
    ) * 1000000) / 1000000,
  )
})

test('visual comparison rejects mixed trace capabilities', () => {
  const population = createPopulation({ size: 125, seed: 101 })
  const baselineSimulation = runSimulationTrace({ scenario, response, population, seed: 303 })
  const candidateSimulation = runSimulationTrace({
    scenario,
    response,
    population,
    seed: 303,
    includeDrivers: true,
  })

  assert.throws(
    () => createVisualComparison({ baselineSimulation, candidateSimulation, population }),
    /trace version/i,
  )
})
