'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const { createPopulation, runPairedEnsemble, runSimulationTrace } = require('../src/model.js')
const { createSensitivityBundle } = require('../src/sensitivity-data.js')
const { createVisualBundle } = require('../src/visualization-bundle.js')
const { createVisualComparison } = require('../src/visualization-data.js')
const {
  ENSEMBLE_RUNS,
  ENSEMBLE_SEED,
  POPULATION_SEED,
  SIMULATION_SEED,
  baselineResponse,
  candidateResponse,
  evidence,
  scenario,
} = require('../experiments/fixtures/mechanics-rollback.js')

const ARTIFACT_FILENAME = 'visual-data-beta0.3.json'
const MANIFEST_FILENAME = 'visual-data-beta0.3-manifest.json'

function createArtifact({
  artifactVersion = 'visual-data-beta0.3',
  generatedBy = 'scripts/run-data-beta03.js',
  includeSegmentTimeline = false,
  notes = [
    '逐 Agent 棋盘是一条固定种子的代表性回放；不能把单个棋子路径理解为现实个体预测。',
    'P10/P50/P90 来自配对的有界模型扰动，表示假设敏感性，不是统计置信区间或现实概率。',
    '历史案例事实为 B 级专业媒体转述；模型触发强度和响应系数仍是研究者假设。',
    'Reverse 声量、热度、Agent 级集合区间与关系边仍未建模，能力清单保持 false。',
  ],
} = {}) {
  const population = createPopulation({ size: 125, seed: POPULATION_SEED })
  const baselineSimulation = runSimulationTrace({
    scenario,
    response: baselineResponse,
    population,
    seed: SIMULATION_SEED,
    includeDrivers: true,
  })
  const candidateSimulation = runSimulationTrace({
    scenario,
    response: candidateResponse,
    population,
    seed: SIMULATION_SEED,
    includeDrivers: true,
  })
  const comparison = createVisualComparison({ baselineSimulation, candidateSimulation, population })
  const visualBundle = createVisualBundle({
    comparison,
    events: [
      {
        day: scenario.eventDay,
        type: 'scenario-event',
        label: scenario.label,
        strategy: null,
      },
      {
        day: scenario.eventDay + candidateResponse.delayDays,
        type: 'response-start',
        label: '候选响应开始生效',
        strategy: 'candidate',
      },
    ],
  })
  const ensemble = runPairedEnsemble({
    scenario,
    baselineResponse,
    candidateResponse,
    runs: ENSEMBLE_RUNS,
    populationSize: 125,
    seed: ENSEMBLE_SEED,
    includeSegmentTimeline,
  })

  return {
    artifactVersion,
    claimType: 'scenario-index',
    generatedBy,
    inputs: {
      populationSeed: POPULATION_SEED,
      simulationSeed: SIMULATION_SEED,
      ensembleSeed: ENSEMBLE_SEED,
      ensembleRuns: ENSEMBLE_RUNS,
      evidence,
      scenario,
      strategies: { baseline: baselineResponse, candidate: candidateResponse },
    },
    bundle: visualBundle,
    sensitivity: createSensitivityBundle({ ensemble, evidence }),
    notes,
  }
}

function createManifest(artifactBytes, {
  artifact = ARTIFACT_FILENAME,
  artifactVersion = 'visual-data-beta0.3',
  manifestVersion = 'visual-data-manifest/1.1',
  sensitivitySchemaVersion = 'sensitivity-bundle/1.0',
  dailySegmentBands = false,
} = {}) {
  return {
    manifestVersion,
    artifact,
    artifactVersion,
    bundleSchemaVersion: 'visual-bundle/1.0',
    sensitivitySchemaVersion,
    byteLength: artifactBytes.byteLength,
    sha256: crypto.createHash('sha256').update(artifactBytes).digest('hex'),
    populationSize: 125,
    cycleDays: 42,
    evidenceGrade: evidence.grade,
    capabilities: {
      dailyRandomAccess: true,
      explainableDrivers: true,
      dailyAggregateBands: true,
      finalSegmentBands: true,
      pairedStrategyDelta: true,
      ...(dailySegmentBands ? { dailySegmentBands: true } : {}),
      perAgentBands: false,
      relationEdges: false,
      reverseVoice: false,
      reverseHeat: false,
    },
  }
}

function writeArtifacts(outputDirectory = path.join(__dirname, '..', 'experiments', 'output')) {
  const artifact = createArtifact()
  const artifactBytes = Buffer.from(`${JSON.stringify(artifact)}\n`)
  const manifest = createManifest(artifactBytes)
  const artifactPath = path.join(outputDirectory, ARTIFACT_FILENAME)
  const manifestPath = path.join(outputDirectory, MANIFEST_FILENAME)
  fs.mkdirSync(outputDirectory, { recursive: true })
  fs.writeFileSync(artifactPath, artifactBytes)
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return { artifactPath, manifestPath }
}

if (require.main === module) {
  const { artifactPath, manifestPath } = writeArtifacts()
  console.log(`Beta 0.3 data written to ${path.relative(process.cwd(), artifactPath)}`)
  console.log(`Beta 0.3 manifest written to ${path.relative(process.cwd(), manifestPath)}`)
}

module.exports = { createArtifact, createManifest, writeArtifacts }
