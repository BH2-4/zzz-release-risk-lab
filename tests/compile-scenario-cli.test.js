'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const checkedApprovedExtractions = require('../data/evidence/extractions/zzz-1-4-fade-approved.json')
const checkedEvidenceReview = require('../data/evidence/reviews/zzz-1-4-fade-evidence-review.json')
const checkedLedger = require('../data/evidence/ledger.json')
const checkedTheoryCatalog = require('../data/evidence/theory-catalog.json')
const checkedVerticalSlice = require('../data/scenarios/zzz-3-1-fade-risk-vertical-slice.json')
const checkedMapping = require('../data/theory-agent/zzz-1-4-fade-mapping-fixture.json')
const { digestValue } = require('../src/artifact-digest.js')
const {
  applyTheoryReview,
  resumeTheoryAgent,
  startTheoryAgent,
} = require('../src/theory-agent.js')
const {
  defaults,
  main,
  parseArgs,
  runCommand,
} = require('../scripts/compile-scenario.js')

function writeJson(root, relativePath, value) {
  const filePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
  return filePath
}

function inputFixtures() {
  return {
    approvedExtractions: structuredClone(checkedApprovedExtractions),
    evidenceReview: structuredClone(checkedEvidenceReview),
    ledger: structuredClone(checkedLedger),
    theoryCatalog: structuredClone(checkedTheoryCatalog),
  }
}

function mappingProvider() {
  return {
    async generateObject() {
      return {
        object: structuredClone(checkedMapping),
        provenance: {
          mode: 'deterministic-fixture',
          fixturePath: 'data/theory-agent/zzz-1-4-fade-mapping-fixture.json',
          fixtureDigest: digestValue(checkedMapping),
        },
      }
    },
  }
}

async function pendingRun(inputs = inputFixtures()) {
  return startTheoryAgent({
    ...inputs,
    provider: mappingProvider(),
    runId: 'compile-cli-test-run',
    now: '2026-07-24T14:00:00+08:00',
  })
}

async function readyRun(inputs = inputFixtures()) {
  const pending = await pendingRun(inputs)
  const approved = applyTheoryReview({
    run: pending,
    review: {
      schemaVersion: 'theory-review/1.0',
      targetDigest: pending.checkpoint.targetDigest,
      decision: 'approve',
      mappingDecisions: pending.mapping.mappings.map((mapping) => ({
        mappingId: mapping.id,
        decision: 'approve',
        reasonCodes: ['TEST_HUMAN_VERIFIED'],
      })),
      reviewer: 'compile-cli-test-reviewer',
      reviewedAt: '2026-07-24T14:05:00+08:00',
      feedback: [],
    },
  })
  return resumeTheoryAgent({
    ...inputs,
    run: approved,
    now: '2026-07-24T14:06:00+08:00',
  })
}

async function installCompilationInputs(root, paths = defaults) {
  const inputs = inputFixtures()
  const run = await readyRun(inputs)
  writeJson(root, paths.approvedExtractions, inputs.approvedExtractions)
  writeJson(root, paths.evidenceReview, inputs.evidenceReview)
  writeJson(root, paths.ledger, inputs.ledger)
  writeJson(root, paths.theoryCatalog, inputs.theoryCatalog)
  writeJson(root, paths.verticalSlice, checkedVerticalSlice)
  writeJson(root, paths.theoryRun, run)
  return { ...inputs, run, verticalSlice: structuredClone(checkedVerticalSlice) }
}

function liveCompilation(extra = {}) {
  return {
    ...extra,
    provenance: { mode: 'live-model', provider: 'fixture', model: 'fixture-model', requestId: 'req-cli-test' },
    capabilities: { realModelUsed: true },
  }
}

