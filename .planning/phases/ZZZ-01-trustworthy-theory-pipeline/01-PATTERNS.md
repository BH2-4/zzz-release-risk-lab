# Phase 1: Trustworthy Theory Pipeline - Pattern Map

**Mapped:** 2026-07-24
**Files analyzed:** 8 new/modified/regenerated files
**Analogs found:** 8 / 8

## Scope Extracted from Context and Research

The phase inputs imply eight files that implementation plans should own. The CLI acceptance file already contains the six locked regressions and is a verification boundary, not an implementation target. `scripts/compile-scenario.js` is likewise a read-only behavioral reference.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/run-theory-agent.js` | controller / CLI utility | request-response + file-I/O | `scripts/compile-scenario.js` | exact |
| `src/theory-mapper.js` | service / validator | request-response + transform | `src/theory-system.js` closed validators | role-match |
| `src/theory-system.js` | model / validator | transform + content-addressed artifact | existing `finalizeTheorySystem` / `validateTheorySystem` in the same file | exact extension |
| `src/theory-agent.js` | service / state-machine orchestrator | event-driven + transform | existing run validation and finalization chain in the same file | exact extension |
| `tests/theory-mapper.test.js` | test | request-response + transform | existing table-driven mapping validation tests in the same file | exact |
| `tests/theory-agent-security.test.js` | test | event-driven + transform | existing persisted-run tampering tests in the same file | exact |
| `experiments/output/theory/zzz-1-4-fade-run.json` | generated model / audit artifact | event-driven + file-I/O | CLI lifecycle test in `tests/theory-agent-cli.test.js` | exact |
| `docs/restart-handoff-2026-07-24.md` | documentation / handoff | transform | current stale-ID and next-task section in the same file | exact update |

## Pattern Assignments

### `scripts/run-theory-agent.js` (controller / CLI utility, request-response + file-I/O)

**Analog:** `scripts/compile-scenario.js`

Port the security behavior, while preserving the target CLI's existing `start`, `review`, `resume`, and `status` commands, environment variable names, exported `runCommand`, and `require.main` guard. Do not import the compiler CLI wholesale.

**Imports pattern** (`scripts/compile-scenario.js`, lines 4-10):

```javascript
const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')

const { createOpenAICompatibleProvider } = require('../src/ai-provider.js')
const { digestValue } = require('../src/artifact-digest.js')
```

**Realpath containment pattern** (`scripts/compile-scenario.js`, lines 75-112):

```javascript
function isInsideProject(root, candidate, { allowRoot = false } = {}) {
  const relative = path.relative(root, candidate)
  if (relative === '') return allowRoot
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
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
```

Use the same `{ label, path, value }` artifact-record shape from `readJsonArtifact` (lines 114-125), but do **not** copy line 123's `${error.message}` for JSON parse failures. The Theory CLI must distinguish safe read/path errors from parse errors and discard raw parser detail.

**Symlink-chain and target pattern** (`scripts/compile-scenario.js`, lines 136-163):

```javascript
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
    if (stat.isSymbolicLink()) throw new TypeError(`AI output parent contains a symbolic link: ${segment}`)
    if (!stat.isDirectory()) throw new TypeError(`AI output parent component is not a directory: ${segment}`)
  }
  const realParent = fs.realpathSync(parentPath)
  if (!isInsideProject(root, realParent, { allowRoot: true })) {
    throw new TypeError('AI output parent resolves outside the project')
  }
  return realParent
}

