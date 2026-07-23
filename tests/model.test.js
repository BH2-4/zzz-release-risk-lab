const test = require('node:test')
const assert = require('node:assert/strict')

const {
  TRACE_DRIVER_FIELDS,
  assessEvidenceReadiness,
  compareResponses,
  createPopulation,
  populationFingerprint,
  runEnsemble,
  runPairedEnsemble,
  runSimulation,
  runSimulationSegmentTrace,
  runSimulationTrace,
  validateScenario,
} = require('../src/model.js')

const rewardScenario = {
  id: 'anniversary-reward-gap',
  label: '周年奖励期待落差',
  eventDay: 25,
  controllability: 0.9,
  priorCrisis: 0.55,
  triggers: {
    economic: 0.82,
    political: 0.08,
    cultural: 0.28,
    social: 0.74,
    internet: 0.92,
  },
}

const silence = {
  id: 'silence',
  delayDays: 8,
  transparency: 0,
  participation: 0,
  restitution: 0,
  localization: 0,
  correctiveAction: 0,
}

const correctiveResponse = {
  id: 'rollback-and-explain',
  delayDays: 1,
  transparency: 0.9,
  participation: 0.55,
  restitution: 0.85,
  localization: 0.7,
  correctiveAction: 0.95,
}

test('createPopulation builds 125 synthetic stakeholders across five levels and domains', () => {
  const population = createPopulation({ size: 125, seed: 20260723 })

  assert.equal(population.length, 125)
  assert.equal(new Set(population.map((agent) => agent.level)).size, 5)
  assert.equal(new Set(population.map((agent) => agent.domain)).size, 5)
  assert.equal(new Set(population.map((agent) => agent.region)).size, 5)
  assert.ok(population.every((agent) => agent.synthetic === true))
})

test('createPopulation is reproducible for the same seed and changes with another seed', () => {
  const first = createPopulation({ size: 125, seed: 11 })
  const replay = createPopulation({ size: 125, seed: 11 })
  const variant = createPopulation({ size: 125, seed: 12 })

  assert.deepEqual(first, replay)
  assert.notDeepEqual(first, variant)
})

test('population fingerprint changes when a visual identity trait changes', () => {
  const population = createPopulation({ size: 125, seed: 11 })
  const tampered = population.map((agent, index) => (
    index === 0 ? { ...agent, networkActivity: agent.networkActivity + 0.01 } : agent
  ))

  assert.match(populationFingerprint(population), /^fnv1a32:[0-9a-f]{8}$/)
  assert.notEqual(populationFingerprint(population), populationFingerprint(tampered))
})

test('createPopulation rejects undersized and non-integer populations', () => {
  assert.throws(() => createPopulation({ size: 24 }), /at least 25/)
  assert.throws(() => createPopulation({ size: 25.5 }), /integer/)
})

test('validateScenario rejects incomplete or out-of-range scenarios', () => {
  assert.equal(validateScenario({ id: 'broken' }).valid, false)
  assert.equal(validateScenario(rewardScenario).valid, true)
  assert.equal(
    validateScenario({ ...rewardScenario, controllability: 2 }).valid,
    false,
  )
  assert.equal(validateScenario(null).valid, false)
  assert.equal(validateScenario({ ...rewardScenario, eventDay: 43 }).valid, false)
  assert.equal(
    validateScenario({
      ...rewardScenario,
      regionFactors: {
        'east-asia': 2,
        'north-america': 1,
        europe: 1,
        'southeast-asia': 1,
        'latin-america': 1,
      },
    }).valid,
    false,
  )
})

test('runSimulation requires a valid scenario and a non-empty population', () => {
  assert.throws(
    () => runSimulation({ scenario: { id: 'broken' }, population: [] }),
    /required|42-day/,
  )
  assert.throws(
    () => runSimulation({ scenario: rewardScenario, population: [] }),
    /population/,
  )
})

