import { createElement, PanelRightOpen, Pause, Play, RotateCcw, X } from '../node_modules/lucide/dist/esm/lucide.mjs'
import { createSimulationScene } from './scene.js'

const TEXT = Object.freeze({
  level: {
    individual: '个人',
    group: '群体',
    region: '地区',
    country: '国家',
    international: '国际',
  },
  domain: {
    economic: '经济',
    political: '政治',
    cultural: '文化',
    social: '社会',
    internet: '互联网',
  },
  region: {
    'east-asia': '东亚',
    'north-america': '北美',
    europe: '欧洲',
    'southeast-asia': '东南亚',
    'latin-america': '拉丁美洲',
  },
  phase: {
    'pre-release': '发布前常态',
    incident: '危机触发',
    response: '响应与恢复',
  },
  driver: {
    background: '背景扰动',
    domain: '议题敏感度',
    sharedTrigger: '共同触发',
    priorCrisis: '历史危机记忆',
    controllability: '责任归因',
    identityFriction: '身份摩擦',
    network: '网络放大',
    trust: '信任缓冲',
    randomVariation: '个体差异',
    pressureClamp: '压力边界',
    response: '公开响应',
    riskClamp: '风险边界',
    roundingResidual: '定点舍入',
  },
})

const elements = {
  app: document.querySelector('#simulation-app'),
  status: document.querySelector('[data-testid="simulation-data-status"]'),
  loading: document.querySelector('#loading-state'),
  fatal: document.querySelector('#fatal-state'),
  fatalMessage: document.querySelector('#fatal-message'),
  canvas: document.querySelector('#simulation-canvas'),
  canvasHost: document.querySelector('#canvas-host'),
  axisLayer: document.querySelector('#axis-label-layer'),
  phase: document.querySelector('#phase-label'),
  aggregate: document.querySelector('#aggregate-risk'),
  aggregateLabel: document.querySelector('#aggregate-label'),
  day: document.querySelector('#simulation-day'),
  range: document.querySelector('#timeline-range'),
  events: document.querySelector('#timeline-events'),
  activeEvent: document.querySelector('#active-event'),
  speed: document.querySelector('#playback-speed'),
  playback: document.querySelector('#playback-toggle'),
  reset: document.querySelector('#reset-camera'),
  toggleInspector: document.querySelector('#toggle-inspector'),
  closeInspector: document.querySelector('#close-inspector'),
  inspector: document.querySelector('#simulation-inspector'),
  selectedId: document.querySelector('#selected-agent-id'),
  agentLevel: document.querySelector('#agent-level'),
  agentDomain: document.querySelector('#agent-domain'),
  agentRegion: document.querySelector('#agent-region'),
  agentDay: document.querySelector('#agent-day'),
  agentRisk: document.querySelector('#agent-risk'),
  agentPressure: document.querySelector('#agent-pressure'),
  agentNetwork: document.querySelector('#agent-network'),
  agentResponse: document.querySelector('#agent-response'),
  agentIntegrity: document.querySelector('#agent-integrity'),
  metricLabels: [...document.querySelectorAll('.metric-list dt')],
  driverList: document.querySelector('#driver-list'),
  viewButtons: [...document.querySelectorAll('[data-view]')],
}

const state = {
  bundle: null,
  view: 'candidate',
  playhead: 1,
  sourceDay: 1,
  speed: 1,
  playing: false,
  selectedId: null,
  lastTick: performance.now(),
  frameCache: new Map(),
  dirty: true,
}

let simulationScene = null

function setIcon(button, icon) {
  button.replaceChildren(createElement(icon, { 'aria-hidden': 'true', width: 18, height: 18 }))
}

