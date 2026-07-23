# Phase 1: Trustworthy Theory Pipeline - Research

**Researched:** 2026-07-24
**Domain:** Node.js CLI filesystem safety, closed provenance validation, content-addressed artifact regeneration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Filesystem boundary
- **D-01:** Port the realpath containment, symlink-chain rejection, protected-input comparison, and atomic output approach from `scripts/compile-scenario.js` into `scripts/run-theory-agent.js` instead of introducing a second security design.
- **D-02:** Temporary JSON output must use a random project-local filename, exclusive `wx` creation, mode `0600`, fsync/close, and atomic rename with cleanup on failure.
- **D-03:** Every command that can write a run must reject output aliases of ledger, extraction, Evidence Review, theory catalog, fixture, or existing symlink targets before reading a model/fixture provider.

### Provenance contract
- **D-04:** `deterministic-fixture` provenance must record the repository-relative fixture path and canonical SHA-256 digest and must keep `realModelUsed: false` through mapping, run, and Theory System.
- **D-05:** `live-model` is valid only with a non-empty provider, model, and request ID and `realModelUsed: true`; recorded output remains a distinct mode and may not be relabeled.
- **D-06:** Provenance validation fails closed at the earliest reusable domain boundary, with CLI tests covering the final observable error.

### Compatibility and regeneration
- **D-07:** Preserve the existing `start`, `review`, `resume`, and `status` CLI surface and environment variable names.
- **D-08:** Do not patch the stale run or Theory System ID manually. After implementation passes focused tests, regenerate the complete demo lifecycle through the CLI and update dependent references from the new content-addressed output.
- **D-09:** JSON read errors identify the artifact and safe path context but never echo raw file content, parser snippets, credentials, or secret test markers.

### Completion gate
- **D-10:** Phase 1 completes only when focused security tests, `npm run build`, full `npm test`, and `npm run test:e2e` all pass from a clean worktree.
- **D-11:** No expected-failure waiver is allowed; all six current red tests must become green without weakening the tests.

### the agent's Discretion
The agent may choose helper names, internal function boundaries, and exact safe error wording while preserving the behaviors above and existing public CLI syntax. The user explicitly delegated discuss and implementation choices to the agent for this GSD lifecycle.

### Deferred Ideas (OUT OF SCOPE)
- Real model invocation and recorded-model replay belong to Phase 2.
- Hybrid memory, relationships, public expression, and Reverse generation belong to Phase 3.
- 3D integration belongs to Phase 4.
- Injective deployment or transaction execution belongs to Phase 5 and remains user-confirmed.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRUST-01 | Operator can run the Theory Agent CLI without any output path overwriting or escaping the reviewed project inputs. | Reuse the existing realpath, parent-chain, inode/canonical-path collision, and exclusive atomic-write pattern; retain all six CLI attack tests. `[VERIFIED: scripts/compile-scenario.js; tests/theory-agent-cli.test.js]` |
| TRUST-02 | Operator can distinguish deterministic fixtures, recorded model output, and live model output from complete provenance. | Add one closed, mode-aware provenance contract at the mapper boundary and preserve every validated field through run and Theory System. `[VERIFIED: src/theory-mapper.js; src/theory-system.js; docs/mvp-v1-spec.md]` |
| TRUST-03 | Operator can regenerate a READY Theory System whose digests and review lineage match the restored evidence ledger. | Regenerate through `start --demo -> review -> resume -> status`; never edit the stale run. `[VERIFIED: src/theory-agent.js; docs/restart-handoff-2026-07-24.md]` |
| TRUST-04 | Maintainer can pass build, complete Node tests, and desktop/mobile E2E tests at every phase boundary. | Use focused Node tests during tasks and all three repository gates at phase closure. `[VERIFIED: package.json; playwright.config.js; .planning/codebase/TESTING.md]` |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Network research, if later needed, starts with Bocha Web Search and then verifies official/original sources; no network research is needed for this codebase-only phase. `[VERIFIED: phase assignment; .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-CONTEXT.md]`
- Product research conclusions must bind to public sources under `research/`; Phase 1 must not add unsupported product claims. `[VERIFIED: .planning/PROJECT.md]`
- Synthetic groups are not real player samples, and scenario risk indices are not reality probabilities. `[VERIFIED: docs/mvp-v1-spec.md]`
- Do not automatically deploy Injective contracts, switch to mainnet, read private keys, or initiate unconfirmed transactions. `[VERIFIED: .planning/PROJECT.md]`
- A phase is complete only after `npm run build`, `npm test`, and `npm run test:e2e` all pass. `[VERIFIED: package.json; .planning/codebase/TESTING.md]`
- Do not use autonomous GSD operation for this repository. `[VERIFIED: .planning/PROJECT.md; .planning/config.json]`

