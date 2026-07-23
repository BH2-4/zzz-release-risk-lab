'use strict'

const { compareResponses, createPopulation, runEnsemble } = require('../src/model.js')

const scenario = {
  id: 'anniversary-reward-gap',
  label: '周年奖励期待落差（待核实建模夹具）',
  eventDay: 25,
  controllability: 0.9,
  priorCrisis: 0.55,
  triggers: { economic: 0.82, political: 0.08, cultural: 0.28, social: 0.74, internet: 0.92 },
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

const corrective = {
  id: 'rollback-and-explain',
  delayDays: 1,
  transparency: 0.9,
  participation: 0.55,
  restitution: 0.85,
  localization: 0.7,
  correctiveAction: 0.95,
}

const comparison = compareResponses({
  scenario,
  baselineResponse: silence,
  candidateResponse: corrective,
  population: createPopulation({ size: 125, seed: 20260723 }),
  seed: 19,
})
const uncertainty = runEnsemble({ scenario, response: corrective, runs: 100, populationSize: 125, seed: 41 })

console.log(JSON.stringify({
  claimType: 'scenario-index',
  scenario,
  baseline: { peakRisk: comparison.baseline.peakRisk, finalRisk: comparison.baseline.finalRisk },
  candidate: { peakRisk: comparison.candidate.peakRisk, finalRisk: comparison.candidate.finalRisk },
  delta: { peakRisk: comparison.peakRiskDelta, finalRisk: comparison.finalRiskDelta },
  candidateByDomain: comparison.candidate.byDomain,
  uncertainty,
}, null, 2))
