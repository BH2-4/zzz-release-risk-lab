'use strict'

const VISUAL_REPLAY_SCHEMA_VERSION = 'visual-replay/1.0'
const VISUAL_COMPARISON_SCHEMA_VERSION = 'visual-comparison/1.0'
const LEVEL_ORDER = ['individual', 'group', 'region', 'country', 'international']
const DOMAIN_ORDER = ['economic', 'political', 'cultural', 'social', 'internet']
const REGION_ORDER = ['east-asia', 'north-america', 'europe', 'southeast-asia', 'latin-america']
const MIN_FRONT_INTEGRITY = 0.2
const BOARD_POPULATION_SIZE = LEVEL_ORDER.length * DOMAIN_ORDER.length * REGION_ORDER.length
const SUPPORTED_TRACE_VERSIONS = new Set(['agent-trace/1.0', 'agent-trace/1.1'])

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function round(value, digits = 4) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function smoothstep(min, max, value) {
  const normalized = clamp((value - min) / (max - min))
  return normalized * normalized * (3 - 2 * normalized)
}

function integrityFromRisk(risk) {
  const erosion = smoothstep(0.25, 0.9, risk) * (1 - MIN_FRONT_INTEGRITY)
  return round(1 - erosion)
}

function getModelApi() {
  if (typeof module !== 'undefined' && module.exports) return require('./model.js')
  return globalThis.ZZZRiskModel
}

