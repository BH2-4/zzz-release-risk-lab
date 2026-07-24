'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const { digestValue } = require('../src/artifact-digest.js')
const { runCommand } = require('../scripts/run-theory-agent.js')

const projectRoot = path.resolve(__dirname, '..')
const AUTHORITY_ERROR = /Theory run authority validation failed/i

const checkedArtifacts = Object.freeze({
  approvedExtractions: 'data/evidence/extractions/zzz-1-4-fade-approved.json',
  evidenceReview: 'data/evidence/reviews/zzz-1-4-fade-evidence-review.json',
  ledger: 'data/evidence/ledger.json',
  theoryCatalog: 'data/evidence/theory-catalog.json',
  fixture: 'data/theory-agent/zzz-1-4-fade-mapping-fixture.json',
})

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function createProjectLocalRun(context) {
  const directory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-authority-'))
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const paths = {}
  for (const [name, sourceRelative] of Object.entries(checkedArtifacts)) {
    paths[name] = path.join(directory, `${name}.json`)
    fs.copyFileSync(path.join(projectRoot, sourceRelative), paths[name])
  }
  paths.run = path.join(directory, 'run.json')
  const relative = (filePath) => path.relative(projectRoot, filePath)
  return {
    directory,
    runPath: paths.run,
    runRelative: relative(paths.run),
    paths,
    env: {
      PROGRAM_E_THEORY_EXTRACTIONS: relative(paths.approvedExtractions),
      PROGRAM_E_EVIDENCE_REVIEW: relative(paths.evidenceReview),
      PROGRAM_E_EVIDENCE_LEDGER: relative(paths.ledger),
      PROGRAM_E_THEORY_CATALOG: relative(paths.theoryCatalog),
      PROGRAM_E_THEORY_FIXTURE: relative(paths.fixture),
    },
  }
}

async function startPending(fixture) {
  await runCommand({
    argv: ['start', '--demo', '--run', fixture.runRelative],
    env: fixture.env,
    now: '2026-07-24T01:50:00+08:00',
  })
}

async function makeReady(fixture) {
  await startPending(fixture)
  await runCommand({
    argv: ['review', '--decision', 'approve', '--reviewer', 'authority-test-reviewer', '--run', fixture.runRelative],
    env: fixture.env,
    now: '2026-07-24T01:51:00+08:00',
  })
  await runCommand({
    argv: ['resume', '--run', fixture.runRelative],
    env: fixture.env,
    now: '2026-07-24T01:52:00+08:00',
  })
}

function transactionDebris(directory) {
  return fs.readdirSync(directory).filter((name) => (
    name.includes('.transaction.json') ||
    name.includes('.tmp-') ||
    name.includes('.bak-') ||
    name.startsWith('.theory-remove-') ||
    name.startsWith('.theory-transaction-update-')
  ))
}

async function assertRejectedWithoutMutation(fixture, secret, operation) {
  const beforeBytes = fs.readFileSync(fixture.runPath)
  const beforeEntries = fs.readdirSync(fixture.directory).sort()
  let caught = null
  try {
    await operation()
  } catch (error) {
    caught = error
  }

  assert.ok(caught instanceof Error, 'tampered persisted authority must be rejected')
  assert.match(caught.message, AUTHORITY_ERROR)
  assert.equal(caught.message.includes(secret), false)
  assert.doesNotMatch(caught.message, /unknown theory|input digest mismatch|invalid JSON|validator contents/i)
  assert.deepEqual(fs.readFileSync(fixture.runPath), beforeBytes)
  assert.deepEqual(fs.readdirSync(fixture.directory).sort(), beforeEntries)
  assert.deepEqual(transactionDebris(fixture.directory), [])
}

test('status rejects a run after a current reviewed input changes without mutating output', async (context) => {
  const fixture = createProjectLocalRun(context)
  await startPending(fixture)
  const secret = `STATUS_STALE_SECRET_${crypto.randomUUID()}`
  const catalog = JSON.parse(fs.readFileSync(fixture.paths.theoryCatalog, 'utf8'))
  catalog.theories[0].name = secret
  writeJson(fixture.paths.theoryCatalog, catalog)

  await assertRejectedWithoutMutation(fixture, secret, () => runCommand({
    argv: ['status', '--run', fixture.runRelative],
    env: fixture.env,
  }))
})

test('status rejects a recomputed READY Theory System detached from its approved mapping', async (context) => {
  const fixture = createProjectLocalRun(context)
  await makeReady(fixture)
  const secret = `STATUS_READY_SECRET_${crypto.randomUUID()}`
  const tampered = JSON.parse(fs.readFileSync(fixture.runPath, 'utf8'))
  tampered.theorySystem.approvedMappings[0].mechanism = secret
  const unsignedSystem = structuredClone(tampered.theorySystem)
  delete unsignedSystem.id
  tampered.theorySystem.id = `theory-system:${digestValue(unsignedSystem)}`
  tampered.events.at(-1).artifactDigests = [digestValue(tampered.theorySystem)]
  writeJson(fixture.runPath, tampered)

  await assertRejectedWithoutMutation(fixture, secret, () => runCommand({
    argv: ['status', '--run', fixture.runRelative],
    env: fixture.env,
  }))
})

test('review rejects a recomputed pending mapping invented outside current inputs', async (context) => {
  const fixture = createProjectLocalRun(context)
  await startPending(fixture)
  const secret = `REVIEW_MAPPING_SECRET_${crypto.randomUUID()}`
  const tampered = JSON.parse(fs.readFileSync(fixture.runPath, 'utf8'))
  tampered.mapping.mappings[0].theoryId = `theory-invented-${secret}`
  const mappingDigest = digestValue(tampered.mapping)
  tampered.audit.mappingDigest = mappingDigest
  const auditDigest = digestValue(tampered.audit)
  tampered.checkpoint.targetDigest = mappingDigest
  tampered.checkpoint.auditDigest = auditDigest
  tampered.events.at(-1).artifactDigests = [mappingDigest, auditDigest]
  writeJson(fixture.runPath, tampered)

  await assertRejectedWithoutMutation(fixture, secret, () => runCommand({
    argv: ['review', '--decision', 'approve', '--reviewer', 'authority-test-reviewer', '--run', fixture.runRelative],
    env: fixture.env,
    now: '2026-07-24T01:51:00+08:00',
  }))
})
