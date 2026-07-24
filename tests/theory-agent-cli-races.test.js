'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { runCommand } = require('../scripts/run-theory-agent.js')

const projectRoot = path.resolve(__dirname, '..')

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
})

test('bound directory writes cannot follow a parent swapped to an external symlink', async (context) => {
  const nonce = crypto.randomUUID()
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-parent-swap-'))
  const movedDirectory = path.join(projectRoot, `.tmp-theory-parent-moved-${nonce}`)
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-theory-parent-outside-'))
  const runPath = path.join(localDirectory, 'run.json')
  const originalContents = 'original-run-owner\n'
  fs.writeFileSync(runPath, originalContents, { mode: 0o600 })
  context.after(() => {
    fs.rmSync(localDirectory, { recursive: true, force: true })
    fs.rmSync(movedDirectory, { recursive: true, force: true })
    fs.rmSync(outsideDirectory, { recursive: true, force: true })
  })

  await assert.rejects(
    () => runCommand({
      argv: ['start', '--demo', '--replace', '--run', path.relative(projectRoot, runPath)],
      now: '2026-07-24T01:50:00+08:00',
      beforeRunCommit() {
        fs.renameSync(localDirectory, movedDirectory)
        fs.symlinkSync(outsideDirectory, localDirectory)
      },
    }),
    /output parent changed during write/i,
  )

  assert.equal(fs.existsSync(path.join(outsideDirectory, 'run.json')), false)
  assert.equal(fs.readFileSync(path.join(movedDirectory, 'run.json'), 'utf8'), originalContents)
})

test('descriptor-bound input reads reject a parent swapped after realpath validation', async (context) => {
  const nonce = crypto.randomUUID()
  const localDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-theory-input-swap-'))
  const movedDirectory = path.join(projectRoot, `.tmp-theory-input-moved-${nonce}`)
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-theory-input-swap-outside-'))
  const fixtureName = 'mapping.json'
  const localFixture = path.join(localDirectory, fixtureName)
  const outsideFixture = path.join(outsideDirectory, fixtureName)
  const runPath = path.join(projectRoot, `.tmp-theory-input-swap-run-${nonce}.json`)
  const originalOpen = fs.openSync
  fs.copyFileSync(path.join(projectRoot, 'data/theory-agent/zzz-1-4-fade-mapping-fixture.json'), localFixture)
  fs.writeFileSync(outsideFixture, '{}\n')
  context.after(() => {
    fs.openSync = originalOpen
    fs.rmSync(localDirectory, { recursive: true, force: true })
    fs.rmSync(movedDirectory, { recursive: true, force: true })
    fs.rmSync(outsideDirectory, { recursive: true, force: true })
    fs.rmSync(runPath, { force: true })
  })

  let swapped = false
  fs.openSync = function interceptedOpen(pathname, ...args) {
    if (!swapped && pathname === localFixture) {
      fs.renameSync(localDirectory, movedDirectory)
      fs.symlinkSync(outsideDirectory, localDirectory)
      swapped = true
    }
    return originalOpen.call(fs, pathname, ...args)
  }

  try {
    await assert.rejects(
      () => runCommand({
        argv: ['start', '--demo', '--run', path.relative(projectRoot, runPath)],
        env: {
          ...process.env,
          PROGRAM_E_THEORY_FIXTURE: path.relative(projectRoot, localFixture),
        },
        now: '2026-07-24T01:50:00+08:00',
      }),
      /fixture could not be read/i,
    )
  } finally {
    fs.openSync = originalOpen
  }

  assert.equal(swapped, true)
  assert.equal(fs.existsSync(runPath), false)
})
