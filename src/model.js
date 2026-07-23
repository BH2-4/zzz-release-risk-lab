'use strict'

const LEVELS = ['individual', 'group', 'region', 'country', 'international']
const DOMAINS = ['economic', 'political', 'cultural', 'social', 'internet']
const REGIONS = ['east-asia', 'north-america', 'europe', 'southeast-asia', 'latin-america']
const CYCLE_DAYS = 42
const TRACE_DRIVER_FIELDS = Object.freeze([
  'background',
  'domain',
  'sharedTrigger',
  'priorCrisis',
  'controllability',
  'identityFriction',
  'network',
  'trust',
  'randomVariation',
  'pressureClamp',
  'response',
  'riskClamp',
  'roundingResidual',
])

function createRandom(seed) {
  let state = Number(seed) >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function round(value, digits = 2) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function populationFingerprint(population) {
  const serialized = population.map((agent) => [
    agent.id,
    agent.synthetic === true ? 1 : 0,
    agent.level,
    agent.domain,
    agent.region,
    agent.threshold,
    agent.susceptibility,
    agent.influence,
    agent.institutionalTrust,
    agent.networkActivity,
  ].join(':')).join('|')
  let hash = 0x811c9dc5
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function createPopulation({ size = 125, seed = 1 } = {}) {
  if (!Number.isInteger(size) || size < 25) {
    throw new TypeError('Population size must be an integer of at least 25')
  }

  const random = createRandom(seed)
  return Array.from({ length: size }, (_, index) => ({
    id: `S${String(index + 1).padStart(3, '0')}`,
    synthetic: true,
    level: LEVELS[index % LEVELS.length],
    domain: DOMAINS[Math.floor(index / LEVELS.length) % DOMAINS.length],
    region: REGIONS[Math.floor(index / (LEVELS.length * DOMAINS.length)) % REGIONS.length],
    threshold: round(0.24 + random() * 0.58, 4),
    susceptibility: round(0.35 + random() * 0.6, 4),
    influence: round(0.2 + random() * 0.75, 4),
    institutionalTrust: round(0.2 + random() * 0.72, 4),
    networkActivity: round(0.25 + random() * 0.73, 4),
  }))
}

function validateScenario(scenario) {
  const errors = []
  if (!scenario || typeof scenario !== 'object') return { valid: false, errors: ['scenario is required'] }
  if (!scenario.id || !scenario.label) errors.push('id and label are required')
  if (!Number.isInteger(scenario.eventDay) || scenario.eventDay < 1 || scenario.eventDay > CYCLE_DAYS) {
    errors.push('eventDay must be within the 42-day cycle')
  }
  for (const key of ['controllability', 'priorCrisis']) {
    if (typeof scenario[key] !== 'number' || scenario[key] < 0 || scenario[key] > 1) {
      errors.push(`${key} must be between 0 and 1`)
    }
  }
  if (!scenario.triggers || typeof scenario.triggers !== 'object') {
    errors.push('all domain triggers are required')
  } else {
    for (const domain of DOMAINS) {
      const value = scenario.triggers[domain]
      if (typeof value !== 'number' || value < 0 || value > 1) {
        errors.push(`${domain} trigger must be between 0 and 1`)
      }
    }
  }
  if (scenario.regionFactors) {
    for (const region of REGIONS) {
      const factor = scenario.regionFactors[region]
      if (typeof factor !== 'number' || factor < 0.5 || factor > 1.5) {
        errors.push(`${region} factor must be between 0.5 and 1.5`)
      }
    }
  }
  return { valid: errors.length === 0, errors }
}

function responseStrength(response = {}) {
  const quality =
    (response.transparency || 0) * 0.2 +
    (response.participation || 0) * 0.14 +
    (response.restitution || 0) * 0.2 +
    (response.localization || 0) * 0.14 +
    (response.correctiveAction || 0) * 0.32
  const delayPenalty = clamp((response.delayDays || 0) / 12)
  return clamp(quality * (1 - delayPenalty * 0.55))
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
}

function aggregatePopulation(population, risks, key) {
  return Object.fromEntries(
    [...new Set(population.map((agent) => agent[key]))].map((name) => {
      const values = risks.filter((_, index) => population[index][key] === name)
      return [name, round(average(values) * 100)]
    }),
  )
}

function createDriverBreakdown(contributions, roundedRisk) {
  const drivers = {}
  let total = 0
  for (const field of TRACE_DRIVER_FIELDS) {
    if (field === 'roundingResidual') continue
    const value = round(contributions[field] || 0, 6)
    drivers[field] = value
    total += value
  }
  drivers.roundingResidual = round(roundedRisk - total, 6)
  return drivers
}

function runSimulationCore(
  { scenario, response = {}, population, seed = 1 },
  { includeAgentTimeline = false, includeDrivers = false, includeSegmentTimeline = false } = {},
) {
  const validation = validateScenario(scenario)
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  if (!Array.isArray(population) || population.length === 0) {
    throw new TypeError('A synthetic population is required')
  }

  const random = createRandom(seed)
  const mitigation = responseStrength(response)
  const triggerMean = average(DOMAINS.map((domain) => scenario.triggers[domain]))
  let previousNetworkRisk = 0
  let latestRisks = population.map(() => 0)
  let peakRisks = population.map(() => 0)
  const timeline = []
  const agentTimeline = includeAgentTimeline ? [] : null
  const segmentTimeline = includeSegmentTimeline ? [] : null

  for (let day = 1; day <= CYCLE_DAYS; day += 1) {
    const age = day - scenario.eventDay
    const responseActive = age >= (response.delayDays || 0)
    const eventPressure = age < 0 ? 0 : Math.exp(-age / 24)
    const networkMomentum = age < 0 ? 0 : Math.min(1, (age + 1) / 7)

    const latestStates = population.map((agent, index) => {
      if (age < 0) {
        const risk = round(0.025 + random() * 0.018, 4)
        const state = {
          risk,
          pressure: 0,
          networkPressure: 0,
          responseBuffer: 0,
        }
        if (includeDrivers) state.drivers = createDriverBreakdown({ background: risk }, risk)
        return state
      }

      const domainTrigger = scenario.triggers[agent.domain]
      const regionFactor = scenario.regionFactors?.[agent.region] || 1
      const identityFriction = agent.level === 'group' || agent.level === 'region' ? 0.07 : 0
      const internationalSpillover = agent.level === 'international' ? previousNetworkRisk * 0.18 : 0
      const thresholdEffect = Math.max(0, previousNetworkRisk - agent.threshold) * agent.influence
      const amplification =
        networkMomentum * agent.networkActivity * (0.14 + thresholdEffect * 0.36) + internationalSpillover
      const trustBuffer = agent.institutionalTrust * 0.12
      const noise = (random() - 0.5) * 0.045
      const raw =
        0.08 +
        domainTrigger * regionFactor * 0.43 +
        triggerMean * 0.13 +
        scenario.priorCrisis * 0.1 +
        scenario.controllability * 0.09 +
        identityFriction +
        amplification * agent.susceptibility -
        trustBuffer +
        noise
      const responseBuffer = responseActive ? mitigation * (0.17 + scenario.controllability * 0.13) : 0
      const persistence = 0.48 + (1 - mitigation) * 0.23
      const temporalScale = eventPressure * persistence + 0.34
      const unclampedPressure = raw * temporalScale
      const pressure = clamp(unclampedPressure)
      const risk = clamp(pressure - responseBuffer)
      peakRisks[index] = Math.max(peakRisks[index], risk)
      const roundedRisk = round(risk, 4)
      const state = {
        risk: roundedRisk,
        pressure: round(pressure, 4),
        networkPressure: round(clamp(amplification * agent.susceptibility), 4),
        responseBuffer: round(responseBuffer, 4),
      }
      if (includeDrivers) {
        state.drivers = createDriverBreakdown({
          background: 0.08 * temporalScale,
          domain: domainTrigger * regionFactor * 0.43 * temporalScale,
          sharedTrigger: triggerMean * 0.13 * temporalScale,
          priorCrisis: scenario.priorCrisis * 0.1 * temporalScale,
          controllability: scenario.controllability * 0.09 * temporalScale,
          identityFriction: identityFriction * temporalScale,
          network: amplification * agent.susceptibility * temporalScale,
          trust: -trustBuffer * temporalScale,
          randomVariation: noise * temporalScale,
          pressureClamp: pressure - unclampedPressure,
          response: -responseBuffer,
          riskClamp: risk - (pressure - responseBuffer),
        }, roundedRisk)
      }
      return state
    })

    latestRisks = latestStates.map((state) => state.risk)
    previousNetworkRisk = average(latestRisks)
    const frame = {
      day,
      phase: age < 0 ? 'pre-release' : responseActive ? 'response' : 'incident',
      risk: round(previousNetworkRisk * 100),
    }
    timeline.push(frame)
    if (includeSegmentTimeline) {
      segmentTimeline.push({
        day,
        byLevel: aggregatePopulation(population, latestRisks, 'level'),
        byDomain: aggregatePopulation(population, latestRisks, 'domain'),
        byRegion: aggregatePopulation(population, latestRisks, 'region'),
      })
    }
    if (includeAgentTimeline) {
      agentTimeline.push({
        ...frame,
        agents: latestStates.map((state, index) => ({ id: population[index].id, ...state })),
      })
    }
  }

  const triggerDrivers = DOMAINS.map((domain) => ({
    id: domain,
    label: domain,
    score: round(scenario.triggers[domain] * 100),
  })).sort((a, b) => b.score - a.score)

  const result = {
    scenarioId: scenario.id,
    responseId: response.id || 'unnamed-response',
    claimType: 'scenario-index',
    cycleDays: CYCLE_DAYS,
    populationSize: population.length,
    timeline,
    peakRisk: round(Math.max(...timeline.map((point) => point.risk))),
    finalRisk: timeline.at(-1).risk,
    byLevel: aggregatePopulation(population, latestRisks, 'level'),
    byDomain: aggregatePopulation(population, latestRisks, 'domain'),
    byRegion: aggregatePopulation(population, latestRisks, 'region'),
    topDrivers: triggerDrivers.slice(0, 5),
    agentPeakMean: round(average(peakRisks) * 100),
  }
  if (includeAgentTimeline) {
    result.traceVersion = includeDrivers ? 'agent-trace/1.1' : 'agent-trace/1.0'
    result.simulationSeed = Number(seed)
    result.populationFingerprint = populationFingerprint(population)
    if (includeDrivers) result.driverFields = TRACE_DRIVER_FIELDS
    result.agentTimeline = agentTimeline
  }
  if (includeSegmentTimeline) result.segmentTimeline = segmentTimeline
  return result
}

function runSimulation(options) {
  return runSimulationCore(options)
}

function runSimulationTrace(options) {
  return runSimulationCore(options, {
    includeAgentTimeline: true,
    includeDrivers: options?.includeDrivers === true,
  })
}

function runSimulationSegmentTrace(options) {
  return runSimulationCore(options, { includeSegmentTimeline: true })
}

function compareResponses({ scenario, baselineResponse, candidateResponse, population, seed = 1 }) {
  const baseline = runSimulation({ scenario, response: baselineResponse, population, seed })
  const candidate = runSimulation({ scenario, response: candidateResponse, population, seed })
  return {
    baseline,
    candidate,
    peakRiskDelta: round(candidate.peakRisk - baseline.peakRisk),
    finalRiskDelta: round(candidate.finalRisk - baseline.finalRisk),
  }
}

function quantile(values, percentile) {
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * percentile
  const lower = Math.floor(position)
  const remainder = position - lower
  return round(sorted[lower] + (sorted[lower + 1] - sorted[lower] || 0) * remainder)
}

function interval(values) {
  return { p10: quantile(values, 0.1), p50: quantile(values, 0.5), p90: quantile(values, 0.9) }
}

function validateEnsembleRuns(runs) {
  if (!Number.isInteger(runs) || runs < 3 || runs > 500) {
    throw new TypeError('runs must be an integer between 3 and 500')
  }
}

function createEnsembleCase({ scenario, ensembleRandom, seed, index }) {
  const runSeed = seed + index * 7919
  const intensityFactor = 0.82 + ensembleRandom() * 0.36
  const responseFactor = 0.88 + ensembleRandom() * 0.24
  return {
    runSeed,
    responseFactor,
    scenario: {
      ...scenario,
      priorCrisis: clamp(scenario.priorCrisis * intensityFactor),
      triggers: Object.fromEntries(
        DOMAINS.map((domain) => [domain, clamp(scenario.triggers[domain] * intensityFactor)]),
      ),
    },
  }
}

function scaleResponse(response = {}, factor) {
  return {
    ...response,
    transparency: clamp((response.transparency || 0) * factor),
    participation: clamp((response.participation || 0) * factor),
    restitution: clamp((response.restitution || 0) * factor),
    localization: clamp((response.localization || 0) * factor),
    correctiveAction: clamp((response.correctiveAction || 0) * factor),
  }
}

function runEnsemble({ scenario, response, runs = 30, populationSize = 125, seed = 1 }) {
  validateEnsembleRuns(runs)
  const ensembleRandom = createRandom(seed ^ 0xa11ce)
  const outcomes = Array.from({ length: runs }, (_, index) => {
    const ensembleCase = createEnsembleCase({ scenario, ensembleRandom, seed, index })
    return runSimulation({
      scenario: ensembleCase.scenario,
      response: scaleResponse(response, ensembleCase.responseFactor),
      population: createPopulation({ size: populationSize, seed: ensembleCase.runSeed }),
      seed: ensembleCase.runSeed + 17,
    })
  })
  return {
    runs,
    peakRisk: interval(outcomes.map((outcome) => outcome.peakRisk)),
    finalRisk: interval(outcomes.map((outcome) => outcome.finalRisk)),
    disclaimer: '区间表示模型假设下的情景指数离散度，不是现实概率或真实人群预测。',
  }
}

function deltaInterval(outcomes, selectBaseline, selectCandidate) {
  return interval(outcomes.map((outcome) => round(
    selectCandidate(outcome.candidate) - selectBaseline(outcome.baseline),
  )))
}

function createSegmentIntervals(outcomes, key, order) {
  const field = `by${key[0].toUpperCase()}${key.slice(1)}`
  const strategyIntervals = (strategy) => Object.fromEntries(order.map((name) => [
    name,
    interval(outcomes.map((outcome) => outcome[strategy][field][name])),
  ]))
  return {
    order: [...order],
    baseline: strategyIntervals('baseline'),
    candidate: strategyIntervals('candidate'),
    delta: Object.fromEntries(order.map((name) => [
      name,
      deltaInterval(
        outcomes,
        (baseline) => baseline[field][name],
        (candidate) => candidate[field][name],
      ),
    ])),
  }
}

function createDailySegmentIntervals(outcomes, key, order) {
  const field = `by${key[0].toUpperCase()}${key.slice(1)}`
  const framesFor = (strategy) => Array.from({ length: CYCLE_DAYS }, (_, index) => ({
    day: index + 1,
    values: Object.fromEntries(order.map((name) => [
      name,
      interval(outcomes.map((outcome) => outcome[strategy].segmentTimeline[index][field][name])),
    ])),
  }))
  const deltaFrames = Array.from({ length: CYCLE_DAYS }, (_, index) => ({
    day: index + 1,
    values: Object.fromEntries(order.map((name) => [
      name,
      deltaInterval(
        outcomes,
        (baseline) => baseline.segmentTimeline[index][field][name],
        (candidate) => candidate.segmentTimeline[index][field][name],
      ),
    ])),
  }))
  return {
    order: [...order],
    baseline: framesFor('baseline'),
    candidate: framesFor('candidate'),
    delta: deltaFrames,
  }
}

function runPairedEnsemble({
  scenario,
  baselineResponse,
  candidateResponse,
  runs = 30,
  populationSize = 125,
  seed = 1,
  includeSegmentTimeline = false,
}) {
  validateEnsembleRuns(runs)
  const baselineResponseId = baselineResponse?.id || 'unnamed-baseline'
  const candidateResponseId = candidateResponse?.id || 'unnamed-candidate'
  if (baselineResponseId === candidateResponseId) {
    throw new TypeError('Paired ensemble requires distinct baseline and candidate response strategies')
  }

  const ensembleRandom = createRandom(seed ^ 0xa11ce)
  const run = includeSegmentTimeline ? runSimulationSegmentTrace : runSimulation
  const outcomes = Array.from({ length: runs }, (_, index) => {
    const ensembleCase = createEnsembleCase({ scenario, ensembleRandom, seed, index })
    const population = createPopulation({ size: populationSize, seed: ensembleCase.runSeed })
    const simulationSeed = ensembleCase.runSeed + 17
    return {
      baseline: run({
        scenario: ensembleCase.scenario,
        response: scaleResponse(baselineResponse, ensembleCase.responseFactor),
        population,
        seed: simulationSeed,
      }),
      candidate: run({
        scenario: ensembleCase.scenario,
        response: scaleResponse(candidateResponse, ensembleCase.responseFactor),
        population,
        seed: simulationSeed,
      }),
    }
  })

  const timeline = Array.from({ length: CYCLE_DAYS }, (_, index) => ({
    day: index + 1,
    baseline: { risk: interval(outcomes.map((outcome) => outcome.baseline.timeline[index].risk)) },
    candidate: { risk: interval(outcomes.map((outcome) => outcome.candidate.timeline[index].risk)) },
    delta: {
      risk: deltaInterval(
        outcomes,
        (baseline) => baseline.timeline[index].risk,
        (candidate) => candidate.timeline[index].risk,
      ),
    },
  }))

  const result = {
    schemaVersion: includeSegmentTimeline ? 'paired-ensemble/1.1' : 'paired-ensemble/1.0',
    claimType: 'scenario-index',
    scenarioId: scenario.id,
    runs,
    cycleDays: CYCLE_DAYS,
    populationSize,
    strategies: { baseline: baselineResponseId, candidate: candidateResponseId },
    design: {
      pairing: 'shared-scenario-population-and-simulation-seed',
      sampling: 'seeded-uniform-bounded-perturbation',
      baseSeed: seed,
      scenarioIntensityRange: [0.82, 1.18],
      responseEffectivenessRange: [0.88, 1.12],
      populationSeedStride: 7919,
      simulationSeedOffset: 17,
    },
    timeline,
    outcomes: {
      baseline: {
        peakRisk: interval(outcomes.map((outcome) => outcome.baseline.peakRisk)),
        finalRisk: interval(outcomes.map((outcome) => outcome.baseline.finalRisk)),
      },
      candidate: {
        peakRisk: interval(outcomes.map((outcome) => outcome.candidate.peakRisk)),
        finalRisk: interval(outcomes.map((outcome) => outcome.candidate.finalRisk)),
      },
      delta: {
        peakRisk: deltaInterval(outcomes, (baseline) => baseline.peakRisk, (candidate) => candidate.peakRisk),
        finalRisk: deltaInterval(outcomes, (baseline) => baseline.finalRisk, (candidate) => candidate.finalRisk),
      },
    },
    segments: {
      finalDay: CYCLE_DAYS,
      level: createSegmentIntervals(outcomes, 'level', LEVELS),
      domain: createSegmentIntervals(outcomes, 'domain', DOMAINS),
      region: createSegmentIntervals(outcomes, 'region', REGIONS),
    },
    disclaimer: '区间表示有界模型假设扰动下的情景指数敏感性，不是现实概率、统计置信区间或真实人群预测。',
  }
  if (includeSegmentTimeline) {
    result.segmentTimeline = {
      dayCount: CYCLE_DAYS,
      axes: {
        level: createDailySegmentIntervals(outcomes, 'level', LEVELS),
        domain: createDailySegmentIntervals(outcomes, 'domain', DOMAINS),
        region: createDailySegmentIntervals(outcomes, 'region', REGIONS),
      },
    }
  }
  return result
}

function assessEvidenceReadiness({ theorySources = [], crisisSources = [] } = {}) {
  const verifiedTheories = theorySources.filter((source) => source.verified).length
  const verifiedCrises = crisisSources.filter((source) => source.verified).length
  const fixtureCrises = crisisSources.filter((source) => source.fixture).length
  const canRunScenario = verifiedTheories >= 3 && verifiedCrises + fixtureCrises >= 1
  const canClaimPredictiveAccuracy = verifiedTheories >= 5 && verifiedCrises >= 3 && fixtureCrises === 0
  return {
    canRunScenario,
    canClaimPredictiveAccuracy,
    verifiedTheories,
    verifiedCrises,
    fixtureCrises,
    status: fixtureCrises > 0 ? 'fixture-crises' : canClaimPredictiveAccuracy ? 'validated-inputs' : 'insufficient-evidence',
  }
}

const modelApi = {
  CYCLE_DAYS,
  DOMAINS,
  LEVELS,
  REGIONS,
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
}

if (typeof module !== 'undefined' && module.exports) module.exports = modelApi
if (typeof globalThis !== 'undefined') globalThis.ZZZRiskModel = modelApi
