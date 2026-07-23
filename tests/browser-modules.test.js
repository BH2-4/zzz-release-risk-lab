const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function createBrowserContext() {
  const context = { console, crypto: globalThis.crypto, TextEncoder }
  context.globalThis = context
  return context
}

function loadInBrowserContext(filename, context = createBrowserContext()) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', filename), 'utf8')
  vm.runInNewContext(source, context)
  return context
}

test('model module exposes a browser API without CommonJS globals', () => {
  const context = loadInBrowserContext('model.js')
  assert.equal(typeof context.ZZZRiskModel.runSimulation, 'function')
  assert.equal(typeof context.ZZZRiskModel.runSimulationTrace, 'function')
  assert.equal(context.ZZZRiskModel.CYCLE_DAYS, 42)
})

test('visualization data module exposes a browser API without CommonJS globals', () => {
  const context = loadInBrowserContext('visualization-data.js')
  assert.equal(typeof context.ZZZVisualizationData.createVisualReplay, 'function')
  assert.equal(typeof context.ZZZVisualizationData.createVisualComparison, 'function')
  assert.equal(context.ZZZVisualizationData.VISUAL_REPLAY_SCHEMA_VERSION, 'visual-replay/1.0')
})

test('browser visualization adapter consumes the shared model fingerprint API', () => {
  const context = createBrowserContext()
  loadInBrowserContext('model.js', context)
  loadInBrowserContext('visualization-data.js', context)
  const population = context.ZZZRiskModel.createPopulation({ size: 125, seed: 11 })
  const simulation = context.ZZZRiskModel.runSimulationTrace({
    scenario: {
      id: 'browser-visual-fixture',
      label: 'browser visual fixture',
      eventDay: 20,
      controllability: 0.5,
      priorCrisis: 0.4,
      triggers: {
        economic: 0.5,
        political: 0.2,
        cultural: 0.6,
        social: 0.7,
        internet: 0.8,
      },
    },
    population,
    seed: 19,
  })

  const replay = context.ZZZVisualizationData.createVisualReplay({ simulation, population })
  assert.equal(replay.identities.length, 125)
  assert.equal(replay.frames.length, 42)
})

test('Injective module exposes a browser API without CommonJS globals', () => {
  const context = loadInBrowserContext('injective.js')
  assert.equal(typeof context.ZZZInjective.buildCommitTransaction, 'function')
  assert.equal(context.ZZZInjective.getInjectiveTestnetConfig().chainIdDecimal, 1439)
})