## Summary

Phase 1 is a narrow hardening and regeneration phase, not a feature phase. The current domain state machine already enforces input digests, human approval, monotonic event history, catalog-gap blocking, and content-addressed Theory Systems; the focused run confirms all 15 non-CLI lifecycle/security tests pass. The remaining acceptance surface is exactly six failing tests in `tests/theory-agent-cli.test.js`. `[VERIFIED: src/theory-agent.js; tests/theory-agent.test.js; tests/theory-agent-security.test.js; focused test run 2026-07-24]`

The filesystem implementation should be ported from `scripts/compile-scenario.js`, but its JSON parser error wrapper must not be copied verbatim because it appends `error.message`. The target CLI test requires a stable, artifact-specific error that does not expose parser snippets or the embedded secret marker. `[VERIFIED: scripts/compile-scenario.js; scripts/run-theory-agent.js; tests/theory-agent-cli.test.js]`

Provenance is the only required domain-layer extension. `mapTheories` currently derives `realModelUsed` but accepts any provenance object; `finalizeTheorySystem` then drops fixture path/digest and `validateTheorySystem` does not validate provenance. The planner should therefore establish one reusable mode-aware validator in `src/theory-mapper.js`, call it before accepting generated output, and preserve the validated fields in `src/theory-system.js`. `[VERIFIED: src/theory-mapper.js; src/theory-system.js]`

**Primary recommendation:** Execute four ordered plans: provenance contract tests and validation; CLI filesystem hardening; CLI lifecycle regeneration and reference updates; full build/unit/E2E gate and clean-worktree review. `[VERIFIED: .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-CONTEXT.md; .planning/ROADMAP.md]`

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Path containment and safe JSON persistence | CLI / trusted Node process | Filesystem | `run-theory-agent.js` owns all paths and writes before artifacts enter shared domain logic. `[VERIFIED: scripts/run-theory-agent.js]` |
| Provenance mode validation | Domain validation | Provider adapter | The same contract must protect CLI, tests, and later callers rather than relying on one command path. `[VERIFIED: src/theory-mapper.js; src/ai-provider.js]` |
| Review and lineage state machine | Domain orchestration | CLI | The existing agent module owns transitions, input digests, event history, and readiness. `[VERIFIED: src/theory-agent.js]` |
| Content-addressed approved system | Domain artifact layer | Compiler gate | Finalization binds mapping, review, ledger, catalog, and evidence review before compilation. `[VERIFIED: src/theory-system.js; scripts/compile-scenario.js]` |
| Phase acceptance | Test/build tooling | Browser E2E | Node tests cover trust boundaries; build and Playwright protect generated and browser-facing surfaces. `[VERIFIED: package.json; playwright.config.js]` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard Here |
|---------|---------|---------|-------------------|
| Node.js built-ins: `node:fs`, `node:path`, `node:crypto` | Node v26.5.0 available | Realpath resolution, `lstat`, exclusive file creation, UUID temp names, fsync, rename | Already used by the reference CLI; adds no dependency or second design. `[VERIFIED: scripts/compile-scenario.js; environment probe 2026-07-24]` |
| `node:test` + `node:assert/strict` | Node v26.5.0 available | Unit, integration, and CLI attack tests | Existing repository test harness and current red tests use it. `[VERIFIED: package.json; tests/theory-agent-cli.test.js]` |
| Existing canonical digest API | repository module | Canonical JSON SHA-256 for fixtures, inputs, reviews, and systems | Prevents hashing incidental JSON formatting. `[VERIFIED: src/artifact-digest.js; src/theory-agent.js]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `solc` | locked by `package-lock.json`; declared `^0.8.30` | Required project build gate | Run unchanged through `npm run build`; Phase 1 does not alter the contract. `[VERIFIED: package.json; scripts/build-contract.js]` |
| `@playwright/test` | locked by `package-lock.json`; declared `^1.61.1` | Desktop/mobile phase gate | Run only at closure after dependencies are restored. `[VERIFIED: package.json; playwright.config.js]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Porting proven local helpers | New filesystem utility package | Adds supply-chain and behavior risk with no Phase 1 benefit; rejected by D-01. `[VERIFIED: 01-CONTEXT.md]` |
| Mode-aware closed provenance validator | CLI-only fixture field injection | Makes the first test pass but leaves non-CLI callers able to create contradictory mapping/System provenance. `[VERIFIED: src/theory-mapper.js; src/theory-system.js]` |
| Regenerating through the state machine | Editing the checked JSON run | Breaks content digests and review/event lineage; explicitly forbidden by D-08. `[VERIFIED: src/theory-agent.js; 01-CONTEXT.md]` |

