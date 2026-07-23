const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function loadInBrowserContext(filename) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', filename), 'utf8')
  const context = { console, crypto: globalThis.crypto, TextEncoder }
  context.globalThis = context
  vm.runInNewContext(source, context)
  return context
}

test('model module exposes a browser API without CommonJS globals', () => {
  const context = loadInBrowserContext('model.js')
  assert.equal(typeof context.ZZZRiskModel.runSimulation, 'function')
  assert.equal(context.ZZZRiskModel.CYCLE_DAYS, 42)
})

test('Injective module exposes a browser API without CommonJS globals', () => {
  const context = loadInBrowserContext('injective.js')
  assert.equal(typeof context.ZZZInjective.buildCommitTransaction, 'function')
  assert.equal(context.ZZZInjective.getInjectiveTestnetConfig().chainIdDecimal, 1439)
})