test('compile CLI defaults to the 3.1 fade slice and injects the ready Theory System', async (context) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-defaults-'))
  context.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  const fixture = await installCompilationInputs(projectRoot)

  const calls = []
  const provider = { generateObject: async () => ({}) }
  const result = await runCommand({
    argv: [],
    env: {
      PROGRAM_E_AI_BASE_URL: 'https://models.example.com/v1',
      PROGRAM_E_AI_API_KEY: 'test-key',
      PROGRAM_E_AI_MODEL: 'test-model',
    },
    projectRoot,
    providerFactory(config) {
      calls.push({ kind: 'provider', config })
      return provider
    },
    compile: async (input) => {
      calls.push({ kind: 'compile', input })
      return liveCompilation({ compiled: true, verticalSliceId: input.verticalSlice.id })
    },
  })

  assert.equal(calls[0].config.model, 'test-model')
  assert.equal(calls[1].input.provider, provider)
  assert.deepEqual(calls[1].input.ledger, fixture.ledger)
  assert.deepEqual(calls[1].input.theoryCatalog, fixture.theoryCatalog)
  assert.deepEqual(calls[1].input.theorySystem, fixture.run.theorySystem)
  assert.deepEqual(calls[1].input.verticalSlice, fixture.verticalSlice)
  assert.equal(result.outputRelative, defaults.output)
  const written = JSON.parse(fs.readFileSync(path.join(projectRoot, defaults.output), 'utf8'))
  assert.equal(written.compiled, true)
  assert.equal(written.verticalSliceId, 'zzz-3-1-fade-risk-v1')
  assert.equal(written.capabilities.realModelUsed, true)
})

test('compile CLI accepts explicit input and output paths and keeps them inside the project', async (context) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-overrides-'))
  context.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  const paths = {
    approvedExtractions: 'custom/extractions.json',
    evidenceReview: 'custom/review.json',
    ledger: 'custom/ledger.json',
    theoryCatalog: 'custom/catalog.json',
    verticalSlice: 'custom/slice.json',
    theoryRun: 'custom/run.json',
    output: 'custom/result.json',
  }
  const fixture = await installCompilationInputs(projectRoot, paths)

  let compilationInput
  const result = await runCommand({
    argv: [
      '--approved-extractions', paths.approvedExtractions,
      '--evidence-review', paths.evidenceReview,
      '--ledger', 'custom/ledger.json',
      '--theory-catalog', 'custom/catalog.json',
      '--vertical-slice', 'custom/slice.json',
      '--theory-run', 'custom/run.json',
      '--output', 'custom/result.json',
    ],
    env: {},
    projectRoot,
    providerFactory: () => ({ generateObject: async () => ({}) }),
    compile: async (input) => {
      compilationInput = input
      return liveCompilation({ ok: true })
    },
  })

  assert.deepEqual(compilationInput.ledger, fixture.ledger)
  assert.deepEqual(compilationInput.theoryCatalog, fixture.theoryCatalog)
  assert.deepEqual(compilationInput.verticalSlice, fixture.verticalSlice)
  assert.equal(compilationInput.theorySystem.id, fixture.run.theorySystem.id)
  assert.equal(result.outputRelative, 'custom/result.json')
  await assert.rejects(
    () => runCommand({
      argv: ['--theory-run', '../outside.json'],
      env: {},
      projectRoot,
      providerFactory: () => ({}),
      compile: async () => ({}),
    }),
    /Theory Agent run path must stay inside the project/,
  )
})