**Installation:** No package additions. The new workspace currently has no `node_modules`; restore the exact lockfile environment with `npm ci` before build/E2E closure. `[VERIFIED: package-lock.json; environment probe 2026-07-24]`

## Package Legitimacy Audit

Not applicable: Phase 1 installs no new package and changes no dependency declaration. `[VERIFIED: 01-CONTEXT.md; package.json]`

## Architecture Patterns

### System Architecture Diagram

```text
CLI argv + env
      |
      v
Resolve real project root
      |
      v
Resolve every input realpath ----reject escape/symlink alias----> safe error
      |
      v
Validate output parent/target + protected-input collision
      |
      +----reject before provider read---------------------------> safe error
      |
      v
Fixture/live provider -> closed provenance validator
      |
      v
Theory mapping -> deterministic audit -> human checkpoint
      |
      v
approve/revise/reject -> READY Theory System with preserved provenance
      |
      v
exclusive random temp (0600) -> write -> fsync -> close -> recheck -> rename
```

The ordering is security-significant: output collision and path checks precede fixture/model generation, while the final parent/target checks repeat immediately before rename to narrow time-of-check/time-of-use exposure. `[VERIFIED: scripts/compile-scenario.js; 01-CONTEXT.md D-03]`

### Recommended Project Structure

```text
scripts/
├── run-theory-agent.js       # CLI path boundary, safe reads/writes, provider construction
└── compile-scenario.js       # behavioral reference, not a new imported dependency
src/
├── theory-mapper.js          # earliest reusable provenance contract
├── theory-agent.js           # lifecycle and lineage propagation
├── theory-system.js          # approved artifact preservation and validation
└── artifact-digest.js        # canonical content digests
tests/
├── theory-agent-cli.test.js       # six observable regressions
├── theory-agent-security.test.js  # lineage/provenance tampering
├── theory-agent.test.js           # lifecycle and finalization
└── theory-mapper.test.js          # mode-aware provenance unit cases
```

### Pattern 1: Resolve Inputs to Artifact Records

Return `{ label, path, value }` for every JSON input. The canonical real path supports protected-input comparisons; the parsed value feeds domain validation; the label supports redacted errors. `[VERIFIED: scripts/compile-scenario.js]`

### Pattern 2: Mode-Aware Provenance as a Closed Contract

Use one validator that rejects unknown modes and contradictory fields. `deterministic-fixture` requires repository-relative `fixturePath`, canonical `fixtureDigest`, and false model capability; `live-model` requires non-empty provider/model/requestId and true capability; `recorded-model-output` remains a distinct non-live mode and must not be rewritten. `[VERIFIED: docs/mvp-v1-spec.md; 01-CONTEXT.md D-04 through D-06]`

### Pattern 3: Validate, Preserve, Revalidate

