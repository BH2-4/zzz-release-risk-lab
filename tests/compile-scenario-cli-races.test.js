'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const childProcess = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { once } = require('node:events')

const { runCommand } = require('../scripts/compile-scenario.js')

const projectRoot = path.resolve(__dirname, '..')
const secureOutputHelper = path.join(projectRoot, 'scripts/secure-run-output.py')

function transactionDebris(directory) {
  return fs.readdirSync(directory).filter((name) => (
    name.includes('.transaction.json') ||
    name.includes('.tmp-') ||
    name.includes('.bak-') ||
    name.startsWith('.theory-transaction-update-')
  ))
}

function fileIdentity(filePath) {
  const fileStat = fs.statSync(filePath)
  return { dev: String(fileStat.dev), ino: String(fileStat.ino) }
}

function invokeOutputHelper(directoryDescriptor, request) {
  const result = childProcess.spawnSync('python3', [secureOutputHelper], {
    encoding: 'utf8',
    input: JSON.stringify(request),
    stdio: ['pipe', 'pipe', 'pipe', directoryDescriptor],
  })
  const unlock = childProcess.spawnSync(
    'python3',
    ['-c', 'import fcntl; fcntl.flock(3, fcntl.LOCK_UN)'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe', directoryDescriptor] },
  )
  assert.equal(unlock.status, 0, unlock.stderr)
  return result
}

function outputTransactionRequest({ operationId, targetName, expectedTarget, contents, failpoint }) {
  return {
    operation: 'commit',
    operationId,
    mode: expectedTarget.kind === 'missing' ? 'noreplace' : 'replace',
    targetName,
    tempName: `.${targetName}.tmp-${operationId}`,
    backupName: `.${targetName}.bak-${operationId}`,
    journalName: `.${targetName}.transaction.json`,
    expectedTarget,
    contents: Buffer.from(contents, 'utf8').toString('base64'),
    failpoint,
  }
}

function liveCompilation(marker = 'cli-race') {
  return {
    marker,
    provenance: {
      mode: 'live-model', provider: 'minimax', model: 'MiniMax-M2.7', requestId: 'race-request-id',
    },
    capabilities: { realModelUsed: true },
  }
}

function createOutputDirectory(context, prefix) {
  const directory = fs.mkdtempSync(path.join(projectRoot, prefix))
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  return directory
}

function commandOptions(outputPath, overrides = {}) {
  return {
    argv: ['--output', path.relative(projectRoot, outputPath)],
    env: {},
    providerFactory: () => ({ generateObject: async () => ({}) }),
    compile: async () => liveCompilation(),
    ...overrides,
  }
}

async function startFlockHolder(directory) {
  const code = [
    'import fcntl, os, sys',
    'fd = os.open(sys.argv[1], os.O_RDONLY | os.O_DIRECTORY)',
    'fcntl.flock(fd, fcntl.LOCK_EX)',
    'print("locked", flush=True)',
    'sys.stdin.read()',
    'os.close(fd)',
  ].join('\n')
  const process = childProcess.spawn('python3', ['-c', code, directory], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const [chunk] = await once(process.stdout, 'data')
  assert.match(chunk.toString(), /locked/)
  return process
}

async function stopFlockHolder(process) {
  const exited = once(process, 'exit')
  process.stdin.end()
  const [status] = await exited
  assert.equal(status, 0)
}

for (const initialState of ['missing', 'existing']) {
  test(`held parent flock returns busy/76 before provider creation with ${initialState} target`, async (context) => {
    const directory = createOutputDirectory(context, '.tmp-compile-flock-busy-')
    const outputPath = path.join(directory, 'compiled.json')
    const original = Buffer.from('existing-cooperating-owner\n')
    if (initialState === 'existing') fs.writeFileSync(outputPath, original, { mode: 0o600 })
    const holder = await startFlockHolder(directory)
    context.after(() => {
      if (holder.exitCode === null) holder.kill('SIGTERM')
    })
    const descriptor = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY)
    context.after(() => fs.closeSync(descriptor))

    const direct = invokeOutputHelper(descriptor, { operation: 'inspect', targetName: 'compiled.json' })
    assert.equal(direct.status, 76)
    assert.equal(JSON.parse(direct.stdout).status, 'busy')

    let providerCount = 0
    await assert.rejects(
      () => runCommand(commandOptions(outputPath, {
        providerFactory: () => { providerCount += 1; return {} },
      })),
      /another AI output transaction is still in progress/i,
    )
    assert.equal(providerCount, 0)
    if (initialState === 'existing') assert.deepEqual(fs.readFileSync(outputPath), original)
    else assert.equal(fs.existsSync(outputPath), false)
    assert.deepEqual(transactionDebris(directory), [])

    await stopFlockHolder(holder)
    const result = await runCommand(commandOptions(outputPath))
    assert.equal(result.kind, 'compiled')
    assert.equal(JSON.parse(fs.readFileSync(outputPath, 'utf8')).marker, 'cli-race')
    assert.equal(fs.statSync(outputPath).mode & 0o777, 0o600)
    assert.deepEqual(transactionDebris(directory), [])
  })
}

test('a cooperating helper writer between preflight and commit is preserved as an identity conflict', async (context) => {
  const directory = createOutputDirectory(context, '.tmp-compile-helper-conflict-')
  const outputPath = path.join(directory, 'compiled.json')
  fs.writeFileSync(outputPath, '{"owner":"original"}\n', { mode: 0o600 })
  const foreignBytes = '{"owner":"cooperating-writer"}\n'
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY)
  context.after(() => fs.closeSync(descriptor))

  await assert.rejects(
    () => runCommand(commandOptions(outputPath, {
      compile: async () => {
        const operationId = crypto.randomUUID()
        const committed = invokeOutputHelper(descriptor, outputTransactionRequest({
          operationId,
          targetName: 'compiled.json',
          expectedTarget: { kind: 'file', identity: fileIdentity(outputPath) },
          contents: foreignBytes,
        }))
        assert.equal(committed.status, 0, committed.stderr)
        const response = JSON.parse(committed.stdout)
        assert.equal(response.status, 'committed')
        const finalized = invokeOutputHelper(descriptor, {
          operation: 'finalize',
          journalName: '.compiled.json.transaction.json',
          operationId,
          publishedIdentity: response.publishedIdentity,
        })
        assert.equal(finalized.status, 0, finalized.stderr)
        assert.equal(JSON.parse(finalized.stdout).status, 'finalized')
        return liveCompilation('losing-writer')
      },
    })),
    /AI output changed before it could be committed safely/i,
  )

  assert.equal(fs.readFileSync(outputPath, 'utf8'), foreignBytes)
  assert.deepEqual(transactionDebris(directory), [])
})

