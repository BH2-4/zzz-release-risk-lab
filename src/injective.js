'use strict'

const MIN_STAKE_WEI = 1_000_000_000_000_000n
const MAX_STAKE_WEI = 100_000_000_000_000_000n
const COMMIT_RISK_SELECTOR = 'a088e5a7'

function getInjectiveTestnetConfig() {
  return {
    chainId: '0x59f',
    chainIdDecimal: 1439,
    chainName: 'Injective EVM Testnet',
    nativeChainId: 'injective-888',
    nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
    rpcUrls: ['https://k8s.testnet.json-rpc.injective.network/'],
    blockExplorerUrls: ['https://testnet.blockscout.injective.network/'],
    faucetUrl: 'https://testnet.faucet.injective.network/',
  }
}

function parseInjToWei(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,18})?$/.test(value)) {
    throw new TypeError('Test INJ stake must be a decimal string')
  }
  const [whole, fraction = ''] = value.split('.')
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))
  if (wei < MIN_STAKE_WEI) throw new RangeError('Minimum stake is 0.001 test INJ')
  if (wei > MAX_STAKE_WEI) throw new RangeError('Maximum stake is 0.1 test INJ')
  return wei
}

function validateCommitment({ account, contractAddress, scenarioHash, riskBand, stakeInj } = {}) {
  const errors = []
  const addressPattern = /^0x[0-9a-fA-F]{40}$/
  if (!addressPattern.test(account || '')) errors.push('Invalid wallet account')
  if (!addressPattern.test(contractAddress || '') || /^0x0{40}$/i.test(contractAddress || '')) {
    errors.push('Invalid contract address')
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(scenarioHash || '')) errors.push('Invalid scenario hash')
  if (!Number.isInteger(riskBand) || riskBand < 1 || riskBand > 5) errors.push('Risk band must be 1-5')
  try {
    parseInjToWei(stakeInj)
  } catch (error) {
    errors.push(error.message)
  }
  return { valid: errors.length === 0, errors }
}

function buildCommitTransaction(input = {}) {
  if ('privateKey' in input || 'mnemonic' in input) {
    throw new TypeError('Private keys and mnemonics must never enter the application')
  }
  const validation = validateCommitment(input)
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))

  const encodedHash = input.scenarioHash.slice(2).toLowerCase()
  const encodedBand = input.riskBand.toString(16).padStart(64, '0')
  return {
    from: input.account,
    to: input.contractAddress,
    value: `0x${parseInjToWei(input.stakeInj).toString(16)}`,
    data: `0x${COMMIT_RISK_SELECTOR}${encodedHash}${encodedBand}`,
    chainId: getInjectiveTestnetConfig().chainId,
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

async function createScenarioHash(payload) {
  const bytes = new TextEncoder().encode(canonicalJson(payload))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function requireWalletProvider(provider) {
  if (!provider || typeof provider.request !== 'function') {
    throw new TypeError('A browser wallet provider is required')
  }
}

async function ensureInjectiveTestnet(provider) {
  requireWalletProvider(provider)
  const network = getInjectiveTestnetConfig()
  const currentChainId = await provider.request({ method: 'eth_chainId' })
  if (String(currentChainId).toLowerCase() === network.chainId) return network

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainId }],
    })
  } catch (error) {
    if (error?.code !== 4902) throw error
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: network.chainId,
        chainName: network.chainName,
        nativeCurrency: network.nativeCurrency,
        rpcUrls: network.rpcUrls,
        blockExplorerUrls: network.blockExplorerUrls,
      }],
    })
  }
  return network
}

async function connectWallet(provider) {
  await ensureInjectiveTestnet(provider)
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  const account = Array.isArray(accounts) ? accounts[0] : null
  if (!/^0x[0-9a-fA-F]{40}$/.test(account || '')) {
    throw new TypeError('Wallet did not return a valid EVM account')
  }
  return account
}

async function verifyRiskContract(provider, contractAddress, expectedRuntimeCode) {
  requireWalletProvider(provider)
  if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress || '') || /^0x0{40}$/i.test(contractAddress || '')) {
    throw new TypeError('Invalid contract address')
  }
  if (!/^0x[0-9a-fA-F]+$/.test(expectedRuntimeCode || '')) {
    throw new TypeError('Expected runtime bytecode is required')
  }
  const runtimeCode = await provider.request({
    method: 'eth_getCode',
    params: [contractAddress, 'latest'],
  })
  return typeof runtimeCode === 'string' && runtimeCode.toLowerCase() === expectedRuntimeCode.toLowerCase()
}

const injectiveApi = {
  buildCommitTransaction,
  connectWallet,
  createScenarioHash,
  ensureInjectiveTestnet,
  getInjectiveTestnetConfig,
  parseInjToWei,
  validateCommitment,
  verifyRiskContract,
}

if (typeof module !== 'undefined' && module.exports) module.exports = injectiveApi
if (typeof globalThis !== 'undefined') globalThis.ZZZInjective = injectiveApi