Validate provider provenance in `mapTheories`, preserve all approved fields when `finalizeTheorySystem` constructs its provenance object, and validate again in `validateTheorySystem`. This mirrors the repository's existing mapping -> audit -> review -> system digest chain. `[VERIFIED: src/theory-mapper.js; src/theory-agent.js; src/theory-system.js]`

### Pattern 4: Exclusive Atomic JSON Replacement

Serialize first, create a random same-directory temp with `wx` and `0600`, write by descriptor, fsync, close, recheck parent/target, rename, and unlink the temp on failure. `[VERIFIED: scripts/compile-scenario.js]`

### Anti-Patterns to Avoid

- **Lexical `startsWith` containment:** does not resolve symlinks and is weaker than `path.relative` plus `realpath`. `[VERIFIED: scripts/run-theory-agent.js; tests/theory-agent-cli.test.js]`
- **Fixed PID temp path:** an attacker can pre-create a symlink at the predictable name; the current red test demonstrates overwrite outside the project. `[VERIFIED: scripts/run-theory-agent.js; tests/theory-agent-cli.test.js]`
- **Provider-first validation:** may incur an external call before discovering an unsafe output path; D-03 requires collision rejection first. `[VERIFIED: 01-CONTEXT.md]`
- **Derived boolean without provenance validation:** computing `realModelUsed` alone does not establish a valid fixture/live/recorded mode. `[VERIFIED: src/theory-mapper.js]`
- **Manual JSON artifact edits:** invalidate content-derived IDs and review/event digests. `[VERIFIED: src/theory-agent.js; docs/restart-handoff-2026-07-24.md]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canonical content hashing | `JSON.stringify` hash ad hoc | `digestValue` | Existing canonical representation is already the artifact identity contract. `[VERIFIED: src/artifact-digest.js]` |
| Filesystem boundary design | A second set of path rules | Port the `compile-scenario.js` helpers | D-01 locks one project pattern and tests already exercise it. `[VERIFIED: 01-CONTEXT.md; scripts/compile-scenario.js]` |
| Theory lifecycle | CLI-specific approval flags | Existing `startTheoryAgent`, `applyTheoryReview`, `resumeTheoryAgent` | Existing module validates transitions, timestamps, reviews, and digests. `[VERIFIED: src/theory-agent.js]` |
| Provenance inference from labels | Reviewer/provider-name heuristics | Explicit closed mode contract | A local reviewer name is not authentication and a fixture must remain non-live. `[VERIFIED: docs/restart-handoff-2026-07-24.md]` |

**Key insight:** This phase should consolidate trust boundaries already present in the repository; new abstraction is justified only for provenance validation because the same invariant is consumed by mapper, run, and final Theory System. `[VERIFIED: src/theory-mapper.js; src/theory-agent.js; src/theory-system.js]`

## Common Pitfalls

### Pitfall 1: Copying the Reference JSON Error Verbatim
**What goes wrong:** Parser detail is appended to the public error and can contain source snippets or secret markers. `[VERIFIED: scripts/compile-scenario.js; tests/theory-agent-cli.test.js]`
**How to avoid:** Separate file read failures from parse failures and emit only the artifact label plus safe project-relative context; discard `JSON.parse` message text. `[VERIFIED: 01-CONTEXT.md D-09]`

### Pitfall 2: Protecting Only the Ledger
**What goes wrong:** Extractions, Evidence Review, catalog, or fixture can still be overwritten through the shared run output. `[VERIFIED: 01-CONTEXT.md D-03]`
**How to avoid:** Build one complete protected artifact list for each writing command and compare lexical path, realpath, and same-file device/inode where available. `[VERIFIED: scripts/compile-scenario.js]`

### Pitfall 3: Losing Fixture Fields During Finalization
**What goes wrong:** Adding fields in `createFixtureProvider` is insufficient because `finalizeTheorySystem` currently reconstructs only mode/provider/model/requestId/realModelUsed. `[VERIFIED: scripts/run-theory-agent.js; src/theory-system.js]`
**How to avoid:** Preserve the validated mode-specific provenance object into the unsigned system before computing its content ID. `[VERIFIED: src/theory-system.js]`

### Pitfall 4: Treating the Old READY Run as Authority
**What goes wrong:** The old run's ledger digest differs from the restored ledger and its provenance omits fixture path/digest. `[VERIFIED: experiments/output/theory/zzz-1-4-fade-run.json; data/evidence/ledger.json; docs/restart-handoff-2026-07-24.md]`
**How to avoid:** Regenerate after focused tests pass and update all exact-ID references from the generated artifact. `[VERIFIED: 01-CONTEXT.md D-08]`

### Pitfall 5: Declaring Completion on Focused Tests
**What goes wrong:** Browser dual-module behavior, generated contract artifacts, or E2E rendering may regress outside the Theory Agent tests. `[VERIFIED: .planning/codebase/CONCERNS.md; .planning/codebase/TESTING.md]`
**How to avoid:** Run all three required commands and require a clean worktree before phase completion. `[VERIFIED: 01-CONTEXT.md D-10]`

## Code Examples

### Safe Mode-Aware Validation Shape

```javascript
// Project pattern sources: src/theory-mapper.js, src/artifact-digest.js
function validateProvenance(provenance, { realModelUsed } = {}) {
  // Reject unknown fields/modes first.
  // Enforce the required field set for exactly one supported mode.
  // Return errors; callers fail closed before accepting the mapping.
}
```

### Safe Atomic Write Shape

```javascript
// Project pattern source: scripts/compile-scenario.js
const temporaryPath = path.join(parent, `.${path.basename(output)}.tmp-${process.pid}-${randomUUID()}`)
const fd = fs.openSync(temporaryPath, 'wx', 0o600)
fs.writeFileSync(fd, serialized, 'utf8')
fs.fsyncSync(fd)
fs.closeSync(fd)
fs.renameSync(temporaryPath, output)
```

The implementation must retain cleanup and repeat output parent/target validation around the rename; this abbreviated example is not a substitute for the complete reference block. `[VERIFIED: scripts/compile-scenario.js]`

## State of the Art

| Old Approach | Required Phase 1 Approach | Impact |
|--------------|---------------------------|--------|
| Lexical path prefix only | Real project root + input realpath + symlink-chain output validation | Stops project-boundary escape. `[VERIFIED: scripts/run-theory-agent.js; scripts/compile-scenario.js]` |
| PID-only temporary filename | UUID/random same-directory exclusive temp | Stops predictable symlink overwrite. `[VERIFIED: tests/theory-agent-cli.test.js]` |
| Unstructured provenance pass-through | Closed mode-aware provenance contract | Prevents fixture/live/recorded mislabeling. `[VERIFIED: docs/mvp-v1-spec.md]` |
| Manually retained stale READY artifact | Full CLI lifecycle regeneration | Restores current ledger/review/content-address lineage. `[VERIFIED: docs/restart-handoff-2026-07-24.md]` |

## Assumptions Log

All implementation claims in this research were verified against repository code, tests, or locked planning documents. No package, external API, legal, compliance, or product-evidence claim was inferred from model memory.

## Open Questions

1. **Which exact generated references will change after regeneration?**
   - What we know: the old Theory System ID is stale and must not be reused. `[VERIFIED: docs/restart-handoff-2026-07-24.md]`
   - What's unclear: the new ID cannot be known until the approved lifecycle is regenerated.
   - Recommendation: after regeneration, search exact old ID and run path references with `rg`, update only generated/dependent references, then rerun validation.

2. **How strict should `recorded-model-output` fields be in Phase 1?**
   - What we know: it must remain distinct and non-live; actual recorded replay belongs to Phase 2. `[VERIFIED: docs/mvp-v1-spec.md; 01-CONTEXT.md]`
   - Recommendation: validate the mode and prohibit `realModelUsed: true` now; defer any new replay-specific required metadata to Phase 2 so Phase 1 does not widen scope.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | focused and full Node tests | yes | v26.5.0 | none needed `[VERIFIED: environment probe 2026-07-24]` |
| npm | dependency restoration and gates | yes | 11.17.0 | none needed `[VERIFIED: environment probe 2026-07-24]` |
| Project `node_modules` | build and Playwright gates | no | — | run `npm ci` from the checked lockfile `[VERIFIED: filesystem probe; package-lock.json]` |
| Google Chrome | desktop/mobile E2E | yes | 150.0.7871.129 | Playwright cache fallback is encoded in config `[VERIFIED: environment probe; playwright.config.js]` |
| Python | static E2E web server | yes | 3.14.3 | none needed `[VERIFIED: environment probe; playwright.config.js]` |

**Missing dependencies with no fallback:** None identified. `[VERIFIED: package-lock.json; environment probe 2026-07-24]`

**Missing dependencies with fallback:** Local packages are not installed; `npm ci` restores the lockfile-defined environment before build/E2E. `[VERIFIED: package-lock.json]`

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test`; Playwright for browser E2E `[VERIFIED: package.json]` |
| Config file | `playwright.config.js`; Node tests use the package script glob `[VERIFIED: package.json; playwright.config.js]` |
| Quick run command | `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js` |
| Full suite command | `npm run build && npm test && npm run test:e2e` `[VERIFIED: .planning/codebase/TESTING.md]` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRUST-01 | No path escape, symlink output, predictable temp, or input overwrite | CLI security integration | `node --test tests/theory-agent-cli.test.js` | yes, six red acceptance cases `[VERIFIED: tests/theory-agent-cli.test.js]` |
| TRUST-02 | Mode-specific provenance remains internally consistent | unit + lifecycle | `node --test tests/theory-mapper.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js` | partial; add negative mode cases in Wave 0 `[VERIFIED: src/theory-mapper.js; tests/theory-agent-security.test.js]` |
| TRUST-03 | Approved run reconstructs current Theory System and lineage | integration | `node --test tests/theory-agent.test.js tests/theory-agent-security.test.js tests/compile-scenario-cli.test.js` | yes `[VERIFIED: listed test files]` |
| TRUST-04 | Build, all Node tests, desktop/mobile E2E pass | gate | `npm run build && npm test && npm run test:e2e` | yes after `npm ci` `[VERIFIED: package.json; playwright.config.js]` |