test('runSimulation produces a 42-day trace and multi-level breakdown', () => {
  const population = createPopulation({ size: 125, seed: 7 })
  const result = runSimulation({
    scenario: rewardScenario,
    response: silence,
    population,
    seed: 19,
  })

  assert.equal(result.timeline.length, 42)
  assert.equal(result.populationSize, 125)
  assert.equal(Object.keys(result.byLevel).length, 5)
  assert.equal(Object.keys(result.byDomain).length, 5)
  assert.equal(Object.keys(result.byRegion).length, 5)
  assert.ok(result.peakRisk >= result.finalRisk)
  assert.ok(result.topDrivers.length >= 3)
  assert.equal(result.claimType, 'scenario-index')
  assert.equal(Object.hasOwn(result, 'agentTimeline'), false)
})

test('runSimulationTrace preserves all 42 daily states for every agent', () => {
  const population = createPopulation({ size: 125, seed: 7 })
  const result = runSimulationTrace({
    scenario: rewardScenario,
    response: correctiveResponse,
    population,
    seed: 19,
  })

  assert.equal(result.traceVersion, 'agent-trace/1.0')
  assert.equal(result.simulationSeed, 19)
  assert.match(result.populationFingerprint, /^fnv1a32:[0-9a-f]{8}$/)
  assert.equal(result.agentTimeline.length, 42)
  assert.ok(result.agentTimeline.every((frame) => frame.agents.length === 125))
  assert.deepEqual(
    result.agentTimeline[0].agents.map((agent) => agent.id),
    population.map((agent) => agent.id),
  )

  for (const frame of result.agentTimeline) {
    for (const agent of frame.agents) {
      for (const key of ['risk', 'pressure', 'networkPressure', 'responseBuffer']) {
        assert.ok(agent[key] >= 0 && agent[key] <= 1, `${key} must be normalized`)
      }
    }
  }
})

test('runSimulationSegmentTrace preserves daily macro and micro slices without Agent payloads', () => {
  const population = createPopulation({ size: 125, seed: 11 })
  const result = runSimulationSegmentTrace({
    scenario: rewardScenario,
    response: correctiveResponse,
    population,
    seed: 19,
  })

  assert.equal(result.segmentTimeline.length, 42)
  assert.equal(Object.keys(result.segmentTimeline[0].byLevel).length, 5)
  assert.equal(Object.keys(result.segmentTimeline[0].byDomain).length, 5)
  assert.equal(Object.keys(result.segmentTimeline[0].byRegion).length, 5)
  assert.deepEqual(result.segmentTimeline.at(-1).byLevel, result.byLevel)
  assert.deepEqual(result.segmentTimeline.at(-1).byDomain, result.byDomain)
  assert.deepEqual(result.segmentTimeline.at(-1).byRegion, result.byRegion)
  assert.equal(Object.hasOwn(result, 'agentTimeline'), false)
})

test('runSimulationTrace is deterministic and agrees with aggregate risk', () => {
  const population = createPopulation({ size: 125, seed: 17 })
  const options = {
    scenario: rewardScenario,
    response: correctiveResponse,
    population,
    seed: 23,
  }
  const first = runSimulationTrace(options)
  const replay = runSimulationTrace(options)

  assert.deepEqual(first, replay)
  first.agentTimeline.forEach((frame, index) => {
    const meanRisk = frame.agents.reduce((sum, agent) => sum + agent.risk, 0) / frame.agents.length
    assert.ok(Math.abs(first.timeline[index].risk - meanRisk * 100) <= 0.02)
  })
})

