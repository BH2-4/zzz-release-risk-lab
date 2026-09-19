---
phase: ZZZ-01-trustworthy-theory-pipeline
reviewed_head: 007543d5875b18c41e9c176fb40c285c500ae61e
status: clean
depth: deep
files_reviewed: 37
finding_counts:
  blocker: 0
  high: 0
  medium: 0
  low: 0
  info: 0
historical_findings_resolved: 7
---

# Phase ZZZ-01 Final Deep Code Review

## Current Findings

No current open findings.

## Phase Gate

**PASS.** Current findings are BLOCKER=0, HIGH=0, MEDIUM=0, LOW=0, INFO=0. The required independent-review gate is satisfied.

## Historical Findings - Resolved

The entries below preserve the prior audit trail. They are not current open findings.

### [RESOLVED LOW-01] Current release guidance described the CI workflow as Ubuntu

**Original issue:** Although `.github/workflows/ci.yml:9` already used `runs-on: macos-latest`, current operator guidance still described the workflow as Ubuntu and instructed the next operator to migrate it.

**Resolution:** The current working-tree documentation now identifies the existing single macOS target-platform job in `README.md:29`, `AGENTS.md:35`, `docs/competition-mac-mvp-outline.md:51`, `docs/restart-handoff-2026-07-24.md:68`, `.planning/STATE.md:74`, and `.planning/PROJECT.md:62`. The same files explicitly keep non-macOS jobs, operating-system matrices, portability, and cross-platform verification outside the pre-competition acceptance boundary (`README.md:29`, `AGENTS.md:35`, `docs/competition-mac-mvp-outline.md:55`, `.planning/STATE.md:72-74`, `.planning/PROJECT.md:42,58,62`).

**Evidence:** A focused search found no remaining current Ubuntu-workflow claim in those six operator documents. The remaining Ubuntu references in `01-02-PLAN.md` and `01-02-SUMMARY.md` are intentionally preserved historical records, not current release instructions. The current documentation therefore agrees with `.github/workflows/ci.yml:9` without making a Linux/Windows or cross-platform support claim.

### [RESOLVED HIGH-01] `status` presented stale or tampered runs as authoritative READY output

**Original issue:** At reviewed head `6dafd78`, `status` summarized the persisted run without current-input validation or READY reconstruction.

**Resolution:** Commit `3cdb209` loads the four reviewed inputs, checks output/input aliasing, and calls the constant-error authority precheck before `summarize` (`scripts/run-theory-agent.js:535-539`).

**Evidence:** `tests/theory-agent-cli-authority.test.js:103-133` rejects both current-input drift and a recomputed detached READY System without changing run bytes or directory entries. The fresh focused suite passed 60/60, and the public checked-run `status` command passed at this reviewed head.

### [RESOLVED HIGH-02] `review` could persist `APPROVED` for a recomputed invented mapping

**Original issue:** The public review path loaded inputs but did not pass them into `applyTheoryReview`, so recomputed mapping/audit/checkpoint/event digests could wrap an invented theory.

**Resolution:** Commit `3cdb209` validates the run against current inputs before review and passes those inputs into `applyTheoryReview` (`scripts/run-theory-agent.js:545-571`). The domain function validates both incoming and reviewed states with those inputs (`src/theory-agent.js:321-339`), including canonical audit reconstruction (`src/theory-agent.js:520-525`).

**Evidence:** `tests/theory-agent-cli-authority.test.js:135-154` recomputes every structural digest named by the original finding and proves rejection with exact output immutability. Fresh focused result: 60/60.

### [RESOLVED MEDIUM-01] READY validation did not prove exact derivation from the approved mapping

**Original issue:** A modified approved-mapping payload inside the stored Theory System could be re-addressed and rebound to the final event while remaining validator-valid.

**Resolution:** Commit `3cdb209` rebuilds the complete System with `finalizeTheorySystem({ mapping, review, ...inputs })` and requires canonical digest equality with the persisted System (`src/theory-agent.js:615-629`). Existing schema, provenance, content-ID, and final-event checks remain in place.

**Evidence:** `tests/theory-agent-security.test.js:177-189` and `tests/theory-agent-cli-authority.test.js:117-133` exercise direct and public-command variants after recomputing the System ID and final-event digest. Both passed in the fresh focused and full suites.

### [RESOLVED MEDIUM-02] Historical review decisions were not bound to paired event states

**Original issue:** A prior `revise` review could be changed to `approve`, rehashed, and rebound while its paired event remained `REVISION_REQUESTED`.

**Resolution:** Commit `3cdb209` normalizes every stored review, pairs reviews with review events in order, and enforces `approve -> APPROVED`, `revise -> REVISION_REQUESTED`, and `reject -> REJECTED` (`src/theory-agent.js:462-490`).

