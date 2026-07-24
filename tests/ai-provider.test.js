'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  createMiniMaxM27Provider,
  createOpenAICompatibleProvider,
  createReplayProvider,
  parseModelObject,
} = require('../src/ai-provider.js')

const SECRET_SENTINEL = 'secret-sentinel-7707'
const PROMPT_SENTINEL = 'prompt-sentinel-7707'
const RESPONSE_SENTINEL = 'response-sentinel-7707'
const REASONING_SENTINEL = 'reasoning-sentinel-7707'

test('MiniMax M2.7 provider makes one bounded non-streaming request with body-id provenance', async () => {
  const requests = []
  const timeoutCalls = []
  const provider = createMiniMaxM27Provider({
    baseUrl: 'https://api.minimaxi.com/v1/',
    apiKey: SECRET_SENTINEL,
    model: 'MiniMax-M2.7',
    timeoutSignalFactory(milliseconds) {
      timeoutCalls.push(milliseconds)
      return { kind: 'test-timeout-signal' }
    },
    fetchImpl: async (url, init) => {
      requests.push({ url, init })
      return {
        ok: true,
        headers: { get: (name) => name === 'trace_id' ? 'trace-123' : null },
        json: async () => ({
          id: 'minimax-request-123',
          usage: { total_tokens: 999999 },
          choices: [{
            message: {
              reasoning_content: REASONING_SENTINEL,
              content: '```json\n{"answer":"bounded"}\n```',
            },
          }],
        }),
      }
    },
  })

  const result = await provider.generateObject({
    schemaName: 'compiled-scenario/1.0',
    system: `Return one JSON object. ${PROMPT_SENTINEL}`,
    user: 'Compile the approved fixed slice.',
  })

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, 'https://api.minimaxi.com/v1/chat/completions')
  assert.deepEqual(timeoutCalls, [120_000])
  assert.deepEqual(requests[0].init.signal, { kind: 'test-timeout-signal' })
  assert.equal(requests[0].init.method, 'POST')
  assert.equal(requests[0].init.headers.Authorization, `Bearer ${SECRET_SENTINEL}`)
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    model: 'MiniMax-M2.7',
    messages: [
      { role: 'system', content: `Return one JSON object. ${PROMPT_SENTINEL}` },
      { role: 'user', content: 'Compile the approved fixed slice.' },
    ],
    temperature: 0.1,
    max_tokens: 8192,
    reasoning_split: true,
    stream: false,
  })
  for (const forbidden of ['response_format', 'tools', 'tool_choice', 'stream_options']) {
    assert.equal(Object.hasOwn(JSON.parse(requests[0].init.body), forbidden), false)
  }
  assert.deepEqual(result.object, { answer: 'bounded' })
  assert.deepEqual(result.provenance, {
    mode: 'live-model',
    provider: 'minimax',
    model: 'MiniMax-M2.7',
    schemaName: 'compiled-scenario/1.0',
    requestId: 'minimax-request-123',
    traceId: 'trace-123',
  })
  const accepted = JSON.stringify(result)
  for (const sentinel of [SECRET_SENTINEL, PROMPT_SENTINEL, REASONING_SENTINEL, 'total_tokens']) {
    assert.equal(accepted.includes(sentinel), false)
  }
})

test('MiniMax normalization strips one complete leading think wrapper and one JSON fence', () => {
  assert.deepEqual(parseModelObject('<think>private chain</think>\n```json\n{"ok":true}\n```'), { ok: true })
  assert.deepEqual(parseModelObject('```\n{"ok":true}\n```'), { ok: true })
  assert.deepEqual(parseModelObject('{"ok":true}'), { ok: true })

  for (const malformed of [
    '<think>truncated {"ok":true}',
    '<think>one</think><think>two</think>{"ok":true}',
    '```json\n{"ok":true}',
    '```json\n{"ok":true}\n``` trailing',
    '[]',
    '{"ok":',
  ]) {
    assert.throws(() => parseModelObject(malformed), /valid JSON object/i)
  }
})

