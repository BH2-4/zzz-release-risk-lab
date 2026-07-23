'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const { createPopulation, runSimulationTrace } = require('../src/model.js')
const { createVisualComparison } = require('../src/visualization-data.js')
const { createVisualBundle } = require('../src/visualization-bundle.js')
const {
  POPULATION_SEED,
  SIMULATION_SEED,
  baselineResponse,
  candidateResponse,
  scenario,
} = require('../experiments/fixtures/reward-gap.js')

const ARTIFACT_FILENAME = 'visual-data-beta0.2.json'
const MANIFEST_FILENAME = 'visual-data-manifest.json'

function createArtifact() {
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
  const events = [
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
  ]

  return {
    artifactVersion: 'visual-data-beta0.2',
    claimType: 'scenario-index',
    generatedBy: 'scripts/run-visual-bundle.js',
    inputs: {
      populationSeed: POPULATION_SEED,
      simulationSeed: SIMULATION_SEED,
      scenario,
      strategies: { baseline: baselineResponse, candidate: candidateResponse },
    },
    bundle: createVisualBundle({ comparison, events }),
    notes: [
      '数据用于独立 3D 运行态播放器，不属于路演页面或概念视频。',
      '驱动项解释模型公式中的有符号贡献，不证明真实世界因果关系。',
      'Reverse 声量、热度与 Agent 关系边尚未建模，前端必须保持 unavailable。',
      '紧凑整数帧允许逐日随机访问和视觉插值，检查数值时必须回到原始日帧。',
    ],
  }
}

function createManifest(artifactBytes) {
  return {
    manifestVersion: 'visual-data-manifest/1.0',
    artifact: ARTIFACT_FILENAME,
    artifactVersion: 'visual-data-beta0.2',
    bundleSchemaVersion: 'visual-bundle/1.0',
    byteLength: artifactBytes.byteLength,
    sha256: crypto.createHash('sha256').update(artifactBytes).digest('hex'),
    populationSize: 125,
    cycleDays: 42,
    capabilities: {
      dailyRandomAccess: true,
      explainableDrivers: true,
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
  console.log(`Visual bundle written to ${path.relative(process.cwd(), artifactPath)}`)
  console.log(`Visual manifest written to ${path.relative(process.cwd(), manifestPath)}`)
}

module.exports = { createArtifact, createManifest, writeArtifacts }
