#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const childProcess = require('node:child_process')

const { createOpenAICompatibleProvider } = require('../src/ai-provider.js')
const {
  applyTheoryReview,
  resumeTheoryAgent,
  startTheoryAgent,
  validateTheoryAgentRun,
} = require('../src/theory-agent.js')
const { digestValue } = require('../src/artifact-digest.js')

const projectRoot = path.resolve(__dirname, '..')
const secureInputHelper = path.join(__dirname, 'secure-input-read.py')
const secureOutputHelper = path.join(__dirname, 'secure-run-output.py')
const defaults = Object.freeze({
  extractions: 'data/evidence/extractions/zzz-1-4-fade-approved.json',
  evidenceReview: 'data/evidence/reviews/zzz-1-4-fade-evidence-review.json',
  ledger: 'data/evidence/ledger.json',
  theoryCatalog: 'data/evidence/theory-catalog.json',
  fixtureMapping: 'data/theory-agent/zzz-1-4-fade-mapping-fixture.json',
  run: 'experiments/output/theory/zzz-1-4-fade-run.json',
})

function usage() {
  return [
    'Theory System Agent',
    '',
    'Commands:',
    '  start  [--demo] [--run PATH] [--replace]',
    '  review --decision approve|revise|reject --reviewer NAME [--feedback TEXT] [--run PATH]',
    '  resume [--demo] [--run PATH]',
    '  status [--run PATH]',
    '',
    'Live mode reads PROGRAM_E_AI_BASE_URL, PROGRAM_E_AI_API_KEY, and PROGRAM_E_AI_MODEL.',
    'Demo mode uses a checked-in deterministic fixture and never claims a real model call.',
  ].join('\n')
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = {}
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument: ${token}`)
    const name = token.slice(2)
    if (['demo', 'replace'].includes(name)) {
      options[name] = true
      continue
    }
    const value = rest[index + 1]
    if (!value || value.startsWith('--')) throw new TypeError(`Option --${name} requires a value`)
    options[name] = value
    index += 1
  }
  return { command, options }
}

function isInsideProject(root, candidate, { allowRoot = false } = {}) {
  const relative = path.relative(root, candidate)
  if (relative === '') return allowRoot
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

function resolveRealProjectRoot(root) {
  const resolved = path.resolve(root)
  let realRoot
  try {
    realRoot = fs.realpathSync(resolved)
  } catch (error) {
    throw new TypeError(`Project root could not be resolved: ${error.message}`)
  }
  if (!fs.statSync(realRoot).isDirectory()) throw new TypeError('Project root must be a directory')
  return realRoot
}

function resolveProjectPath(root, relativePath, label) {
  if (typeof relativePath !== 'string' || relativePath.trim().length === 0) {
    throw new TypeError(`${label} path is required`)
  }
  const candidate = path.resolve(root, relativePath)
  if (!isInsideProject(root, candidate)) throw new TypeError(`${label} path must stay inside the project`)
  return candidate
}

function resolveInputRecord(root, relativePath, label) {
  const inputPath = resolveProjectPath(root, relativePath, label)
  const relative = path.relative(root, inputPath)
  const components = relative.split(path.sep)
  if (components.some((component) => component === '' || component === '.' || component === '..')) {
    throw new TypeError(`${label} path must stay inside the project`)
  }
  return {
    path: inputPath,
    safePath: components.join('/'),
  }
}

function openInputContext(root, beforeInputOpen) {
  let rootDescriptor = null
  try {
    rootDescriptor = fs.openSync(
      root,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW,
    )
    if (!fs.fstatSync(rootDescriptor).isDirectory()) throw new TypeError('Project root must be a directory')
    return { root, rootDescriptor, beforeInputOpen, inputOpenStarted: false }
  } catch (error) {
    if (rootDescriptor !== null) fs.closeSync(rootDescriptor)
    throw new TypeError(`Project root could not be opened safely: ${error.message}`)
  }
}

function closeInputContext(context) {
  if (context?.rootDescriptor !== null) {
    fs.closeSync(context.rootDescriptor)
    context.rootDescriptor = null
  }
}

function parseHelperResponse(result) {
  if (typeof result.stdout !== 'string' || result.stdout.trim() === '') return null
  try {
    const response = JSON.parse(result.stdout)
    return response && typeof response === 'object' && !Array.isArray(response) ? response : null
  } catch {
    return null
  }
}

function inputReadError(root, input, label) {
  try {
    const resolved = fs.realpathSync(input.path)
    if (!isInsideProject(root, resolved)) {
      return new TypeError(`${label} path resolves outside the project`)
    }
  } catch {
    // The descriptor-bound helper remains the authority; this only preserves safe error specificity.
  }
  return new TypeError(`${label} could not be read at ${input.safePath}`)
}

function readJsonArtifact(context, relativePath, label) {
  const input = resolveInputRecord(context.root, relativePath, label)
  if (!context.inputOpenStarted) {
    context.inputOpenStarted = true
    if (context.beforeInputOpen) context.beforeInputOpen()
  }
  const result = childProcess.spawnSync('python3', [secureInputHelper], {
    encoding: 'utf8',
    input: JSON.stringify({ relativePath: input.safePath }),
    maxBuffer: 48 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe', context.rootDescriptor],
  })
  if (result.error) throw new TypeError('Secure input reader is unavailable')
  const response = parseHelperResponse(result)
  if (result.status !== 0 || response?.status !== 'ok' ||
      typeof response.contents !== 'string' || !response.identity) {
    throw inputReadError(context.root, input, label)
  }
  let contents
  try {
    const decoded = Buffer.from(response.contents, 'base64')
    if (decoded.toString('base64') !== response.contents) throw new TypeError('invalid base64')
    contents = decoded.toString('utf8')
  } catch {
    throw inputReadError(context.root, input, label)
  }
  let value
  try {
    value = JSON.parse(contents)
  } catch {
    throw new TypeError(`${label} contains invalid JSON at ${input.safePath}`)
  }
  return { label, path: input.path, identity: response.identity, value }
}

function inspectPath(pathname) {
  try {
    return fs.lstatSync(pathname)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function ensureSafeOutputParent(root, outputPath, { createMissing = true } = {}) {
  const parentPath = path.dirname(outputPath)
  const relative = path.relative(root, parentPath)
  const segments = relative === '' ? [] : relative.split(path.sep)
  let current = root
  for (const segment of segments) {
    current = path.join(current, segment)
    let stat = inspectPath(current)
    if (!stat) {
      if (!createMissing) throw new TypeError('Run output parent does not exist')
      fs.mkdirSync(current, { mode: 0o700 })
      stat = fs.lstatSync(current)
    }
    if (stat.isSymbolicLink()) throw new TypeError(`Run output parent contains a symbolic link: ${segment}`)
    if (!stat.isDirectory()) throw new TypeError(`Run output parent component is not a directory: ${segment}`)
  }
  const realParent = fs.realpathSync(parentPath)
  if (!isInsideProject(root, realParent, { allowRoot: true })) {
    throw new TypeError('Run output parent resolves outside the project')
  }
  return realParent
}

function sameIdentity(left, right) {
  return left?.dev === right?.dev && left?.ino === right?.ino
}

function runOutputHelper(output, request) {
  const result = childProcess.spawnSync(
    'python3',
    [secureOutputHelper],
    {
      encoding: 'utf8',
      input: JSON.stringify(request),
      stdio: ['pipe', 'pipe', 'pipe', output.parentDescriptor],
    },
  )
  if (result.error) throw new TypeError('Secure run output helper is unavailable')
  return { processStatus: result.status, response: parseHelperResponse(result) }
}

function inspectBoundOutputTarget(output) {
  const result = runOutputHelper(output, { operation: 'inspect', targetName: output.targetName })
  if (result.processStatus !== 0 || result.response?.status !== 'ok' || !result.response.target) {
    throw new TypeError('Run output target could not be inspected safely')
  }
  const target = result.response.target
  if (target.kind === 'missing') return { kind: 'missing' }
  if (target.kind === 'symlink') throw new TypeError('Run output target must not be a symbolic link')
  if (target.kind !== 'file') throw new TypeError('Run output target must be a regular file')
  return target
}

function reconcileRunOutput(output, operationId) {
  const result = runOutputHelper(output, {
    operation: 'recover',
    journalName: output.journalName,
    operationId,
  })
  if ((result.processStatus !== 0 && !['busy', 'conflict-preserved'].includes(result.response?.status)) ||
      !['none', 'published', 'unpublished', 'conflict', 'conflict-preserved', 'busy'].includes(result.response?.status)) {
    throw new TypeError('Run output transaction could not be recovered safely')
  }
  return result.response
}

function finalizeRunOutput(output, operationId, publishedIdentity) {
  const request = {
    operation: 'finalize',
    journalName: output.journalName,
    operationId,
    publishedIdentity,
  }
  let result = runOutputHelper(output, request)
  if (result.processStatus === 0 && result.response?.status === 'finalized' &&
      result.response.operationId === operationId) return

  // A lost finalize response is safe to retry: cleanup is ownership-aware and idempotent.
  result = runOutputHelper(output, request)
  if (result.processStatus === 0 && ['finalized', 'none'].includes(result.response?.status) &&
      result.response.operationId === operationId) {
    const target = inspectBoundOutputTarget(output)
    if (target.kind === 'file' && sameIdentity(target.identity, publishedIdentity)) return
  }
  throw new TypeError('Theory run output acknowledgement failed')
}

function assertOutputParentStillBound(output) {
  let realParent
  let currentIdentity
  try {
    realParent = fs.realpathSync(output.parentPath)
    const currentStat = fs.statSync(realParent)
    currentIdentity = { dev: String(currentStat.dev), ino: String(currentStat.ino) }
  } catch {
    throw new TypeError('Run output parent changed during write')
  }
  if (!isInsideProject(output.root, realParent, { allowRoot: true }) ||
      !sameIdentity(currentIdentity, output.parentIdentity)) {
    throw new TypeError('Run output parent changed during write')
  }
}

function assertOutputDoesNotOverwriteInput(output, inputArtifacts) {
  const collision = inputArtifacts.find((artifact) => {
    if (output.outputPath === artifact.path) return true
    return output.target.kind === 'file' && sameIdentity(output.target.identity, artifact.identity)
  })
  if (collision) throw new TypeError(`Run output must not overwrite the ${collision.label} input artifact`)
}

function prepareRunOutput(root, relativePath, inputArtifacts, { createMissingParent = true } = {}) {
  const outputPath = resolveProjectPath(root, relativePath, 'Run output')
  const parentPath = path.dirname(outputPath)
  const realParent = ensureSafeOutputParent(root, outputPath, { createMissing: createMissingParent })
  const expectedParentStat = fs.statSync(realParent)
  const parentIdentity = { dev: String(expectedParentStat.dev), ino: String(expectedParentStat.ino) }
  let parentDescriptor = null
  try {
    parentDescriptor = fs.openSync(
      realParent,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW,
    )
    const openedParentStat = fs.fstatSync(parentDescriptor)
    const openedParentIdentity = { dev: String(openedParentStat.dev), ino: String(openedParentStat.ino) }
    if (!openedParentStat.isDirectory() || !sameIdentity(openedParentIdentity, parentIdentity)) {
      throw new TypeError('Run output parent changed while it was being opened')
    }
    const output = {
      root,
      outputPath,
      parentPath,
      parentDescriptor,
      parentIdentity,
      targetName: path.basename(outputPath),
      journalName: `.${path.basename(outputPath)}.transaction.json`,
    }
    assertOutputParentStillBound(output)
    const recovery = reconcileRunOutput(output)
    if (['conflict', 'conflict-preserved'].includes(recovery.status)) {
      throw new TypeError('A previous run output transaction conflicts with the current target')
    } else if (recovery.status === 'busy') {
      throw new TypeError('Another run output transaction is still in progress')
    } else if (recovery.status === 'published') {
      finalizeRunOutput(output, recovery.operationId, recovery.publishedIdentity)
    }
    output.target = inspectBoundOutputTarget(output)
    assertOutputDoesNotOverwriteInput(output, inputArtifacts)
    return output
  } catch (error) {
    if (parentDescriptor !== null) fs.closeSync(parentDescriptor)
    throw error
  }
}

function closeRunOutput(output) {
  if (output?.parentDescriptor !== null) {
    fs.closeSync(output.parentDescriptor)
    output.parentDescriptor = null
  }
}

function writeJsonAtomic(output, value, {
  replace = true,
  beforeCommit,
  afterCommit,
  filesystemFailpoint,
} = {}) {
  const serialized = JSON.stringify(value, null, 2)
  if (typeof serialized !== 'string') throw new TypeError('Theory run must be JSON serializable')
  assertOutputParentStillBound(output)
  if (beforeCommit) beforeCommit()
  const operationId = randomUUID()
  const nonce = `${process.pid}-${operationId}`
  const request = {
    operation: 'commit',
    operationId,
    mode: replace ? 'replace' : 'noreplace',
    targetName: output.targetName,
    tempName: `.${output.targetName}.tmp-${nonce}`,
    backupName: `.${output.targetName}.bak-${nonce}`,
    journalName: output.journalName,
    expectedTarget: output.target,
    contents: Buffer.from(`${serialized}\n`, 'utf8').toString('base64'),
    failpoint: filesystemFailpoint,
  }
  const result = runOutputHelper(output, request)
  let publishedIdentity = result.processStatus === 0 && result.response?.status === 'committed' &&
    result.response.operationId === operationId
    ? result.response.publishedIdentity
    : null
  if (!publishedIdentity) {
    const failureStatus = result.response?.status
    const recovery = reconcileRunOutput(output, operationId)
    if (recovery.status === 'published' && recovery.operationId === operationId) {
      publishedIdentity = recovery.publishedIdentity
    } else {
      if (!replace && failureStatus === 'exists') {
        throw new TypeError('Theory run already exists; pass --replace to start a new run explicitly')
      }
      if (['conflict', 'conflict-preserved'].includes(failureStatus) ||
          ['conflict', 'conflict-preserved'].includes(recovery.status)) {
        throw new TypeError('Theory run changed before it could be committed safely')
      }
      throw new TypeError('Theory run could not be committed safely')
    }
  }

  assertOutputParentStillBound(output)
  let currentTarget = inspectBoundOutputTarget(output)
  if (currentTarget.kind !== 'file' || !sameIdentity(currentTarget.identity, publishedIdentity)) {
    throw new TypeError('Theory run output changed after publication')
  }
  finalizeRunOutput(output, operationId, publishedIdentity)

  if (afterCommit) afterCommit()
  assertOutputParentStillBound(output)
  currentTarget = inspectBoundOutputTarget(output)
  if (currentTarget.kind !== 'file' || !sameIdentity(currentTarget.identity, publishedIdentity)) {
    throw new TypeError('Theory run output changed after publication')
  }
  return output.outputPath
}

function loadInputArtifacts(inputContext, env = process.env) {
  const artifacts = {
    approvedExtractions: readJsonArtifact(inputContext, env.PROGRAM_E_THEORY_EXTRACTIONS || defaults.extractions, 'Approved extractions'),
    evidenceReview: readJsonArtifact(inputContext, env.PROGRAM_E_EVIDENCE_REVIEW || defaults.evidenceReview, 'Evidence review'),
    ledger: readJsonArtifact(inputContext, env.PROGRAM_E_EVIDENCE_LEDGER || defaults.ledger, 'Evidence ledger'),
    theoryCatalog: readJsonArtifact(inputContext, env.PROGRAM_E_THEORY_CATALOG || defaults.theoryCatalog, 'Theory catalog'),
  }
  if (!Array.isArray(artifacts.approvedExtractions.value) || artifacts.approvedExtractions.value.length === 0) {
    throw new TypeError('Approved extractions file must contain a non-empty array')
  }
  return artifacts
}

function inputValues(artifacts) {
  return {
    approvedExtractions: artifacts.approvedExtractions.value,
    evidenceReview: artifacts.evidenceReview.value,
    ledger: artifacts.ledger.value,
    theoryCatalog: artifacts.theoryCatalog.value,
  }
}

function loadFixtureArtifact(inputContext, env = process.env) {
  return readJsonArtifact(inputContext, env.PROGRAM_E_THEORY_FIXTURE || defaults.fixtureMapping, 'Theory mapping fixture')
}

function createFixtureProvider(root, env = process.env, fixture) {
  return Object.freeze({
    async generateObject() {
      return {
        object: structuredClone(fixture.value),
        provenance: {
          mode: 'deterministic-fixture',
          fixturePath: path.relative(root, fixture.path).split(path.sep).join('/'),
          fixtureDigest: digestValue(fixture.value),
        },
      }
    },
  })
}

function createProvider({ demo }, root, env = process.env, fixture) {
  if (demo) return createFixtureProvider(root, env, fixture)
  return createOpenAICompatibleProvider({
    baseUrl: env.PROGRAM_E_AI_BASE_URL,
    apiKey: env.PROGRAM_E_AI_API_KEY,
    model: env.PROGRAM_E_AI_MODEL,
  })
}

function summarize(run) {
  return {
    runId: run.runId,
    state: run.state,
    revision: run.revision,
    attempt: run.attempt,
    realModelUsed: run.capabilities.realModelUsed,
    mappingCount: run.mapping?.mappings?.length || 0,
    unmappedClaimCount: run.audit?.unmappedClaimProposalIds?.length || 0,
    theorySystemId: run.theorySystem?.id || null,
    nextAction: run.state === 'AWAITING_HUMAN'
      ? 'Run review with approve, revise, or reject.'
      : (run.state === 'APPROVED' || run.state === 'REVISION_REQUESTED' ? 'Run resume.' : null),
  }
}

function assertAuthoritativeRun(run, inputs) {
  const validation = validateTheoryAgentRun(run, inputs)
  if (!validation.valid) throw new TypeError('Theory run authority validation failed')
}

async function runCommand({
  argv = process.argv.slice(2),
  env = process.env,
  now = new Date().toISOString(),
  beforeInputOpen,
  beforeRunCommit,
  afterRunCommit,
  filesystemFailpoint,
} = {}) {
  const { command, options } = parseArgs(argv)
  if (!command || ['help', '-h', '--help'].includes(command)) return { kind: 'help', text: usage() }
  const realRoot = resolveRealProjectRoot(projectRoot)
  const runRelative = options.run || env.PROGRAM_E_THEORY_RUN || defaults.run
  const inputContext = openInputContext(realRoot, beforeInputOpen)
  try {
    if (command === 'start') {
      const inputArtifacts = loadInputArtifacts(inputContext, env)
      const fixtureArtifact = loadFixtureArtifact(inputContext, env)
      const output = prepareRunOutput(realRoot, runRelative, [...Object.values(inputArtifacts), fixtureArtifact])
      try {
        if (output.target.kind !== 'missing' && !options.replace) {
          throw new TypeError('Theory run already exists; pass --replace to start a new run explicitly')
        }
        const run = await startTheoryAgent({
          ...inputValues(inputArtifacts),
          provider: createProvider(options, realRoot, env, fixtureArtifact),
          runId: `zzz-fade-${now.replace(/[^0-9]/g, '').slice(0, 14)}`,
          now,
        })
        writeJsonAtomic(output, run, {
          replace: options.replace === true,
          beforeCommit: beforeRunCommit,
          afterCommit: afterRunCommit,
          filesystemFailpoint,
        })
        return { kind: 'run', summary: summarize(run), path: runRelative }
      } finally {
        closeRunOutput(output)
      }
    }

    const output = prepareRunOutput(realRoot, runRelative, [], { createMissingParent: false })
    try {
      const runArtifact = readJsonArtifact(inputContext, runRelative, 'Theory run')
      const run = runArtifact.value
      if (output.target.kind !== 'file' || !sameIdentity(output.target.identity, runArtifact.identity)) {
        throw new TypeError('Theory run changed after it was read')
      }
      if (command === 'status') {
        const inputArtifacts = loadInputArtifacts(inputContext, env)
        assertOutputDoesNotOverwriteInput(output, Object.values(inputArtifacts))
        assertAuthoritativeRun(run, inputValues(inputArtifacts))
        return { kind: 'run', summary: summarize(run), path: runRelative }
      }

      const inputArtifacts = loadInputArtifacts(inputContext, env)
      const fixtureArtifact = loadFixtureArtifact(inputContext, env)
      assertOutputDoesNotOverwriteInput(output, [...Object.values(inputArtifacts), fixtureArtifact])
      if (command === 'review') {
        const inputs = inputValues(inputArtifacts)
        assertAuthoritativeRun(run, inputs)
        const decision = options.decision
        if (!['approve', 'revise', 'reject'].includes(decision)) {
          throw new TypeError('Review requires --decision approve, revise, or reject')
        }
        if (!options.reviewer) throw new TypeError('Review requires --reviewer')
        if (decision === 'revise' && !options.feedback) throw new TypeError('Revision review requires --feedback')
        const mappingDecision = decision === 'approve' ? 'approve' : decision
        const reviewed = applyTheoryReview({
          ...inputs,
          run,
          review: {
            schemaVersion: 'theory-review/1.0',
            targetDigest: run.checkpoint?.targetDigest,
            decision,
            mappingDecisions: (run.mapping?.mappings || []).map((mapping) => ({
              mappingId: mapping.id,
              decision: mappingDecision,
              reasonCodes: [decision === 'approve' ? 'HUMAN_VERIFIED' : decision === 'revise' ? 'REVISION_REQUIRED' : 'HUMAN_REJECTED'],
            })),
            reviewer: options.reviewer,
            reviewedAt: now,
            feedback: options.feedback ? [options.feedback] : [],
          },
        })
        writeJsonAtomic(output, reviewed, {
          beforeCommit: beforeRunCommit,
          afterCommit: afterRunCommit,
          filesystemFailpoint,
        })
        return { kind: 'run', summary: summarize(reviewed), path: runRelative }
      }

      if (command === 'resume') {
        const inputs = inputValues(inputArtifacts)
        assertAuthoritativeRun(run, inputs)
        const provider = run.state === 'REVISION_REQUESTED'
          ? createProvider(options, realRoot, env, fixtureArtifact)
          : undefined
        const resumed = await resumeTheoryAgent({ run, provider, ...inputs, now })
        writeJsonAtomic(output, resumed, {
          beforeCommit: beforeRunCommit,
          afterCommit: afterRunCommit,
          filesystemFailpoint,
        })
        return { kind: 'run', summary: summarize(resumed), path: runRelative }
      }

      throw new TypeError(`Unknown command: ${command}`)
    } finally {
      closeRunOutput(output)
    }
  } finally {
    closeInputContext(inputContext)
  }
}

async function main() {
  const result = await runCommand()
  if (result.kind === 'help') {
    process.stdout.write(`${result.text}\n`)
    return
  }
  process.stdout.write(`${JSON.stringify({ ...result.summary, runPath: result.path }, null, 2)}\n`)
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Theory agent failed: ${error.message}\n`)
    process.exitCode = 1
  })
}

module.exports = {
  defaults,
  parseArgs,
  runCommand,
  summarize,
  usage,
}