test('compile CLI rejects a run awaiting review with a clear non-zero process error', async (context) => {
  const projectRoot = path.resolve(__dirname, '..')
  const fixtureDirectory = fs.mkdtempSync(path.join(projectRoot, '.tmp-compile-cli-'))
  context.after(() => fs.rmSync(fixtureDirectory, { recursive: true, force: true }))
  const runPath = path.join(fixtureDirectory, 'pending-run.json')
  fs.writeFileSync(runPath, `${JSON.stringify(await pendingRun(), null, 2)}\n`)

  const result = spawnSync(process.execPath, [
    path.join(projectRoot, 'scripts/compile-scenario.js'),
    '--theory-run', path.relative(projectRoot, runPath),
  ], {
    cwd: projectRoot,
    env: { ...process.env },
    encoding: 'utf8',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Scenario compilation failed:/)
  assert.match(result.stderr, /AWAITING_HUMAN/)
  assert.match(result.stderr, /READY_FOR_COMPILATION/)
})

test('compile CLI help is side-effect free and malformed options fail clearly', async () => {
  let output = ''
  await main({
    argv: ['--help'],
    env: {},
    stdout: { write: (value) => { output += value } },
    providerFactory: () => { throw new Error('help must not create a provider') },
  })

  assert.match(output, /ZZZ 3\.1 fade-risk vertical slice/)
  assert.match(output, /--approved-extractions PATH/)
  assert.match(output, /--theory-run PATH/)
  assert.throws(() => parseArgs(['--unknown', 'value']), /Unknown option: --unknown/)
  assert.throws(() => parseArgs(['--output']), /Option --output requires a value/)
  assert.throws(() => parseArgs(['positional']), /Unexpected argument: positional/)
})

test('compile CLI validates a ready run before creating a model provider', async (context) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-invalid-run-'))
  context.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  const fixture = await installCompilationInputs(projectRoot)
  const invalid = structuredClone(fixture.run)
  delete invalid.inputDigests.approvedExtractions
  writeJson(projectRoot, defaults.theoryRun, invalid)
  let providerCreated = false

  await assert.rejects(
    () => runCommand({
      argv: [],
      env: {},
      projectRoot,
      providerFactory: () => {
        providerCreated = true
        return {}
      },
      compile: async () => ({}),
    }),
    /input digests.*(?:contain|requires?) exactly|requires exactly.*input digests/i,
  )
  assert.equal(providerCreated, false)

  const mismatched = structuredClone(fixture.run)
  mismatched.inputDigests.ledger = `sha256:${'0'.repeat(64)}`
  writeJson(projectRoot, defaults.theoryRun, mismatched)
  await assert.rejects(
    () => runCommand({
      argv: [], env: {}, projectRoot,
      providerFactory: () => { providerCreated = true; return {} },
      compile: async () => ({}),
    }),
    /Theory Agent run input digest mismatch: ledger/,
  )
  assert.equal(providerCreated, false)

  fs.writeFileSync(path.join(projectRoot, defaults.theoryRun), '{not-json')
  await assert.rejects(
    () => runCommand({ argv: [], env: {}, projectRoot }),
    /Theory Agent run could not be read as JSON/,
  )
})

test('compile CLI rejects tampered audit, review chain, Theory System, and final event before model creation', async (context) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-chain-'))
  context.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  const fixture = await installCompilationInputs(projectRoot)
  const mutations = [
    [/audit/i, (run) => { run.audit.warnings.push('post-review mutation') }],
    [/review history/i, (run) => {
      run.reviews[run.reviews.length - 1] = structuredClone(run.reviews[run.reviews.length - 1])
      run.reviews[run.reviews.length - 1].reviewer = 'substituted-reviewer'
    }],
    [/review content digest|review.*digest/i, (run) => {
      const changed = structuredClone(run.review)
      changed.reviewer = 'substituted-reviewer'
      run.review = changed
      run.reviews[run.reviews.length - 1] = structuredClone(changed)
    }],
    [/Theory System/i, (run) => { run.theorySystem.approvedMappings[0].mechanism = 'post-approval mutation' }],
    [/mapping\/audit event|event 1.*artifact digests/i, (run) => {
      run.events.find((event) => event.state === 'AWAITING_HUMAN').artifactDigests = []
    }],
    [/approval event|event 2.*artifact digests/i, (run) => {
      run.events.find((event) => event.state === 'APPROVED').artifactDigests = []
    }],
    [/state transition/i, (run) => {
      run.events[0].state = 'APPROVED'
      run.events[1].state = 'AWAITING_HUMAN'
    }],
    [/final event|event 3.*artifact digests/i, (run) => { run.events[run.events.length - 1].artifactDigests = [] }],
  ]

  for (const [expectedError, mutate] of mutations) {
    const run = structuredClone(fixture.run)
    mutate(run)
    writeJson(projectRoot, defaults.theoryRun, run)
    let providerCreated = false
    await assert.rejects(
      () => runCommand({
        argv: [], env: {}, projectRoot,
        providerFactory: () => { providerCreated = true; return {} },
        compile: async () => liveCompilation(),
      }),
      expectedError,
    )
    assert.equal(providerCreated, false)
  }
})

