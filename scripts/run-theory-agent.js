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
} = require('../src/theory-agent.js')
const { digestValue } = require('../src/artifact-digest.js')

const projectRoot = path.resolve(__dirname, '..')
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

function resolveInputPath(root, relativePath, label) {
  const lexicalPath = resolveProjectPath(root, relativePath, label)
  let realPath
  try {
    realPath = fs.realpathSync(lexicalPath)
  } catch (error) {
    throw new TypeError(`${label} path could not be resolved: ${error.message}`)
  }
  if (!isInsideProject(root, realPath)) throw new TypeError(`${label} path resolves outside the project`)
  return realPath
}

function readJsonArtifact(root, relativePath, label) {
  const inputPath = resolveInputPath(root, relativePath, label)
  const safePath = path.relative(root, inputPath).split(path.sep).join('/')
  let expectedIdentity
  let fileDescriptor = null
  let contents
  try {
    const expectedStat = fs.statSync(inputPath)
    if (!expectedStat.isFile()) throw new TypeError(`${label} must be a regular file at ${safePath}`)
    expectedIdentity = { dev: String(expectedStat.dev), ino: String(expectedStat.ino) }
    fileDescriptor = fs.openSync(inputPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)
    const openedStat = fs.fstatSync(fileDescriptor)
    const openedIdentity = { dev: String(openedStat.dev), ino: String(openedStat.ino) }
    if (!openedStat.isFile() || openedIdentity.dev !== expectedIdentity.dev || openedIdentity.ino !== expectedIdentity.ino) {
      throw new TypeError(`${label} changed while it was being opened at ${safePath}`)
    }
    contents = fs.readFileSync(fileDescriptor, 'utf8')
  } catch {
    throw new TypeError(`${label} could not be read at ${safePath}`)
  } finally {
    if (fileDescriptor !== null) fs.closeSync(fileDescriptor)
  }
  let value
  try {
    value = JSON.parse(contents)
  } catch {
    throw new TypeError(`${label} contains invalid JSON at ${safePath}`)
  }
  return { label, path: inputPath, identity: expectedIdentity, value }
}