### Sampling Rate

- **Per task commit:** run the directly affected Theory mapper/agent/CLI test files. `[VERIFIED: .planning/codebase/TESTING.md]`
- **Per plan boundary:** run all four focused Theory files plus `git diff --check`. `[VERIFIED: 01-CONTEXT.md]`
- **Phase gate:** run `npm run build`, `npm test`, and `npm run test:e2e` from a clean worktree. `[VERIFIED: 01-CONTEXT.md D-10]`

### Wave 0 Gaps

- [ ] Extend `tests/theory-mapper.test.js` with negative cases for incomplete `live-model`, fixture digest/path omissions, contradictory `realModelUsed`, unknown mode, and recorded output relabeling. `[VERIFIED: src/theory-mapper.js currently lacks these validations]`
- [ ] Extend `tests/theory-agent-security.test.js` or `tests/theory-agent.test.js` to prove tampered mode-specific provenance is rejected after persistence/finalization. `[VERIFIED: src/theory-agent.js; src/theory-system.js currently validate only the propagated boolean]`
- Existing six CLI tests must remain unchanged as final observable acceptance. `[VERIFIED: 01-CONTEXT.md D-11]`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Reviewer names are local declarations, not identity authentication. `[VERIFIED: docs/restart-handoff-2026-07-24.md]` |
| V3 Session Management | no | No session boundary exists in this CLI phase. `[VERIFIED: scripts/run-theory-agent.js]` |
| V4 Access Control | yes, local resource boundary | Project-root containment, protected-input denylist, symlink rejection, exclusive writes. `[VERIFIED: scripts/compile-scenario.js]` |
| V5 Input Validation | yes | Closed JSON/domain schemas and fail-closed provenance/path checks. `[VERIFIED: src/theory-mapper.js; src/theory-agent.js; src/theory-system.js]` |
| V6 Cryptography | yes | Existing canonical SHA-256 content digests; no custom cryptography. `[VERIFIED: src/artifact-digest.js]` |

