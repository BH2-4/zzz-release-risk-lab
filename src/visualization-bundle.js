'use strict'

const VISUAL_BUNDLE_SCHEMA_VERSION = 'visual-bundle/1.0'
const FRONT_FIELDS = Object.freeze([
  'risk',
  'pressure',
  'networkPressure',
  'responseBuffer',
  'integrity',
  'dissolve',
])
const DELTA_FRONT_FIELDS = Object.freeze([
  'riskDelta',
  'pressureDelta',
  'networkPressureDelta',
  'responseBufferDelta',
  'integrityDelta',
  'dissolveDelta',
])
const FRONT_SCALE = 10000
const DRIVER_SCALE = 1000000

function getVisualizationApi() {
  if (typeof module !== 'undefined' && module.exports) return require('./visualization-data.js')
  return globalThis.ZZZVisualizationData
}

function round(value, digits) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function quantize(value, scale, field) {
  if (!Number.isFinite(value)) throw new TypeError(`${field} must be finite before encoding`)
  const encoded = Math.round(value * scale)
  return Object.is(encoded, -0) ? 0 : encoded
}

function encodeAgents(agents, fields, scale, select) {
  const encoded = []
  for (const agent of agents) {
    const values = select(agent)
    for (const field of fields) encoded.push(quantize(values[field], scale, field))
  }
  return encoded
}

function assertFrameAgentOrder(frame, agentOrder, label) {
  if (!frame || !Array.isArray(frame.agents) || frame.agents.length !== agentOrder.length) {
    throw new TypeError(`${label} frame must contain the complete Agent order`)
  }
  frame.agents.forEach((agent, index) => {
    if (agent.id !== agentOrder[index]) {
      throw new TypeError(`${label} frame Agent order must match bundle identities`)
    }
  })
}

function validateComparison(comparison) {
  const visualizationApi = getVisualizationApi()
  if (
    !visualizationApi ||
    comparison?.schemaVersion !== visualizationApi.VISUAL_COMPARISON_SCHEMA_VERSION
  ) {
    throw new TypeError('A supported visual comparison is required')
  }
  if (comparison.channels?.frontDrivers?.status !== 'available') {
    throw new TypeError('Visual bundle requires explainable front driver data')
  }
  if (comparison.channels?.relationEdges?.status !== 'unavailable') {
    throw new TypeError('Visual bundle relation edge boundary must be explicit')
  }
  if (!Array.isArray(comparison.identities) || comparison.identities.length === 0) {
    throw new TypeError('Visual bundle requires stable Agent identities')
  }

  const baselineFrames = comparison.strategies?.baseline?.frames
  const candidateFrames = comparison.strategies?.candidate?.frames
  const deltaFrames = comparison.deltaFrames
  if (
    !Array.isArray(baselineFrames) ||
    !Array.isArray(candidateFrames) ||
    !Array.isArray(deltaFrames) ||
    baselineFrames.length === 0 ||
    baselineFrames.length !== candidateFrames.length ||
    baselineFrames.length !== deltaFrames.length
  ) {
    throw new TypeError('Visual bundle requires aligned baseline, candidate, and delta frames')
  }

  const agentOrder = comparison.identities.map((identity) => identity.id)
  baselineFrames.forEach((frame) => assertFrameAgentOrder(frame, agentOrder, 'Baseline'))
  candidateFrames.forEach((frame) => assertFrameAgentOrder(frame, agentOrder, 'Candidate'))
  deltaFrames.forEach((frame) => assertFrameAgentOrder(frame, agentOrder, 'Delta'))
}

function normalizeEvents(events, dayCount) {
  if (!Array.isArray(events)) throw new TypeError('Visual bundle events must be an array')
  return events.map((event, index) => {
    if (!Number.isInteger(event?.day) || event.day < 1 || event.day > dayCount) {
      throw new TypeError('Visual bundle event day must be within the simulation cycle')
    }
    if (typeof event.type !== 'string' || typeof event.label !== 'string') {
      throw new TypeError('Visual bundle events require type and label')
    }
    if (![null, undefined, 'baseline', 'candidate'].includes(event.strategy)) {
      throw new TypeError('Visual bundle event strategy must be baseline, candidate, or null')
    }
    return {
      day: event.day,
      type: event.type,
      label: event.label,
      strategy: event.strategy || null,
      order: index,
    }
  }).sort((left, right) => left.day - right.day || left.order - right.order)
    .map(({ order, ...event }) => event)
}

function encodeStrategy(frames, driverFields, agentOrder, responseId) {
  return {
    responseId,
    phases: frames.map((frame) => frame.phase),
    aggregateRisk: frames.map((frame) => frame.aggregateRisk),
    frames: frames.map((frame) => {
      assertFrameAgentOrder(frame, agentOrder, 'Strategy')
      return {
        front: encodeAgents(frame.agents, FRONT_FIELDS, FRONT_SCALE, (agent) => agent.front),
        drivers: encodeAgents(frame.agents, driverFields, DRIVER_SCALE, (agent) => agent.front.drivers),
      }
    }),
  }
}

function encodeDelta(frames, driverFields, agentOrder) {
  return {
    phases: frames.map((frame) => frame.phase),
    aggregateRisk: frames.map((frame) => frame.aggregateRiskDelta),
    frames: frames.map((frame) => {
      assertFrameAgentOrder(frame, agentOrder, 'Delta')
      return {
        front: encodeAgents(frame.agents, DELTA_FRONT_FIELDS, FRONT_SCALE, (agent) => agent.front),
        drivers: encodeAgents(
          frame.agents,
          driverFields,
          DRIVER_SCALE,
          (agent) => agent.front.driverDeltas,
        ),
      }
    }),
  }
}

