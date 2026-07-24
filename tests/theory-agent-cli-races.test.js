'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const childProcess = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { runCommand } = require('../scripts/run-theory-agent.js')

const projectRoot = path.resolve(__dirname, '..')
const secureOutputHelper = path.join(projectRoot, 'scripts/secure-run-output.py')

function fileIdentity(filePath) {
  const fileStat = fs.statSync(filePath)
  return { dev: String(fileStat.dev), ino: String(fileStat.ino) }
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

test('ordinary start atomically refuses a concurrently created run target', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-no-clobber-'))
  const runPath = path.join(localDirectory, 'run.json')
  const concurrentContents = 'concurrent-owner\n'
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--run', path.relative(projectRoot, runPath)],
      now: '2026-07-24T01:50:00+08:00',
      beforeRunCommit() {
        fs.writeFileSync(runPath, concurrentContents, { flag: 'wx', mode: 0o600 })
      },
    }),
    /already exists.*--replace/i,
  )

  assert.equal(fs.readFileSync(runPath, 'utf8'), concurrentContents)
  assert.deepEqual(transactionDebris(localDirectory), [])
})

test('bound directory publication cannot follow a parent swapped to an external symlink', async (context) => {
  const nonce = crypto.randomUUID()
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-parent-swap-'))
  const movedDirectory = path.join(projectRoot, `.tmp-theory-parent-moved-${nonce}`)
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-theory-parent-outside-'))
  const runPath = path.join(localDirectory, 'run.json')
  fs.writeFileSync(runPath, 'original-run-owner\n', { mode: 0o600 })
  context.after(() => {
    fs.rmSync(localDirectory, { recursive: true, force: true })
    fs.rmSync(movedDirectory, { recursive: true, force: true })
    fs.rmSync(outsideDirectory, { recursive: true, force: true })
  })

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--replace', '--run', path.relative(projectRoot, runPath)],
      now: '2026-07-24T01:50:00+08:00',
      afterRunCommit() {
        fs.renameSync(localDirectory, movedDirectory)
        fs.symlinkSync(outsideDirectory, localDirectory)
      },
    }),
    /output parent changed during write/i,
  )

  assert.equal(fs.existsSync(path.join(outsideDirectory, 'run.json')), false)
  assert.equal(JSON.parse(fs.readFileSync(path.join(movedDirectory, 'run.json'), 'utf8')).state, 'AWAITING_HUMAN')
  assert.deepEqual(transactionDebris(movedDirectory), [])
})

test('root-fd input walk rejects a parent swapped before its first component open', async (context) => {
  const nonce = crypto.randomUUID()
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-input-swap-'))
  const movedDirectory = path.join(projectRoot, `.tmp-theory-input-moved-${nonce}`)
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-theory-input-swap-outside-'))
  const fixtureName = 'mapping.json'
  const localFixture = path.join(localDirectory, fixtureName)
  const outsideFixture = path.join(outsideDirectory, fixtureName)
  const runPath = path.join(projectRoot, `.tmp-theory-input-swap-run-${nonce}.json`)
  fs.copyFileSync(path.join(projectRoot, 'data/theory-agent/zzz-1-4-fade-mapping-fixture.json'), localFixture)
  fs.writeFileSync(outsideFixture, '{}\n')
  context.after(() => {
    fs.rmSync(localDirectory, { recursive: true, force: true })
    fs.rmSync(movedDirectory, { recursive: true, force: true })
    fs.rmSync(outsideDirectory, { recursive: true, force: true })
    fs.rmSync(runPath, { force: true })
  })

  let swapped = false
  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--run', path.relative(projectRoot, runPath)],
      env: {
        ...process.env,
        PROGRAM_E_THEORY_FIXTURE: path.relative(projectRoot, localFixture),
      },
      now: '2026-07-24T01:50:00+08:00',
      beforeInputOpen() {
        fs.renameSync(localDirectory, movedDirectory)
        fs.symlinkSync(outsideDirectory, localDirectory)
        swapped = true
      },
    }),
    /fixture (?:could not be read|path resolves outside the project)/i,
  )

  assert.equal(swapped, true)
  assert.equal(fs.existsSync(runPath), false)
})

