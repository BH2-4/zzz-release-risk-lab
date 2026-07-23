'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  createOpenAICompatibleProvider,
  createReplayProvider,
} = require('../src/ai-provider.js')

test('OpenAI-compatible provider sends a server-side structured request without exposing its key', async () => {
  const requests = []
  const provider = createOpenAICompatibleProvider({
    baseUrl: 'https://models.example.com/v1/',
    apiKey: 'secret-test-key',
    model: 'small-structured-model',
    fetchImpl: async (url, init) => {
      requests.push({ url, init })
      return {
        ok: true,
        headers: { get: (name) => name.toLowerCase() === 'x-request-id' ? 'req-123' : null },
        json: async () => ({
          choices: [{ message: { content: '{"answer":"bounded"}' } }],
        }),
      }
    },
  })

  const result = await provider.generateObject({
    schemaName: 'test-contract',
    system: 'Return JSON.',
    user: 'Compile the bounded input.',
  })

  assert.deepEqual(result.object, { answer: 'bounded' })
  assert.equal(result.provenance.mode, 'live-model')
  assert.equal(result.provenance.model, 'small-structured-model')
  assert.equal(result.provenance.requestId, 'req-123')
  assert.equal(requests[0].url, 'https://models.example.com/v1/chat/completions')
  assert.equal(requests[0].init.headers.Authorization, 'Bearer secret-test-key')
  assert.equal(JSON.stringify(provider).includes('secret-test-key'), false)
  assert.equal(JSON.stringify(result).includes('secret-test-key'), false)
})

test('provider rejects missing configuration and malformed model JSON', async () => {
  assert.throws(
    () => createOpenAICompatibleProvider({ baseUrl: 'https://example.com/v1', model: 'model' }),
    /API key/i,
  )

  const provider = createOpenAICompatibleProvider({
    baseUrl: 'https://example.com/v1',
    apiKey: 'test-key',
    model: 'model',
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => null },
      json: async () => ({ choices: [{ message: { content: 'not-json' } }] }),
    }),
  })
  await assert.rejects(
    () => provider.generateObject({ schemaName: 'test', system: 'x', user: 'y' }),
    /valid JSON/i,
  )
})

test('provider refuses plaintext remote credentials and redacts transport failures', async () => {
  assert.throws(
    () => createOpenAICompatibleProvider({
      baseUrl: 'http://models.example.com/v1', apiKey: 'secret-key', model: 'model',
    }),
    /HTTPS/i,
  )

  const local = createOpenAICompatibleProvider({
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKey: 'local-placeholder',
    model: 'local-model',
    fetchImpl: async () => { throw new Error('transport included secret-key') },
  })
  await assert.rejects(
    () => local.generateObject({ schemaName: 'test', system: 'x', user: 'y' }),
    (error) => error.message === 'Model request failed before receiving a response',
  )
})

test('replay provider is explicitly recorded output, deterministic, and mutation-safe', async () => {
  const provider = createReplayProvider({
    model: 'recorded-model',
    recordingId: 'recording-001',
    object: { nested: { value: 1 } },
  })
  const first = await provider.generateObject({ schemaName: 'compiled-scenario/1.0' })
  first.object.nested.value = 99
  const second = await provider.generateObject({ schemaName: 'compiled-scenario/1.0' })

  assert.equal(second.object.nested.value, 1)
  assert.equal(second.provenance.mode, 'recorded-model-output')
  assert.equal(second.provenance.recordingId, 'recording-001')
})
