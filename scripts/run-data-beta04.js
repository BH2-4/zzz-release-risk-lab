'use strict'

const fs = require('node:fs')
const path = require('node:path')

const {
  createArtifact: createVersionedArtifact,
  createManifest: createVersionedManifest,
} = require('./run-data-beta03.js')

const ARTIFACT_FILENAME = 'visual-data-beta0.4.json'
const MANIFEST_FILENAME = 'visual-data-manifest.json'

function createArtifact() {
  return createVersionedArtifact({
    artifactVersion: 'visual-data-beta0.4',
    generatedBy: 'scripts/run-data-beta04.js',
    includeSegmentTimeline: true,
    notes: [
      '逐 Agent 棋盘是一条固定种子的代表性回放；不能把单个棋子路径理解为现实个体预测。',
      'P10/P50/P90 来自配对的有界模型扰动，表示假设敏感性，不是统计置信区间或现实概率。',
      '逐日分层区间覆盖层级、领域与地区，可供前端沿 42 天时间轴随机访问。',
      '历史案例事实为 B 级专业媒体转述；模型触发强度和响应系数仍是研究者假设。',
      'Reverse 声量、热度、Agent 级集合区间与关系边仍未建模，能力清单保持 false。',
    ],
  })
}

function createManifest(artifactBytes) {
  return createVersionedManifest(artifactBytes, {
    artifact: ARTIFACT_FILENAME,
    artifactVersion: 'visual-data-beta0.4',
    manifestVersion: 'visual-data-manifest/1.2',
    sensitivitySchemaVersion: 'sensitivity-bundle/1.1',
    dailySegmentBands: true,
  })
}

function writeArtifacts(outputDirectory = path.join(__dirname, '..', 'experiments', 'output')) {
  const artifact = createArtifact()
  const artifactBytes = Buffer.from(`${JSON.stringify(artifact)}\n`)
  const manifest = createManifest(artifactBytes)
  const artifactPath = path.join(outputDirectory, ARTIFACT_FILENAME)
  const manifestPath = path.join(outputDirectory, MANIFEST_FILENAME)
  fs.mkdirSync(outputDirectory, { recursive: true })
  fs.writeFileSync(artifactPath, artifactBytes)
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return { artifactPath, manifestPath }
}

if (require.main === module) {
  const { artifactPath, manifestPath } = writeArtifacts()
  console.log(`Beta 0.4 data written to ${path.relative(process.cwd(), artifactPath)}`)
  console.log(`Current visual manifest written to ${path.relative(process.cwd(), manifestPath)}`)
}

module.exports = { createArtifact, createManifest, writeArtifacts }
