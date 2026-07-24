'use strict'

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new TypeError(`${label} is required`)
  return value.trim()
}

function isLoopbackHost(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (normalized === 'localhost' || normalized === '::1') return true
  const octets = normalized.split('.')
  return octets.length === 4 && octets[0] === '127' && octets.every((octet) => {
    return /^\d{1,3}$/.test(octet) && Number(octet) <= 255
  })
}

function normalizeBaseUrl(value) {
  const url = new URL(requiredString(value, 'Model base URL'))
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Model base URL must use HTTP(S)')
  if (url.protocol === 'http:' && !isLoopbackHost(url.hostname)) {
    throw new TypeError('Remote model base URL must use HTTPS')
  }
  return url.toString().replace(/\/$/, '')
}

function parseModelObject(content) {
  if (content && typeof content === 'object' && !Array.isArray(content)) return structuredClone(content)
  if (typeof content !== 'string') throw new TypeError('Model response must be a valid JSON object')
  let normalized = content.trim()
  if (normalized.startsWith('<think>')) {
    const thinkMatch = normalized.match(/^<think>[\s\S]*?<\/think>\s*/)
    if (!thinkMatch) throw new TypeError('Model response must be a valid JSON object')
    normalized = normalized.slice(thinkMatch[0].length).trim()
    if (normalized.startsWith('<think>')) throw new TypeError('Model response must be a valid JSON object')
  }
  if (normalized.startsWith('```')) {
    const fenceMatch = normalized.match(/^```(?:json)?[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?```$/i)
    if (!fenceMatch) throw new TypeError('Model response must be a valid JSON object')
    normalized = fenceMatch[1].trim()
  }
  try {
    const parsed = JSON.parse(normalized)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
    return parsed
  } catch {
    throw new TypeError('Model response must be a valid JSON object')
  }
}

function createMiniMaxM27Provider({
  baseUrl,
  apiKey,
  model = 'MiniMax-M2.7',
  fetchImpl = globalThis.fetch,
  timeoutSignalFactory = (milliseconds) => AbortSignal.timeout(milliseconds),
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const secret = requiredString(apiKey, 'Model API key')
  const modelName = requiredString(model, 'Model name')
  if (modelName !== 'MiniMax-M2.7') throw new TypeError('MiniMax provider requires model MiniMax-M2.7')
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required')
  if (typeof timeoutSignalFactory !== 'function') throw new TypeError('A timeout signal factory is required')

  return Object.freeze({
    async generateObject({ schemaName, system, user } = {}) {
      const contract = requiredString(schemaName, 'Schema name')
      const body = {
        model: modelName,
        messages: [
          { role: 'system', content: requiredString(system, 'System prompt') },
          { role: 'user', content: requiredString(user, 'User prompt') },
        ],
        temperature: 0.1,
        reasoning_split: true,
        stream: false,
      }
      let response
      try {
        response = await fetchImpl(`${normalizedBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify(body),
          signal: timeoutSignalFactory(120_000),
        })
      } catch {
        throw new Error('MiniMax request failed before receiving a response')
      }
      if (!response?.ok) {
        const status = Number.isInteger(response?.status) ? ` (${response.status})` : ''
        throw new Error(`MiniMax request failed${status}`)
      }
      let payload
      try {
        payload = await response.json()
      } catch {
        throw new Error('MiniMax response body was not valid JSON')
      }
      if (typeof payload?.id !== 'string' || payload.id.trim().length === 0) {
        throw new Error('MiniMax response did not include a request id')
      }
      let object
      try {
        object = parseModelObject(payload?.choices?.[0]?.message?.content)
      } catch {
        throw new Error('MiniMax response did not contain a valid JSON object')
      }
      const provenance = {
        mode: 'live-model',
        provider: 'minimax',
        model: modelName,
        schemaName: contract,
        requestId: payload.id.trim(),
      }
      let traceId = null
      try {
        traceId = response.headers?.get?.('trace_id')
      } catch {
        throw new Error('MiniMax response metadata could not be read')
      }
      if (typeof traceId === 'string' && traceId.trim().length > 0) provenance.traceId = traceId.trim()
      return { object, provenance }
    },
  })
}

function createOpenAICompatibleProvider({
  baseUrl,
  apiKey,
  model,
  fetchImpl = globalThis.fetch,
  supportsJsonMode = true,
  temperature = 0.1,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const secret = requiredString(apiKey, 'Model API key')
  const modelName = requiredString(model, 'Model name')
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required')
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new TypeError('Model temperature must be between 0 and 2')
  }

  return Object.freeze({
    async generateObject({ schemaName, system, user } = {}) {
      const contract = requiredString(schemaName, 'Schema name')
      const body = {
        model: modelName,
        messages: [
          { role: 'system', content: requiredString(system, 'System prompt') },
          { role: 'user', content: requiredString(user, 'User prompt') },
        ],
        temperature,
      }
      if (supportsJsonMode) body.response_format = { type: 'json_object' }
      let response
      try {
        response = await fetchImpl(`${normalizedBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify(body),
        })
      } catch {
        throw new Error('Model request failed before receiving a response')
      }
      if (!response?.ok) {
        const status = Number.isInteger(response?.status) ? ` (${response.status})` : ''
        throw new Error(`Model request failed${status}`)
      }
      const payload = await response.json()
      const content = payload?.choices?.[0]?.message?.parsed ?? payload?.choices?.[0]?.message?.content
      return {
        object: parseModelObject(content),
        provenance: {
          mode: 'live-model',
          provider: 'openai-compatible',
          model: modelName,
          schemaName: contract,
          requestId: response.headers?.get?.('x-request-id') || payload?.id || null,
        },
      }
    },
  })
}

function createReplayProvider({ model, recordingId, object } = {}) {
  const modelName = requiredString(model, 'Recorded model name')
  const id = requiredString(recordingId, 'Recording id')
  if (!object || typeof object !== 'object' || Array.isArray(object)) {
    throw new TypeError('Recorded model object is required')
  }
  const recording = structuredClone(object)
  return Object.freeze({
    async generateObject({ schemaName } = {}) {
      return {
        object: structuredClone(recording),
        provenance: {
          mode: 'recorded-model-output',
          provider: 'replay',
          model: modelName,
          schemaName: requiredString(schemaName, 'Schema name'),
          recordingId: id,
          requestId: null,
        },
      }
    },
  })
}

const aiProviderApi = {
  createMiniMaxM27Provider,
  createOpenAICompatibleProvider,
  createReplayProvider,
  parseModelObject,
}

if (typeof module !== 'undefined' && module.exports) module.exports = aiProviderApi
if (typeof globalThis !== 'undefined') globalThis.ZZZAIProvider = aiProviderApi
