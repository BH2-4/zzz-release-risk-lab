'use strict'

const fs = require('node:fs')
const path = require('node:path')

const { createPopulation, runSimulationTrace } = require('../src/model.js')
const { createVisualComparison } = require('../src/visualization-data.js')

const POPULATION_SEED = 20260723
const SIMULATION_SEED = 19

const scenario = {
  id: 'anniversary-reward-gap',
  label: '周年奖励期待落差（待核实建模夹具）',
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

const baselineResponse = {
  id: 'silence',
  delayDays: 8,
  transparency: 0,
  participation: 0,
  restitution: 0,
  localization: 0,
  correctiveAction: 0,
}

const candidateResponse = {
  id: 'rollback-and-explain',
  delayDays: 1,
  transparency: 0.9,
  participation: 0.55,
  restitution: 0.85,
  localization: 0.7,
  correctiveAction: 0.95,
}

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
