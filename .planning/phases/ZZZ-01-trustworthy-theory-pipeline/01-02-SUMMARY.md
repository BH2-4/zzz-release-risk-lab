---
phase: ZZZ-01-trustworthy-theory-pipeline
plan: "02"
subsystem: theory-cli-filesystem-security
tags: [node-fs, realpath, symlink-defense, atomic-write, error-redaction]

requires:
  - phase: ZZZ-01-01
    provides: Closed three-mode Theory provenance validation and preserved fixture identity
provides:
  - Real-project-root containment for every Theory Agent CLI artifact input
  - Protected-input alias and symlink rejection before provider access
  - Descriptor-bound exclusive atomic JSON persistence with no-clobber start semantics
affects: [01-03-authoritative-regeneration, 01-04-quality-closure]

tech-stack:
  added: []
  patterns: [descriptor-bound-inputs, inherited-directory-fd, atomic-no-clobber-publish, exclusive-atomic-json-replacement]

key-files:
  created:
    - scripts/secure-run-output.py
    - tests/theory-agent-cli-races.test.js
  modified:
    - scripts/run-theory-agent.js

key-decisions:
  - "Port the compile-scenario filesystem boundary locally while preserving the Theory Agent CLI surface."
  - "Resolve the complete protected artifact set before constructing any fixture or live provider."
  - "Expose only artifact labels and project-relative paths for malformed JSON errors."
  - "Use inherited directory descriptors with native openat/linkat/renameat operations because Node does not expose safe directory-relative writes on macOS."

patterns-established:
  - "Stable inputs: compare the opened O_NOFOLLOW descriptor identity with the validated canonical input before reading."
  - "Stable writes: pass a verified directory descriptor to native dir_fd operations for inspect, wx write, no-clobber link or replace, fsync, rollback, and cleanup."

requirements-completed: [TRUST-01]

coverage:
  - id: D1
    description: "Theory Agent inputs and output targets cannot escape the real project root or alias protected evidence and fixture artifacts."
    requirement: TRUST-01
    verification:
      - kind: integration
        ref: "tests/theory-agent-cli.test.js#rejects input symlinks, rejects symlinked output parents, and refuses protected-input overwrite"
        status: pass
      - kind: integration
        ref: "tests/theory-agent-cli-races.test.js#descriptor-bound input reads reject a parent swapped after realpath validation"
        status: pass
    human_judgment: false
  - id: D2
    description: "Theory run writes use random exclusive atomic persistence and malformed JSON errors do not disclose parser contents."
    requirement: TRUST-01
    verification:
      - kind: integration
        ref: "tests/theory-agent-cli.test.js#uses an exclusive random temporary file and does not expose malformed JSON contents"
        status: pass
      - kind: integration
        ref: "tests/theory-agent-cli-races.test.js#ordinary start no-clobber and bound parent-swap rollback"
        status: pass
    human_judgment: false
  - id: D3
    description: "The closed deterministic-fixture provenance lifecycle remains intact while all six locked CLI regressions pass."
    verification:
      - kind: integration
        ref: "node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js tests/theory-agent-cli-races.test.js"
        status: pass
    human_judgment: false

duration: 18 min
completed: 2026-07-24
status: complete
---

# Phase ZZZ-01 Plan 02: CLI Filesystem Boundary Hardening Summary

**Descriptor-bound Theory Agent inputs and directory-relative native writes now resist concurrent creation and post-validation symlink swaps while preserving the closed provenance lifecycle.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-24T00:49:30Z
- **Completed:** 2026-07-24T00:56:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Every CLI input is opened with `O_NOFOLLOW`, matched to its validated device/inode, and read through the stable descriptor.
- Ordinary `start` publishes through kernel-atomic no-clobber linking; replacement commands use directory-FD-relative native replace with rollback to the prior run when a parent swap is detected.
- Malformed JSON errors remain redacted, and all 31 focused Theory and filesystem-race tests pass without changing the locked suite.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reject escaped, aliased, and protected paths before provider access** - `06c2eb6` (feat)
2. **Task 2: Complete exclusive atomic writes and artifact-safe JSON errors** - `2f793e6` (feat)
3. **Code review fix: Close no-clobber and path-swap races** - `2f6b3e9` (fix)

## Files Created/Modified

