import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createPieceGeometries } from './piece-geometries.js'

const CELL_SIZE = 4
const BOARD_SIZE = 21
const SLOT_OFFSETS = Object.freeze([
  [-0.88, -0.72],
  [0.88, -0.72],
  [0, 0],
  [-0.88, 0.72],
  [0.88, 0.72],
])
const DOMAIN_COLORS = Object.freeze([
  0x29936b,
  0xc08c2b,
  0x7867a4,
  0xcf654f,
  0x318493,
])
const DOMAIN_COLOR_VALUES = DOMAIN_COLORS.map((color) => new THREE.Color(color))
const DELTA_NEUTRAL_COLOR = new THREE.Color(0x8e9791)
const DELTA_STABLE_COLOR = new THREE.Color(0x78827c)
const DELTA_IMPROVING_COLOR = new THREE.Color(0x168c63)
const DELTA_WORSENING_COLOR = new THREE.Color(0xd34f3f)
const PRESSURE_COLOR = new THREE.Color(0xd4493b)
const RISK_WARNING_COLOR = new THREE.Color(0xd94f3d)
const TILE_BASE_COLOR = new THREE.Color(0xdde2db)
const TILE_PRESSURE_COLOR = new THREE.Color(0xe4b0a3)
const LABELS = Object.freeze({
  individual: '个人',
  group: '群体',
  region: '地区',
  country: '国家',
  international: '国际',
  economic: '经济',
  political: '政治',
  cultural: '文化',
  social: '社会',
  internet: '互联网',
})

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function lerp(left, right, amount) {
  return left + (right - left) * amount
}

function frontValue(front, field, fallback = 0) {
  const value = front?.[field]
  return Number.isFinite(value) ? value : fallback
}

function stableUnit(index, salt) {
  const value = Math.sin((index + 1) * 91.371 + salt * 17.113) * 43758.5453
  return value - Math.floor(value)
}

function interpolateFront(frame, nextFrame, index, mix) {
  const current = frame.agents[index].front
  const next = nextFrame.agents[index].front
  return {
    risk: lerp(frontValue(current, 'risk'), frontValue(next, 'risk'), mix),
    pressure: lerp(frontValue(current, 'pressure'), frontValue(next, 'pressure'), mix),
    integrity: lerp(frontValue(current, 'integrity', 1), frontValue(next, 'integrity', 1), mix),
    dissolve: lerp(frontValue(current, 'dissolve'), frontValue(next, 'dissolve'), mix),
  }
}

function interpolateDelta(frame, nextFrame, index, mix) {
  const current = frame.agents[index].front
  const next = nextFrame.agents[index].front
  return lerp(frontValue(current, 'riskDelta'), frontValue(next, 'riskDelta'), mix)
}

function riskColor(domain, risk, target) {
  const amount = clamp((risk - 0.16) / 0.64)
  return target.copy(DOMAIN_COLOR_VALUES[domain]).lerp(RISK_WARNING_COLOR, amount)
}

function deltaColor(delta, target) {
  if (Math.abs(delta) < 0.004) return target.copy(DELTA_STABLE_COLOR)
  const magnitude = clamp(Math.abs(delta) / 0.38)
  const direction = delta < 0 ? DELTA_IMPROVING_COLOR : DELTA_WORSENING_COLOR
  return target.copy(DELTA_NEUTRAL_COLOR).lerp(direction, 0.45 + magnitude * 0.55)
}

function agentPosition(identity) {
  const [slotX, slotZ] = SLOT_OFFSETS[identity.board.slot]
  return new THREE.Vector3(
    (identity.board.column - 2) * CELL_SIZE + slotX,
    0.08,
    (identity.board.row - 2) * CELL_SIZE + slotZ,
  )
}

function makeAxisLabels(layer, board) {
  const labels = []
  board.rows.forEach((row, index) => {
    const element = document.createElement('span')
    element.className = 'axis-label'
    element.dataset.axis = 'row'
    element.textContent = LABELS[row] || row
    layer.append(element)
    labels.push({ element, position: new THREE.Vector3(-11.25, 0.05, (index - 2) * CELL_SIZE) })
  })
  board.columns.forEach((column, index) => {
    const element = document.createElement('span')
    element.className = 'axis-label'
    element.dataset.axis = 'column'
    element.textContent = LABELS[column] || column
    layer.append(element)
    labels.push({ element, position: new THREE.Vector3((index - 2) * CELL_SIZE, 0.05, -11.25) })
  })
  return labels
}

