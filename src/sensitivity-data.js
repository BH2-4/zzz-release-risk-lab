'use strict'

const SENSITIVITY_BUNDLE_SCHEMA_VERSION = 'sensitivity-bundle/1.1'
const LEGACY_SENSITIVITY_BUNDLE_SCHEMA_VERSION = 'sensitivity-bundle/1.0'
const PAIRED_ENSEMBLE_SCHEMA_VERSIONS = Object.freeze([
  'paired-ensemble/1.0',
  'paired-ensemble/1.1',
])
const SENSITIVITY_BUNDLE_SCHEMA_VERSIONS = Object.freeze([
  LEGACY_SENSITIVITY_BUNDLE_SCHEMA_VERSION,
  SENSITIVITY_BUNDLE_SCHEMA_VERSION,
])
const VIEWS = Object.freeze(['baseline', 'candidate', 'delta'])
const AXES = Object.freeze(['level', 'domain', 'region'])
const QUANTILES = Object.freeze(['p10', 'p50', 'p90'])
const EVIDENCE_FIELDS = Object.freeze([
  'caseId',
  'grade',
  'title',
  'site',
  'url',
  'publishedAt',
  'historicalEnvironment',
  'applicationEnvironment',
  'parameterStatus',
])

function assertInterval(value, label) {
  if (!value || QUANTILES.some((quantile) => !Number.isFinite(value[quantile]))) {
    throw new TypeError(`${label} must contain finite P10, P50, and P90 values`)
  }
  if (value.p10 > value.p50 || value.p50 > value.p90) {
    throw new TypeError(`${label} quantiles must be ordered`)
  }
}

function validateEvidence(evidence) {
  if (!evidence || EVIDENCE_FIELDS.some((field) => typeof evidence[field] !== 'string' || !evidence[field])) {
    throw new TypeError('Sensitivity bundle requires complete evidence metadata')
  }
  if (!['A', 'B', 'C', 'F'].includes(evidence.grade)) {
    throw new TypeError('Sensitivity evidence grade must be A, B, C, or F')
  }
  try {
    const url = new URL(evidence.url)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
  } catch {
    throw new TypeError('Sensitivity evidence URL must be an absolute HTTP(S) URL')
  }
}

function validateEnsemble(ensemble) {
  if (!PAIRED_ENSEMBLE_SCHEMA_VERSIONS.includes(ensemble?.schemaVersion)) {
    throw new TypeError('A supported paired ensemble is required')
  }
  if (!Number.isInteger(ensemble.runs) || ensemble.runs < 3) {
    throw new TypeError('Paired ensemble must declare its run count')
  }
  if (
    !Number.isInteger(ensemble.cycleDays) ||
    !Array.isArray(ensemble.timeline) ||
    ensemble.timeline.length !== ensemble.cycleDays
  ) {
    throw new TypeError('Paired ensemble timeline must match its cycle')
  }
  ensemble.timeline.forEach((frame, index) => {
    if (frame.day !== index + 1) throw new TypeError('Paired ensemble days must be contiguous')
    VIEWS.forEach((view) => assertInterval(frame[view]?.risk, `${view} day ${frame.day} risk`))
  })
  VIEWS.forEach((view) => {
    assertInterval(ensemble.outcomes?.[view]?.peakRisk, `${view} peak risk`)
    assertInterval(ensemble.outcomes?.[view]?.finalRisk, `${view} final risk`)
  })
  AXES.forEach((axis) => {
    const segment = ensemble.segments?.[axis]
    if (!segment || !Array.isArray(segment.order) || segment.order.length === 0) {
      throw new TypeError(`Paired ensemble ${axis} segments are required`)
    }
    VIEWS.forEach((view) => segment.order.forEach((key) => {
      assertInterval(segment[view]?.[key], `${view} ${axis} ${key}`)
    }))
  })
  if (ensemble.schemaVersion === 'paired-ensemble/1.1') {
    if (ensemble.segmentTimeline?.dayCount !== ensemble.cycleDays) {
      throw new TypeError('Paired ensemble segment timeline must match its cycle')
    }
    AXES.forEach((axis) => {
      const segment = ensemble.segmentTimeline.axes?.[axis]
      if (!segment || !Array.isArray(segment.order) || segment.order.length === 0) {
        throw new TypeError(`Paired ensemble daily ${axis} segments are required`)
      }
      const finalOrder = ensemble.segments[axis].order
      if (
        segment.order.length !== finalOrder.length ||
        segment.order.some((key, index) => key !== finalOrder[index])
      ) {
        throw new TypeError(`Paired ensemble daily ${axis} segment order must match final segments`)
      }
      VIEWS.forEach((view) => {
        const frames = segment[view]
        if (!Array.isArray(frames) || frames.length !== ensemble.cycleDays) {
          throw new TypeError(`Paired ensemble daily ${axis} ${view} width is invalid`)
        }
        frames.forEach((frame, index) => {
          if (frame.day !== index + 1) throw new TypeError('Paired ensemble segment days must be contiguous')
          segment.order.forEach((key) => {
            assertInterval(frame.values?.[key], `${view} day ${frame.day} ${axis} ${key}`)
          })
        })
      })
    })
  }
}