test('replace refuses a target identity changed during provider generation', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-target-change-'))
  const runPath = path.join(localDirectory, 'run.json')
  const displacedPath = path.join(localDirectory, 'displaced.json')
  const concurrentContents = 'concurrent-owner\n'
  fs.writeFileSync(runPath, 'pre-generation-owner\n', { mode: 0o600 })
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--replace', '--run', path.relative(projectRoot, runPath)],
      now: '2026-07-24T01:50:00+08:00',
      beforeRunCommit() {
        fs.renameSync(runPath, displacedPath)
        fs.writeFileSync(runPath, concurrentContents, { flag: 'wx', mode: 0o600 })
      },
    }),
    /changed before it could be committed safely/i,
  )

  assert.equal(fs.readFileSync(runPath, 'utf8'), concurrentContents)
  assert.deepEqual(transactionDebris(localDirectory), [])
})

test('finalization never overwrites a concurrent owner installed after publication', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-finalize-owner-'))
  const runPath = path.join(localDirectory, 'run.json')
  const publishedPath = path.join(localDirectory, 'published.json')
  const concurrentContents = 'concurrent-owner-after-publication\n'
  fs.writeFileSync(runPath, 'pre-generation-owner\n', { mode: 0o600 })
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--replace', '--run', path.relative(projectRoot, runPath)],
      now: '2026-07-24T01:50:00+08:00',
      afterRunCommit() {
        fs.renameSync(runPath, publishedPath)
        fs.writeFileSync(runPath, concurrentContents, { flag: 'wx', mode: 0o600 })
      },
    }),
    /changed after publication/i,
  )

  assert.equal(fs.readFileSync(runPath, 'utf8'), concurrentContents)
  assert.equal(JSON.parse(fs.readFileSync(publishedPath, 'utf8')).state, 'AWAITING_HUMAN')
  assert.deepEqual(transactionDebris(localDirectory), [])
})

test('interruption before publication recovers without creating a target', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-interrupt-before-'))
  const runPath = path.join(localDirectory, 'run.json')
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--run', path.relative(projectRoot, runPath)],
      now: '2026-07-24T01:50:00+08:00',
      filesystemFailpoint: 'before-publication',
    }),
    /could not be committed safely/i,
  )

  assert.equal(fs.existsSync(runPath), false)
  assert.deepEqual(transactionDebris(localDirectory), [])
})

test('interruption after temp creation records and removes the operation-scoped temp', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-interrupt-temp-'))
  const runPath = path.join(localDirectory, 'run.json')
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--run', path.relative(projectRoot, runPath)],
      now: '2026-07-24T01:50:00+08:00',
      filesystemFailpoint: 'after-temp-create-before-journal',
    }),
    /could not be committed safely/i,
  )

  assert.equal(fs.existsSync(runPath), false)
  assert.deepEqual(transactionDebris(localDirectory), [])
})

test('interruption between replacement steps restores the expected target without clobber', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-interrupt-between-'))
  const runPath = path.join(localDirectory, 'run.json')
  const originalContents = 'pre-generation-owner\n'
  fs.writeFileSync(runPath, originalContents, { mode: 0o600 })
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--replace', '--run', path.relative(projectRoot, runPath)],
      now: '2026-07-24T01:50:00+08:00',
      filesystemFailpoint: 'between-replacement-steps',
    }),
    /could not be committed safely/i,
  )

  assert.equal(fs.readFileSync(runPath, 'utf8'), originalContents)
  assert.deepEqual(transactionDebris(localDirectory), [])
})

test('interruption after target move adopts the backup inode and restores it no-clobber', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-interrupt-move-'))
  const runPath = path.join(localDirectory, 'run.json')
  const originalContents = 'pre-generation-owner\n'
  fs.writeFileSync(runPath, originalContents, { mode: 0o600 })
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--replace', '--run', path.relative(projectRoot, runPath)],
      now: '2026-07-24T01:50:00+08:00',
      filesystemFailpoint: 'after-target-move-before-journal',
    }),
    /could not be committed safely/i,
  )

  assert.equal(fs.readFileSync(runPath, 'utf8'), originalContents)
  assert.deepEqual(transactionDebris(localDirectory), [])
})

