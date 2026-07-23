'use strict'

const POPULATION_SEED = 20260723
const SIMULATION_SEED = 19
const ENSEMBLE_SEED = 41
const ENSEMBLE_RUNS = 100

const evidence = Object.freeze({
  caseId: 'C1',
  grade: 'B',
  title: '米哈游《原神》道歉：角色技能问题修复后回退、补偿 1600 原石',
  site: 'IT之家',
  url: 'https://www.ithome.com/0/782/509.htm',
  publishedAt: '2024-07-18',
  historicalEnvironment: 'Genshin Impact 4.8 / Neuvillette charged attack fix rollback',
  applicationEnvironment: 'Zenless Zone Zero synthetic release scenario',
  parameterStatus: 'researcher-assumption',
})

const scenario = Object.freeze({
  id: 'mechanics-fix-rollback',
  label: '角色机制修复后回退（B 级历史原型）',
  eventDay: 25,
  controllability: 0.95,
  priorCrisis: 0.35,
  triggers: Object.freeze({
    economic: 0.72,
    political: 0.06,
    cultural: 0.12,
    social: 0.7,
    internet: 0.88,
  }),
})

const baselineResponse = Object.freeze({
  id: 'delayed-minimal-response',
  delayDays: 8,
  transparency: 0.1,
  participation: 0,
  restitution: 0,
  localization: 0.1,
  correctiveAction: 0,
})

const candidateResponse = Object.freeze({
  id: 'rollback-explain-and-compensate',
  delayDays: 1,
  transparency: 0.82,
  participation: 0.25,
  restitution: 1,
  localization: 0.5,
  correctiveAction: 1,
})

module.exports = {
  ENSEMBLE_RUNS,
  ENSEMBLE_SEED,
  POPULATION_SEED,
  SIMULATION_SEED,
  baselineResponse,
  candidateResponse,
  evidence,
  scenario,
}