function packTimeline(ensemble, view) {
  return {
    risk: Object.fromEntries(QUANTILES.map((quantile) => [
      quantile,
      ensemble.timeline.map((frame) => frame[view].risk[quantile]),
    ])),
  }
}

function packSegments(segment, view) {
  return Object.fromEntries(QUANTILES.map((quantile) => [
    quantile,
    segment.order.map((key) => segment[view][key][quantile]),
  ]))
}

function packSegmentTimeline(segment, view) {
  return Object.fromEntries(QUANTILES.map((quantile) => [
    quantile,
    segment[view].flatMap((frame) => segment.order.map((key) => frame.values[key][quantile])),
  ]))
}

function createSensitivityBundle({ ensemble, evidence }) {
  validateEnsemble(ensemble)
  validateEvidence(evidence)
  const hasDailySegmentBands = ensemble.schemaVersion === 'paired-ensemble/1.1'

  return {
    schemaVersion: hasDailySegmentBands
      ? SENSITIVITY_BUNDLE_SCHEMA_VERSION
      : LEGACY_SENSITIVITY_BUNDLE_SCHEMA_VERSION,
    ensembleSchemaVersion: ensemble.schemaVersion,
    claimType: ensemble.claimType,
    source: {
      scenarioId: ensemble.scenarioId,
      strategies: { ...ensemble.strategies },
    },
    evidence: Object.fromEntries(EVIDENCE_FIELDS.map((field) => [field, evidence[field]])),
    quantiles: QUANTILES,
    sampleDesign: {
      runs: ensemble.runs,
      populationSize: ensemble.populationSize,
      ...ensemble.design,
    },
    capabilities: {
      dailyAggregateBands: true,
      finalSegmentBands: true,
      pairedStrategyDelta: true,
      ...(hasDailySegmentBands ? { dailySegmentBands: true } : {}),
      perAgentBands: false,
      relationEdges: false,
      reverseVoice: false,
      reverseHeat: false,
    },
    renderHints: {
      unit: 'scenario-index-points',
      bandSemantics: 'bounded-assumption-sensitivity-not-confidence',
      deltaSemantics: 'candidate-minus-baseline',
      improvementDirection: 'negative',
      recommendedBand: ['p10', 'p90'],
      recommendedCenter: 'p50',
    },
    timeline: {
      dayCount: ensemble.cycleDays,
      days: ensemble.timeline.map((frame) => frame.day),
      baseline: packTimeline(ensemble, 'baseline'),
      candidate: packTimeline(ensemble, 'candidate'),
      delta: packTimeline(ensemble, 'delta'),
    },
    outcomes: JSON.parse(JSON.stringify(ensemble.outcomes)),
    segments: {
      finalDay: ensemble.segments.finalDay,
      axes: Object.fromEntries(AXES.map((axis) => {
        const segment = ensemble.segments[axis]
        const packed = {
          order: [...segment.order],
          baseline: packSegments(segment, 'baseline'),
          candidate: packSegments(segment, 'candidate'),
          delta: packSegments(segment, 'delta'),
        }
        if (hasDailySegmentBands) {
          const segmentTimeline = ensemble.segmentTimeline.axes[axis]
          packed.timeline = {
            baseline: packSegmentTimeline(segmentTimeline, 'baseline'),
            candidate: packSegmentTimeline(segmentTimeline, 'candidate'),
            delta: packSegmentTimeline(segmentTimeline, 'delta'),
          }
        }
        return [axis, packed]
      })),
    },
    disclaimer: `${ensemble.disclaimer} P10/P50/P90 仅描述这 ${ensemble.runs} 次有界模型运行的分布。`,
  }
}