function refreshPlaybackIcon() {
  setIcon(elements.playback, state.playing ? Pause : Play)
  const label = state.playing ? '暂停' : '播放'
  elements.playback.setAttribute('aria-label', label)
  elements.playback.title = label
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function fetchVerifiedBundle() {
  const manifestResponse = await fetch('../experiments/output/visual-data-manifest.json', { cache: 'no-store' })
  if (!manifestResponse.ok) throw new Error(`数据清单请求失败（${manifestResponse.status}）`)
  const manifest = await manifestResponse.json()
  if (manifest.manifestVersion !== 'visual-data-manifest/1.0') throw new Error('不支持的数据清单版本')
  if (!/^[a-z0-9.-]+\.json$/.test(manifest.artifact)) throw new Error('数据清单包含无效文件名')
  if (!Number.isSafeInteger(manifest.byteLength) || manifest.byteLength <= 0) throw new Error('数据清单包含无效字节长度')
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('数据清单包含无效 SHA-256')

  const artifactResponse = await fetch(`../experiments/output/${manifest.artifact}`, { cache: 'no-store' })
  if (!artifactResponse.ok) throw new Error(`演化数据请求失败（${artifactResponse.status}）`)
  const artifactText = await artifactResponse.text()
  const artifactBytes = new TextEncoder().encode(artifactText)
  if (artifactBytes.byteLength !== manifest.byteLength) throw new Error('演化数据长度与清单不一致')
  if (!globalThis.crypto?.subtle) throw new Error('当前浏览器无法执行 SHA-256 数据校验')
  const digest = bytesToHex(await globalThis.crypto.subtle.digest('SHA-256', artifactBytes))
  if (digest !== manifest.sha256) throw new Error('演化数据 SHA-256 校验失败')

  const artifact = JSON.parse(artifactText)
  if (artifact.artifactVersion !== manifest.artifactVersion) throw new Error('数据产物版本与清单不一致')
  if (artifact.bundle?.schemaVersion !== manifest.bundleSchemaVersion) throw new Error('数据契约版本与清单不一致')
  if (artifact.bundle.identities?.length !== manifest.populationSize) throw new Error('Agent 数量与清单不一致')
  if (artifact.bundle.timeline?.dayCount !== manifest.cycleDays) throw new Error('发行周期与清单不一致')
  return artifact.bundle
}

function decodeFrame(view, day) {
  const key = `${view}:${day}`
  if (!state.frameCache.has(key)) {
    const api = globalThis.ZZZVisualizationBundle
    if (!api?.decodeVisualFrame) throw new Error('浏览器解码器未载入')
    state.frameCache.set(key, api.decodeVisualFrame(state.bundle, { view, day }))
  }
  return state.frameCache.get(key)
}

function sourceDay() {
  return Math.min(state.bundle.timeline.dayCount, Math.max(1, Math.round(state.playhead)))
}

function signed(value, digits = 1) {
  if (!Number.isFinite(value)) return '--'
  if (Math.abs(value) < 0.05) return '0.0'
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`
}

function percent(value, signedValue = false) {
  if (!Number.isFinite(value)) return '--'
  const percentage = value * 100
  return signedValue ? `${signed(percentage)} pt` : `${percentage.toFixed(1)}%`
}

function renderTimelineMarks() {
  elements.events.replaceChildren()
  const maximum = Math.max(1, state.bundle.timeline.dayCount - 1)
  state.bundle.events.forEach((event) => {
    const mark = document.createElement('i')
    mark.className = 'timeline-event-mark'
    mark.style.left = `${((event.day - 1) / maximum) * 100}%`
    if (event.strategy) mark.dataset.strategy = event.strategy
    elements.events.append(mark)
  })
}

function renderDrivers(front, view) {
  elements.driverList.replaceChildren()
  const values = view === 'delta' ? front.driverDeltas : front.drivers
  if (!values) return
  const leading = Object.entries(values)
    .filter(([, value]) => Number.isFinite(value) && Math.abs(value) > 0.000001)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, 5)
  const maximum = Math.max(0.001, ...leading.map(([, value]) => Math.abs(value)))

  leading.forEach(([name, value]) => {
    const row = document.createElement('div')
    row.className = 'driver-row'
    const metadata = document.createElement('div')
    metadata.className = 'driver-row__meta'
    const label = document.createElement('span')
    label.textContent = TEXT.driver[name] || name
    const amount = document.createElement('strong')
    amount.textContent = signed(value * 100, 2)
    metadata.append(label, amount)

    const track = document.createElement('div')
    track.className = 'driver-track'
    const fill = document.createElement('i')
    fill.className = `driver-fill${value < 0 ? ' is-negative' : ''}`
    const width = Math.max(1.5, Math.abs(value) / maximum * 50)
    fill.style.width = `${width}%`
    fill.style.left = value < 0 ? `${50 - width}%` : '50%'
    track.append(fill)
    row.append(metadata, track)
    elements.driverList.append(row)
  })
}

function renderInspector(day) {
  if (!state.selectedId) return
  const identity = state.bundle.identities.find((candidate) => candidate.id === state.selectedId)
  if (!identity) return
  const frame = decodeFrame(state.view, day)
  const agent = frame.agents.find((candidate) => candidate.id === state.selectedId)
  if (!agent) return
  const deltaMode = state.view === 'delta'
  const front = agent.front

  elements.selectedId.textContent = identity.id
  elements.agentLevel.textContent = TEXT.level[identity.level] || identity.level
  elements.agentDomain.textContent = TEXT.domain[identity.domain] || identity.domain
  elements.agentRegion.textContent = TEXT.region[identity.region] || identity.region
  elements.agentDay.textContent = `第 ${String(day).padStart(2, '0')} 天`

  elements.metricLabels[0].textContent = deltaMode ? '风险差值' : '风险'
  elements.metricLabels[1].textContent = deltaMode ? '压力差值' : '压力'
  elements.metricLabels[2].textContent = deltaMode ? '网络放大差值' : '网络放大'
  elements.metricLabels[3].textContent = deltaMode ? '响应缓冲差值' : '响应缓冲'
  elements.metricLabels[4].textContent = deltaMode ? '完整度差值' : '完整度'

  elements.agentRisk.textContent = percent(deltaMode ? front.riskDelta : front.risk, deltaMode)
  elements.agentPressure.textContent = percent(deltaMode ? front.pressureDelta : front.pressure, deltaMode)
  elements.agentNetwork.textContent = percent(
    deltaMode ? front.networkPressureDelta : front.networkPressure,
    deltaMode,
  )
  elements.agentResponse.textContent = percent(
    deltaMode ? front.responseBufferDelta : front.responseBuffer,
    deltaMode,
  )
  elements.agentIntegrity.textContent = percent(
    deltaMode ? front.integrityDelta : front.integrity,
    deltaMode,
  )
  renderDrivers(front, state.view)
}

function currentEvent(day, phase) {
  const direct = state.bundle.events.find((event) => event.day === day)
  if (direct) return direct.label
  const responseStart = state.bundle.events.find((event) => event.type === 'response-start')
  if (responseStart && day > responseStart.day) return '响应效果持续演化'
  return TEXT.phase[phase] || '常态波动'
}

function renderState() {
  const maximumDay = state.bundle.timeline.dayCount
  const day = sourceDay()
  state.sourceDay = day
  const lowerDay = Math.floor(state.playhead)
  const upperDay = Math.min(maximumDay, lowerDay + 1)
  const mix = state.playhead - lowerDay
  const absoluteView = state.view === 'delta' ? 'candidate' : state.view
  const frame = decodeFrame(absoluteView, lowerDay)
  const nextFrame = decodeFrame(absoluteView, upperDay)
  const deltaFrame = state.view === 'delta' ? decodeFrame('delta', lowerDay) : null
  const nextDeltaFrame = state.view === 'delta' ? decodeFrame('delta', upperDay) : null
  simulationScene.updateVisuals({
    frame,
    nextFrame,
    deltaFrame,
    nextDeltaFrame,
    mix,
    view: state.view,
    playhead: state.playhead,
  })

  const displayFrame = decodeFrame(state.view, day)
  const aggregate = state.view === 'delta'
    ? displayFrame.aggregateRiskDelta
    : displayFrame.aggregateRisk
  elements.aggregate.textContent = state.view === 'delta' ? signed(aggregate) : aggregate.toFixed(1)
  if (state.view === 'delta') {
    elements.aggregate.dataset.direction = aggregate < 0 ? 'improving' : aggregate > 0 ? 'worsening' : 'neutral'
  } else {
    elements.aggregate.dataset.direction = aggregate >= 35 ? 'worsening' : aggregate >= 15 ? 'watch' : 'stable'
  }
  elements.aggregateLabel.textContent = {
    baseline: '沉默方案指数',
    candidate: '响应方案指数',
    delta: '相对沉默差值',
  }[state.view]
  elements.phase.textContent = TEXT.phase[displayFrame.phase] || displayFrame.phase
  elements.day.textContent = `${String(day).padStart(2, '0')} / ${String(maximumDay).padStart(2, '0')}`
  elements.range.value = String(state.playhead)
  elements.activeEvent.textContent = currentEvent(day, displayFrame.phase)
  renderInspector(day)
  state.dirty = false
}

function setPlaying(playing) {
  state.playing = playing
  state.lastTick = performance.now()
  refreshPlaybackIcon()
}

function setPlayhead(playhead, { pause = false } = {}) {
  state.playhead = Math.min(state.bundle.timeline.dayCount, Math.max(1, playhead))
  state.dirty = true
  if (pause) setPlaying(false)
}

function setView(view) {
  if (!['baseline', 'candidate', 'delta'].includes(view)) return
  state.view = view
  elements.viewButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.view === view))
  })
  state.dirty = true
}

function selectAgent(id) {
  state.selectedId = id
  const index = state.bundle.identities.findIndex((identity) => identity.id === id)
  simulationScene.selectAgent(index)
  elements.inspector.dataset.open = 'true'
  elements.toggleInspector.setAttribute('aria-label', '关闭检视面板')
  renderInspector(state.sourceDay)
}

function bindControls() {
  function togglePlayback() {
    if (state.playhead >= state.bundle.timeline.dayCount) setPlayhead(1)
    setPlaying(!state.playing)
  }
  elements.playback.addEventListener('click', togglePlayback)
  elements.range.addEventListener('input', () => setPlayhead(Number(elements.range.value), { pause: true }))
  elements.speed.addEventListener('change', () => {
    state.speed = Number(elements.speed.value)
  })
  elements.viewButtons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)))
  elements.reset.addEventListener('click', () => simulationScene.resetCamera())
  elements.toggleInspector.addEventListener('click', () => {
    const open = elements.inspector.dataset.open !== 'true'
    elements.inspector.dataset.open = String(open)
    elements.toggleInspector.setAttribute('aria-label', open ? '关闭检视面板' : '打开检视面板')
  })
  elements.closeInspector.addEventListener('click', () => {
    elements.inspector.dataset.open = 'false'
    elements.toggleInspector.setAttribute('aria-label', '打开检视面板')
  })
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
    if (event.code === 'Space') {
      event.preventDefault()
      togglePlayback()
    } else if (event.key === 'ArrowRight') {
      setPlayhead(Math.round(state.playhead) + 1, { pause: true })
    } else if (event.key === 'ArrowLeft') {
      setPlayhead(Math.round(state.playhead) - 1, { pause: true })
    } else if (event.key === 'Home') {
      setPlayhead(1, { pause: true })
    } else if (event.key === 'End') {
      setPlayhead(state.bundle.timeline.dayCount, { pause: true })
    } else if (event.key === 'Escape') {
      elements.inspector.dataset.open = 'false'
    }
  })
}

function animationTick(now) {
  const elapsedSeconds = Math.min(0.1, Math.max(0, (now - state.lastTick) / 1000))
  state.lastTick = now
  if (state.playing) {
    state.playhead += elapsedSeconds * state.speed * 0.82
    if (state.playhead >= state.bundle.timeline.dayCount) {
      state.playhead = state.bundle.timeline.dayCount
      setPlaying(false)
    }
    state.dirty = true
  }
  if (state.dirty) renderState()
  requestAnimationFrame(animationTick)
}

async function start() {
  setIcon(elements.reset, RotateCcw)
  setIcon(elements.toggleInspector, PanelRightOpen)
  setIcon(elements.closeInspector, X)
  refreshPlaybackIcon()

  try {
    state.bundle = await fetchVerifiedBundle()
    elements.range.max = String(state.bundle.timeline.dayCount)
    renderTimelineMarks()
    simulationScene = createSimulationScene({
      canvas: elements.canvas,
      host: elements.canvasHost,
      axisLayer: elements.axisLayer,
      identities: state.bundle.identities,
      board: state.bundle.board,
      events: state.bundle.events,
      onSelect: selectAgent,
    })
    bindControls()
    renderState()
    elements.loading.hidden = true
    elements.status.classList.add('is-ready')
    elements.status.querySelector('span:last-child').textContent = '数据已校验'
    elements.app.dataset.simulationReady = 'true'
    globalThis.__simulationDiagnostics = {
      agentScreenPoint: (id) => simulationScene.agentScreenPoint(id),
      pixelStats: () => simulationScene.pixelStats(),
      selectAgent,
    }
    requestAnimationFrame(animationTick)
  } catch (error) {
    elements.loading.hidden = true
    elements.fatal.hidden = false
    elements.fatalMessage.textContent = error instanceof Error ? error.message : '未知启动错误'
    elements.status.classList.add('is-error')
    elements.status.querySelector('span:last-child').textContent = '数据校验失败'
  }
}

start()