test('MiniMax failures are sanitized and never retry or reflect request, response, or reasoning material', async () => {
  const cases = [
    {
      name: 'transport',
      fetchImpl: async () => { throw new Error(`${SECRET_SENTINEL} ${PROMPT_SENTINEL}`) },
      expected: 'MiniMax request failed before receiving a response',
    },
    {
      name: 'status',
      fetchImpl: async () => ({ ok: false, status: 401, text: async () => RESPONSE_SENTINEL }),
      expected: 'MiniMax request failed (401)',
    },
    {
      name: 'body json',
      fetchImpl: async () => ({
        ok: true,
        headers: { get: () => null },
        json: async () => { throw new Error(RESPONSE_SENTINEL) },
      }),
      expected: 'MiniMax response body was not valid JSON',
    },
    {
      name: 'missing body id',
      fetchImpl: async () => ({
        ok: true,
        headers: { get: () => null },
        json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
      }),
      expected: 'MiniMax response did not include a request id',
    },
    {
      name: 'malformed content',
      fetchImpl: async () => ({
        ok: true,
        headers: { get: () => null },
        json: async () => ({
          id: 'request-id',
          choices: [{ message: { reasoning_content: REASONING_SENTINEL, content: RESPONSE_SENTINEL } }],
        }),
      }),
      expected: 'MiniMax response did not contain a valid JSON object',
    },
  ]

  for (const entry of cases) {
    let fetchCount = 0
    const provider = createMiniMaxM27Provider({
      baseUrl: 'https://api.minimaxi.com/v1',
      apiKey: SECRET_SENTINEL,
      model: 'MiniMax-M2.7',
      fetchImpl: async (...args) => {
        fetchCount += 1
        return entry.fetchImpl(...args)
      },
    })
    await assert.rejects(
      () => provider.generateObject({
        schemaName: 'compiled-scenario/1.0',
        system: PROMPT_SENTINEL,
        user: 'bounded-user-prompt',
      }),
      (error) => {
        assert.equal(error.message, entry.expected, entry.name)
        for (const sentinel of [SECRET_SENTINEL, PROMPT_SENTINEL, RESPONSE_SENTINEL, REASONING_SENTINEL]) {
          assert.equal(error.message.includes(sentinel), false, entry.name)
        }
        return true
      },
    )
    assert.equal(fetchCount, 1, entry.name)
  }
})

test('MiniMax adapter requires the exact approved model and ignores absent trace metadata', async () => {
  assert.throws(
    () => createMiniMaxM27Provider({
      baseUrl: 'https://api.minimaxi.com/v1', apiKey: 'key', model: 'MiniMax-M2.7-highspeed',
    }),
    /MiniMax-M2\.7/,
  )
  const provider = createMiniMaxM27Provider({
    baseUrl: 'https://api.minimaxi.com/v1',
    apiKey: 'key',
    model: 'MiniMax-M2.7',
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => null },
      json: async () => ({ id: 'body-id', choices: [{ message: { content: '{"ok":true}' } }] }),
    }),
  })
  const result = await provider.generateObject({ schemaName: 'contract', system: 'system', user: 'user' })
  assert.equal(Object.hasOwn(result.provenance, 'traceId'), false)
  assert.equal(result.provenance.requestId, 'body-id')
})

test('MiniMax rejects oversized bodies and reflected or structured provenance identifiers without retry', async () => {
  const identifierCases = [
    ['secret body id', SECRET_SENTINEL, null, 'bounded system', '', null, '{"ok":true}'],
    ['prompt body id', PROMPT_SENTINEL, null, `bounded ${PROMPT_SENTINEL}`, '', null, '{"ok":true}'],
    ['reasoning trace id', 'safe-body-id', REASONING_SENTINEL, 'bounded system', REASONING_SENTINEL, null, '{"ok":true}'],
    ['structured body id', '{"raw":"response"}', null, 'bounded system', '', null, '{"ok":true}'],
    ['reasoning details body id', 'details-body-id', null, 'bounded system', '', [{ text: 'private details-body-id' }], '{"ok":true}'],
    ['reasoning details trace id', 'safe-body-id', 'details-trace-id', 'bounded system', '', { nested: { text: 'private details-trace-id' } }, '{"ok":true}'],
    ['leading think body id', 'think-body-id', null, 'bounded system', '', null, '<think>private think-body-id</think>{"ok":true}'],
    ['leading think trace id', 'safe-body-id', 'think-trace-id', 'bounded system', '', null, '<think>private think-trace-id</think>{"ok":true}'],
  ]
  for (const [name, id, traceId, system, reasoning, reasoningDetails, content] of identifierCases) {
    let fetchCount = 0
    const provider = createMiniMaxM27Provider({
      baseUrl: 'https://api.minimaxi.com/v1',
      apiKey: SECRET_SENTINEL,
      fetchImpl: async () => {
        fetchCount += 1
        return {
          ok: true,
          headers: { get: () => traceId },
          json: async () => ({
            id,
            choices: [{ message: { content, reasoning_content: reasoning, reasoning_details: reasoningDetails } }],
          }),
        }
      },
    })
    await assert.rejects(
      () => provider.generateObject({ schemaName: 'contract', system, user: 'bounded user' }),
      (error) => {
        assert.match(error.message, /metadata|request id/i, name)
        for (const sentinel of [SECRET_SENTINEL, PROMPT_SENTINEL, REASONING_SENTINEL, RESPONSE_SENTINEL]) {
          assert.equal(error.message.includes(sentinel), false, name)
        }
        return true
      },
    )
    assert.equal(fetchCount, 1, name)
  }

  let reads = 0
  const oversized = createMiniMaxM27Provider({
    baseUrl: 'https://api.minimaxi.com/v1',
    apiKey: SECRET_SENTINEL,
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => null },
      body: {
        getReader() {
          return {
            async read() {
              reads += 1
              if (reads === 1) return { done: false, value: new Uint8Array(1024 * 1024 + 1) }
              return { done: true }
            },
            async cancel() {},
          }
        },
      },
    }),
  })
  await assert.rejects(
    () => oversized.generateObject({ schemaName: 'contract', system: 'bounded system', user: 'bounded user' }),
    (error) => error.message === 'MiniMax response body exceeded the size limit',
  )
  assert.equal(reads, 1)
})

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