function validateBundle(bundle) {
  if (!SENSITIVITY_BUNDLE_SCHEMA_VERSIONS.includes(bundle?.schemaVersion)) {
    throw new TypeError(`Unsupported sensitivity bundle schema: ${bundle?.schemaVersion}`)
  }
  if (!Number.isInteger(bundle.timeline?.dayCount) || bundle.timeline.dayCount < 1) {
    throw new TypeError('Sensitivity bundle requires a valid day count')
  }
}

function validateView(view) {
  if (!VIEWS.includes(view)) throw new TypeError(`Unsupported sensitivity view: ${view}`)
}

function decodeSensitivityDay(bundle, { view, day }) {
  validateBundle(bundle)
  validateView(view)
  if (!Number.isInteger(day) || day < 1 || day > bundle.timeline.dayCount) {
    throw new TypeError('Sensitivity day must be within the simulation cycle')
  }
  const risk = Object.fromEntries(QUANTILES.map((quantile) => {
    const values = bundle.timeline[view]?.risk?.[quantile]
    if (!Array.isArray(values) || values.length !== bundle.timeline.dayCount) {
      throw new TypeError('Sensitivity timeline width does not match its day count')
    }
    return [quantile, values[day - 1]]
  }))
  assertInterval(risk, `${view} day ${day} risk`)
  return { view, day, risk }
}

function decodeSensitivitySegments(bundle, { view, axis }) {
  validateBundle(bundle)
  validateView(view)
  if (!AXES.includes(axis)) throw new TypeError(`Unsupported sensitivity axis: ${axis}`)
  const segment = bundle.segments?.axes?.[axis]
  if (!segment || !Array.isArray(segment.order)) {
    throw new TypeError(`Sensitivity ${axis} segments are unavailable`)
  }
  return segment.order.map((key, index) => {
    const decoded = { key }
    QUANTILES.forEach((quantile) => {
      const values = segment[view]?.[quantile]
      if (!Array.isArray(values) || values.length !== segment.order.length) {
        throw new TypeError(`Sensitivity ${axis} segment width is invalid`)
      }
      decoded[quantile] = values[index]
    })
    assertInterval(decoded, `${view} ${axis} ${key}`)
    return decoded
  })
}

function decodeSensitivitySegmentDay(bundle, { view, axis, day }) {
  validateBundle(bundle)
  validateView(view)
  if (!AXES.includes(axis)) throw new TypeError(`Unsupported sensitivity axis: ${axis}`)
  if (bundle.capabilities?.dailySegmentBands !== true) {
    throw new TypeError('Daily sensitivity segment bands are unavailable')
  }
  if (!Number.isInteger(day) || day < 1 || day > bundle.timeline.dayCount) {
    throw new TypeError('Sensitivity segment day must be within the simulation cycle')
  }
  const segment = bundle.segments?.axes?.[axis]
  if (!segment || !Array.isArray(segment.order)) {
    throw new TypeError(`Sensitivity ${axis} segments are unavailable`)
  }
  const width = segment.order.length
  const expectedLength = bundle.timeline.dayCount * width
  const offset = (day - 1) * width
  return segment.order.map((key, index) => {
    const decoded = { key }
    QUANTILES.forEach((quantile) => {
      const values = segment.timeline?.[view]?.[quantile]
      if (!Array.isArray(values) || values.length !== expectedLength) {
        throw new TypeError(`Sensitivity daily ${axis} segment width is invalid`)
      }
      decoded[quantile] = values[offset + index]
    })
    assertInterval(decoded, `${view} day ${day} ${axis} ${key}`)
    return decoded
  })
}

const sensitivityDataApi = {
  SENSITIVITY_BUNDLE_SCHEMA_VERSION,
  createSensitivityBundle,
  decodeSensitivityDay,
  decodeSensitivitySegmentDay,
  decodeSensitivitySegments,
}

if (typeof module !== 'undefined' && module.exports) module.exports = sensitivityDataApi
if (typeof globalThis !== 'undefined') globalThis.ZZZSensitivityData = sensitivityDataApi
