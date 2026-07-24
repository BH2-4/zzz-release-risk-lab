---
phase: ZZZ-01-trustworthy-theory-pipeline
reviewed_head: 6dafd78
status: issues_found
depth: deep
files_reviewed: 20
finding_counts:
  blocker: 0
  high: 2
  medium: 2
  low: 0
  info: 0
reviewed_files:
  - AGENTS.md
  - scripts/run-theory-agent.js
  - scripts/secure-input-read.py
  - scripts/secure-run-output.py
  - src/theory-mapper.js
  - src/theory-system.js
  - src/theory-agent.js
  - tests/theory-mapper.test.js
  - tests/theory-agent-security.test.js
  - tests/theory-agent-cli-races.test.js
  - .github/workflows/ci.yml
  - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-01-PLAN.md
  - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-02-PLAN.md
  - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-03-PLAN.md
  - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-04-PLAN.md
  - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-01-SUMMARY.md
  - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-02-SUMMARY.md
  - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-03-SUMMARY.md
  - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-04-SUMMARY.md
  - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-VALIDATION.md
---

# Phase ZZZ-01 Deep Code Review

## Findings

### [HIGH-01] `status` presents stale or tampered runs as authoritative READY output

**File:** `scripts/run-theory-agent.js:524-531`

**Issue:** The status path returns `summarize(run)` at line 529 immediately after a descriptor-bound JSON read. It does not call `validateTheoryAgentRun`, does not load the current evidence inputs (that begins only at line 531), and does not reconstruct the Theory System. Consequently, a stale run whose input digests no longer match, or a tampered run with contradictory provenance/content identity/review lineage, is still printed as `READY_FOR_COMPILATION`.

**Evidence:** A bounded in-memory helper-response substitution changed only the read run value to `capabilities.realModelUsed: true` and `theorySystem.id: theory-system:sha256:000...000`. `runCommand({ argv: ['status'] })` returned success with exactly those false authority fields:

```json
{"state":"READY_FOR_COMPILATION","realModelUsed":true,"theorySystemId":"theory-system:sha256:0000000000000000000000000000000000000000000000000000000000000000"}
```

This contradicts the persisted-run trust boundary and the Plan 03/04 claim that public `status` confirms current input digests, deterministic provenance, content identity, and READY lineage.

**Fix:** For `status`, load the same current input set through the secure reader, validate it against the run, and perform READY reconstruction before summarizing. Return a non-zero, artifact-safe error on any stale digest or semantic/content-lineage failure. Add CLI regressions for stale input digests and recomputed tampered READY artifacts.

### [HIGH-02] `review` can persist `APPROVED` for a semantically tampered mapping

**Files:** `scripts/run-theory-agent.js:531-558`; `src/theory-agent.js:314-329`; `src/theory-agent.js:492-495`

**Issue:** The CLI securely loads all current inputs before review, but passes only `{ run, review }` to `applyTheoryReview`. That function calls `validateTheoryAgentRun(run)` without inputs. The reusable validator checks a mapping against the approved extractions/catalog only when `inputs` is supplied, so a persisted mapping can be changed to an invented theory, have its mapping/audit/checkpoint/event digests recomputed, and then be written as `APPROVED` by the public review command.

**Evidence:** An in-memory regression changed a pending mapping's `theoryId` to `theory-invented`, recomputed `audit.mappingDigest`, both checkpoint digests, and the pending event artifact digests, then applied a matching approving review. Observed result:

```json
{"preReviewWithoutInputs":true,"preReviewWithInputs":false,"approvedState":"APPROVED"}
```

`resume` later rejects this artifact when it validates with inputs, but the review command has already persisted a false approved state. That violates the phase's fail-closed persisted-run and approval boundary.

**Fix:** Make review validation consume the already loaded current inputs and reconstruct/compare the audit before applying or persisting a review. Add a CLI-level regression that recomputes structural digests around an invented theory and asserts no output write occurs.