test('explainable trace adds signed driver contributions without changing simulation results', () => {
  const population = createPopulation({ size: 125, seed: 17 })
  const options = {
    scenario: rewardScenario,
    response: correctiveResponse,
    population,
    seed: 23,
  }
  const legacy = runSimulationTrace(options)
  const explainable = runSimulationTrace({ ...options, includeDrivers: true })

  assert.equal(legacy.traceVersion, 'agent-trace/1.0')
  assert.equal(explainable.traceVersion, 'agent-trace/1.1')
  assert.deepEqual(explainable.driverFields, TRACE_DRIVER_FIELDS)
  assert.deepEqual(explainable.timeline, legacy.timeline)
  assert.equal(explainable.peakRisk, legacy.peakRisk)
  assert.equal(explainable.finalRisk, legacy.finalRisk)

  explainable.agentTimeline.forEach((frame, frameIndex) => {
    frame.agents.forEach((agent, agentIndex) => {
      const legacyAgent = legacy.agentTimeline[frameIndex].agents[agentIndex]
      assert.deepEqual(
        {
          id: agent.id,
          risk: agent.risk,
          pressure: agent.pressure,
          networkPressure: agent.networkPressure,
          responseBuffer: agent.responseBuffer,
        },
        legacyAgent,
      )
      assert.deepEqual(Object.keys(agent.drivers), TRACE_DRIVER_FIELDS)
      const driverTotal = Object.values(agent.drivers).reduce((sum, value) => sum + value, 0)
      assert.ok(Math.abs(driverTotal - agent.risk) <= 0.000001)
    })
  })

  const preReleaseAgent = explainable.agentTimeline[0].agents[0]
  assert.equal(preReleaseAgent.drivers.background, preReleaseAgent.risk)
  assert.equal(preReleaseAgent.drivers.network, 0)
  const responseAgent = explainable.agentTimeline[25].agents[0]
  assert.ok(responseAgent.drivers.domain > 0)
  assert.ok(responseAgent.drivers.trust < 0)
  assert.ok(responseAgent.drivers.response <= 0)
})

test('a fast corrective response lowers peak and final risk relative to silence', () => {
  const population = createPopulation({ size: 125, seed: 31 })
  const comparison = compareResponses({
    scenario: rewardScenario,
    baselineResponse: silence,
    candidateResponse: correctiveResponse,
    population,
    seed: 91,
  })

  assert.ok(comparison.candidate.peakRisk < comparison.baseline.peakRisk)
  assert.ok(comparison.candidate.finalRisk < comparison.baseline.finalRisk)
  assert.ok(comparison.peakRiskDelta < 0)
  assert.ok(comparison.candidate.finalRisk > 0)
})

test('regional differences come from explicit scenario factors, not fixed stereotypes', () => {
  const population = createPopulation({ size: 125, seed: 31 })
  const result = runSimulation({
    scenario: {
      ...rewardScenario,
      regionFactors: {
        'east-asia': 1,
        'north-america': 1,
        europe: 1,
        'southeast-asia': 1,
        'latin-america': 1.35,
      },
    },
    response: silence,
    population,
    seed: 91,
  })

  assert.ok(result.byRegion['latin-america'] > result.byRegion.europe)
})

test('runEnsemble reports an uncertainty interval instead of a single probability', () => {
  const result = runEnsemble({
    scenario: rewardScenario,
    response: correctiveResponse,
    runs: 12,
    populationSize: 125,
    seed: 41,
  })

  assert.equal(result.runs, 12)
  assert.ok(result.peakRisk.p10 <= result.peakRisk.p50)
  assert.ok(result.peakRisk.p50 <= result.peakRisk.p90)
  assert.ok(result.peakRisk.p90 - result.peakRisk.p10 >= 2)
  assert.match(result.disclaimer, /不是现实概率/)
})