### Known Threat Patterns for the Node CLI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Symlink/path traversal | Tampering | Realpath containment and parent-chain `lstat` checks. `[VERIFIED: scripts/compile-scenario.js]` |
| Predictable temp-file link attack | Tampering / Elevation | Random same-directory temp plus `wx`, `0600`, fsync, rename, cleanup. `[VERIFIED: scripts/compile-scenario.js; tests/theory-agent-cli.test.js]` |
| Output aliasing trusted inputs | Tampering | Canonical path and same-file collision checks before provider access. `[VERIFIED: scripts/compile-scenario.js; 01-CONTEXT.md D-03]` |
| Parser detail disclosure | Information Disclosure | Redacted artifact-specific errors with no raw parser message. `[VERIFIED: tests/theory-agent-cli.test.js]` |
| Provenance relabeling | Spoofing | Closed mode contract, derived capabilities, preservation into content-addressed system. `[VERIFIED: docs/mvp-v1-spec.md; src/theory-system.js]` |

## Exact Planning Recommendation

1. **Plan 01-01, provenance contract:** add failing domain tests first; implement/export a mode-aware validator in `src/theory-mapper.js`; make `mapTheories` fail before returning a mapping; preserve mode-specific fields and revalidate in `src/theory-system.js`; verify mapper, agent, security, and CLI provenance tests. `[VERIFIED: D-04 through D-06]`
2. **Plan 01-02, CLI filesystem boundary:** refactor path reads to artifact records; port real-root, real-input, output-parent, target, collision, and random exclusive atomic-write helpers; use safe JSON errors; ensure all protected inputs, including demo fixture, are checked before provider generation; verify the six CLI tests without weakening them. `[VERIFIED: D-01 through D-03, D-09, D-11]`
3. **Plan 01-03, authoritative regeneration:** after focused tests are green, execute `start --demo`, human `review --decision approve`, `resume`, and `status` with monotonic timestamps after all input reviews; validate the resulting run against current inputs; replace the stale generated run through the CLI and update exact old-ID references discovered by `rg`. `[VERIFIED: D-08; src/theory-agent.js; docs/restart-handoff-2026-07-24.md]`
4. **Plan 01-04, closure:** restore dependencies with `npm ci`; run focused tests, `npm run build`, full `npm test`, `npm run test:e2e`, `git diff --check`, and repository secret scan; require clean status and no HIGH security/code-review findings before phase completion and push. `[VERIFIED: D-10; .planning/codebase/TESTING.md; .planning/codebase/CONCERNS.md]`