**Evidence:** `tests/theory-agent-security.test.js:191-213` performs the recomputed contradictory-history attack against a valid revise/remap/approve/READY lifecycle. Fresh focused result: 60/60.

### [RESOLVED HIGH-03] Public `resume` leaked persisted attacker semantics through validator errors

**Original issue:** The first Plan 05 fix protected `status` and `review`, but `resume` still delegated directly to detailed domain validation and could reflect attacker-controlled mapping content or secret markers.

**Resolution:** RED commit `53e9fac` captured the leak; fix commit `832bc08` applies the same constant-error authority precheck before provider selection and domain resume (`scripts/run-theory-agent.js:580-586`).

**Evidence:** `tests/theory-agent-cli-authority.test.js:156-186` recomputes approved mapping, audit, checkpoint, review, and event digests around a unique secret marker. It asserts the constant error, no marker/reflected validator detail, exact run bytes, identical directory entries, and no transaction debris. Fresh focused result: 60/60.

### [RESOLVED MEDIUM-03] Historical review targets could bind to `auditDigest` instead of `mappingDigest`

**Original issue:** Accepting any digest in a proposal event allowed a historical review to retarget the proposal's audit artifact while retaining a self-consistent recomputed review/event chain.

**Resolution:** RED commit `53e9fac` captured the ambiguity; fix commit `832bc08` requires each historical target to equal artifact position 0 of its immediately preceding `AWAITING_HUMAN` event, the typed mapping-digest position (`src/theory-agent.js:486-490`).

**Evidence:** `tests/theory-agent-security.test.js:215-230` retargets the first historical review to proposal artifact position 1 (`auditDigest`), recomputes its ID and paired event digest, and proves rejection. Fresh focused result: 60/60.

## Review Scope

The deep pass covered 37 files: the full Phase 1 code/test/documentation surface changed from `main`, the secure input/output helpers and compiler/digest call-chain dependencies, the locked CLI contract, the current `.planning/PROJECT.md` and `.planning/STATE.md` operator guidance, and all ten `01-01` through `01-05` PLAN/SUMMARY artifacts. The Plan 05 authority diff `cfa7352..007543d` was traced line-by-line through public command, reusable validator, persistence, compiler-consumer, and adversarial-test paths.

## Verification Performed

- `node --test tests/theory-agent-cli-authority.test.js tests/theory-agent-security.test.js tests/theory-agent.test.js tests/compile-scenario-cli.test.js tests/theory-agent-cli.test.js tests/theory-agent-cli-races.test.js` - 60 passed, 0 failed.
- `npm test` - 153 passed, 0 failed, 0 skipped.
- `npm run build` - passed; `RiskCommitment` built at 556 bytes.
- `npm run theory:agent -- status` - passed for run `zzz-fade-20260724045215`, revision 3, `READY_FOR_COMPILATION`, `realModelUsed: false`, expected Theory System ID.
- Locked `tests/theory-agent-cli.test.js` SHA-256 - exact baseline `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23`.
- `git diff --check` and `git diff --staged --check` - passed.
- No `.tmp-theory-*` test directories remained after the fresh suites.
- Recorded orchestrator Mac-host E2E evidence at this head: 10 passed and 4 explicit project-matrix skips in 9.5s. This reviewer did not rerun the host-only E2E gate.

No network, credential, `.env.*`, live-model, wallet, deployment, signature, or Injective action was used during this review.

## Residual Risks And Test Gaps

- Non-cooperating same-UID writers that ignore the parent-directory `flock` remain explicitly outside the local MVP boundary. No universal hostile-filesystem transaction guarantee is inferred.
- Read-only commands intentionally reconcile an interrupted cooperating-writer transaction before opening the run. Ordinary authority failures do not write or create parents; recovery and authority rejection are well tested separately, but no single test combines a semantically tampered run with pre-existing valid interrupted-journal state.
- Historical reviews do not retain each prior mapping payload. The validator enforces closed review shape, decision/event agreement, review digest/timestamp, and typed proposal mapping target without claiming full historical mapping reconstruction.
- Reviewer names are local declarations, not authenticated or cryptographically verified identities.
- Recovery tests cover deterministic process failpoints, not physical power loss or filesystem remount durability on the target Mac.
- Repository-wide branch coverage was recorded at 69.60%; the changed authority paths have direct adversarial coverage, but the generic 80% repository target remains unmet outside this plan's scoped changes.
- The Mac-host E2E result is orchestrator evidence, not an independently rerun browser gate from this review session.

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| BLOCKER | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |
| INFO | 0 | pass |

Verdict: APPROVE - no current findings remain.
