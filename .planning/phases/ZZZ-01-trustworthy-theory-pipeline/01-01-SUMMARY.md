---
phase: ZZZ-01-trustworthy-theory-pipeline
plan: "01"
subsystem: theory-provenance
tags: [provenance, content-addressing, deterministic-fixture, node-test]

requires: []
provides:
  - Closed validation for deterministic-fixture, recorded-model-output, and live-model provenance
  - Fixture path and canonical digest preservation through approved Theory System content identity
  - Persisted mapping and finalized System provenance tamper detection
affects: [01-02-cli-filesystem-hardening, 01-03-authoritative-regeneration, 01-04-quality-closure]

tech-stack:
  added: []
  patterns: [validate-preserve-revalidate, mode-aware-closed-contract, canonical-content-digest]

key-files:
  created: []
  modified:
    - scripts/run-theory-agent.js
    - src/theory-mapper.js
    - src/theory-system.js
    - src/theory-agent.js
    - tests/theory-mapper.test.js
    - tests/theory-agent-security.test.js

key-decisions:
  - "Derive realModelUsed exclusively from the validated provenance mode."
  - "Keep recorded-model-output metadata optional in Phase 1 while rejecting incompatible or unknown fields."
  - "Leave the five pre-existing CLI filesystem-security regressions to declared owner Plan 01-02."

patterns-established:
  - "Closed provenance: every accepted record belongs to exactly one supported mode with compatible fields."
  - "Lineage validation: mapping provenance is revalidated after persistence and compared exactly with finalized System provenance."

requirements-completed: [TRUST-01, TRUST-02, TRUST-03, TRUST-04]

coverage:
  - id: D1
    description: "Offline fixture approval preserves repository-relative fixture path, canonical digest, and realModelUsed false through Theory System finalization."
    requirement: TRUST-02
    verification:
      - kind: integration
        ref: "tests/theory-agent-cli.test.js#formal data completes the offline Theory Agent approval workflow without claiming a model call"
        status: pass
    human_judgment: false
  - id: D2
    description: "The three provenance modes accept only compatible fields and capabilities and reject missing, unknown, contradictory, or relabeled records."
    requirement: TRUST-02
    verification:
      - kind: unit
        ref: "tests/theory-mapper.test.js#theory provenance is a closed three-mode contract with derived model capability"
        status: pass
    human_judgment: false
  - id: D3
    description: "Persisted mapping and finalized Theory System provenance tampering fails semantic validation even after content identity is recomputed."
    requirement: TRUST-02
    verification:
      - kind: integration
        ref: "tests/theory-agent-security.test.js#persisted mapping provenance tampering fails the reusable domain contract"
        status: pass
      - kind: integration
        ref: "tests/theory-agent-security.test.js#finalized provenance tampering fails after the attacker recomputes content identity"
        status: pass
    human_judgment: false

duration: 7 min
completed: 2026-07-24
status: complete
---

# Phase ZZZ-01 Plan 01: Closed Provenance Contract Summary

**A closed three-mode provenance contract now binds deterministic fixture artifacts to content-addressed Theory Systems and rejects persisted semantic tampering.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-23T23:57:11Z
- **Completed:** 2026-07-24T00:04:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- The offline CLI path carries the exact repository-relative fixture path and `digestValue(fixture)` into the approved Theory System with `realModelUsed: false`.
- `validateTheoryProvenance` closes deterministic fixture, recorded output, and live model modes and derives model capability from the validated mode.
- Run and System validators reject missing or contradictory provenance, including finalized tampering after the attacker recomputes content identity.

## Task Commits

Each task was committed atomically:

1. **Task 1: Trace one deterministic fixture from CLI input to approved Theory System provenance** - `8764e9e` (feat)
2. **Task 2: Expand the closed provenance contract across modes and persisted lineage** - `aebaf0f` (feat)

## Files Created/Modified

- `scripts/run-theory-agent.js` - Retains fixture artifact path/value and emits canonical fixture provenance.
- `src/theory-mapper.js` - Exports the closed mode-aware provenance validator and derives capability after validation.
- `src/theory-system.js` - Preserves and revalidates complete provenance before and after content hashing.
- `src/theory-agent.js` - Revalidates persisted provenance and enforces mapping/System lineage consistency.
- `tests/theory-mapper.test.js` - Covers valid modes and missing, unknown, contradictory, and relabeled provenance.
- `tests/theory-agent-security.test.js` - Covers persisted mapping and finalized System provenance tampering.

## Decisions Made

- `realModelUsed` is true only for a valid `live-model` record; fixtures and recordings are always non-live.
- `schemaName` and `recordingId` remain accepted recorded-output metadata without becoming newly mandatory before Phase 2.
- The locked CLI suite was not edited, and Plan 01-02 retains ownership of the five pre-existing filesystem-security failures.

## Deviations from Plan

None - plan implementation executed exactly as written. The full Task 2 command exposed known downstream work already assigned to Plan 01-02; it was not treated as an acceptance waiver or pulled into this plan.

## Verification Results

- PASS: `node --test --test-name-pattern="formal data completes" tests/theory-agent-cli.test.js` - 1/1.
- PASS: `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js` - 21/21.
- PASS: `git diff --check`.
- PASS: `git diff -- tests/theory-agent-cli.test.js` is empty.
- DOWNSTREAM BLOCKED: exact Task 2 command `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js` - 22/27; all provenance/domain assertions pass, while five pre-existing locked CLI filesystem-security cases remain red for Plan 01-02.

The five Plan 01-02 blockers are input symlink escape rejection, symlinked output-parent rejection, exclusive random temporary writes, protected-input overwrite rejection, and malformed-JSON error redaction.

## Issues Encountered

The plan-level four-file command includes five pre-existing CLI filesystem-security regressions whose implementation is explicitly assigned to Plan 01-02. They remain active blockers and are not waived; no 01-02 filesystem hardening was pulled into this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The reusable provenance boundary is ready for Plan 01-02 filesystem hardening.
- Plan 01-02 must make the five named CLI attack cases green before authoritative regeneration or Phase 1 closure.

## Self-Check: PASSED

- Summary and all six declared product/test files exist.
- Task commits `8764e9e` and `aebaf0f` are present in git history.

---
*Phase: ZZZ-01-trustworthy-theory-pipeline*
*Completed: 2026-07-24*