Do not combine regeneration with implementation before focused tests pass: a partial fix can create another apparently READY but non-authoritative content-addressed artifact. `[VERIFIED: docs/restart-handoff-2026-07-24.md; 01-CONTEXT.md D-08]`

## Sources

### Primary (HIGH confidence)

- `.planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-CONTEXT.md` - locked Phase 1 decisions and boundaries.
- `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` - acceptance requirements and success criteria.
- `scripts/run-theory-agent.js` and `scripts/compile-scenario.js` - vulnerable target and proven local reference.
- `src/theory-mapper.js`, `src/theory-agent.js`, and `src/theory-system.js` - provenance, lifecycle, lineage, and finalization boundaries.
- `tests/theory-agent-cli.test.js`, `tests/theory-agent-security.test.js`, `tests/theory-agent.test.js`, and `tests/theory-mapper.test.js` - executable acceptance and regression contracts.
- `docs/mvp-v1-spec.md` and `docs/restart-handoff-2026-07-24.md` - frozen product/provenance boundary and stale-artifact warning.

### Secondary (MEDIUM confidence)

- `.planning/codebase/CONCERNS.md`, `.planning/codebase/CONVENTIONS.md`, and `.planning/codebase/TESTING.md` - generated brownfield inventory cross-checked against code and focused test execution.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new package; all recommended APIs already exist in the reference implementation.
- Architecture: HIGH - based on the current execution path, locked decisions, and executable tests.
- Pitfalls: HIGH - five are directly exhibited by current code, failing tests, or the stale checked artifact.

**Research date:** 2026-07-24
**Valid until:** Phase 1 implementation or acceptance-test contract changes.