for (const entry of [
  { failpoint: 'before-publication', existing: false, succeeds: false },
  { failpoint: 'between-replacement-steps', existing: true, succeeds: false },
  { failpoint: 'after-publication-before-response', existing: false, succeeds: true },
  { failpoint: 'malformed-final-response', existing: false, succeeds: true },
]) {
  test(`helper recovery is deterministic at ${entry.failpoint}`, async (context) => {
    const directory = createOutputDirectory(context, '.tmp-compile-helper-recovery-')
    const outputPath = path.join(directory, 'compiled.json')
    const original = '{"owner":"original"}\n'
    if (entry.existing) fs.writeFileSync(outputPath, original, { mode: 0o600 })
    const operation = runCommand(commandOptions(outputPath, { filesystemFailpoint: entry.failpoint }))

    if (entry.succeeds) {
      const result = await operation
      assert.equal(result.kind, 'compiled')
      assert.equal(JSON.parse(fs.readFileSync(outputPath, 'utf8')).marker, 'cli-race')
    } else {
      await assert.rejects(() => operation, /AI output could not be committed safely/i)
      if (entry.existing) assert.equal(fs.readFileSync(outputPath, 'utf8'), original)
      else assert.equal(fs.existsSync(outputPath), false)
    }
    assert.deepEqual(transactionDebris(directory), [])
  })
}