function createVisualBundle({ comparison, events = [] }) {
  validateComparison(comparison)
  const agentOrder = comparison.identities.map((identity) => identity.id)
  const driverFields = [...comparison.channels.frontDrivers.fields]
  const dayCount = comparison.deltaFrames.length

  return {
    schemaVersion: VISUAL_BUNDLE_SCHEMA_VERSION,
    comparisonSchemaVersion: comparison.schemaVersion,
    claimType: comparison.claimType,
    source: {
      ...comparison.source,
      populationFingerprint: comparison.strategies.candidate.source.populationFingerprint,
    },
    board: comparison.board,
    channels: comparison.channels,
    identities: comparison.identities,
    encoding: {
      layout: 'frame-agent-field',
      agentOrder,
      front: { fields: FRONT_FIELDS, scale: FRONT_SCALE },
      drivers: { fields: driverFields, scale: DRIVER_SCALE },
      deltaFront: { fields: DELTA_FRONT_FIELDS, scale: FRONT_SCALE },
      deltaDrivers: { fields: driverFields, scale: DRIVER_SCALE },
    },
    capabilities: {
      dailyRandomAccess: true,
      frameInterpolation: true,
      explainableDrivers: true,
      relationEdges: false,
      reverseVoice: false,
      reverseHeat: false,
    },
    renderHints: {
      sourceCadenceDays: 1,
      inspectionMode: 'snap-to-source-day',
      interpolationMode: 'linear-visual-only',
      instanceOrder: 'encoding.agentOrder',
      driverDetail: 'selection-only',
    },
    timeline: {
      dayCount,
      baseline: encodeStrategy(
        comparison.strategies.baseline.frames,
        driverFields,
        agentOrder,
        comparison.strategies.baseline.source.responseId,
      ),
      candidate: encodeStrategy(
        comparison.strategies.candidate.frames,
        driverFields,
        agentOrder,
        comparison.strategies.candidate.source.responseId,
      ),
      delta: encodeDelta(comparison.deltaFrames, driverFields, agentOrder),
    },
    events: normalizeEvents(events, dayCount),
    disclaimer: `${comparison.disclaimer} 紧凑帧只做定点编码，不添加模型结论。`,
  }
}

function decodeFields(encoded, fields, scale, offset) {
  const values = {}
  const digits = Math.log10(scale)
  fields.forEach((field, fieldIndex) => {
    const value = encoded[offset + fieldIndex]
    if (!Number.isInteger(value)) throw new TypeError(`Encoded ${field} must be an integer`)
    values[field] = round(value / scale, digits)
  })
  return values
}

function decodeVisualFrame(bundle, { view, day }) {
  if (bundle?.schemaVersion !== VISUAL_BUNDLE_SCHEMA_VERSION) {
    throw new TypeError(`Unsupported visual bundle schema: ${bundle?.schemaVersion}`)
  }
  if (!['baseline', 'candidate', 'delta'].includes(view)) {
    throw new TypeError(`Unsupported visual bundle view: ${view}`)
  }
  if (!Number.isInteger(day) || day < 1 || day > bundle.timeline.dayCount) {
    throw new TypeError('Visual bundle day must be within the simulation cycle')
  }

  const timeline = bundle.timeline[view]
  const frame = timeline.frames[day - 1]
  const frontEncoding = view === 'delta' ? bundle.encoding.deltaFront : bundle.encoding.front
  const driverEncoding = view === 'delta' ? bundle.encoding.deltaDrivers : bundle.encoding.drivers
  const agentOrder = bundle.encoding.agentOrder
  const expectedFrontWidth = agentOrder.length * frontEncoding.fields.length
  const expectedDriverWidth = agentOrder.length * driverEncoding.fields.length
  if (frame?.front?.length !== expectedFrontWidth || frame?.drivers?.length !== expectedDriverWidth) {
    throw new TypeError('Encoded visual bundle frame width does not match its field dictionary')
  }

  const agents = agentOrder.map((id, index) => {
    const front = decodeFields(
      frame.front,
      frontEncoding.fields,
      frontEncoding.scale,
      index * frontEncoding.fields.length,
    )
    const drivers = decodeFields(
      frame.drivers,
      driverEncoding.fields,
      driverEncoding.scale,
      index * driverEncoding.fields.length,
    )
    front[view === 'delta' ? 'driverDeltas' : 'drivers'] = drivers
    return {
      id,
      front,
      reverse: { voice: null, heat: null, status: 'unavailable' },
    }
  })

  const decoded = {
    view,
    day,
    phase: timeline.phases[day - 1],
    agents,
    events: bundle.events.filter((event) => event.day === day),
  }
  decoded[view === 'delta' ? 'aggregateRiskDelta' : 'aggregateRisk'] = timeline.aggregateRisk[day - 1]
  return decoded
}

const visualizationBundleApi = {
  DELTA_FRONT_FIELDS,
  FRONT_FIELDS,
  VISUAL_BUNDLE_SCHEMA_VERSION,
  createVisualBundle,
  decodeVisualFrame,
}

if (typeof module !== 'undefined' && module.exports) module.exports = visualizationBundleApi
if (typeof globalThis !== 'undefined') globalThis.ZZZVisualizationBundle = visualizationBundleApi