export function createSimulationScene({ canvas, host, axisLayer, identities, board, events = [], onSelect }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.setClearColor(0xe9ede7, 1)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xe9ede7)
  scene.fog = new THREE.Fog(0xe9ede7, 52, 92)

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.minDistance = 17
  controls.maxDistance = 62
  controls.minPolarAngle = THREE.MathUtils.degToRad(28)
  controls.maxPolarAngle = THREE.MathUtils.degToRad(78)
  controls.target.set(0, 0.2, 0)

  scene.add(new THREE.AmbientLight(0xfffdf5, 1.35))
  scene.add(new THREE.HemisphereLight(0xf9fbf4, 0x5b655e, 1.8))
  const keyLight = new THREE.DirectionalLight(0xfff4df, 2.4)
  keyLight.position.set(-11, 20, 13)
  scene.add(keyLight)
  const rimLight = new THREE.DirectionalLight(0xb9d8d1, 1.15)
  rimLight.position.set(15, 9, -13)
  scene.add(rimLight)

  const boardBase = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_SIZE + 0.8, 0.22, BOARD_SIZE + 0.8),
    new THREE.MeshStandardMaterial({ color: 0xcbd1ca, roughness: 0.93, metalness: 0 }),
  )
  boardBase.position.y = -0.16
  scene.add(boardBase)

  const tileGeometry = new THREE.BoxGeometry(CELL_SIZE - 0.12, 0.1, CELL_SIZE - 0.12)
  const tileMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const tiles = new THREE.InstancedMesh(tileGeometry, tileMaterial, 25)
  tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  tiles.frustumCulled = false
  scene.add(tiles)

  const dummy = new THREE.Object3D()
  const tempColor = new THREE.Color()
  const tempPieceColor = new THREE.Color()
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const index = row * 5 + column
      dummy.position.set((column - 2) * CELL_SIZE, -0.025, (row - 2) * CELL_SIZE)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      tiles.setMatrixAt(index, dummy.matrix)
      tiles.setColorAt(index, tempColor.set(0xdce1da))
    }
  }
  tiles.instanceMatrix.needsUpdate = true
  tiles.instanceColor.needsUpdate = true

  const grid = new THREE.GridHelper(BOARD_SIZE - 0.7, 5, 0x7a857e, 0xaeb6af)
  grid.position.y = 0.035
  scene.add(grid)

  const geometries = createPieceGeometries()
  const levels = board.rows
  const levelMeshes = new Map()
  const agentMeshRefs = new Array(identities.length)
  levels.forEach((level) => {
    const indices = identities
      .map((identity, index) => ({ identity, index }))
      .filter(({ identity }) => identity.level === level)
      .map(({ index }) => index)
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.49,
      metalness: 0.13,
    })
    const mesh = new THREE.InstancedMesh(geometries[level], material, indices.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    mesh.userData.agentIndices = indices
    indices.forEach((agentIndex, instanceIndex) => {
      agentMeshRefs[agentIndex] = { mesh, instanceIndex }
    })
    levelMeshes.set(level, mesh)
    scene.add(mesh)
  })

  const reverseGeometry = new THREE.CircleGeometry(0.43, 20)
  const reverseMaterial = new THREE.MeshBasicMaterial({
    color: 0x111412,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const reverseShadows = new THREE.InstancedMesh(reverseGeometry, reverseMaterial, identities.length)
  reverseShadows.frustumCulled = false
  identities.forEach((identity, index) => {
    const position = agentPosition(identity)
    dummy.position.set(position.x + 0.26, 0.065, position.z + 0.29)
    dummy.rotation.set(-Math.PI / 2, 0, 0)
    dummy.scale.set(1.18, 0.68, 1)
    dummy.updateMatrix()
    reverseShadows.setMatrixAt(index, dummy.matrix)
  })
  reverseShadows.instanceMatrix.needsUpdate = true
  scene.add(reverseShadows)

  const haloGeometry = new THREE.RingGeometry(0.34, 0.44, 22)
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const pressureHalos = new THREE.InstancedMesh(haloGeometry, haloMaterial, identities.length)
  pressureHalos.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  pressureHalos.frustumCulled = false
  scene.add(pressureHalos)

  const fragmentCount = identities.length * 3
  const fragmentGeometry = new THREE.TetrahedronGeometry(0.105, 0)
  const fragmentMaterial = new THREE.MeshStandardMaterial({ roughness: 0.58, metalness: 0.08 })
  const fragments = new THREE.InstancedMesh(fragmentGeometry, fragmentMaterial, fragmentCount)
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  fragments.frustumCulled = false
  scene.add(fragments)

  const selection = new THREE.Mesh(
    new THREE.RingGeometry(0.52, 0.61, 28),
    new THREE.MeshBasicMaterial({ color: 0x17211b, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
  )
  selection.rotation.x = -Math.PI / 2
  selection.position.y = 0.075
  selection.visible = false
  scene.add(selection)

  function pulse(color) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(2.25, 2.34, 72),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0.09
    scene.add(mesh)
    return mesh
  }
  const eventPulse = pulse(0xd84f3e)
  const responsePulse = pulse(0x1d9167)
  const scenarioEventDay = events.find((event) => event.type === 'scenario-event')?.day ?? null
  const responseEventDay = events.find((event) => event.type === 'response-start')?.day ?? null

  const axisLabels = makeAxisLabels(axisLayer, board)
  const positions = identities.map(agentPosition)
  let latestPlayhead = 1
  let selectedIndex = -1
  let animationHandle = 0
  let elapsed = 0
  let lastTime = performance.now()

  function resetCamera() {
    const aspect = Math.max(0.4, host.clientWidth / Math.max(host.clientHeight, 1))
    if (aspect < 0.9) {
      camera.position.set(22, 25, 30)
      controls.target.set(0, 0.25, 2.1)
    } else {
      camera.position.set(18, 20, 25)
      controls.target.set(0, 0.25, 0)
    }
    controls.update()
  }

  function resize() {
    const width = Math.max(1, host.clientWidth)
    const height = Math.max(1, host.clientHeight)
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function updateLabels() {
    const rect = canvas.getBoundingClientRect()
    axisLabels.forEach(({ element, position }) => {
      const projected = position.clone().project(camera)
      const visible = projected.z > -1 && projected.z < 1
      const x = (projected.x * 0.5 + 0.5) * rect.width
      const y = (-projected.y * 0.5 + 0.5) * rect.height
      const inside = x > 22 && x < rect.width - 22 && y > 16 && y < rect.height - 16
      element.hidden = !visible || !inside
      if (!visible || !inside) return
      element.style.left = `${x}px`
      element.style.top = `${y}px`
    })
  }

  function updatePulse(mesh, eventDay, playhead, phaseOffset) {
    if (!Number.isInteger(eventDay)) {
      mesh.visible = false
      return
    }
    const proximity = clamp(1 - Math.abs(playhead - eventDay) / 1.25)
    const wave = (elapsed * 0.42 + phaseOffset) % 1
    const scale = 0.85 + wave * 3.2
    mesh.scale.setScalar(scale)
    mesh.material.opacity = proximity * (1 - wave) * 0.62
    mesh.visible = proximity > 0.001
  }

  function updateVisuals({ frame, nextFrame, deltaFrame, nextDeltaFrame, mix, view, playhead }) {
    latestPlayhead = playhead
    const cellPressure = new Float32Array(25)
    const cellCounts = new Uint8Array(25)

    identities.forEach((identity, index) => {
      const front = interpolateFront(frame, nextFrame, index, mix)
      const delta = view === 'delta'
        ? interpolateDelta(deltaFrame, nextDeltaFrame, index, mix)
        : 0
      const position = positions[index]
      const dissolve = clamp(front.dissolve)
      const integrity = clamp(front.integrity)
      const pressure = clamp(front.pressure)
      const pieceColor = view === 'delta'
        ? deltaColor(delta, tempPieceColor)
        : riskColor(identity.board.column, front.risk, tempPieceColor)

      const { mesh, instanceIndex } = agentMeshRefs[index]
      const angle = stableUnit(index, 2) * Math.PI * 2
      const tilt = dissolve * 0.28
      const scale = 0.72 + integrity * 0.28
      dummy.position.copy(position)
      dummy.rotation.set(Math.cos(angle) * tilt, (stableUnit(index, 5) - 0.5) * 0.28, Math.sin(angle) * tilt)
      dummy.scale.set(scale, scale * (0.82 + integrity * 0.18), scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(instanceIndex, dummy.matrix)
      mesh.setColorAt(instanceIndex, pieceColor)

      const haloScale = pressure < 0.025 ? 0.001 : 0.48 + pressure * 1.18
      dummy.position.set(position.x, 0.072, position.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.set(haloScale, haloScale, haloScale)
      dummy.updateMatrix()
      pressureHalos.setMatrixAt(index, dummy.matrix)
      pressureHalos.setColorAt(index, tempColor.set(0xd99a37).lerp(PRESSURE_COLOR, pressure))

      for (let fragment = 0; fragment < 3; fragment += 1) {
        const fragmentIndex = index * 3 + fragment
        const direction = angle + fragment * (Math.PI * 2 / 3) + stableUnit(index, fragment + 11) * 0.6
        const distance = dissolve * (0.35 + fragment * 0.16)
        const fragmentScale = dissolve < 0.035 ? 0.001 : 0.22 + dissolve * 0.8
        dummy.position.set(
          position.x + Math.cos(direction) * distance,
          0.38 + dissolve * (0.35 + fragment * 0.22),
          position.z + Math.sin(direction) * distance,
        )
        dummy.rotation.set(direction * 0.7, elapsed * 0.25 + fragment, direction)
        dummy.scale.setScalar(fragmentScale)
        dummy.updateMatrix()
        fragments.setMatrixAt(fragmentIndex, dummy.matrix)
        fragments.setColorAt(fragmentIndex, pieceColor)
      }

      const cellIndex = identity.board.row * 5 + identity.board.column
      cellPressure[cellIndex] += pressure
      cellCounts[cellIndex] += 1
    })

    levelMeshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true
      mesh.instanceColor.needsUpdate = true
    })
    pressureHalos.instanceMatrix.needsUpdate = true
    pressureHalos.instanceColor.needsUpdate = true
    fragments.instanceMatrix.needsUpdate = true
    fragments.instanceColor.needsUpdate = true

    for (let index = 0; index < 25; index += 1) {
      const pressure = cellPressure[index] / Math.max(1, cellCounts[index])
      const row = Math.floor(index / 5)
      const column = index % 5
      dummy.position.set((column - 2) * CELL_SIZE, -0.025 + pressure * 0.045, (row - 2) * CELL_SIZE)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1 + pressure * 0.35, 1)
      dummy.updateMatrix()
      tiles.setMatrixAt(index, dummy.matrix)
      tiles.setColorAt(
        index,
        tempColor.copy(TILE_BASE_COLOR).lerp(TILE_PRESSURE_COLOR, clamp(pressure * 0.78)),
      )
    }
    tiles.instanceMatrix.needsUpdate = true
    tiles.instanceColor.needsUpdate = true
  }

  function render(time) {
    const deltaSeconds = Math.min(0.05, Math.max(0, (time - lastTime) / 1000))
    lastTime = time
    elapsed += deltaSeconds
    controls.update()
    updatePulse(eventPulse, scenarioEventDay, latestPlayhead, 0)
    updatePulse(responsePulse, responseEventDay, latestPlayhead, 0.5)
    updateLabels()
    renderer.render(scene, camera)
    animationHandle = requestAnimationFrame(render)
  }

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerStart = null
  canvas.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY }
  })
  canvas.addEventListener('pointerup', (event) => {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) return
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const intersections = raycaster.intersectObjects([...levelMeshes.values()], false)
    const hit = intersections[0]
    if (!hit || !Number.isInteger(hit.instanceId)) return
    const agentIndex = hit.object.userData.agentIndices[hit.instanceId]
    selectAgent(agentIndex)
    onSelect?.(identities[agentIndex].id)
  })

  function selectAgent(index) {
    selectedIndex = index
    if (!Number.isInteger(index) || !positions[index]) {
      selection.visible = false
      return
    }
    selection.position.x = positions[index].x
    selection.position.z = positions[index].z
    selection.visible = true
  }

  function agentScreenPoint(id) {
    const index = identities.findIndex((identity) => identity.id === id)
    if (index < 0) return null
    const projected = positions[index].clone()
    projected.y = 0.55
    projected.project(camera)
    const rect = canvas.getBoundingClientRect()
    return {
      x: rect.left + (projected.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-projected.y * 0.5 + 0.5) * rect.height,
    }
  }

  function pixelStats() {
    const sample = document.createElement('canvas')
    sample.width = 64
    sample.height = 64
    const context = sample.getContext('2d', { willReadFrequently: true })
    context.drawImage(canvas, 0, 0, sample.width, sample.height)
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data
    let opaque = 0
    let minLuminance = 255
    let maxLuminance = 0
    const buckets = new Set()
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const red = pixels[offset]
      const green = pixels[offset + 1]
      const blue = pixels[offset + 2]
      const alpha = pixels[offset + 3]
      if (alpha > 250) opaque += 1
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
      minLuminance = Math.min(minLuminance, luminance)
      maxLuminance = Math.max(maxLuminance, luminance)
      buckets.add(`${red >> 4}:${green >> 4}:${blue >> 4}`)
    }
    return {
      opaqueRatio: opaque / (pixels.length / 4),
      colorBuckets: buckets.size,
      luminanceRange: maxLuminance - minLuminance,
    }
  }

  const resizeObserver = new ResizeObserver(() => resize())
  resizeObserver.observe(host)
  resize()
  resetCamera()
  animationHandle = requestAnimationFrame(render)

  return {
    agentScreenPoint,
    pixelStats,
    resetCamera,
    selectAgent,
    updateVisuals,
    destroy() {
      cancelAnimationFrame(animationHandle)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      Object.values(geometries).forEach((geometry) => geometry.dispose())
    },
    get selectedIndex() {
      return selectedIndex
    },
  }
}