function assertSafeOutputTarget(outputPath) {
  const stat = inspectPath(outputPath)
  if (!stat) return
  if (stat.isSymbolicLink()) throw new TypeError('AI output target must not be a symbolic link')
  if (!stat.isFile()) throw new TypeError('AI output target must be a regular file')
}
```

Parameterize the artifact label (`Theory run`) rather than retaining `AI output` wording.

**Exclusive atomic-write pattern** (`scripts/compile-scenario.js`, lines 165-192):

```javascript
const temporaryPath = path.join(outputParent, `.${path.basename(outputPath)}.tmp-${process.pid}-${randomUUID()}`)
let fileDescriptor = null
try {
  fileDescriptor = fs.openSync(temporaryPath, 'wx', 0o600)
  fs.writeFileSync(fileDescriptor, `${serialized}\n`, 'utf8')
  fs.fsyncSync(fileDescriptor)
  fs.closeSync(fileDescriptor)
  fileDescriptor = null

  ensureSafeOutputParent(root, outputPath)
  assertSafeOutputTarget(outputPath)
  fs.renameSync(temporaryPath, outputPath)
} catch (error) {
  if (fileDescriptor !== null) fs.closeSync(fileDescriptor)
  try {
    fs.unlinkSync(temporaryPath)
  } catch (cleanupError) {
    if (cleanupError.code !== 'ENOENT') throw cleanupError
  }
  throw error
}
```

**Protected-input collision pattern** (`scripts/compile-scenario.js`, lines 306-318):

```javascript
const candidatePaths = new Set([outputPath])
const outputStat = inspectPath(outputPath)
if (outputStat && !outputStat.isSymbolicLink()) candidatePaths.add(fs.realpathSync(outputPath))
const collision = inputArtifacts.find((artifact) => {
  if (candidatePaths.has(artifact.path)) return true
  if (!outputStat || outputStat.isSymbolicLink()) return false
  const inputStat = fs.statSync(artifact.path)
  return outputStat.dev === inputStat.dev && outputStat.ino === inputStat.ino
})
if (collision) throw new TypeError(`AI output must not overwrite the ${collision.label} input artifact`)
```

Apply this to ledger, approved extractions, Evidence Review, theory catalog, and deterministic fixture. Run-output collision checks and output parent/target checks must occur before provider construction/generation for every writing command, then parent/target checks repeat immediately before rename.

### `src/theory-mapper.js` (service / validator, request-response + transform)

**Analog:** closed validation in `src/theory-system.js`

Add and export one reusable mode-aware provenance validator. Use closed allowed-field sets, accumulate semantic errors, and let callers fail closed with `TypeError` before returning a mapping.

**Closed-field helper** (`src/theory-system.js`, lines 19-31):

```javascript
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function unknownFields(value, allowed, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object`)
    return
  }
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) errors.push(`${label} contains unknown field: ${field}`)
  }
}
```

**Fail-closed caller pattern** (`src/theory-mapper.js`, lines 173-195):

```javascript
const generated = await provider.generateObject({
  schemaName: THEORY_MAPPING_SCHEMA_VERSION,
  system: prompt.system,
  user: prompt.user,
})
const validation = validateTheoryMapping(generated.object, { approvedExtractions, theoryCatalog })
if (!validation.valid) throw new TypeError(`Theory mapping failed validation: ${validation.errors.join('; ')}`)
return {
  ...generated.object,
  reviewStatus: 'pending-human-review',
  provenance: { ...(generated.provenance || {}) },
  capabilities: {
    realModelUsed: generated.provenance?.mode === 'live-model' &&
      isNonEmptyString(generated.provenance?.provider) &&
      isNonEmptyString(generated.provenance?.model) &&
      isNonEmptyString(generated.provenance?.requestId),
    closedTheoryCatalog: true,
    causalProof: false,
  },
}
```

Insert provenance validation between generated-object validation and construction of the returned mapping. The validator contract is:

- `deterministic-fixture`: require repository-relative `fixturePath`, `fixtureDigest` matching `sha256:[0-9a-f]{64}`, and `realModelUsed: false`; reject live-only fields or contradictory capability.
- `live-model`: require non-empty `provider`, `model`, and `requestId`, and `realModelUsed: true`.
- `recorded-model-output`: retain the distinct mode and require `realModelUsed: false`; do not add Phase 2 replay metadata requirements.
- Reject unknown modes, unknown provenance fields, missing required fields, and mode-incompatible fields.

Derive capability from the validated mode contract rather than from a partial truthiness expression.

### `src/theory-system.js` (model / validator, transform + content addressing)

**Analog:** existing `finalizeTheorySystem` and `validateTheorySystem`

Import the reusable provenance validator from `src/theory-mapper.js`. Preserve its normalized mode-specific object rather than rebuilding only five generic fields.

**Current reconstruction point to replace** (`src/theory-system.js`, lines 174-180):

```javascript
const provenance = {
  mode: mapping.provenance?.mode || 'unknown',
  provider: mapping.provenance?.provider || null,
  model: mapping.provenance?.model || null,
  requestId: mapping.provenance?.requestId || null,
  realModelUsed: mapping.capabilities?.realModelUsed === true,
}
```

Keep the surrounding content-addressing pattern (`src/theory-system.js`, lines 181-211): construct `unsigned`, include the fully preserved provenance before hashing, calculate `id` from `digestValue(unsigned)`, then validate the complete artifact before returning it.

```javascript
const system = { ...unsigned, id: `theory-system:${digestValue(unsigned)}` }
const validation = validateTheorySystem(system, { approvedExtractions, evidenceReview, ledger, theoryCatalog })
if (!validation.valid) throw new TypeError(`Theory system failed validation: ${validation.errors.join('; ')}`)
return system
```

**Revalidation pattern** (`src/theory-system.js`, lines 214-230):

```javascript
const errors = []
if (!system || typeof system !== 'object') return { valid: false, errors: ['Theory system is required'] }
unknownFields(system, SYSTEM_FIELDS, 'Theory system', errors)
// ... validate fields and bound input digests ...
const unsigned = structuredClone(system)
delete unsigned.id
if (system.id !== `theory-system:${digestValue(unsigned)}`) errors.push('Theory system content digest mismatch')
```

Call the provenance validator inside `validateTheorySystem` even when no source mapping object is supplied, then verify `provenance.realModelUsed` remains consistent with the approved mapping capability during finalization.

### `src/theory-agent.js` (service / state-machine orchestrator, event-driven + transform)

**Analog:** existing validate/preserve/revalidate lifecycle in the same file

The run already copies the mapping-derived capability and validates after every transition. Extend this chain only as needed so persisted/tampered mapping provenance fails even outside the original CLI call.

**Preservation pattern** (`src/theory-agent.js`, lines 184-209):

```javascript
const run = {
  // ... mapping, audit, checkpoint, review and events ...
  capabilities: {
    realModelUsed: mapping.capabilities?.realModelUsed === true,
    humanApprovalRequired: true,
    autoCatalogExpansion: false,
  },
}
```

**Transition revalidation pattern** (`src/theory-agent.js`, lines 336-359):

```javascript
const currentValidation = validateTheoryAgentRun(run, inputs)
if (!currentValidation.valid) throw new TypeError(`Theory agent run failed validation: ${currentValidation.errors.join('; ')}`)
assertInputsUnchanged(run, inputs)
if (run.state === 'APPROVED') {
  const theorySystem = finalizeTheorySystem({
    mapping: run.mapping,
    review: run.review,
    ...inputs,
  })
  // ... transition to READY_FOR_COMPILATION ...
  const validation = validateTheoryAgentRun(next, inputs)
  if (!validation.valid) throw new TypeError(`Theory agent run failed validation: ${validation.errors.join('; ')}`)
  return next
}
```

**Run/System consistency pattern** (`src/theory-agent.js`, lines 474-501 and 554-577): mapping validation feeds run errors, `run.capabilities.realModelUsed` must equal the mapping capability, and READY validation invokes `validateTheorySystem`. Reuse the provenance validator here if `validateTheoryMapping` intentionally remains content-only; do not duplicate mode rules.

### `tests/theory-mapper.test.js` (test, request-response + transform)

**Analog:** table-driven negative mapping tests in the same file

Add table-driven provenance cases for incomplete live mode, missing fixture path/digest, contradictory `realModelUsed`, unknown mode/field, and recorded output relabeling.

**Mutation table pattern** (`tests/theory-mapper.test.js`, lines 84-99):

```javascript
for (const [field, value, pattern] of [
  ['theoryId', 'theory-invented', /unknown theory/i],
  ['claimProposalIds', ['proposal-invented'], /unknown claim proposal/i],
  ['constructs', ['invented-construct'], /unsupported construct/i],
  ['suggestedParameterPaths', ['scenario.secretBias'], /unsupported parameter path/i],
]) {
  const invalid = mapping()
  invalid.mappings[0][field] = value
  assert.match(
    validateTheoryMapping(invalid, {
      approvedExtractions: [approvedExtraction()],
      theoryCatalog: catalog,
    }).errors.join('; '),
    pattern,
  )
}
```

**Provider integration pattern** (`tests/theory-mapper.test.js`, lines 112-130): use a local `generateObject` stub, assert the schema name, then assert returned review status, provenance, and capability. Add valid cases for all three supported modes as well as rejection cases.

### `tests/theory-agent-security.test.js` (test, event-driven + transform)

**Analog:** persisted-run tampering tests in the same file

Reuse the canonical fixture digest and complete READY lifecycle already defined in this file.

**Fixture provenance pattern** (`tests/theory-agent-security.test.js`, lines 22-38):

```javascript
function provider() {
  return {
    async generateObject() {
      return {
        object: structuredClone(fixtureMapping),
        provenance: {
          mode: 'deterministic-fixture',
          provider: 'test-fixture',
          model: null,
          requestId: null,
          fixturePath: 'data/theory-agent/zzz-1-4-fade-mapping-fixture.json',
          fixtureDigest: digestValue(fixtureMapping),
        },
      }
    },
  }
}
```

**Tamper-and-validate pattern** (`tests/theory-agent-security.test.js`, lines 104-112):

```javascript
const ready = await readyRun()
const tampered = structuredClone(ready)
tampered.mapping.mappings[0].mechanism = 'Changed after review.'

const validation = validateTheoryAgentRun(tampered, inputs)
assert.equal(validation.valid, false)
assert.match(validation.errors.join('; '), /mapping digest|review target|theory system/i)
```

Add analogous mutations for mapping provenance and finalized System provenance. Recompute content IDs in at least one case so the test proves semantic provenance validation, not only digest mismatch detection.

### `experiments/output/theory/zzz-1-4-fade-run.json` (generated model / audit artifact, event-driven + file-I/O)

**Analog:** lifecycle in `tests/theory-agent-cli.test.js`, lines 15-55

Regenerate this file only through:

```text
start --demo -> review --decision approve -> resume -> status
```

Use monotonic timestamps after all input review timestamps. The generated mapping and Theory System must both retain `deterministic-fixture`, repository-relative fixture path, canonical fixture digest, and `realModelUsed: false`. Never patch the JSON or Theory System ID manually.

The canonical digest implementation is `src/artifact-digest.js`, lines 5-27:

```javascript
function digestValue(value) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson(value)).digest('hex')}`
}

