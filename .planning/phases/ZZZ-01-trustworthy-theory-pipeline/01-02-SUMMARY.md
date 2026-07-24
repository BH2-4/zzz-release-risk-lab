---
phase: ZZZ-01-trustworthy-theory-pipeline
plan: "02"
subsystem: theory-cli-filesystem-security
tags: [node-fs, root-fd, symlink-defense, revisioned-journal, caller-ack, cooperative-locking, error-redaction]

requires:
  - phase: ZZZ-01-01
    provides: Closed three-mode Theory provenance validation and preserved fixture identity
provides:
  - Root-descriptor containment for every Theory Agent CLI artifact input
  - Protected-input alias and symlink rejection before provider access
  - Revisioned, descriptor-bound JSON persistence with no-clobber publication, interruption recovery, and caller acknowledgement
affects: [01-03-authoritative-regeneration, 01-04-quality-closure]

tech-stack:
  added: [python3-posix-standard-library]
  patterns: [root-fd-component-walk, inherited-directory-fd, atomic-no-clobber-publish, revisioned-journal-adoption, caller-acknowledged-finalize, cooperative-writer-flock]

key-files:
  created:
    - scripts/secure-input-read.py
    - scripts/secure-run-output.py
  modified:
    - scripts/run-theory-agent.js
    - tests/theory-agent-cli-races.test.js

key-decisions:
  - "Port the compile-scenario filesystem boundary locally while preserving the Theory Agent CLI surface."
  - "Resolve the complete protected artifact set before constructing any fixture or live provider."
  - "Expose only artifact labels and project-relative paths for malformed JSON errors."
  - "Walk inputs and mutate outputs through inherited directory descriptors because Node does not expose safe directory-relative filesystem operations on macOS."
  - "Persist deterministic transaction journals so an interrupted helper can reconcile whether publication happened and recover only operation-owned entries."
  - "Bound concurrency guarantees to cooperating project CLI writers that acquire the parent-directory flock; non-cooperating same-UID mutation is outside the local MVP threat model."
  - "Open and reconcile the run output transaction before reading the run for status, review, or resume."
  - "Retain the published journal until Node validates the published inode and explicitly acknowledges cleanup."

patterns-established:
  - "Stable inputs: duplicate the project-root descriptor and open every path component with O_DIRECTORY/O_NOFOLLOW before opening the final regular file."
  - "Recoverable writes: journal operation IDs, expected and owned inode identities, and fsynced state transitions before no-clobber publication or replacement."
  - "Recoverable journal updates: publish unique revision candidates that recovery can validate, adopt, and retry without removing non-owned names."
  - "Cooperative serialization: every output helper operation acquires a non-blocking exclusive flock on the inherited parent-directory descriptor."

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
        ref: "tests/theory-agent-cli-races.test.js#root-fd input walk rejects a parent swapped before its first component open"
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
        ref: "tests/theory-agent-cli-races.test.js#no-clobber publication, interruption recovery, and conflict preservation"
        status: pass
    human_judgment: false
  - id: D3
    description: "The closed deterministic-fixture provenance lifecycle remains intact while all six locked CLI regressions pass."
    verification:
      - kind: integration
        ref: "node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js tests/theory-agent-cli-races.test.js"
        status: pass
    human_judgment: false

duration: 131 min
completed: 2026-07-24
status: complete
---

# Phase ZZZ-01 Plan 02: CLI Filesystem Boundary Hardening Summary

**Root-descriptor input walking plus revisioned, caller-acknowledged output transactions now close the cooperating-CLI read, recovery, and lost-response cases while preserving the closed provenance lifecycle.**

## Performance

- **Duration:** 131 min
- **Started:** 2026-07-24T00:49:30Z
- **Completed:** 2026-07-24T03:00:50Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Every CLI input is opened by walking from inherited project-root FD 3 with no-follow directory component opens, eliminating parent-swap traversal windows.
- Ordinary `start` and replacement commands use operation-scoped files, expected inode validation, fsynced journal transitions, no-clobber publication, and interruption reconciliation.
- Recovery preserves later target owners instead of overwriting them, while cooperating CLI writers serialize through the parent-directory flock.
- Status, review, and resume reconcile any pending output transaction before opening the run artifact.
- Malformed JSON errors remain redacted; all 45 focused Theory tests pass without changing the locked suite.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reject escaped, aliased, and protected paths before provider access** - `06c2eb6` (feat)
2. **Task 2: Complete exclusive atomic writes and artifact-safe JSON errors** - `2f793e6` (feat)
3. **Code review fix: Close no-clobber and path-swap races** - `2f6b3e9` (fix)
4. **Code review fix: Make Theory run transactions recoverable** - `d5c36ed` (fix)
5. **Code review fix: Acknowledge recoverable Theory publications** - `3b17daf` (fix)

