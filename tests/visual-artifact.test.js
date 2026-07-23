const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { createArtifact } = require('../scripts/run-visual-replay.js')

test('visual data artifact is deterministic and preserves model boundaries', () => {
  const first = createArtifact()
  const replay = createArtifact()

  assert.deepEqual(first, replay)
  assert.equal(first.artifactVersion, 'visual-data-beta0.1')
  assert.equal(first.comparison.identities.length, 125)
  assert.equal(first.comparison.deltaFrames.length, 42)
  assert.equal(first.comparison.channels.reverseVoice.status, 'unavailable')
  assert.ok(first.notes.some((note) => note.includes('Reverse')))
})

test('checked-in visual artifact matches the deterministic generator', () => {
  const artifactPath = path.join(__dirname, '..', 'experiments', 'output', 'visual-data-beta0.1.json')
  const checkedInArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

  assert.deepEqual(checkedInArtifact, createArtifact())
})
