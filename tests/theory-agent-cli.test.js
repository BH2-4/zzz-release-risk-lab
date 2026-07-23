'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { digestValue } = require('../src/artifact-digest.js')
const { runCommand } = require('../scripts/run-theory-agent.js')

const projectRoot = path.resolve(__dirname, '..')

test('formal data completes the offline Theory Agent approval workflow without claiming a model call', async (context) => {
  const runRelative = `experiments/output/theory/test-${crypto.randomUUID()}.json`
  const runPath = path.join(projectRoot, runRelative)
  context.after(() => fs.rmSync(runPath, { force: true }))

  const started = await runCommand({
    argv: ['start', '--demo', '--run', runRelative],
    now: '2026-07-24T01:50:00+08:00',
  })
  assert.equal(started.summary.state, 'AWAITING_HUMAN')
  assert.equal(started.summary.realModelUsed, false)
  assert.equal(started.summary.mappingCount, 4)
  assert.equal(started.summary.unmappedClaimCount, 0)

  const reviewed = await runCommand({
    argv: ['review', '--decision', 'approve', '--reviewer', 'test-demo-curator', '--run', runRelative],
    now: '2026-07-24T01:51:00+08:00',
  })
  assert.equal(reviewed.summary.state, 'APPROVED')

  const resumed = await runCommand({
    argv: ['resume', '--run', runRelative],
    now: '2026-07-24T01:52:00+08:00',
  })
  assert.equal(resumed.summary.state, 'READY_FOR_COMPILATION')
  assert.equal(resumed.summary.realModelUsed, false)
  assert.match(resumed.summary.theorySystemId, /^theory-system:sha256:[0-9a-f]{64}$/)

  const status = await runCommand({ argv: ['status', '--run', runRelative] })
  assert.deepEqual(status.summary, resumed.summary)

  const persisted = JSON.parse(fs.readFileSync(runPath, 'utf8'))
  assert.equal(persisted.theorySystem.coverage.ratio, 1)
  assert.equal(persisted.theorySystem.provenance.mode, 'deterministic-fixture')
  assert.equal(persisted.theorySystem.provenance.realModelUsed, false)
  assert.equal(persisted.theorySystem.provenance.fixturePath, 'data/theory-agent/zzz-1-4-fade-mapping-fixture.json')
  assert.equal(
    persisted.theorySystem.provenance.fixtureDigest,
    digestValue(require('../data/theory-agent/zzz-1-4-fade-mapping-fixture.json')),
  )
})

test('Theory Agent CLI rejects input symlinks that resolve outside the project', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-input-link-'))
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-theory-input-outside-'))
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))
  context.after(() => fs.rmSync(outsideDirectory, { recursive: true, force: true }))
  const outsideFixture = path.join(outsideDirectory, 'mapping.json')
  fs.copyFileSync(path.join(projectRoot, 'data/theory-agent/zzz-1-4-fade-mapping-fixture.json'), outsideFixture)
  const linkedFixture = path.join(localDirectory, 'mapping.json')
  fs.symlinkSync(outsideFixture, linkedFixture)

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--run', path.relative(projectRoot, path.join(localDirectory, 'run.json'))],
      env: {
        ...process.env,
        PROGRAM_E_THEORY_FIXTURE: path.relative(projectRoot, linkedFixture),
      },
      now: '2026-07-24T01:50:00+08:00',
    }),
    /fixture path resolves outside the project/i,
  )
})

test('Theory Agent CLI rejects symlinked output parents', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-output-link-'))
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-theory-output-outside-'))
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))
  context.after(() => fs.rmSync(outsideDirectory, { recursive: true, force: true }))
  const linkedParent = path.join(localDirectory, 'linked-output')
  fs.symlinkSync(outsideDirectory, linkedParent)

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--run', path.relative(projectRoot, path.join(linkedParent, 'run.json'))],
      now: '2026-07-24T01:50:00+08:00',
    }),
    /output parent contains a symbolic link/i,
  )
  assert.equal(fs.existsSync(path.join(outsideDirectory, 'run.json')), false)
})

test('Theory Agent CLI uses an exclusive random temporary file', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-atomic-'))
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-theory-atomic-outside-'))
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))
  context.after(() => fs.rmSync(outsideDirectory, { recursive: true, force: true }))
  const runPath = path.join(localDirectory, 'run.json')
  const outsideTarget = path.join(outsideDirectory, 'protected.txt')
  fs.writeFileSync(outsideTarget, 'protected')
  fs.symlinkSync(outsideTarget, `${runPath}.tmp-${process.pid}`)

  await runCommand({
    argv: ['start', '--demo', '--run', path.relative(projectRoot, runPath)],
    now: '2026-07-24T01:50:00+08:00',
  })

  assert.equal(fs.readFileSync(outsideTarget, 'utf8'), 'protected')
  assert.equal(JSON.parse(fs.readFileSync(runPath, 'utf8')).state, 'AWAITING_HUMAN')
})

test('Theory Agent CLI refuses to overwrite a validated input artifact', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-input-collision-'))
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))
  const ledgerPath = path.join(localDirectory, 'ledger.json')
  fs.copyFileSync(path.join(projectRoot, 'data/evidence/ledger.json'), ledgerPath)
  const ledgerRelative = path.relative(projectRoot, ledgerPath)
  const before = fs.readFileSync(ledgerPath, 'utf8')

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--replace', '--run', ledgerRelative],
      env: { ...process.env, PROGRAM_E_EVIDENCE_LEDGER: ledgerRelative },
      now: '2026-07-24T01:50:00+08:00',
    }),
    /must not overwrite.*Evidence ledger/i,
  )
  assert.equal(fs.readFileSync(ledgerPath, 'utf8'), before)
})

test('Theory Agent CLI does not expose malformed JSON contents in errors', async (context) => {
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-json-error-'))
  context.after(() => fs.rmSync(localDirectory, { recursive: true, force: true }))
  const malformedPath = path.join(localDirectory, 'malformed.json')
  fs.writeFileSync(malformedPath, '{"secret":"TOP_SECRET_VALUE", broken}')

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--run', path.relative(projectRoot, path.join(localDirectory, 'run.json'))],
      env: {
        ...process.env,
        PROGRAM_E_THEORY_FIXTURE: path.relative(projectRoot, malformedPath),
      },
      now: '2026-07-24T01:50:00+08:00',
    }),
    (error) => /fixture contains invalid JSON/i.test(error.message) && !error.message.includes('TOP_SECRET_VALUE'),
  )
})
