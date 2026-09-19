#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const childProcess = require('node:child_process')

const { createMiniMaxM27Provider } = require('../src/ai-provider.js')
const { digestValue } = require('../src/artifact-digest.js')
const {
  prepareScenarioCompilation,
  runScenarioCompilation,
} = require('../src/compilation-pipeline.js')
const {
  auditTheoryMapping,
  validateTheoryAgentRun,
} = require('../src/theory-agent.js')
const { finalizeTheorySystem } = require('../src/theory-system.js')

const projectRoot = path.resolve(__dirname, '..')
const secureOutputHelper = path.join(__dirname, 'secure-run-output.py')
const defaults = Object.freeze({
  approvedExtractions: 'data/evidence/extractions/zzz-1-4-fade-approved.json',
  evidenceReview: 'data/evidence/reviews/zzz-1-4-fade-evidence-review.json',
  ledger: 'data/evidence/ledger.json',
  theoryCatalog: 'data/evidence/theory-catalog.json',
  theoryRun: 'experiments/output/theory/zzz-1-4-fade-run.json',
  verticalSlice: 'data/scenarios/zzz-3-1-fade-risk-vertical-slice.json',
  output: 'experiments/output/ai/compiled-scenario-v1.json',
})
const PATH_OPTIONS = new Set([
  'approved-extractions', 'evidence-review', 'ledger', 'theory-catalog', 'theory-run', 'vertical-slice', 'output',
])
const INPUT_DIGEST_KEYS = Object.freeze(['approvedExtractions', 'evidenceReview', 'ledger', 'theoryCatalog'])

function usage() {
  return [
    'Compile the checked ZZZ 3.1 fade-risk vertical slice with a real structured-output model.',
    '',
    'The Theory Agent run must be READY_FOR_COMPILATION and contain an approved Theory System.',
    '',
    'Required environment variables:',
    '  PROGRAM_E_AI_BASE_URL   OpenAI-compatible API base, usually ending in /v1',
    '  PROGRAM_E_AI_API_KEY    Server-side BYOK credential',
    '  PROGRAM_E_AI_MODEL      Model identifier',
    '',
    'Optional path overrides (CLI flags take precedence):',
    '  --approved-extractions PATH  PROGRAM_E_THEORY_EXTRACTIONS',
    '  --evidence-review PATH       PROGRAM_E_EVIDENCE_REVIEW',
    '  --ledger PATH           PROGRAM_E_EVIDENCE_LEDGER',
    '  --theory-catalog PATH   PROGRAM_E_THEORY_CATALOG',
    '  --theory-run PATH       PROGRAM_E_THEORY_RUN',
    '  --vertical-slice PATH   PROGRAM_E_VERTICAL_SLICE',
    '  --output PATH           PROGRAM_E_AI_OUTPUT',
    '',
    'All paths must stay inside the project root.',
  ].join('\n')
}

function parseArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--help' || token === '-h') {
      options.help = true
      continue
    }
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument: ${token}`)
    const name = token.slice(2)
    if (!PATH_OPTIONS.has(name)) throw new TypeError(`Unknown option: --${name}`)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new TypeError(`Option --${name} requires a value`)
    options[name] = value
    index += 1
  }
  return options
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
  try {
    const fileStat = fs.statSync(inputPath)
    if (!fileStat.isFile()) throw new TypeError('artifact is not a regular file')
    return {
      label,
      path: inputPath,
      identity: { dev: String(fileStat.dev), ino: String(fileStat.ino) },
      value: JSON.parse(fs.readFileSync(inputPath, 'utf8')),
    }
  } catch (error) {
    throw new TypeError(`${label} could not be read as JSON: ${error.message}`)
  }
}

function inspectPath(pathname) {
  try {
    return fs.lstatSync(pathname)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function resolveExistingOutputParent(root, outputPath) {
  const parentPath = path.dirname(outputPath)
  const relative = path.relative(root, parentPath)
  const segments = relative === '' ? [] : relative.split(path.sep)
  let current = root
  for (const segment of segments) {
    current = path.join(current, segment)
    const stat = inspectPath(current)
    if (!stat) throw new TypeError('AI output parent does not exist')
    if (stat.isSymbolicLink()) throw new TypeError(`AI output parent contains a symbolic link: ${segment}`)
    if (!stat.isDirectory()) throw new TypeError(`AI output parent component is not a directory: ${segment}`)
  }
  const realParent = fs.realpathSync(parentPath)
  if (!isInsideProject(root, realParent, { allowRoot: true })) {
    throw new TypeError('AI output parent resolves outside the project')
  }
  return realParent
}

function sameIdentity(left, right) {
  return left?.dev === right?.dev && left?.ino === right?.ino
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

function runOutputHelper(output, request) {
  const result = childProcess.spawnSync('python3', [secureOutputHelper], {
    encoding: 'utf8',
    input: JSON.stringify(request),
    stdio: ['pipe', 'pipe', 'pipe', output.parentDescriptor],
  })
  // The inherited fd shares one open-file description; explicitly release its helper-acquired flock.
  const unlock = childProcess.spawnSync(
    'python3',
    ['-c', 'import fcntl; fcntl.flock(3, fcntl.LOCK_UN)'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe', output.parentDescriptor] },
  )
  if (unlock.error || unlock.status !== 0) throw new TypeError('Secure AI output lock could not be released')
  if (result.error) throw new TypeError('Secure AI output helper is unavailable')
  return { processStatus: result.status, response: parseHelperResponse(result) }
}

function busyOutputError() {
  return new TypeError('Another AI output transaction is still in progress')
}

function inspectBoundOutputTarget(output) {
  const result = runOutputHelper(output, { operation: 'inspect', targetName: output.targetName })
  if (result.processStatus === 76 || result.response?.status === 'busy') throw busyOutputError()
  if (result.processStatus !== 0 || result.response?.status !== 'ok' || !result.response.target) {
    throw new TypeError('AI output target could not be inspected safely')
  }
  const target = result.response.target
  if (target.kind === 'missing') return { kind: 'missing' }
  if (target.kind === 'symlink') throw new TypeError('AI output target must not be a symbolic link')
  if (target.kind !== 'file') throw new TypeError('AI output target must be a regular file')
  return target
}

function recoverOutput(output, operationId, { allowConflict = false } = {}) {
  const request = { operation: 'recover', journalName: output.journalName }
  if (operationId) request.operationId = operationId
  const result = runOutputHelper(output, request)
  if (result.processStatus === 76 || result.response?.status === 'busy') throw busyOutputError()
  const allowed = new Set(['none', 'published', 'unpublished', 'conflict', 'conflict-preserved'])
  if (!allowed.has(result.response?.status) || ![0, 73].includes(result.processStatus)) {
    throw new TypeError('AI output transaction could not be recovered safely')
  }
  if (!allowConflict && ['conflict', 'conflict-preserved'].includes(result.response.status)) {
    throw new TypeError('A previous AI output transaction conflicts with the current target')
  }
  return result.response
}

function assertOutputParentStillBound(output) {
  let realParent
  let currentIdentity
  try {
    realParent = fs.realpathSync(output.parentPath)
    const currentStat = fs.statSync(realParent)
    currentIdentity = { dev: String(currentStat.dev), ino: String(currentStat.ino) }
  } catch {
    throw new TypeError('AI output parent changed during write')
  }
  if (!isInsideProject(output.root, realParent, { allowRoot: true }) ||
      !sameIdentity(currentIdentity, output.parentIdentity)) {
    throw new TypeError('AI output parent changed during write')
  }
}

function finalizeOutput(output, operationId, publishedIdentity) {
  const request = {
    operation: 'finalize',
    journalName: output.journalName,
    operationId,
    publishedIdentity,
  }
  let result = runOutputHelper(output, request)
  if (result.processStatus === 76 || result.response?.status === 'busy') throw busyOutputError()
  if (result.processStatus === 0 && result.response?.status === 'finalized' &&
      result.response.operationId === operationId) return
  result = runOutputHelper(output, request)
  if (result.processStatus === 76 || result.response?.status === 'busy') throw busyOutputError()
  if (result.processStatus === 0 && ['finalized', 'none'].includes(result.response?.status) &&
      result.response.operationId === operationId) {
    const target = inspectBoundOutputTarget(output)
    if (target.kind === 'file' && sameIdentity(target.identity, publishedIdentity)) return
  }
  throw new TypeError('AI output acknowledgement failed')
}

function assertOutputDoesNotOverwriteInput(output, inputArtifacts) {
  const collision = inputArtifacts.find((artifact) => {
    if (output.outputPath === artifact.path) return true
    return output.target.kind === 'file' && sameIdentity(output.target.identity, artifact.identity)
  })
  if (collision) throw new TypeError(`AI output must not overwrite the ${collision.label} input artifact`)
}

function prepareCompileOutput(root, relativePath, inputArtifacts) {
  const outputPath = resolveProjectPath(root, relativePath, 'AI output')
  const parentPath = path.dirname(outputPath)
  const realParent = resolveExistingOutputParent(root, outputPath)
  const parentStat = fs.statSync(realParent)
  const parentIdentity = { dev: String(parentStat.dev), ino: String(parentStat.ino) }
  let parentDescriptor = null
  try {
    parentDescriptor = fs.openSync(
      realParent,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW,
    )
    const openedStat = fs.fstatSync(parentDescriptor)
    const openedIdentity = { dev: String(openedStat.dev), ino: String(openedStat.ino) }
    if (!openedStat.isDirectory() || !sameIdentity(openedIdentity, parentIdentity)) {
      throw new TypeError('AI output parent changed while it was being opened')
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
    const recovery = recoverOutput(output)
    if (recovery.status === 'published') {
      finalizeOutput(output, recovery.operationId, recovery.publishedIdentity)
    }
    output.target = inspectBoundOutputTarget(output)
    assertOutputDoesNotOverwriteInput(output, inputArtifacts)
    return output
  } catch (error) {
    if (parentDescriptor !== null) fs.closeSync(parentDescriptor)
    throw error
  }
}

function closeCompileOutput(output) {
  if (output?.parentDescriptor !== null) {
    fs.closeSync(output.parentDescriptor)
    output.parentDescriptor = null
  }
}

function writeJsonAtomic(output, value, { beforeCommit, afterCommit, filesystemFailpoint } = {}) {
  const serialized = JSON.stringify(value, null, 2)
  if (typeof serialized !== 'string') throw new TypeError('Compiled scenario must be JSON serializable')
  assertOutputParentStillBound(output)
  if (beforeCommit) beforeCommit()
  const operationId = randomUUID()
  const nonce = `${process.pid}-${operationId}`
  const result = runOutputHelper(output, {
    operation: 'commit',
    operationId,
    mode: output.target.kind === 'missing' ? 'noreplace' : 'replace',
    targetName: output.targetName,
    tempName: `.${output.targetName}.tmp-${nonce}`,
    backupName: `.${output.targetName}.bak-${nonce}`,
    journalName: output.journalName,
    expectedTarget: output.target,
    contents: Buffer.from(`${serialized}\n`, 'utf8').toString('base64'),
    failpoint: filesystemFailpoint,
  })
  if (result.processStatus === 76 || result.response?.status === 'busy') throw busyOutputError()
  let publishedIdentity = result.processStatus === 0 && result.response?.status === 'committed' &&
    result.response.operationId === operationId
    ? result.response.publishedIdentity
    : null
  if (!publishedIdentity) {
    const failureStatus = result.response?.status
    const recovery = recoverOutput(output, operationId, { allowConflict: true })
    if (recovery.status === 'published' && recovery.operationId === operationId) {
      publishedIdentity = recovery.publishedIdentity
    } else if (['conflict', 'conflict-preserved', 'exists'].includes(failureStatus) ||
        ['conflict', 'conflict-preserved'].includes(recovery.status)) {
      throw new TypeError('AI output changed before it could be committed safely')
    } else {
      throw new TypeError('AI output could not be committed safely')
    }
  }
  assertOutputParentStillBound(output)
  let target = inspectBoundOutputTarget(output)
  if (target.kind !== 'file' || !sameIdentity(target.identity, publishedIdentity)) {
    throw new TypeError('AI output changed after publication')
  }
  finalizeOutput(output, operationId, publishedIdentity)
  if (afterCommit) afterCommit()
  assertOutputParentStillBound(output)
  target = inspectBoundOutputTarget(output)
  if (target.kind !== 'file' || !sameIdentity(target.identity, publishedIdentity)) {
    throw new TypeError('AI output changed after publication')
  }
  const outputStat = fs.statSync(output.outputPath)
  if ((outputStat.mode & 0o777) !== 0o600) throw new TypeError('AI output permissions are not 0600')
  return output.outputPath
}

function assertTheoryRunReadyState(theoryRun) {
  if (theoryRun.state !== 'READY_FOR_COMPILATION') {
    throw new TypeError(
      `Theory Agent run is ${theoryRun.state || 'UNKNOWN'}; expected READY_FOR_COMPILATION after human approval and resume`,
    )
  }
}

function assertReadyEventTransitions(theoryRun) {
  const events = theoryRun.events
  const allowedNextStates = {
    AWAITING_HUMAN: new Set(['REVISION_REQUESTED', 'APPROVED']),
    REVISION_REQUESTED: new Set(['AWAITING_HUMAN']),
    APPROVED: new Set(['READY_FOR_COMPILATION']),
    READY_FOR_COMPILATION: new Set(),
  }
  if (events[0]?.state !== 'AWAITING_HUMAN') {
    throw new TypeError('Theory Agent run event state transition must start at AWAITING_HUMAN')
  }
  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1].state
    const current = events[index].state
    if (!allowedNextStates[previous]?.has(current)) {
      throw new TypeError(`Theory Agent run event state transition is invalid: ${previous} -> ${current}`)
    }
  }
  const mappingAttempts = events.filter((event) => event.state === 'AWAITING_HUMAN').length
  const reviewTransitions = events.filter(
    (event) => event.state === 'REVISION_REQUESTED' || event.state === 'APPROVED',
  ).length
  if (mappingAttempts !== theoryRun.attempt || reviewTransitions !== theoryRun.reviews.length) {
    throw new TypeError('Theory Agent run event state transitions do not match its attempts and review history')
  }
}

function assertReadyTheoryRun(theoryRun, inputs) {
  assertTheoryRunReadyState(theoryRun)
  const runValidation = validateTheoryAgentRun(theoryRun)
  if (!runValidation.valid) {
    throw new TypeError(`Theory Agent run failed validation: ${runValidation.errors.join('; ')}`)
  }
  assertReadyEventTransitions(theoryRun)

  const digestKeys = Object.keys(theoryRun.inputDigests || {}).sort()
  if (JSON.stringify(digestKeys) !== JSON.stringify([...INPUT_DIGEST_KEYS].sort())) {
    throw new TypeError(`Theory Agent run input digests must contain exactly: ${INPUT_DIGEST_KEYS.join(', ')}`)
  }
  for (const key of INPUT_DIGEST_KEYS) {
    if (theoryRun.inputDigests[key] !== digestValue(inputs[key])) {
      throw new TypeError(`Theory Agent run input digest mismatch: ${key}`)
    }
  }

  const rebuiltAudit = auditTheoryMapping(theoryRun.mapping, inputs)
  if (rebuiltAudit.status !== 'pass' || rebuiltAudit.errors.length > 0) {
    throw new TypeError(`Theory Agent run audit no longer passes: ${rebuiltAudit.errors.join('; ')}`)
  }
  if (digestValue(rebuiltAudit) !== digestValue(theoryRun.audit)) {
    throw new TypeError('Theory Agent run audit digest chain mismatch')
  }
  const latestReview = theoryRun.reviews[theoryRun.reviews.length - 1]
  if (!latestReview || digestValue(latestReview) !== digestValue(theoryRun.review)) {
    throw new TypeError('Theory Agent run review history does not match the approving review')
  }
  const unsignedReview = structuredClone(theoryRun.review)
  delete unsignedReview.id
  if (theoryRun.review?.id !== `theory-review:${digestValue(unsignedReview)}`) {
    throw new TypeError('Theory Agent run review content digest mismatch')
  }

  let rebuiltTheorySystem
  try {
    rebuiltTheorySystem = finalizeTheorySystem({
      mapping: theoryRun.mapping,
      review: theoryRun.review,
      ...inputs,
    })
  } catch (error) {
    throw new TypeError(`Theory Agent run Theory System reconstruction failed: ${error.message}`)
  }
  if (digestValue(rebuiltTheorySystem) !== digestValue(theoryRun.theorySystem)) {
    throw new TypeError('Theory Agent run Theory System does not match its approved mapping and review')
  }

  const events = theoryRun.events
  const revisionsAreContinuous = events.every((event, index) => event.revision === index + 1)
  const mappingEvent = [...events].reverse().find((event) => event.state === 'AWAITING_HUMAN')
  const approvalEvent = [...events].reverse().find(
    (event) => event.state === 'APPROVED' && event.revision < theoryRun.revision,
  )
  const finalEvent = events[events.length - 1]
  const mappingDigest = digestValue(theoryRun.mapping)
  const auditDigest = digestValue(theoryRun.audit)
  const reviewDigest = digestValue(theoryRun.review)
  const theorySystemDigest = digestValue(theoryRun.theorySystem)
  if (!revisionsAreContinuous) throw new TypeError('Theory Agent run event revisions are not continuous')
  if (!Array.isArray(mappingEvent?.artifactDigests) ||
      !mappingEvent.artifactDigests.includes(mappingDigest) || !mappingEvent.artifactDigests.includes(auditDigest)) {
    throw new TypeError('Theory Agent run mapping/audit event digest chain mismatch')
  }
  if (!Array.isArray(approvalEvent?.artifactDigests) || !approvalEvent.artifactDigests.includes(reviewDigest)) {
    throw new TypeError('Theory Agent run approval event review digest chain mismatch')
  }
  if (finalEvent?.revision !== theoryRun.revision ||
      finalEvent?.state !== 'READY_FOR_COMPILATION' ||
      !Array.isArray(finalEvent?.artifactDigests) || !finalEvent.artifactDigests.includes(theorySystemDigest)) {
    throw new TypeError('Theory Agent run final event does not match its READY_FOR_COMPILATION revision and Theory System')
  }
  return theoryRun.theorySystem
}

async function runCommand({
  argv = process.argv.slice(2),
  env = process.env,
  projectRoot: root = projectRoot,
  providerFactory = createMiniMaxM27Provider,
  compile = runScenarioCompilation,
  beforeOutputCommit,
  afterOutputCommit,
  filesystemFailpoint,
} = {}) {
  const options = parseArgs(argv)
  if (options.help) return { kind: 'help', text: usage() }
  const realRoot = resolveRealProjectRoot(root)

  const paths = {
    approvedExtractions: options['approved-extractions'] || env.PROGRAM_E_THEORY_EXTRACTIONS || defaults.approvedExtractions,
    evidenceReview: options['evidence-review'] || env.PROGRAM_E_EVIDENCE_REVIEW || defaults.evidenceReview,
    ledger: options.ledger || env.PROGRAM_E_EVIDENCE_LEDGER || defaults.ledger,
    theoryCatalog: options['theory-catalog'] || env.PROGRAM_E_THEORY_CATALOG || defaults.theoryCatalog,
    theoryRun: options['theory-run'] || env.PROGRAM_E_THEORY_RUN || defaults.theoryRun,
    verticalSlice: options['vertical-slice'] || env.PROGRAM_E_VERTICAL_SLICE || defaults.verticalSlice,
    output: options.output || env.PROGRAM_E_AI_OUTPUT || defaults.output,
  }
  const theoryRunArtifact = readJsonArtifact(realRoot, paths.theoryRun, 'Theory Agent run')
  const theoryRun = theoryRunArtifact.value
  assertTheoryRunReadyState(theoryRun)
  const inputArtifacts = {
    approvedExtractions: readJsonArtifact(realRoot, paths.approvedExtractions, 'Approved extractions'),
    evidenceReview: readJsonArtifact(realRoot, paths.evidenceReview, 'Evidence review'),
    ledger: readJsonArtifact(realRoot, paths.ledger, 'Evidence ledger'),
    theoryCatalog: readJsonArtifact(realRoot, paths.theoryCatalog, 'Theory catalog'),
  }
  const inputs = {
    approvedExtractions: inputArtifacts.approvedExtractions.value,
    evidenceReview: inputArtifacts.evidenceReview.value,
    ledger: inputArtifacts.ledger.value,
    theoryCatalog: inputArtifacts.theoryCatalog.value,
  }
  const theorySystem = assertReadyTheoryRun(theoryRun, inputs)
  const verticalSliceArtifact = readJsonArtifact(realRoot, paths.verticalSlice, 'Vertical slice')
  const protectedInputs = [
    theoryRunArtifact,
    ...Object.values(inputArtifacts),
    verticalSliceArtifact,
  ]
  const compilationInputs = {
    ...inputs,
    theoryRun,
    theorySystem,
    verticalSlice: verticalSliceArtifact.value,
  }
  prepareScenarioCompilation(compilationInputs)
  const output = prepareCompileOutput(realRoot, paths.output, protectedInputs)
  try {
    const provider = providerFactory({
      baseUrl: env.PROGRAM_E_AI_BASE_URL,
      apiKey: env.PROGRAM_E_AI_API_KEY,
      model: env.PROGRAM_E_AI_MODEL,
    })
    const compiled = await compile({ provider, ...compilationInputs })
    if (compiled?.capabilities?.realModelUsed !== true) {
      throw new TypeError('Scenario compiler did not produce an attributable live-model result; output was not written')
    }
    const outputPath = writeJsonAtomic(output, compiled, {
      beforeCommit: beforeOutputCommit,
      afterCommit: afterOutputCommit,
      filesystemFailpoint,
    })
    return {
      kind: 'compiled',
      compiled,
      outputPath,
      outputRelative: path.relative(realRoot, outputPath),
    }
  } finally {
    closeCompileOutput(output)
  }
}

async function main(options = {}) {
  const result = await runCommand(options)
  const stdout = options.stdout || process.stdout
  if (result.kind === 'help') {
    stdout.write(`${result.text}\n`)
    return
  }
  stdout.write(`Validated live-model scenario written to ${result.outputRelative}\n`)
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Scenario compilation failed: ${error.message}\n`)
    process.exitCode = 1
  })
}

module.exports = {
  defaults,
  main,
  parseArgs,
  runCommand,
  usage,
}
