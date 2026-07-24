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
  - Exclusive random atomic JSON persistence with redacted parse errors
affects: [01-03-authoritative-regeneration, 01-04-quality-closure]

tech-stack:
  added: []
  patterns: [realpath-artifact-records, canonical-and-inode-collision-checks, exclusive-atomic-json-replacement]

key-files:
  created: []
  modified:
    - scripts/run-theory-agent.js

key-decisions:
  - "Port the compile-scenario filesystem boundary locally while preserving the Theory Agent CLI surface."
  - "Resolve the complete protected artifact set before constructing any fixture or live provider."
  - "Expose only artifact labels and project-relative paths for malformed JSON errors."

patterns-established:
  - "Protected writes: validate lexical path, real parent chain, target type, canonical identity, and device/inode before provider access."
  - "Durable JSON replacement: random same-directory wx temp at 0600, descriptor write, fsync, close, recheck, rename, and cleanup."

requirements-completed: [TRUST-01, TRUST-02, TRUST-03, TRUST-04]

coverage:
  - id: D1
    description: "Theory Agent inputs and output targets cannot escape the real project root or alias protected evidence and fixture artifacts."
    requirement: TRUST-01
    verification:
      - kind: integration
        ref: "tests/theory-agent-cli.test.js#rejects input symlinks, rejects symlinked output parents, and refuses protected-input overwrite"
        status: pass
    human_judgment: false
  - id: D2
    description: "Theory run writes use random exclusive atomic persistence and malformed JSON errors do not disclose parser contents."
    requirement: TRUST-01
    verification:
      - kind: integration
        ref: "tests/theory-agent-cli.test.js#uses an exclusive random temporary file and does not expose malformed JSON contents"
        status: pass
    human_judgment: false
  - id: D3
    description: "The closed deterministic-fixture provenance lifecycle remains intact while all six locked CLI regressions pass."
    requirement: TRUST-02
    verification:
      - kind: integration
        ref: "node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js"
        status: pass
    human_judgment: false

duration: 7 min
completed: 2026-07-24
status: complete
---

# Phase ZZZ-01 Plan 02: CLI Filesystem Boundary Hardening Summary

**Realpath-contained Theory Agent inputs, protected-artifact collision checks, exclusive atomic run persistence, and redacted JSON failures now close all six locked CLI regressions.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-24T00:49:30Z
- **Completed:** 2026-07-24T00:56:44Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Every CLI input resolves through the real project root, while output parents, targets, canonical aliases, and same-inode aliases of evidence and fixture inputs fail before provider access.
- Run persistence uses a random same-directory `wx` temporary file at mode `0600`, flushes and closes it, repeats output safety checks, and atomically renames with failure cleanup.
- Malformed JSON errors retain the artifact label and safe project-relative context without parser snippets or embedded secret markers; all 28 focused Theory tests pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reject escaped, aliased, and protected paths before provider access** - `06c2eb6` (feat)
2. **Task 2: Complete exclusive atomic writes and artifact-safe JSON errors** - `2f793e6` (feat)

## Files Created/Modified

- `scripts/run-theory-agent.js` - Adds real-root artifact resolution, protected-output checks, exclusive atomic JSON writes, and safe parse errors while preserving `start`, `review`, `resume`, `status`, environment names, `runCommand`, and `require.main` behavior.

## Decisions Made

- Kept the compiler CLI as a behavioral reference instead of importing it, avoiding cross-CLI coupling while retaining one filesystem security design.
- Loaded all four evidence inputs and the deterministic fixture before each writing command validates its output; provider construction remains strictly downstream of these checks.
- Allowed regular run-file replacement for `review`, `resume`, and explicit `start --replace`, but rejected symlinks and non-regular targets.

## TDD Gate Compliance

- The locked `tests/theory-agent-cli.test.js` suite supplied the RED baseline: 1/6 passed and five declared Plan 01-02 attacks failed before implementation.
- The plan explicitly prohibited editing that test file, so no new RED test commit was created. Its SHA-256 remained `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23` throughout.
- GREEN completed in two task-scoped production commits; the final locked suite passes 6/6.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- PASS: `node --test tests/theory-agent-cli.test.js` - 6/6.
- PASS: `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js` - 28/28.
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

- The declared production file and summary exist.
- Task commits `06c2eb6` and `2f793e6` are present in git history.
- Coverage metadata classifies all three deliverables as automation-backed PASS.

---
*Phase: ZZZ-01-trustworthy-theory-pipeline*
*Completed: 2026-07-24*