### [MEDIUM-01] READY validation does not prove the finalized System was derived from the approved mapping

**File:** `src/theory-agent.js:567-597`

**Issue:** `validateTheoryAgentRun` checks the stored System's `mappingDigest`, a subset of review fields, provenance equality, self-consistent content ID, final event digest, and schema validity. It never calls `finalizeTheorySystem` and compares the rebuilt result to the stored System. A schema-valid approved mapping field can therefore diverge from the reviewed mapping if the System ID and final event digest are recomputed.

**Evidence:** Changing only `theorySystem.approvedMappings[0].mechanism`, recomputing `theorySystem.id`, and rebinding the final event caused `validateTheoryAgentRun(tampered, currentInputs)` to return:

```json
{"valid":true,"errors":[]}
```

`scripts/compile-scenario.js:265-276` performs the missing reconstruction and would block compilation, which limits immediate impact, but the advertised reusable persisted-run validator and any other consumer can accept a semantically detached READY System.

**Fix:** When validating READY with inputs, rebuild via `finalizeTheorySystem` and require exact canonical equality with the stored System. Distinguish explicitly between structural validation without inputs and authority validation with inputs so callers cannot confuse the two.

### [MEDIUM-02] Historical review decisions are not bound to their review-event states

**File:** `src/theory-agent.js:452-475`

**Issue:** Historical reviews receive only basic schema/reviewer/timestamp/content-digest checks and an event timestamp/artifact-digest match. Their decision is never checked against the corresponding event state, and their full mapping-decision contract is not normalized. After a revision cycle, contradictory history remains validator-valid.

**Evidence:** In a valid `revise -> remap -> approve -> READY` run, changing the first review from `revise` to `approve`, changing its mapping decisions to approve, recomputing its review ID, and rebinding its event digest produced:

```json
{"valid":true,"errors":[],"historyDecision":"approve","eventState":"REVISION_REQUESTED"}
```

This breaks the explicit review-lineage integrity requirement even though the latest approval remains intact.

**Fix:** Fully validate each stored review's closed fields and require `approve -> APPROVED`, `revise -> REVISION_REQUESTED`, and `reject -> REJECTED` for its paired event. If historical mapping-decision reconstruction is required, retain the reviewed mapping artifact (not only its digest) per attempt.

## Phase Gate

**FAIL.** The phase requires zero BLOCKER, HIGH, and MEDIUM findings. This review found 2 HIGH and 2 MEDIUM findings; Phase 1 must not be pushed or marked independently reviewed until they are fixed and re-reviewed.

## Verification Performed

- `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js tests/theory-agent-cli-races.test.js` - 46 passed, 0 failed.
- `npm test` - 146 passed, 0 failed, 0 skipped.
- `git diff --check` and `git diff --staged --check` - passed.
- Locked CLI test SHA-256 remains `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23`.
- Failed readonly `status`, `review`, and `resume` share `prepareRunOutput(..., { createMissingParent: false })`; code inspection confirms they cannot create a missing output parent. `start` retains `createMissingParent: true`.
- Ordinary concurrent start no-clobber, symlink escape, input parent exchange, output parent exchange, malformed-error redaction, interruption recovery, caller acknowledgement, and conflict preservation passed within the declared cooperative parent-directory `flock` boundary.

## Residual Risks And Test Gaps

- Non-cooperating same-UID writers remain an explicit out-of-scope residual risk; this review does not demand universal hostile-filesystem transaction safety.
- The local reviewer label is a declaration, not authenticated or cryptographically verified identity.
- The recovery suite exercises process failpoints but not actual power-loss/filesystem-remount durability on the target Mac.
- Only `status` has an explicit missing-nested-parent no-creation regression. Shared code also protects failed `review` and `resume`, but dedicated regressions would prevent command-branch drift.
- This review reran the complete Node suite, not Playwright E2E; the recorded host E2E result remains executor evidence rather than independent review evidence.
