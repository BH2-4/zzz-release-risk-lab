const test = require('node:test')
const assert = require('node:assert/strict')

const {
  buildCommitTransaction,
  connectWallet,
  createScenarioHash,
  ensureInjectiveTestnet,
  getInjectiveTestnetConfig,
  parseInjToWei,
  validateCommitment,
  verifyRiskContract,
} = require('../src/injective.js')

const account = '0x1111111111111111111111111111111111111111'
const contract = '0x2222222222222222222222222222222222222222'
const scenarioHash = `0x${'ab'.repeat(32)}`

test('uses the current official Injective EVM testnet configuration', () => {
  const network = getInjectiveTestnetConfig()

  assert.equal(network.chainId, '0x59f')
  assert.equal(network.chainIdDecimal, 1439)
  assert.equal(network.nativeCurrency.symbol, 'INJ')
  assert.equal(network.rpcUrls[0], 'https://k8s.testnet.json-rpc.injective.network/')
})

test('parseInjToWei converts bounded decimal test INJ without floating-point math', () => {
  assert.equal(parseInjToWei('0.001'), 1000000000000000n)
  assert.equal(parseInjToWei('0.1'), 100000000000000000n)
  assert.throws(() => parseInjToWei('0.0001'), /0.001/)
  assert.throws(() => parseInjToWei('1'), /0.1/)
  assert.throws(() => parseInjToWei(0.01), /decimal string/)
  assert.throws(() => parseInjToWei('0.0000000000000000001'), /decimal string/)
})

test('validateCommitment rejects malformed addresses, hashes, and risk bands', () => {
  assert.equal(
    validateCommitment({ account, contractAddress: contract, scenarioHash, riskBand: 3, stakeInj: '0.01' }).valid,
    true,
  )
  assert.equal(
    validateCommitment({ account: 'bad', contractAddress: contract, scenarioHash, riskBand: 3, stakeInj: '0.01' }).valid,
    false,
  )
  assert.equal(
    validateCommitment({ account, contractAddress: contract, scenarioHash, riskBand: 8, stakeInj: '0.01' }).valid,
    false,
  )
  assert.equal(
    validateCommitment({ account, contractAddress: contract, scenarioHash: 'bad', riskBand: 3, stakeInj: '1' }).valid,
    false,
  )
})

test('buildCommitTransaction returns a narrow wallet request and never accepts a private key', () => {
  const transaction = buildCommitTransaction({
    account,
    contractAddress: contract,
    scenarioHash,
    riskBand: 3,
    stakeInj: '0.01',
  })

  assert.equal(transaction.from, account)
  assert.equal(transaction.to, contract)
  assert.equal(transaction.value, '0x2386f26fc10000')
  assert.match(transaction.data, /^0xa088e5a7[0-9a-f]{128}$/)
  assert.equal('privateKey' in transaction, false)
  assert.throws(
    () => buildCommitTransaction({
      account,
      contractAddress: contract,
      scenarioHash,
      riskBand: 3,
      stakeInj: '0.01',
      privateKey: 'never',
    }),
    /never enter/,
  )
  assert.throws(
    () => buildCommitTransaction({ account: 'bad' }),
    /Invalid wallet account/,
  )
})

test('createScenarioHash is stable across object key order and changes with inputs', async () => {
  const first = await createScenarioHash({ scenario: 'reward-gap', peakRisk: 61, seed: 42 })
  const reordered = await createScenarioHash({ seed: 42, peakRisk: 61, scenario: 'reward-gap' })
  const variant = await createScenarioHash({ seed: 43, peakRisk: 61, scenario: 'reward-gap' })

  assert.equal(first, reordered)
  assert.notEqual(first, variant)
  assert.match(first, /^0x[0-9a-f]{64}$/)
})

test('ensureInjectiveTestnet switches an existing wallet network', async () => {
  const calls = []
  const provider = {
    request: async (request) => {
      calls.push(request)
      if (request.method === 'eth_chainId') return '0x1'
      return null
    },
  }

  await ensureInjectiveTestnet(provider)

  assert.deepEqual(calls.map((call) => call.method), ['eth_chainId', 'wallet_switchEthereumChain'])
  assert.equal(calls[1].params[0].chainId, '0x59f')
})

test('ensureInjectiveTestnet adds Injective when the wallet does not know it', async () => {
  const calls = []
  const provider = {
    request: async (request) => {
      calls.push(request)
      if (request.method === 'eth_chainId') return '0x1'
      if (request.method === 'wallet_switchEthereumChain') {
        const error = new Error('unknown chain')
        error.code = 4902
        throw error
      }
      return null
    },
  }

  await ensureInjectiveTestnet(provider)

  assert.deepEqual(
    calls.map((call) => call.method),
    ['eth_chainId', 'wallet_switchEthereumChain', 'wallet_addEthereumChain'],
  )
  assert.equal(calls[2].params[0].chainId, '0x59f')
})

test('connectWallet requests accounts only after confirming the testnet', async () => {
  const calls = []
  const provider = {
    request: async (request) => {
      calls.push(request.method)
      if (request.method === 'eth_chainId') return '0x59f'
      if (request.method === 'eth_requestAccounts') return [account]
      return null
    },
  }

  const connected = await connectWallet(provider)

  assert.equal(connected, account)
  assert.deepEqual(calls, ['eth_chainId', 'eth_requestAccounts'])
})

test('wallet helpers reject missing providers and malformed accounts', async () => {
  await assert.rejects(() => ensureInjectiveTestnet(), /wallet/i)
  await assert.rejects(
    () => connectWallet({ request: async ({ method }) => method === 'eth_chainId' ? '0x59f' : ['bad'] }),
    /valid EVM account/,
  )
})

test('verifyRiskContract compares deployed runtime bytecode at the target address', async () => {
  const expectedRuntimeCode = '0x60006000'
  const calls = []
  const matchingProvider = {
    request: async (request) => {
      calls.push(request)
      return '0x60006000'
    },
  }

  assert.equal(await verifyRiskContract(matchingProvider, contract, expectedRuntimeCode), true)
  assert.deepEqual(calls[0], { method: 'eth_getCode', params: [contract, 'latest'] })
  assert.equal(
    await verifyRiskContract({ request: async () => '0x60006001' }, contract, expectedRuntimeCode),
    false,
  )
  await assert.rejects(() => verifyRiskContract(matchingProvider, 'bad', expectedRuntimeCode), /contract address/)
  await assert.rejects(() => verifyRiskContract(matchingProvider, contract, '0x'), /runtime bytecode/)
})
