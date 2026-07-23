'use strict'

const riskContractArtifact = {
  "contractName": "RiskCommitment",
  "abi": [
    {
      "inputs": [],
      "name": "InvalidRiskBand",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidScenarioHash",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidVerificationValue",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrantCall",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "RefundFailed",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "committer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "scenarioHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "riskBand",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "verificationValue",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "RiskCommitted",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "scenarioHash",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "riskBand",
          "type": "uint8"
        }
      ],
      "name": "commitRisk",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ],
  "bytecode": "0x6080604052348015600e575f5ffd5b506102108061001c5f395ff3fe60806040526004361061001d575f3560e01c8063a088e5a714610021575b5f5ffd5b61003461002f3660046101a7565b610036565b005b5f5460ff1615610059576040516306fda65d60e31b815260040160405180910390fd5b81610077576040516335d2d54b60e01b815260040160405180910390fd5b60018160ff16108061008c575060058160ff16115b156100aa576040516331e3e96760e01b815260040160405180910390fd5b66038d7ea4c680003410806100c6575067016345785d8a000034115b156100e45760405163570ec56560e11b815260040160405180910390fd5b6040805160ff8316815234602082015242818301529051839133917f51ca52e6859679edaf2398ed56f1ebcde1bee7a510307f70bbe6511837a13e479181900360600190a35f805460ff19166001178155604051339034908381818185875af1925050503d805f8114610172576040519150601f19603f3d011682016040523d82523d5f602084013e610177565b606091505b50505f805460ff191690559050806101a257604051633c31275160e21b815260040160405180910390fd5b505050565b5f5f604083850312156101b8575f5ffd5b82359150602083013560ff811681146101cf575f5ffd5b80915050925092905056fea26469706673582212209963a442c3f6a0eb4aba97a8632452373961ab41c413ec6f15b78912b979229d64736f6c634300081e0033",
  "deployedBytecode": "0x60806040526004361061001d575f3560e01c8063a088e5a714610021575b5f5ffd5b61003461002f3660046101a7565b610036565b005b5f5460ff1615610059576040516306fda65d60e31b815260040160405180910390fd5b81610077576040516335d2d54b60e01b815260040160405180910390fd5b60018160ff16108061008c575060058160ff16115b156100aa576040516331e3e96760e01b815260040160405180910390fd5b66038d7ea4c680003410806100c6575067016345785d8a000034115b156100e45760405163570ec56560e11b815260040160405180910390fd5b6040805160ff8316815234602082015242818301529051839133917f51ca52e6859679edaf2398ed56f1ebcde1bee7a510307f70bbe6511837a13e479181900360600190a35f805460ff19166001178155604051339034908381818185875af1925050503d805f8114610172576040519150601f19603f3d011682016040523d82523d5f602084013e610177565b606091505b50505f805460ff191690559050806101a257604051633c31275160e21b815260040160405180910390fd5b505050565b5f5f604083850312156101b8575f5ffd5b82359150602083013560ff811681146101cf575f5ffd5b80915050925092905056fea26469706673582212209963a442c3f6a0eb4aba97a8632452373961ab41c413ec6f15b78912b979229d64736f6c634300081e0033"
}

if (typeof module !== 'undefined' && module.exports) module.exports = riskContractArtifact
if (typeof globalThis !== 'undefined') globalThis.ZZZRiskContract = riskContractArtifact