function inspectPath(pathname) {
  try {
    return fs.lstatSync(pathname)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function ensureSafeOutputParent(root, outputPath) {
  const parentPath = path.dirname(outputPath)
  const relative = path.relative(root, parentPath)
  const segments = relative === '' ? [] : relative.split(path.sep)
  let current = root
  for (const segment of segments) {
    current = path.join(current, segment)
    let stat = inspectPath(current)
    if (!stat) {
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

function runOutputHelper(output, operation, contents = '') {
  const result = childProcess.spawnSync(
    'python3',
    [secureOutputHelper, operation, output.temporaryName, output.targetName, output.backupName],
    {
      encoding: 'utf8',
      input: contents,
      stdio: ['pipe', 'pipe', 'pipe', output.parentDescriptor],
    },
  )
  if (result.error) throw new TypeError('Secure run output helper is unavailable')
  return result
}

function inspectBoundOutputTarget(output) {
  const result = runOutputHelper(output, 'inspect')
  if (result.status !== 0) throw new TypeError('Run output target could not be inspected safely')
  const [kind, dev, ino] = result.stdout.trim().split(/\s+/)
  if (kind === 'missing') return { kind }
  if (kind === 'symlink') throw new TypeError('Run output target must not be a symbolic link')
  if (kind !== 'file') throw new TypeError('Run output target must be a regular file')
  return { kind, identity: { dev, ino } }
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

function prepareRunOutput(root, relativePath, inputArtifacts) {
  const outputPath = resolveProjectPath(root, relativePath, 'Run output')
  const parentPath = path.dirname(outputPath)
  const realParent = ensureSafeOutputParent(root, outputPath)
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
    const nonce = `${process.pid}-${randomUUID()}`
    const output = {
      root,
      outputPath,
      parentPath,
      parentDescriptor,
      parentIdentity,
      targetName: path.basename(outputPath),
      temporaryName: `.${path.basename(outputPath)}.tmp-${nonce}`,
      backupName: `.${path.basename(outputPath)}.bak-${nonce}`,
    }
    assertOutputParentStillBound(output)
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

function writeJsonAtomic(output, value, { replace = true, beforeCommit } = {}) {
  const serialized = JSON.stringify(value, null, 2)
  if (typeof serialized !== 'string') throw new TypeError('Theory run must be JSON serializable')
  assertOutputParentStillBound(output)
  if (beforeCommit) beforeCommit()
  const operation = replace ? 'write-replace' : 'write-noreplace'
  const result = runOutputHelper(output, operation, `${serialized}\n`)
  if (!replace && result.status === 17) {
    throw new TypeError('Theory run already exists; pass --replace to start a new run explicitly')
  }
  if (result.status !== 0) throw new TypeError('Theory run could not be committed safely')
  try {
    assertOutputParentStillBound(output)
  } catch (error) {
    const rollback = runOutputHelper(output, replace ? 'rollback-replace' : 'rollback-noreplace')
    if (rollback.status !== 0) throw new TypeError('Theory run output rollback failed')
    throw error
  }
  const finalized = runOutputHelper(output, 'finalize')
  if (finalized.status !== 0) throw new TypeError('Theory run output cleanup failed')
  return output.outputPath
}

function loadInputArtifacts(root, env = process.env) {
  const artifacts = {
    approvedExtractions: readJsonArtifact(root, env.PROGRAM_E_THEORY_EXTRACTIONS || defaults.extractions, 'Approved extractions'),
    evidenceReview: readJsonArtifact(root, env.PROGRAM_E_EVIDENCE_REVIEW || defaults.evidenceReview, 'Evidence review'),
    ledger: readJsonArtifact(root, env.PROGRAM_E_EVIDENCE_LEDGER || defaults.ledger, 'Evidence ledger'),
    theoryCatalog: readJsonArtifact(root, env.PROGRAM_E_THEORY_CATALOG || defaults.theoryCatalog, 'Theory catalog'),
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

function loadFixtureArtifact(root, env = process.env) {
  return readJsonArtifact(root, env.PROGRAM_E_THEORY_FIXTURE || defaults.fixtureMapping, 'Theory mapping fixture')
}

function createFixtureProvider(root, env = process.env, fixture = loadFixtureArtifact(root, env)) {
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

async function runCommand({
  argv = process.argv.slice(2),
  env = process.env,
  now = new Date().toISOString(),
  beforeRunCommit,
} = {}) {
  const { command, options } = parseArgs(argv)
  if (!command || ['help', '-h', '--help'].includes(command)) return { kind: 'help', text: usage() }
  const realRoot = resolveRealProjectRoot(projectRoot)
  const runRelative = options.run || env.PROGRAM_E_THEORY_RUN || defaults.run

  if (command === 'start') {
    const inputArtifacts = loadInputArtifacts(realRoot, env)
    const fixtureArtifact = loadFixtureArtifact(realRoot, env)
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
      writeJsonAtomic(output, run, { replace: options.replace === true, beforeCommit: beforeRunCommit })
      return { kind: 'run', summary: summarize(run), path: runRelative }
    } finally {
      closeRunOutput(output)
    }
  }

  const runArtifact = readJsonArtifact(realRoot, runRelative, 'Theory run')
  const run = runArtifact.value
  if (command === 'status') return { kind: 'run', summary: summarize(run), path: runRelative }

  const inputArtifacts = loadInputArtifacts(realRoot, env)
  const fixtureArtifact = loadFixtureArtifact(realRoot, env)
  const output = prepareRunOutput(realRoot, runRelative, [...Object.values(inputArtifacts), fixtureArtifact])
  try {
    if (command === 'review') {
      const decision = options.decision
      if (!['approve', 'revise', 'reject'].includes(decision)) {
        throw new TypeError('Review requires --decision approve, revise, or reject')
      }
      if (!options.reviewer) throw new TypeError('Review requires --reviewer')
      if (decision === 'revise' && !options.feedback) throw new TypeError('Revision review requires --feedback')
      const mappingDecision = decision === 'approve' ? 'approve' : decision
      const reviewed = applyTheoryReview({
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
      writeJsonAtomic(output, reviewed, { beforeCommit: beforeRunCommit })
      return { kind: 'run', summary: summarize(reviewed), path: runRelative }
    }

    if (command === 'resume') {
      const inputs = inputValues(inputArtifacts)
      const provider = run.state === 'REVISION_REQUESTED'
        ? createProvider(options, realRoot, env, fixtureArtifact)
        : undefined
      const resumed = await resumeTheoryAgent({ run, provider, ...inputs, now })
      writeJsonAtomic(output, resumed, { beforeCommit: beforeRunCommit })
      return { kind: 'run', summary: summarize(resumed), path: runRelative }
    }

    throw new TypeError(`Unknown command: ${command}`)
  } finally {
    closeRunOutput(output)
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
