---
phase: ZZZ-01-trustworthy-theory-pipeline
plan: "03"
subsystem: theory-authority-lifecycle
tags: [theory-agent, deterministic-fixture, provenance, content-addressing, recovery-closeout]

requires:
  - phase: ZZZ-01-02
    provides: Hardened Theory Agent CLI filesystem boundary and recoverable persistence
provides:
  - Authoritative READY_FOR_COMPILATION run bound to the current reviewed inputs
  - Content-addressed Theory System with complete deterministic-fixture provenance
  - Restart handoff that distinguishes the current authority from the invalid historical ID
affects: [01-04-quality-closure, phase-2-ai-compilation]

tech-stack:
  added: []
  patterns: [public-cli-lifecycle, content-addressed-authority, monotonic-review-lineage, recovery-closeout]

key-files:
  created: []
  modified:
    - experiments/output/theory/zzz-1-4-fade-run.json
    - docs/restart-handoff-2026-07-24.md

key-decisions:
  - "Keep the regenerated authority explicitly bounded to deterministic-fixture provenance with realModelUsed: false."
  - "Treat manual-demo-curator as a local reviewer declaration, not authenticated or cryptographically verified identity."
  - "Preserve mixed recovery commit 91f0929 unchanged and record its non-atomic Plan 03 history as a deviation instead of rewriting it."
  - "Advance only to Plan 01-04; Phase 1 remains incomplete until the full quality-gate closure plan finishes."

patterns-established:
  - "Authority regeneration: only start --demo --replace -> review approve -> resume -> status may replace the checked default run."
  - "Recovery closeout: when production artifacts are already approved but SUMMARY is missing, verify read-only and document the existing commit without re-executing lifecycle writes."

requirements-completed: [TRUST-01, TRUST-02, TRUST-03, TRUST-04]

coverage:
  - id: D1
    description: "The default Theory run is READY_FOR_COMPILATION with current input digests, monotonic review/event lineage, and a content-addressed Theory System."
    requirement: TRUST-03
    verification:
      - kind: integration
        ref: "node --test tests/theory-agent.test.js tests/theory-agent-security.test.js tests/compile-scenario-cli.test.js (29/29 pass)"
        status: pass
      - kind: integration
        ref: "npm run theory:agent -- status"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mapping and Theory System provenance identify the checked fixture path/digest and state realModelUsed: false."
    requirement: TRUST-02
    verification:
      - kind: integration
        ref: "tests/theory-agent-security.test.js#persisted and finalized provenance tampering"
        status: pass
    human_judgment: false
  - id: D3
    description: "The restart handoff names the current Theory System ID and retains the former ID only as invalid historical context."
    requirement: TRUST-03
    verification:
      - kind: other
        ref: "rg exact current and historical theory-system IDs"
        status: pass
    human_judgment: false

duration: 59 min
completed: 2026-07-24
status: complete
---

# Phase ZZZ-01 Plan 03: Authoritative CLI Lifecycle Regeneration Summary

**The checked default run now exposes a reviewed, content-addressed `READY_FOR_COMPILATION` Theory System while preserving the deterministic-fixture and non-live-model boundary.**

## Performance

- **Duration:** 59 min
- **Started:** 2026-07-24T04:52:15Z
- **Completed:** 2026-07-24T05:51:20Z
- **Tasks:** 2
- **Files modified:** 2 production artifacts

## Accomplishments

- Recovered and verified authoritative run `zzz-fade-20260724045215` at revision 3 and state `READY_FOR_COMPILATION`.
- Confirmed Theory System `theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912` reconstructs from the current mapping, review, evidence, catalog, and event lineage.
- Preserved `provenance.mode = deterministic-fixture`, the checked fixture path/digest, and `realModelUsed = false` in both mapping and finalized Theory System.
- Kept the former Theory System ID only as explicitly invalid historical context in the restart handoff.
- Re-ran the recovery-focused verification read-only: 29/29 tests passed and `status` returned the expected authority without lifecycle regeneration.

## Task Commits

The lifecycle artifact and handoff were recovered from an existing mixed commit:

1. **Task 1: Regenerate the authoritative demo through the complete public CLI lifecycle** - `91f0929` (mixed recovery commit)
2. **Task 2: Replace stale exact references and document current authority without new claims** - `91f0929` (mixed recovery commit)

`91f0929` is intentionally not rewritten or split during this closeout. The metadata-only recovery commit is recorded by the repository history for this SUMMARY, ROADMAP, and STATE update.

## Files Created/Modified

- `experiments/output/theory/zzz-1-4-fade-run.json` - Current READY run with revision 1 -> 2 -> 3 lineage and deterministic provenance.
- `docs/restart-handoff-2026-07-24.md` - Current authority, exact ID, test boundary, and explicit historical invalidation.
- `.planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-03-SUMMARY.md` - Recovery evidence and Plan 03 closure metadata.
- `.planning/ROADMAP.md` - Plan 03 marked complete while Phase 1 remains in progress.
- `.planning/STATE.md` - Current plan advanced to 01-04 with three of four plans complete.

## Decisions Made

- Accepted the previously generated artifact only after the supplied read-only independent review and a fresh 29/29 focused verification agreed with its current status and lineage.
- Did not rerun `start`, `review`, or `resume`; recovery validation was restricted to tests and the public read-only `status` command.
- Did not treat the local reviewer label as authentication, and did not promote the fixture to a real-model result.
- Left Phase 1 open for Plan 01-04 full quality gates and closure evidence.

## Deviations from Plan

### Recovered Historical Deviation

**1. Plan 03 production work was committed non-atomically with unrelated recovery changes**
- **Found during:** Recovery closeout before summary creation
- **Issue:** `91f0929` contains the Plan 03 run and handoff together with CLI, CI, documentation, and broader planning changes under `feat: align mac competition mvp gates`; it is not the two atomic task commits prescribed by the plan.
- **Resolution:** Preserved `91f0929` unchanged as instructed, verified only the Plan 03 artifacts, and documented the mixed-commit boundary here.
- **Files modified during closeout:** Planning metadata only; no product files were changed.
- **Verification:** `git show 91f0929 -- experiments/output/theory/zzz-1-4-fade-run.json docs/restart-handoff-2026-07-24.md`, focused tests 29/29, read-only status, exact-ID search, and `git diff --check`.

---

**Total deviations:** 1 recovered historical deviation; 0 product auto-fixes.
**Impact on plan:** The product artifacts and authority contract verify successfully, but commit-level atomicity cannot be claimed for `91f0929`.

## Issues Encountered

- The Plan 03 SUMMARY was absent even though the production artifacts existed in `91f0929`; this recovery closeout restores the required planning record without replaying lifecycle writes.
- Existing user-owned `.planning/config.json` changes and untracked `.codex/` content were deliberately excluded from this plan and its commit.

## User Setup Required

None - no external service configuration required.

## Verification Results

- `node --test tests/theory-agent.test.js tests/theory-agent-security.test.js tests/compile-scenario-cli.test.js` - 29 tests, 29 passed, 0 failed.
- `npm run theory:agent -- status` - `zzz-fade-20260724045215`, revision 3, `READY_FOR_COMPILATION`, `realModelUsed: false`, expected Theory System ID.
- Exact-ID search - current ID appears in the run and handoff; former ID appears only in the handoff as invalid history.
- `git diff --check` - passed.

## Next Phase Readiness

- Plan 01-04 can now run full build, test, E2E, hygiene, claim-boundary, security, and closure checks against the current authority.
- Phase 1 is not complete. No Phase 2 work, live model invocation, wallet action, Injective deployment, signature, or transaction was performed here.

## Self-Check: PASSED

- Plan 03 production artifacts exist in `91f0929` and match the recorded authority.
- The fresh focused suite passed 29/29 and the read-only status command returned the expected run.
- SUMMARY, ROADMAP, and STATE are the only closeout files selected for the metadata commit.
- Plan 01-04 remains pending and Phase 1 remains in progress.

---
*Phase: ZZZ-01-trustworthy-theory-pipeline*
*Completed: 2026-07-24*
