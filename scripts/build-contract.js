'use strict'

const fs = require('node:fs')
const path = require('node:path')
const solc = require('solc')

const root = path.join(__dirname, '..')
const contractPath = path.join(root, 'contracts', 'RiskCommitment.sol')
const source = fs.readFileSync(contractPath, 'utf8')
const input = {
  language: 'Solidity',
  sources: { 'RiskCommitment.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  },
}
const output = JSON.parse(solc.compile(JSON.stringify(input)))
const errors = (output.errors || []).filter((entry) => entry.severity === 'error')
if (errors.length) {
  throw new Error(errors.map((entry) => entry.formattedMessage).join('\n'))
}

const artifact = output.contracts['RiskCommitment.sol'].RiskCommitment
const browserModule = `'use strict'\n\nconst riskContractArtifact = ${JSON.stringify({
  contractName: 'RiskCommitment',
  abi: artifact.abi,
  bytecode: `0x${artifact.evm.bytecode.object}`,
  deployedBytecode: `0x${artifact.evm.deployedBytecode.object}`,
}, null, 2)}\n\nif (typeof module !== 'undefined' && module.exports) module.exports = riskContractArtifact\nif (typeof globalThis !== 'undefined') globalThis.ZZZRiskContract = riskContractArtifact\n`

fs.writeFileSync(path.join(root, 'src', 'contract-artifact.js'), browserModule)
console.log(`Built RiskCommitment (${artifact.evm.bytecode.object.length / 2} bytes)`)
