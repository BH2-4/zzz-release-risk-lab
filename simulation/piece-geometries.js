import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

function part(geometry, { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  if (geometry.index) {
    const indexedGeometry = geometry
    geometry = indexedGeometry.toNonIndexed()
    indexedGeometry.dispose()
  }
  geometry.scale(...scale)
  geometry.rotateX(rotation[0])
  geometry.rotateY(rotation[1])
  geometry.rotateZ(rotation[2])
  geometry.translate(...position)
  return geometry
}

function merge(parts) {
  const geometry = mergeGeometries(parts, false)
  parts.forEach((partGeometry) => partGeometry.dispose())
  if (!geometry) throw new Error('Unable to merge procedural piece geometry')
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function individualGeometry() {
  return merge([
    part(new THREE.CylinderGeometry(0.31, 0.35, 0.12, 12), { position: [0, 0.06, 0] }),
    part(new THREE.ConeGeometry(0.24, 0.58, 10), { position: [0, 0.4, 0] }),
    part(new THREE.SphereGeometry(0.17, 12, 8), { position: [0, 0.77, 0] }),
    part(new THREE.ConeGeometry(0.09, 0.18, 6), { position: [0, 0.95, 0] }),
  ])
}

function groupGeometry() {
  return merge([
    part(new THREE.CylinderGeometry(0.38, 0.43, 0.13, 8), { position: [0, 0.065, 0] }),
    part(new THREE.CylinderGeometry(0.13, 0.18, 0.52, 8), { position: [-0.18, 0.39, 0.02], rotation: [0, 0, 0.14] }),
    part(new THREE.CylinderGeometry(0.15, 0.2, 0.68, 8), { position: [0, 0.46, -0.03] }),
    part(new THREE.CylinderGeometry(0.13, 0.18, 0.48, 8), { position: [0.19, 0.37, 0.03], rotation: [0, 0, -0.14] }),
    part(new THREE.SphereGeometry(0.19, 10, 8), { position: [0, 0.82, -0.03], scale: [1.2, 0.72, 1] }),
  ])
}

function regionGeometry() {
  return merge([
    part(new THREE.CylinderGeometry(0.42, 0.47, 0.14, 6), { position: [0, 0.07, 0] }),
    part(new THREE.CylinderGeometry(0.29, 0.34, 0.27, 6), { position: [0, 0.275, 0] }),
    part(new THREE.TorusGeometry(0.25, 0.065, 7, 18), { position: [0, 0.52, 0], rotation: [Math.PI / 2, 0, 0] }),
    part(new THREE.OctahedronGeometry(0.22, 0), { position: [0, 0.73, 0], scale: [1, 1.25, 1] }),
  ])
}

function countryGeometry() {
  return merge([
    part(new THREE.BoxGeometry(0.76, 0.12, 0.62), { position: [0, 0.06, 0] }),
    part(new THREE.BoxGeometry(0.55, 0.16, 0.49), { position: [0, 0.2, 0] }),
    part(new THREE.BoxGeometry(0.31, 0.47, 0.31), { position: [0, 0.515, 0] }),
    part(new THREE.ConeGeometry(0.3, 0.29, 4), { position: [0, 0.895, 0], rotation: [0, Math.PI / 4, 0] }),
  ])
}

function internationalGeometry() {
  return merge([
    part(new THREE.CylinderGeometry(0.34, 0.4, 0.13, 14), { position: [0, 0.065, 0] }),
    part(new THREE.CylinderGeometry(0.12, 0.18, 0.29, 10), { position: [0, 0.27, 0] }),
    part(new THREE.IcosahedronGeometry(0.3, 1), { position: [0, 0.66, 0], scale: [1, 1.08, 1] }),
    part(new THREE.TorusGeometry(0.38, 0.035, 6, 24), { position: [0, 0.66, 0], rotation: [Math.PI / 2, 0, 0.36] }),
    part(new THREE.ConeGeometry(0.08, 0.22, 7), { position: [0, 1.03, 0] }),
  ])
}

export function createPieceGeometries() {
  return {
    individual: individualGeometry(),
    group: groupGeometry(),
    region: regionGeometry(),
    country: countryGeometry(),
    international: internationalGeometry(),
  }
}