test('compile CLI resolves input realpaths and rejects a symlink that escapes the project', async (context) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-input-link-'))
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-outside-'))
  context.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  context.after(() => fs.rmSync(outsideRoot, { recursive: true, force: true }))
  const outsideRun = writeJson(outsideRoot, 'ready.json', await readyRun())
  fs.symlinkSync(outsideRun, path.join(projectRoot, 'run-link.json'))

  await assert.rejects(
    () => runCommand({
      argv: ['--theory-run', 'run-link.json'], env: {}, projectRoot,
      providerFactory: () => ({}), compile: async () => liveCompilation(),
    }),
    /Theory Agent run path resolves outside the project/,
  )
})

test('compile CLI atomically rejects symlinked output parents and final targets', async (context) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-output-link-'))
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-output-outside-'))
  context.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  context.after(() => fs.rmSync(outsideRoot, { recursive: true, force: true }))
  await installCompilationInputs(projectRoot)
  fs.symlinkSync(outsideRoot, path.join(projectRoot, 'linked-output'))

  const command = (output) => runCommand({
    argv: ['--output', output], env: {}, projectRoot,
    providerFactory: () => ({ generateObject: async () => ({}) }),
    compile: async () => liveCompilation({ ok: true }),
  })
  await assert.rejects(() => command('linked-output/result.json'), /AI output parent contains a symbolic link/)
  assert.equal(fs.existsSync(path.join(outsideRoot, 'result.json')), false)

  fs.mkdirSync(path.join(projectRoot, 'safe-output'))
  const outsideTarget = path.join(outsideRoot, 'existing.json')
  fs.writeFileSync(outsideTarget, 'outside-content')
  fs.symlinkSync(outsideTarget, path.join(projectRoot, 'safe-output/result.json'))
  await assert.rejects(() => command('safe-output/result.json'), /AI output target must not be a symbolic link/)
  assert.equal(fs.readFileSync(outsideTarget, 'utf8'), 'outside-content')
})

test('compile CLI fails closed without a real live-model result and writes no output', async (context) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-not-live-'))
  context.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  await installCompilationInputs(projectRoot)

  await assert.rejects(
    () => runCommand({
      argv: [], env: {}, projectRoot,
      providerFactory: () => ({ generateObject: async () => ({}) }),
      compile: async () => ({
        provenance: { mode: 'recorded-model-output' },
        capabilities: { realModelUsed: false },
      }),
    }),
    /did not produce an attributable live-model result/,
  )
  assert.equal(fs.existsSync(path.join(projectRoot, defaults.output)), false)
})

test('compile CLI refuses to overwrite any validated input artifact', async (context) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-input-collision-'))
  context.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  const fixture = await installCompilationInputs(projectRoot)
  let providerCreated = false

  await assert.rejects(
    () => runCommand({
      argv: ['--output', defaults.ledger], env: {}, projectRoot,
      providerFactory: () => { providerCreated = true; return {} },
      compile: async () => liveCompilation({ destructive: true }),
    }),
    /AI output must not overwrite the Evidence ledger input artifact/,
  )
  assert.equal(providerCreated, false)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(projectRoot, defaults.ledger), 'utf8')), fixture.ledger)
})

test('compile CLI rejects a case-variant alias of an input on case-insensitive filesystems', async (context) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'program-e-compile-case-collision-'))
  context.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  const fixture = await installCompilationInputs(projectRoot)
  const caseVariant = defaults.ledger.toUpperCase()
  if (!fs.existsSync(path.join(projectRoot, caseVariant))) {
    context.skip('filesystem is case-sensitive')
    return
  }

  await assert.rejects(
    () => runCommand({
      argv: ['--output', caseVariant], env: {}, projectRoot,
      providerFactory: () => ({}), compile: async () => liveCompilation({ destructive: true }),
    }),
    /AI output must not overwrite the Evidence ledger input artifact/,
  )
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(projectRoot, defaults.ledger), 'utf8')), fixture.ledger)
})