test('runPairedEnsemble exposes aligned daily and final-segment sensitivity bands', () => {
  const options = {
    scenario: rewardScenario,
    baselineResponse: silence,
    candidateResponse: correctiveResponse,
    runs: 12,
    populationSize: 125,
    seed: 41,
  }
  const result = runPairedEnsemble(options)
  const replay = runPairedEnsemble(options)

  assert.deepEqual(result, replay)
  assert.equal(result.schemaVersion, 'paired-ensemble/1.0')
  assert.equal(result.runs, 12)
  assert.equal(result.timeline.length, 42)
  assert.equal(result.timeline[0].day, 1)
  assert.equal(result.timeline.at(-1).day, 42)
  assert.deepEqual(result.timeline[0].delta.risk, { p10: 0, p50: 0, p90: 0 })
  assert.ok(result.timeline.at(-1).delta.risk.p50 < 0)
  assert.ok(result.outcomes.delta.finalRisk.p50 < 0)
  assert.deepEqual(result.segments.level.order, ['individual', 'group', 'region', 'country', 'international'])
  assert.equal(Object.keys(result.segments.domain.candidate).length, 5)
  assert.equal(Object.keys(result.segments.region.delta).length, 5)
  assert.equal(result.design.pairing, 'shared-scenario-population-and-simulation-seed')
  assert.equal(Object.hasOwn(result, 'rawRuns'), false)

  for (const frame of result.timeline) {
    for (const view of ['baseline', 'candidate', 'delta']) {
      const interval = frame[view].risk
      assert.ok(interval.p10 <= interval.p50)
      assert.ok(interval.p50 <= interval.p90)
    }
  }
})

test('runPairedEnsemble optionally exposes paired daily segment bands for evolution front ends', () => {
  const result = runPairedEnsemble({
    scenario: rewardScenario,
    baselineResponse: silence,
    candidateResponse: correctiveResponse,
    runs: 12,
    populationSize: 125,
    seed: 41,
    includeSegmentTimeline: true,
  })

  assert.equal(result.schemaVersion, 'paired-ensemble/1.1')
  assert.equal(result.segmentTimeline.dayCount, 42)
  assert.deepEqual(result.segmentTimeline.axes.level.order, [
    'individual',
    'group',
    'region',
    'country',
    'international',
  ])
  assert.equal(result.segmentTimeline.axes.domain.candidate.length, 42)
  assert.equal(result.segmentTimeline.axes.region.delta.length, 42)
  assert.equal(result.segmentTimeline.axes.level.baseline[0].day, 1)
  assert.equal(result.segmentTimeline.axes.level.baseline.at(-1).day, 42)
  assert.deepEqual(
    result.segmentTimeline.axes.level.baseline.at(-1).values,
    result.segments.level.baseline,
  )
})

test('runPairedEnsemble validates run count and distinct strategy inputs', () => {
  const base = {
    scenario: rewardScenario,
    baselineResponse: silence,
    candidateResponse: correctiveResponse,
    populationSize: 125,
    seed: 41,
  }
  assert.throws(() => runPairedEnsemble({ ...base, runs: 2 }), /runs/i)
  assert.throws(
    () => runPairedEnsemble({ ...base, runs: 12, candidateResponse: silence }),
    /strategy|response/i,
  )
})

test('runEnsemble rejects too few or excessive runs', () => {
  assert.throws(
    () => runEnsemble({ scenario: rewardScenario, response: correctiveResponse, runs: 2 }),
    /between 3 and 500/,
  )
  assert.throws(
    () => runEnsemble({ scenario: rewardScenario, response: correctiveResponse, runs: 501 }),
    /between 3 and 500/,
  )
})

test('evidence readiness allows fixture experiments but blocks predictive claims', () => {
  const readiness = assessEvidenceReadiness({
    theorySources: [
      { id: 'T1', verified: true },
      { id: 'T2', verified: true },
      { id: 'T3', verified: true },
      { id: 'T4', verified: true },
      { id: 'T5', verified: true },
    ],
    crisisSources: [
      { id: 'C1', fixture: true },
      { id: 'C2', fixture: true },
      { id: 'C3', fixture: true },
    ],
  })

  assert.equal(readiness.canRunScenario, true)
  assert.equal(readiness.canClaimPredictiveAccuracy, false)
  assert.equal(readiness.status, 'fixture-crises')
})
