#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const { createOpenAICompatibleProvider } = require('../src/ai-provider.js')
const {
  applyTheoryReview,
  resumeTheoryAgent,
  startTheoryAgent,
} = require('../src/theory-agent.js')

const projectRoot = path.resolve(__dirname, '..')
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

function resolveProjectPath(relativePath, label) {
  const resolved = path.resolve(projectRoot, relativePath)
  if (!resolved.startsWith(`${projectRoot}${path.sep}`)) throw new TypeError(`${label} path must stay inside the project`)
  return resolved
}

function readJson(relativePath, label) {
  const filePath = resolveProjectPath(relativePath, label)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    throw new TypeError(`${label} could not be read as JSON: ${error.message}`)
  }
}

function writeJsonAtomic(relativePath, value) {
  const filePath = resolveProjectPath(relativePath, 'Run output')
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  fs.renameSync(temporaryPath, filePath)
  return filePath
}

function loadInputs(env = process.env) {
  const approvedExtractions = readJson(env.PROGRAM_E_THEORY_EXTRACTIONS || defaults.extractions, 'Approved extractions')
  if (!Array.isArray(approvedExtractions) || approvedExtractions.length === 0) {
    throw new TypeError('Approved extractions file must contain a non-empty array')
  }
  return {
    approvedExtractions,
    evidenceReview: readJson(env.PROGRAM_E_EVIDENCE_REVIEW || defaults.evidenceReview, 'Evidence review'),
    ledger: readJson(env.PROGRAM_E_EVIDENCE_LEDGER || defaults.ledger, 'Evidence ledger'),
    theoryCatalog: readJson(env.PROGRAM_E_THEORY_CATALOG || defaults.theoryCatalog, 'Theory catalog'),
  }
}

function createFixtureProvider(env = process.env) {
  const fixture = readJson(env.PROGRAM_E_THEORY_FIXTURE || defaults.fixtureMapping, 'Theory mapping fixture')
  return Object.freeze({
    async generateObject() {
      return {
        object: structuredClone(fixture),
        provenance: {
          mode: 'deterministic-fixture',
          provider: 'checked-in-fixture',
          model: null,
          requestId: null,
        },
      }
    },
  })
}

function createProvider({ demo }, env = process.env) {
  if (demo) return createFixtureProvider(env)
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

async function runCommand({ argv = process.argv.slice(2), env = process.env, now = new Date().toISOString() } = {}) {
  const { command, options } = parseArgs(argv)
  if (!command || ['help', '-h', '--help'].includes(command)) return { kind: 'help', text: usage() }
  const runRelative = options.run || env.PROGRAM_E_THEORY_RUN || defaults.run

  if (command === 'start') {
    const runPath = resolveProjectPath(runRelative, 'Run output')
    if (fs.existsSync(runPath) && !options.replace) throw new TypeError('Theory run already exists; pass --replace to start a new run explicitly')
    const run = await startTheoryAgent({
      ...loadInputs(env),
      provider: createProvider(options, env),
      runId: `zzz-fade-${now.replace(/[^0-9]/g, '').slice(0, 14)}`,
      now,
    })
    writeJsonAtomic(runRelative, run)
    return { kind: 'run', summary: summarize(run), path: runRelative }
  }

  const run = readJson(runRelative, 'Theory run')
  if (command === 'status') return { kind: 'run', summary: summarize(run), path: runRelative }

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
    writeJsonAtomic(runRelative, reviewed)
    return { kind: 'run', summary: summarize(reviewed), path: runRelative }
  }

  if (command === 'resume') {
    const inputs = loadInputs(env)
    const provider = run.state === 'REVISION_REQUESTED' ? createProvider(options, env) : undefined
    const resumed = await resumeTheoryAgent({ run, provider, ...inputs, now })
    writeJsonAtomic(runRelative, resumed)
    return { kind: 'run', summary: summarize(resumed), path: runRelative }
  }

  throw new TypeError(`Unknown command: ${command}`)
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
