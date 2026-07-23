const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const solc = require('solc')

function compileContract() {
  const contractPath = path.join(__dirname, '..', 'contracts', 'RiskCommitment.sol')
  const source = fs.readFileSync(contractPath, 'utf8')
  const input = {
    language: 'Solidity',
    sources: { 'RiskCommitment.sol': { content: source } },
    settings: {
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'evm.methodIdentifiers'] },
      },
    },
  }
  return JSON.parse(solc.compile(JSON.stringify(input)))
}

test('RiskCommitment compiles with the expected narrow public API', () => {
  const output = compileContract()
  const errors = (output.errors || []).filter((entry) => entry.severity === 'error')
  assert.deepEqual(errors, [])

  const artifact = output.contracts['RiskCommitment.sol'].RiskCommitment
  const functions = artifact.abi.filter((entry) => entry.type === 'function')
  const event = artifact.abi.find((entry) => entry.type === 'event' && entry.name === 'RiskCommitted')

  assert.deepEqual(functions.map((entry) => entry.name), ['commitRisk'])
  assert.equal(functions[0].stateMutability, 'payable')
  assert.deepEqual(functions[0].inputs.map((input) => input.type), ['bytes32', 'uint8'])
  assert.ok(event)
  assert.ok(artifact.evm.bytecode.object.length > 100)
  assert.ok(artifact.evm.deployedBytecode.object.length > 100)
  assert.equal(artifact.evm.methodIdentifiers['commitRisk(bytes32,uint8)'], 'a088e5a7')
})

test('contract source bounds the verification pulse and refunds it', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'RiskCommitment.sol'), 'utf8')

  assert.match(source, /0\.001 ether/)
  assert.match(source, /0\.1 ether/)
  assert.match(source, /call\{value: msg\.value\}/)
  assert.doesNotMatch(source, /privateKey|tx\.origin|selfdestruct/)
})
