'use strict'

const fs = require('node:fs')
const path = require('node:path')

const { createPopulation, runSimulationTrace } = require('../src/model.js')
const { createVisualComparison } = require('../src/visualization-data.js')
const {
  POPULATION_SEED,
  SIMULATION_SEED,
  baselineResponse,
  candidateResponse,
  scenario,
} = require('../experiments/fixtures/reward-gap.js')

function createArtifact() {
  const population = createPopulation({ size: 125, seed: POPULATION_SEED })
  const baselineSimulation = runSimulationTrace({
    scenario,
    response: baselineResponse,
    population,
    seed: SIMULATION_SEED,
  })
  const candidateSimulation = runSimulationTrace({
    scenario,
    response: candidateResponse,
    population,
    seed: SIMULATION_SEED,
  })

  return {
    artifactVersion: 'visual-data-beta0.1',
    claimType: 'scenario-index',
    generatedBy: 'scripts/run-visual-replay.js',
    inputs: {
      populationSeed: POPULATION_SEED,
      simulationSeed: SIMULATION_SEED,
      scenario,
      strategies: { baseline: baselineResponse, candidate: candidateResponse },
    },
    comparison: createVisualComparison({ baselineSimulation, candidateSimulation, population }),
    notes: [
      '数据包含 42 天、125 个合成 Agent 的沉默/候选/差值状态，不是真实人群预测。',
      'Reverse 互联网声量与热度尚未建模，字段固定为 null，供后续前端保留通道。',
      '正面 integrity/dissolve 是有界的视觉映射，不修改模型风险值。',
    ],
  }
}

function writeArtifact(outputPath = path.join(__dirname, '..', 'experiments', 'output', 'visual-data-beta0.1.json')) {
  const artifact = createArtifact()
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact)}\n`)
  return outputPath
}

if (require.main === module) {
  const outputPath = writeArtifact()
  console.log(`Visual replay data written to ${path.relative(process.cwd(), outputPath)}`)
}

module.exports = { createArtifact, writeArtifact }
