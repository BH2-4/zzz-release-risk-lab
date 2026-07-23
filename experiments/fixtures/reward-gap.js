'use strict'

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

module.exports = {
  POPULATION_SEED,
  SIMULATION_SEED,
  baselineResponse,
  candidateResponse,
  scenario,
}