- `scripts/run-theory-agent.js` - Binds input reads and output validation to stable descriptors while preserving the public CLI surface.
- `scripts/secure-run-output.py` - Performs target inspection, exclusive write, atomic link/replace, fsync, rollback, and cleanup relative to inherited directory fd 3.
- `tests/theory-agent-cli-races.test.js` - Deterministically covers concurrent target creation plus input/output parent symlink swaps.

## Decisions Made

- Kept the compiler CLI as a behavioral reference instead of importing it, avoiding cross-CLI coupling while retaining one filesystem security design.
- Loaded all four evidence inputs and the deterministic fixture before each writing command validates its output; provider construction remains strictly downstream of these checks.
- Allowed regular run-file replacement for `review`, `resume`, and explicit `start --replace`, but rejected symlinks and non-regular targets.
- Used the repository's existing `python3` runtime for native `dir_fd` operations after confirming Node cannot address children through an open directory FD on macOS.

## TDD Gate Compliance

- The locked `tests/theory-agent-cli.test.js` suite supplied the RED baseline: 1/6 passed and five declared Plan 01-02 attacks failed before implementation.
- The plan explicitly prohibited editing that test file, so no new RED test commit was created. Its SHA-256 remained `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23` throughout.
- GREEN completed in two task-scoped production commits plus one review-fix commit; the final locked suite passes 6/6 and the new race suite passes 3/3.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made ordinary start no-clobber atomic at publication**
- **Found during:** Post-plan code review
- **Issue:** A regular run created after the early existence check could be overwritten by the final rename.
- **Fix:** Ordinary `start` now publishes its fully flushed temp through directory-FD-relative `linkat`, which fails atomically when the target exists; replace remains limited to review, resume, and explicit `start --replace`.
- **Files modified:** `scripts/run-theory-agent.js`, `scripts/secure-run-output.py`, `tests/theory-agent-cli-races.test.js`
- **Verification:** The concurrent-create regression preserves the competing file byte-for-byte and returns the existing `--replace` error.
- **Committed in:** `2f6b3e9`

**2. [Rule 2 - Missing Critical] Bound input reads and output writes to stable filesystem handles**
- **Found during:** Post-plan code review
- **Issue:** Path validation could be invalidated by swapping a parent to a symlink before input read or output rename.
- **Fix:** Inputs are read from verified no-follow descriptors; outputs are inspected and committed with native `dir_fd` operations on an inherited verified directory descriptor, with replacement backup and rollback.
- **Files modified:** `scripts/run-theory-agent.js`, `scripts/secure-run-output.py`, `tests/theory-agent-cli-races.test.js`
- **Verification:** Deterministic input and output parent-swap tests reject the operation, never write outside the project, and restore the prior run.
- **Committed in:** `2f6b3e9`

**3. [Rule 1 - Metadata] Corrected requirement completion claims**
- **Found during:** Post-plan code review
- **Issue:** The initial summary claimed all four phase requirements even though regeneration and phase-wide gates remain pending.
- **Fix:** `requirements-completed` now lists only `TRUST-01`; `TRUST-03` and `TRUST-04` remain pending, while `TRUST-02` remains owned by Plan 01-01.
- **Files modified:** `.planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-02-SUMMARY.md`
- **Verification:** Summary coverage links the plan's security deliverables only to `TRUST-01`.

**Total deviations:** 3 auto-fixed (2 correctness/security, 1 metadata). **Impact:** Closes the review findings without changing CLI syntax, provenance behavior, or the locked test boundary.

## Verification Results

- PASS: `node --test tests/theory-agent-cli.test.js` - 6/6.
- PASS: `node --test tests/theory-agent-cli-races.test.js` - 3/3.
- PASS: `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js tests/theory-agent-cli-races.test.js` - 31/31.
- PASS: live-mode protected-ledger collision rejects before missing provider credentials are inspected.
- PASS: `git diff --check`.
- PASS: `tests/theory-agent-cli.test.js` is unchanged at SHA-256 `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23`.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The hardened CLI is ready for Plan 01-03 authoritative lifecycle regeneration.
- Phase-wide `npm run build`, full `npm test`, and `npm run test:e2e` gates remain assigned to the orchestrator and Plan 01-04; this plan does not mark Phase 1 complete.

## Self-Check: PASSED

- All three declared code/test files and the summary exist.
- Task and review commits `06c2eb6`, `2f793e6`, and `2f6b3e9` are present in git history.
- Coverage metadata classifies all three deliverables as automation-backed PASS.

---
*Phase: ZZZ-01-trustworthy-theory-pipeline*
*Completed: 2026-07-24*