test('bound parent descriptor cannot be redirected by a parent swap after publication', async (context) => {
  const nonce = crypto.randomUUID()
  const directory = createOutputDirectory(context, '.tmp-compile-parent-swap-')
  const movedDirectory = path.join(projectRoot, `.tmp-compile-parent-moved-${nonce}`)
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-outside-'))
  const outputPath = path.join(directory, 'compiled.json')
  context.after(() => {
    fs.rmSync(movedDirectory, { recursive: true, force: true })
    fs.rmSync(outsideDirectory, { recursive: true, force: true })
  })

  await assert.rejects(
    () => runCommand(commandOptions(outputPath, {
      afterOutputCommit() {
        fs.renameSync(directory, movedDirectory)
        fs.symlinkSync(outsideDirectory, directory)
      },
    })),
    /AI output parent changed during write/i,
  )
  assert.equal(fs.existsSync(path.join(outsideDirectory, 'compiled.json')), false)
  assert.equal(JSON.parse(fs.readFileSync(path.join(movedDirectory, 'compiled.json'), 'utf8')).marker, 'cli-race')
  assert.deepEqual(transactionDebris(movedDirectory), [])
})

test('parent and target symlinks fail closed before provider creation', async (context) => {
  const base = createOutputDirectory(context, '.tmp-compile-symlink-')
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-symlink-outside-'))
  context.after(() => fs.rmSync(outsideDirectory, { recursive: true, force: true }))
  const linkedParent = path.join(base, 'linked-parent')
  fs.symlinkSync(outsideDirectory, linkedParent)
  let providerCount = 0
  const providerFactory = () => { providerCount += 1; return {} }

  await assert.rejects(
    () => runCommand(commandOptions(path.join(linkedParent, 'compiled.json'), { providerFactory })),
    /AI output parent contains a symbolic link/i,
  )
  assert.equal(fs.existsSync(path.join(outsideDirectory, 'compiled.json')), false)

  const safeParent = path.join(base, 'safe-parent')
  fs.mkdirSync(safeParent)
  const outsideTarget = path.join(outsideDirectory, 'outside.json')
  fs.writeFileSync(outsideTarget, 'outside-owner\n', { mode: 0o600 })
  fs.symlinkSync(outsideTarget, path.join(safeParent, 'compiled.json'))
  await assert.rejects(
    () => runCommand(commandOptions(path.join(safeParent, 'compiled.json'), { providerFactory })),
    /AI output target must not be a symbolic link/i,
  )
  assert.equal(providerCount, 0)
  assert.equal(fs.readFileSync(outsideTarget, 'utf8'), 'outside-owner\n')
})

test('a non-regular output target fails closed before provider creation', async (context) => {
  const directory = createOutputDirectory(context, '.tmp-compile-nonregular-target-')
  const outputPath = path.join(directory, 'compiled.json')
  fs.mkdirSync(outputPath)
  let providerCount = 0

  await assert.rejects(
    () => runCommand(commandOptions(outputPath, {
      providerFactory: () => { providerCount += 1; return {} },
    })),
    /AI output target must be a regular file/i,
  )
  assert.equal(providerCount, 0)
  assert.deepEqual(transactionDebris(directory), [])
})

test('a protected-input hardlink target is rejected before provider creation', async (context) => {
  const directory = createOutputDirectory(context, '.tmp-compile-input-hardlink-')
  const outputPath = path.join(directory, 'compiled.json')
  fs.linkSync(path.join(projectRoot, 'data/evidence/ledger.json'), outputPath)
  const original = fs.readFileSync(outputPath)
  let providerCount = 0

  await assert.rejects(
    () => runCommand(commandOptions(outputPath, {
      providerFactory: () => { providerCount += 1; return {} },
    })),
    /AI output must not overwrite the Evidence ledger input artifact/i,
  )
  assert.equal(providerCount, 0)
  assert.deepEqual(fs.readFileSync(outputPath), original)
  assert.deepEqual(transactionDebris(directory), [])
})