function assertNormalized(value, field) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${field} must be a finite number between 0 and 1`)
  }
}

function validateInputs(simulation, population) {
  if (!simulation || !Array.isArray(simulation.agentTimeline)) {
    throw new TypeError('A versioned agent trace is required to create a visual replay')
  }
  if (!Array.isArray(population) || population.length !== BOARD_POPULATION_SIZE) {
    throw new TypeError(`Visual replay requires the complete ${BOARD_POPULATION_SIZE}-agent board population`)
  }
  if (population.length !== simulation.populationSize) {
    throw new TypeError('A complete population matching the agent trace is required')
  }
  if (!SUPPORTED_TRACE_VERSIONS.has(simulation.traceVersion)) {
    throw new TypeError(`Unsupported agent trace version: ${simulation.traceVersion}`)
  }

  const populationIds = new Set(population.map((agent) => agent.id))
  if (populationIds.size !== population.length) {
    throw new TypeError('Population IDs must be unique')
  }
  if (simulation.agentTimeline.length !== simulation.cycleDays) {
    throw new TypeError('Agent trace length must match the simulation cycle')
  }
  const modelApi = getModelApi()
  if (!modelApi || typeof modelApi.populationFingerprint !== 'function') {
    throw new TypeError('ZZZRiskModel.populationFingerprint is required before creating a visual replay')
  }
  if (modelApi.populationFingerprint(population) !== simulation.populationFingerprint) {
    throw new TypeError('Population fingerprint does not match the agent trace')
  }
  const hasDrivers = simulation.traceVersion === 'agent-trace/1.1'
  if (hasDrivers) {
    if (
      !Array.isArray(simulation.driverFields) ||
      simulation.driverFields.length !== modelApi.TRACE_DRIVER_FIELDS.length ||
      simulation.driverFields.some((field, index) => field !== modelApi.TRACE_DRIVER_FIELDS[index])
    ) {
      throw new TypeError('Agent trace driver fields do not match the model contract')
    }
  }

  const boardSlots = new Set(population.map((agent) => `${agent.level}:${agent.domain}:${agent.region}`))
  if (boardSlots.size !== BOARD_POPULATION_SIZE) {
    throw new TypeError('Visual replay requires one unique Agent for every level/domain/region board slot')
  }

  for (const [frameIndex, frame] of simulation.agentTimeline.entries()) {
    if (frame.day !== frameIndex + 1) {
      throw new TypeError('Agent trace frames must contain sequential days starting at day 1')
    }
    if (!Number.isFinite(frame.risk) || frame.risk < 0 || frame.risk > 100) {
      throw new TypeError('Agent trace aggregate risk must be a finite number between 0 and 100')
    }
    if (!Array.isArray(frame.agents) || frame.agents.length !== population.length) {
      throw new TypeError('Every agent trace frame must match the population')
    }
    const frameIds = new Set(frame.agents.map((agent) => agent.id))
    if (frameIds.size !== population.length || [...populationIds].some((id) => !frameIds.has(id))) {
      throw new TypeError('Agent trace frame IDs must exactly match the population')
    }
    for (const agent of frame.agents) {
      for (const field of ['risk', 'pressure', 'networkPressure', 'responseBuffer']) {
        assertNormalized(agent[field], `Agent trace ${field}`)
      }
      if (hasDrivers) {
        if (!agent.drivers || typeof agent.drivers !== 'object') {
          throw new TypeError('Explainable agent trace requires driver values')
        }
        for (const field of simulation.driverFields) {
          if (!Number.isFinite(agent.drivers[field])) {
            throw new TypeError(`Agent trace driver ${field} must be finite`)
          }
        }
      }
    }
  }
}

function boardIndex(order, value, field) {
  const index = order.indexOf(value)
  if (index === -1) throw new TypeError(`Unsupported ${field}: ${value}`)
  return index
}

function createIdentity(agent) {
  return {
    id: agent.id,
    synthetic: agent.synthetic === true,
    level: agent.level,
    domain: agent.domain,
    region: agent.region,
    archetype: `level-${agent.level}`,
    board: {
      row: boardIndex(LEVEL_ORDER, agent.level, 'level'),
      column: boardIndex(DOMAIN_ORDER, agent.domain, 'domain'),
      slot: boardIndex(REGION_ORDER, agent.region, 'region'),
    },
    traits: {
      threshold: agent.threshold,
      susceptibility: agent.susceptibility,
      influence: agent.influence,
      institutionalTrust: agent.institutionalTrust,
      networkActivity: agent.networkActivity,
    },
  }
}

function createVisualAgent(agent, driverFields) {
  const integrity = integrityFromRisk(agent.risk)
  const visualAgent = {
    id: agent.id,
    front: {
      risk: agent.risk,
      pressure: agent.pressure,
      networkPressure: agent.networkPressure,
      responseBuffer: agent.responseBuffer,
      integrity,
      dissolve: round(1 - integrity),
    },
    reverse: {
      voice: null,
      heat: null,
      status: 'unavailable',
    },
  }
  if (driverFields) {
    visualAgent.front.drivers = Object.fromEntries(
      driverFields.map((field) => [field, agent.drivers[field]]),
    )
  }
  return visualAgent
}

function createVisualReplay({ simulation, population }) {
  validateInputs(simulation, population)
  const driverFields = simulation.traceVersion === 'agent-trace/1.1' ? simulation.driverFields : null
  const channels = {
    frontIntegrity: {
      status: 'available',
      source: 'agent.risk',
      range: [MIN_FRONT_INTEGRITY, 1],
      semantics: '模型情景压力下的可视稳定性，不代表真实人群受损。',
    },
    reverseVoice: {
      status: 'unavailable',
      source: null,
      range: null,
      semantics: '互联网声量尚未建模，正式渲染不得推断或伪造数值。',
    },
    reverseHeat: {
      status: 'unavailable',
      source: null,
      range: null,
      semantics: '互联网情绪热度尚未建模，保留黑到红的未来视觉通道。',
    },
  }
  if (driverFields) {
    channels.frontDrivers = {
      status: 'available',
      source: 'agent.drivers',
      fields: driverFields,
      semantics: '有符号模型贡献项之和等于展示风险；只解释模型公式，不证明现实因果。',
    }
    channels.relationEdges = {
      status: 'unavailable',
      source: null,
      fields: null,
      semantics: '当前 network 项来自群体均值放大，不能伪装成 Agent 之间的真实传播边。',
    }
  }

  return {
    schemaVersion: VISUAL_REPLAY_SCHEMA_VERSION,
    claimType: simulation.claimType,
    source: {
      traceVersion: simulation.traceVersion,
      scenarioId: simulation.scenarioId,
      responseId: simulation.responseId,
      simulationSeed: simulation.simulationSeed,
      populationFingerprint: simulation.populationFingerprint,
    },
    board: {
      axes: { rows: 'level', columns: 'domain', slots: 'region' },
      rows: LEVEL_ORDER,
      columns: DOMAIN_ORDER,
      slots: REGION_ORDER,
    },
    channels,
    identities: population.map(createIdentity),
    frames: simulation.agentTimeline.map((frame) => ({
      day: frame.day,
      phase: frame.phase,
      aggregateRisk: frame.risk,
      agents: frame.agents.map((agent) => createVisualAgent(agent, driverFields)),
    })),
    disclaimer: 'Reverse 声量与热度尚未建模；当前 null 是明确的数据边界，不得用风险指数暗中替代。',
  }
}

function validateComparisonInputs(baselineSimulation, candidateSimulation) {
  if (baselineSimulation.scenarioId !== candidateSimulation.scenarioId) {
    throw new TypeError('Visual comparison requires the same scenario')
  }
  if (baselineSimulation.simulationSeed !== candidateSimulation.simulationSeed) {
    throw new TypeError('Visual comparison requires the same simulation seed')
  }
  if (baselineSimulation.cycleDays !== candidateSimulation.cycleDays) {
    throw new TypeError('Visual comparison requires the same simulation cycle')
  }
  if (baselineSimulation.traceVersion !== candidateSimulation.traceVersion) {
    throw new TypeError('Visual comparison requires the same agent trace version')
  }
}

function createDeltaAgent(baseline, candidate, driverFields) {
  const deltaAgent = {
    id: candidate.id,
    front: {
      riskDelta: round(candidate.front.risk - baseline.front.risk),
      pressureDelta: round(candidate.front.pressure - baseline.front.pressure),
      networkPressureDelta: round(candidate.front.networkPressure - baseline.front.networkPressure),
      responseBufferDelta: round(candidate.front.responseBuffer - baseline.front.responseBuffer),
      integrityDelta: round(candidate.front.integrity - baseline.front.integrity),
      dissolveDelta: round(candidate.front.dissolve - baseline.front.dissolve),
    },
    reverse: {
      voice: null,
      heat: null,
      status: 'unavailable',
    },
  }
  if (driverFields) {
    deltaAgent.front.driverDeltas = Object.fromEntries(driverFields.map((field) => [
      field,
      round(candidate.front.drivers[field] - baseline.front.drivers[field], 6),
    ]))
  }
  return deltaAgent
}

function createVisualComparison({ baselineSimulation, candidateSimulation, population }) {
  validateComparisonInputs(baselineSimulation, candidateSimulation)
  const baseline = createVisualReplay({ simulation: baselineSimulation, population })
  const candidate = createVisualReplay({ simulation: candidateSimulation, population })
  const driverFields = candidate.channels.frontDrivers?.fields || null

  const deltaFrames = candidate.frames.map((candidateFrame, index) => {
    const baselineFrame = baseline.frames[index]
    if (baselineFrame.day !== candidateFrame.day) {
      throw new TypeError('Visual comparison frames must align by day')
    }
    const baselineById = new Map(baselineFrame.agents.map((agent) => [agent.id, agent]))
    return {
      day: candidateFrame.day,
      phase: candidateFrame.phase,
      aggregateRiskDelta: round(candidateFrame.aggregateRisk - baselineFrame.aggregateRisk),
      agents: candidateFrame.agents.map((agent) => createDeltaAgent(
        baselineById.get(agent.id),
        agent,
        driverFields,
      )),
    }
  })

  return {
    schemaVersion: VISUAL_COMPARISON_SCHEMA_VERSION,
    replaySchemaVersion: VISUAL_REPLAY_SCHEMA_VERSION,
    claimType: candidate.claimType,
    source: {
      scenarioId: candidate.source.scenarioId,
      simulationSeed: candidate.source.simulationSeed,
    },
    board: candidate.board,
    channels: candidate.channels,
    identities: candidate.identities,
    strategies: {
      baseline: { source: baseline.source, frames: baseline.frames },
      candidate: { source: candidate.source, frames: candidate.frames },
    },
    deltaFrames,
    disclaimer: `${candidate.disclaimer} 差值仅表示同一模型、同一种子下的策略相对变化。`,
  }
}

const visualizationDataApi = {
  VISUAL_COMPARISON_SCHEMA_VERSION,
  VISUAL_REPLAY_SCHEMA_VERSION,
  createVisualComparison,
  createVisualReplay,
  integrityFromRisk,
}

if (typeof module !== 'undefined' && module.exports) module.exports = visualizationDataApi
if (typeof globalThis !== 'undefined') globalThis.ZZZVisualizationData = visualizationDataApi