test('recovery restores an unexpected owner moved before backup identity journaling', (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-recover-unexpected-'))
  const operationId = crypto.randomUUID()
  const targetName = 'run.json'
  const tempName = `.run.json.tmp-${operationId}`
  const backupName = `.run.json.bak-${operationId}`
  const journalName = '.run.json.transaction.json'
  const displacedPath = path.join(localDirectory, 'displaced.json')
  const tempPath = path.join(localDirectory, tempName)
  const backupPath = path.join(localDirectory, backupName)
  const journalPath = path.join(localDirectory, journalName)
  const foreignContents = 'unexpected-concurrent-owner\n'
  fs.writeFileSync(displacedPath, 'expected-owner\n', { mode: 0o600 })
  fs.writeFileSync(tempPath, 'new-run\n', { mode: 0o600 })
  fs.writeFileSync(backupPath, foreignContents, { mode: 0o600 })
  fs.writeFileSync(journalPath, `${JSON.stringify({
    version: 1,
    operationId,
    mode: 'replace',
    targetName,
    tempName,
    backupName,
    journalName,
    expectedTarget: { kind: 'file', identity: fileIdentity(displacedPath) },
    tempIdentity: fileIdentity(tempPath),
    backupIdentity: null,
    backupPlaceholderIdentity: { dev: '0', ino: '0' },
    publishedIdentity: null,
    state: 'backup-reserved',
  })}\n`, { mode: 0o600 })
  const directoryDescriptor = fs.openSync(localDirectory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY)
  context.after(() => {
    fs.closeSync(directoryDescriptor)
    fs.rmSync(localDirectory, { recursive: true, force: true })
  })

  const recovered = childProcess.spawnSync('python3', [secureOutputHelper], {
    encoding: 'utf8',
    input: JSON.stringify({ operation: 'recover', journalName, operationId }),
    stdio: ['pipe', 'pipe', 'pipe', directoryDescriptor],
  })

  assert.equal(recovered.status, 0, recovered.stderr)
  assert.equal(JSON.parse(recovered.stdout).status, 'unpublished')
  assert.equal(fs.readFileSync(path.join(localDirectory, targetName), 'utf8'), foreignContents)
  assert.deepEqual(transactionDebris(localDirectory), [])
})

test('recovery preserves a moved owner when no-clobber restoration finds a new target', (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-recover-collision-'))
  const operationId = crypto.randomUUID()
  const targetName = 'run.json'
  const tempName = `.run.json.tmp-${operationId}`
  const backupName = `.run.json.bak-${operationId}`
  const journalName = '.run.json.transaction.json'
  const targetPath = path.join(localDirectory, targetName)
  const tempPath = path.join(localDirectory, tempName)
  const backupPath = path.join(localDirectory, backupName)
  const journalPath = path.join(localDirectory, journalName)
  const concurrentContents = 'new-concurrent-target\n'
  const movedContents = 'moved-owner\n'
  fs.writeFileSync(targetPath, concurrentContents, { mode: 0o600 })
  fs.writeFileSync(tempPath, 'new-run\n', { mode: 0o600 })
  fs.writeFileSync(backupPath, movedContents, { mode: 0o600 })
  fs.writeFileSync(journalPath, `${JSON.stringify({
    version: 1,
    operationId,
    mode: 'replace',
    targetName,
    tempName,
    backupName,
    journalName,
    expectedTarget: { kind: 'file', identity: fileIdentity(backupPath) },
    tempIdentity: fileIdentity(tempPath),
    backupIdentity: fileIdentity(backupPath),
    backupPlaceholderIdentity: null,
    publishedIdentity: null,
    state: 'backup-created',
  })}\n`, { mode: 0o600 })
  const directoryDescriptor = fs.openSync(localDirectory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY)
  context.after(() => {
    fs.closeSync(directoryDescriptor)
    fs.rmSync(localDirectory, { recursive: true, force: true })
  })

  const recovered = childProcess.spawnSync('python3', [secureOutputHelper], {
    encoding: 'utf8',
    input: JSON.stringify({ operation: 'recover', journalName, operationId }),
    stdio: ['pipe', 'pipe', 'pipe', directoryDescriptor],
  })

  assert.equal(recovered.status, 73)
  assert.equal(JSON.parse(recovered.stdout).status, 'conflict-preserved')
  assert.equal(fs.readFileSync(targetPath, 'utf8'), concurrentContents)
  assert.equal(fs.readFileSync(backupPath, 'utf8'), movedContents)
  assert.equal(fs.existsSync(journalPath), true)
})

test('interruption after publication reconciles the owned target and returns success', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-interrupt-after-'))
  const runPath = path.join(localDirectory, 'run.json')
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))

  const result = await runCommand({
    argv: ['start', '--demo', '--run', path.relative(projectRoot, runPath)],
    now: '2026-07-24T01:50:00+08:00',
    filesystemFailpoint: 'after-publication-before-response',
  })

  assert.equal(result.kind, 'run')
  assert.equal(JSON.parse(fs.readFileSync(runPath, 'utf8')).state, 'AWAITING_HUMAN')
  assert.deepEqual(transactionDebris(localDirectory), [])
})