## Files Created/Modified

- `scripts/run-theory-agent.js` - Passes stable root/parent descriptors to secure helpers and reconciles abnormal output-helper exits.
- `scripts/secure-input-read.py` - Walks project-relative input components from inherited root FD 3 using `dir_fd`, `O_DIRECTORY`, and `O_NOFOLLOW`.
- `scripts/secure-run-output.py` - Runs locked, revisioned, inode-aware publication, recovery, and caller-acknowledged finalization relative to inherited parent-directory FD 3.
- `tests/theory-agent-cli-races.test.js` - Covers 17 deterministic creation, parent-swap, target-change, interruption, recovery, acknowledgement, and conflict-preservation cases.

## Decisions Made

- Kept the compiler CLI as a behavioral reference instead of importing it, avoiding cross-CLI coupling while retaining one filesystem security design.
- Loaded all four evidence inputs and the deterministic fixture before each writing command validates its output; provider construction remains strictly downstream of these checks.
- Allowed regular run-file replacement for `review`, `resume`, and explicit `start --replace`, but rejected symlinks and non-regular targets.
- Used the repository's existing `python3` runtime for native `dir_fd` operations after confirming Node cannot address children through an open directory FD on macOS.
- Defined the supported concurrency contract as local single-user, cooperating CLI writers. Every project CLI writer must take the same directory flock; hostile non-cooperating same-UID mutation and platform-specific universal filesystem CAS are outside scope.
- Kept macOS local demonstration as the MVP platform commitment while retaining existing POSIX/Python behavior for Ubuntu CI; no private filesystem syscall or platform matrix was added.

## TDD Gate Compliance

- The locked `tests/theory-agent-cli.test.js` suite supplied the RED baseline: 1/6 passed and five declared Plan 01-02 attacks failed before implementation.
- The plan explicitly prohibited editing that test file, so no new RED test commit was created. Its SHA-256 remained `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23` throughout.
- GREEN completed in two task-scoped production commits plus three review-fix commits; the final locked suite passes 6/6 and the race/recovery suite passes 17/17.

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

**4. [Rule 2 - Missing Critical] Added root-FD input walking and interruption-recoverable output journals**
- **Found during:** Independent code review
- **Issue:** Pathname input opens retained a parent-swap window, while abnormal output-helper exits could strand transaction state or report failure after successful publication.
- **Fix:** Added `secure-input-read.py` for component-by-component root-FD reads and expanded the output helper with stable operation IDs, deterministic journals, fsynced state transitions, expected-target identity checks, and ownership-aware recovery.
- **Files modified:** `scripts/run-theory-agent.js`, `scripts/secure-input-read.py`, `scripts/secure-run-output.py`, `tests/theory-agent-cli-races.test.js`
- **Verification:** Parent swaps fail before external input is read; failpoints before, during, and after publication recover deterministically with no operation debris.
- **Committed in:** `d5c36ed`

**5. [Rule 3 - Blocking] Bounded the concurrency guarantee to cooperating project CLI writers**
- **Found during:** Filesystem CAS design review
- **Issue:** Portable Python `dir_fd` APIs cannot provide a universal compare-and-unlink primitive against a hostile same-UID process that ignores application locks.
- **Fix:** Made the parent-directory `flock` mandatory for every helper operation and documented the local single-user cooperative-writer threat boundary instead of overstating hostile-filesystem guarantees.
- **Files modified:** `scripts/secure-run-output.py`, `01-02-PLAN.md`, `01-02-SUMMARY.md`, `.planning/STATE.md`
- **Verification:** All supported writer paths use `LOCK_EX | LOCK_NB`; conflict recovery preserves a later target owner and its moved backup.
- **Committed in:** `d5c36ed` (implementation); threat-boundary metadata recorded by this closeout