function isSha256Digest(value) {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value)
}
```

### `docs/restart-handoff-2026-07-24.md` (documentation / handoff, transform)

**Analog:** current stale-artifact section, lines 61-71

After regeneration, update the handoff's execution state and authoritative new ID/path. Preserve the old ID as historical invalidation only if clearly labeled stale; do not present it as a current dependency. Update the statement that the checked run is non-authoritative once the regenerated run passes validation and all required gates.

## Shared Patterns

### Validation Boundary

**Sources:** `src/theory-system.js` lines 19-31, `src/theory-agent.js` lines 382-409

Use closed field sets, collect validation errors for pure validators, and throw `TypeError` at orchestration boundaries. Unknown modes and contradictory provenance fail closed.

### Canonical Digests

**Source:** `src/artifact-digest.js` lines 5-27

Always use `digestValue` for fixture, mapping, review, event, and Theory System identity. Do not hash raw serialized file bytes or incidental JSON formatting.

### Error Redaction

**Source:** `.planning/codebase/CONVENTIONS.md` lines 20-26

Errors may include the artifact label and safe project-relative path context. They must not include malformed JSON contents, parser snippets, credentials, provider responses, or secret markers.

### CLI Testability

**Sources:** `scripts/run-theory-agent.js` lines 197-219, `.planning/codebase/CONVENTIONS.md` lines 13-18

Keep logic in exported `runCommand`; keep process I/O and exit handling in `main`; invoke `main` only behind `require.main === module`.

### Acceptance Tests Are Locked

**Source:** `tests/theory-agent-cli.test.js` lines 15-153

Do not weaken or rewrite the six existing regression tests. They cover fixture provenance, escaped input symlinks, symlinked output parents, exclusive random temporary files, protected-input overwrite, and malformed-JSON disclosure. Focused implementation is complete only when these tests and the added domain provenance tests pass.

## Verification-Only Files

| File | Use | Modification Policy |
|---|---|---|
| `tests/theory-agent-cli.test.js` | Final observable contract for all six current regressions | Do not weaken; no Phase 1 edit expected |
| `tests/theory-agent.test.js` | Existing approval/content-address lifecycle regression | Prefer security cases in `tests/theory-agent-security.test.js`; modify only if a lifecycle assertion belongs here |
| `scripts/compile-scenario.js` | Filesystem boundary and atomic-write reference | Read-only behavioral source |
| `tests/compile-scenario-cli.test.js` | Regression coverage for the reference CLI | Verification only |
| `README.md` and `research/README.md` | Generic run-path/status references | Update only if regeneration changes their factual status text |

## No Analog Found

None. Every expected Phase 1 file has an exact or same-repository role analog.

## Metadata

**Analog search scope:** `scripts/`, `src/`, `tests/`, `experiments/output/theory/`, `docs/`, `.planning/codebase/`
**Primary files scanned:** 13
**Pattern extraction date:** 2026-07-24
**Network research:** not used; this map is codebase-only