**6. [Rule 1 - Bug] Recovered every non-start transaction before reading its run**
- **Found during:** Third independent code review
- **Issue:** `status`, `review`, and `resume` opened the run before output recovery, so an interrupted replacement could leave the target temporarily absent and prevent the command that should reconcile it.
- **Fix:** Open and recover the bound output transaction first, then read the run through the root-FD helper and compare it with the recovered target identity.
- **Files modified:** `scripts/run-theory-agent.js`, `tests/theory-agent-cli-races.test.js`
- **Verification:** A direct `between-replacement-steps` interruption followed by a fresh `status` restores the original run and removes all owned debris.
- **Committed in:** `3b17daf`

**7. [Rule 2 - Missing Critical] Made journal-update and backup auxiliaries idempotently recoverable**
- **Found during:** Third independent code review
- **Issue:** A deterministic O_EXCL journal-update name or unjournaled backup placeholder could strand an operation and permanently block later recovery.
- **Fix:** Journal updates now use unique revisioned candidates that recovery validates and adopts; non-owned candidates survive untouched. Replacement backup uses a no-clobber hard link whose expected inode can be adopted after interruption, eliminating the placeholder lifecycle.
- **Files modified:** `scripts/secure-run-output.py`, `tests/theory-agent-cli-races.test.js`
- **Verification:** Failpoints immediately after update creation, before update replacement, and after backup creation converge across repeated recoveries while a non-owned similarly named file remains byte-identical.
- **Committed in:** `3b17daf`

**8. [Rule 1 - Bug] Required caller acknowledgement before published-journal cleanup**
- **Found during:** Third independent code review
- **Issue:** The helper removed its published journal before Node received and validated the final response, losing durable proof when the response was absent or malformed.
- **Fix:** Published transactions retain their journal until Node verifies the target inode and invokes an idempotent `finalize` operation. Lost and malformed responses first recover the published identity, then acknowledge cleanup.
- **Files modified:** `scripts/run-theory-agent.js`, `scripts/secure-run-output.py`, `tests/theory-agent-cli-races.test.js`
- **Verification:** Both post-publication process exit and malformed final JSON return success only after recovery identifies the owned published inode; finalization leaves no owned debris.
- **Committed in:** `3b17daf`

**Total deviations:** 8 auto-fixed (6 correctness/security, 1 scoped threat-model decision, 1 metadata). **Impact:** Closes all currently identified in-scope review findings without changing CLI syntax, provenance behavior, or the locked test boundary.

## Verification Results

- PASS: `node --test tests/theory-agent-cli.test.js` - 6/6.
- PASS: `node --test tests/theory-agent-cli-races.test.js` - 17/17.
- PASS: `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js tests/theory-agent-cli-races.test.js` - 45/45.
- PASS: live-mode protected-ledger collision rejects before missing provider credentials are inspected.
- PREVIOUS PASS before `3b17daf`: `npm run build`, `npm test` 140/140, and `npm run test:e2e` 10 passed / 4 skipped. The orchestrator owns the fresh post-fix rerun.
- PASS: `git diff --check`.
- PASS: `tests/theory-agent-cli.test.js` is unchanged at SHA-256 `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23`.

## Issues Encountered

The first E2E attempt could not bind the local Playwright web-server port inside the filesystem sandbox. The identical command passed after receiving the scoped local-server permission; this was an execution-environment restriction, not a product failure.

## User Setup Required

Python 3 with POSIX `dir_fd` and `fcntl.flock` support is required; no third-party Python package or external service configuration is needed.

## Next Phase Readiness

- The hardened CLI is ready for Plan 01-03 authoritative lifecycle regeneration.
- The orchestrator will run independent review plus fresh `npm run build`, full `npm test`, and `npm run test:e2e` before the PR branch is pushed; formal TRUST-03/04 completion remains assigned to Plans 01-03/01-04.

## Self-Check: PASSED

- All four declared code/test files and the summary exist.
- Task and review commits `06c2eb6`, `2f793e6`, `2f6b3e9`, `d5c36ed`, and `3b17daf` are present in git history.
- Coverage metadata classifies all three deliverables as automation-backed PASS.

---
*Phase: ZZZ-01-trustworthy-theory-pipeline*
*Completed: 2026-07-24*
