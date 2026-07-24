---
phase: ZZZ-01-trustworthy-theory-pipeline
plan: "05"
subsystem: persisted-run-authority
tags: [theory-agent, tamper-resistance, canonical-validation, tdd, asvs-l2]

requires:
  - phase: ZZZ-01-04
    provides: Mac quality baseline and independent persisted-authority findings
provides:
  - Current-input authority checks before public status, review, and resume behavior
  - Canonical audit and exact READY Theory System reconstruction
  - Historical review decision, event-state, and typed proposal-target binding
  - Adversarial tamper regressions with output immutability and secret-redaction checks
affects: [phase-1-verification, phase-2-ai-compilation, restart-handoff]

tech-stack:
  added: []
  patterns: [constant-public-authority-errors, canonical-artifact-reconstruction, typed-event-lineage]

key-files:
  created:
    - tests/theory-agent-cli-authority.test.js
    - .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-05-SUMMARY.md
  modified:
    - scripts/run-theory-agent.js
    - src/theory-agent.js
    - tests/theory-agent.test.js
    - tests/theory-agent-security.test.js
    - tests/compile-scenario-cli.test.js
    - docs/restart-handoff-2026-07-24.md

key-decisions:
  - "Treat structural validation without inputs as inspection only; public lifecycle authority always uses the four current reviewed inputs."
  - "Compare canonical audit and READY artifacts by repository digest equality, while returning constant public authority errors."
  - "Bind historical review targets to the proposal event's typed mapping-digest position without claiming unavailable historical payload reconstruction."
  - "Keep host Mac E2E and independent overall review as unwaived orchestrator gates; do not mark Phase 1 complete."

patterns-established:
  - "Public authority precheck: securely load current inputs, validate, emit a constant error before summary/provider/write."
  - "Historical lineage: normalize closed reviews, pair them in order, and bind decision, timestamp, review digest, and proposal mapping target."

requirements-completed: [TRUST-01, TRUST-02, TRUST-03, TRUST-04]

coverage:
  - id: D1
    description: Public Theory Agent commands fail closed for stale or recomputed persisted authority without output mutation or secret reflection.
    requirement: TRUST-01
    verification:
      - kind: integration
        ref: "tests/theory-agent-cli-authority.test.js"
        status: pass
      - kind: other
        ref: "node --test tests/theory-agent-cli-authority.test.js tests/theory-agent-security.test.js tests/theory-agent.test.js tests/compile-scenario-cli.test.js tests/theory-agent-cli.test.js tests/theory-agent-cli-races.test.js (60/60)"
        status: pass
    human_judgment: false
  - id: D2
    description: READY and historical review authority are canonically reconstructed and bound to current inputs and typed events.
    requirement: TRUST-03
    verification:
      - kind: unit
        ref: "tests/theory-agent-security.test.js#READY validation and historical review lineage"
        status: pass
      - kind: integration
        ref: "tests/compile-scenario-cli.test.js"
        status: pass
    human_judgment: false
  - id: D3
    description: Restart handoff reports measured focused and complete Node totals from the final implementation.
    requirement: TRUST-04
    verification:
      - kind: other
        ref: "npm test (153/153)"
        status: pass
      - kind: other
        ref: "npm run build (RiskCommitment 556 bytes)"
        status: pass
    human_judgment: false
  - id: D4
    description: Post-fix claim-boundary and OWASP ASVS L2 security closure reports no unresolved finding.
    requirement: TRUST-01
    verification:
      - kind: manual_procedural
        ref: "independent security re-review: BLOCKER=0 HIGH=0 MEDIUM=0 LOW=0"
        status: pass
    human_judgment: true
    rationale: "ASVS and epistemic claim boundaries require reviewer judgment in addition to automated regressions."

duration: 28 min
completed: 2026-07-24
status: complete
---

# Phase ZZZ-01 Plan 05: Persisted Run Authority Gap Closure Summary

**Current reviewed inputs now govern every public Theory Agent authority path, with exact READY reconstruction and tamper-resistant review lineage.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-07-24T09:23:48Z
- **Completed:** 2026-07-24T09:51:13Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added public tamper regressions for stale inputs, recomputed READY artifacts, invented mappings, and resume error redaction; rejected commands preserve exact run bytes and directory entries with no transaction debris.
- Made `status`, `review`, and `resume` validate persisted runs against all four current reviewed inputs before summary, provider selection, or persistence.
- Rebuilt persisted audits and READY Theory Systems canonically, and bound normalized historical reviews to proposal mapping digests and matching event states.
- Refreshed the handoff from actual final runs: focused authority surface 60/60 and complete Node suite 153/153.

## Task Commits

1. **Task 1 RED: persisted authority tamper regressions** - `ad6bb05`
2. **Task 2 GREEN: current-input and canonical authority enforcement** - `3cdb209`
3. **Task 3 RED: security-review resume and typed-target findings** - `53e9fac`
4. **Task 3 GREEN: close ASVS authority findings** - `832bc08`
5. **Task 3 docs and summary** - this metadata commit

## Gate Results

| Gate | Result |
|------|--------|
| Initial RED evidence | 13 tests: 8 passed, 5 intended authority failures |
| Supplemental RED evidence | 15 tests: 13 passed, 2 intended security-review failures |
| Final focused authority suite | 60 passed, 0 failed, exit 0 |
| `npm run build` | Exit 0; `RiskCommitment` 556 bytes |
| `npm test` | 153 passed, 0 failed, exit 0 |
| TDD stability | Critical authority cases passed in at least three consecutive focused/full/coverage-inclusive runs |
| Coverage command | Exit 0; lines 91.52%, functions 97.60%, branches 69.60% repository-wide |
| Locked CLI SHA-256 | `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23` |
| `git diff --check` | Exit 0 |
| Bounded filename-only secret scan | No filename hits |
| ASVS L2 / claim-boundary re-review | BLOCKER=0, HIGH=0, MEDIUM=0, LOW=0 |
| `npm run test:e2e` | Checkpoint: sandbox denied `127.0.0.1:4173` bind before assertions |

## Threat Boundary

- Authority is derived only from the persisted run plus the securely loaded current approved extractions, evidence review, evidence ledger, and theory catalog.
- Public authority-validation failures are constant and do not reflect attacker-controlled semantic values, raw validator details, or parser content.
- The artifact remains a `deterministic-fixture` with `realModelUsed: false`; no live-model, real-player sample, or real-world probability claim was introduced.
- Guarantees remain scoped to the local single-user Mac workflow and cooperative writers that obey the parent-directory `flock` contract.
- A non-cooperating same-UID process with arbitrary project-tree write authority remains residual risk. Reviewer names remain local declarations rather than authenticated identities.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Security Bug] Public resume leaked detailed authority errors**
- **Found during:** Task 3 ASVS L2 review
- **Issue:** `resume` delegated directly to domain validation, allowing attacker-controlled mapping semantics into CLI stderr.
- **Fix:** Added a RED secret-marker/immutability regression and applied the constant authority precheck before provider selection.
- **Files modified:** `tests/theory-agent-cli-authority.test.js`, `scripts/run-theory-agent.js`
- **Verification:** Focused 60/60; security re-review HIGH=0.
- **Committed in:** `53e9fac`, `832bc08`

**2. [Rule 1 - Security Bug] Historical review targets were not typed within proposal events**
- **Found during:** Task 3 ASVS L2 review
- **Issue:** A historical review could target the proposal audit digest because validation accepted any proposal artifact digest.
- **Fix:** Added a RED audit-retarget regression and required the target to equal the proposal event's mapping-digest position.
- **Files modified:** `tests/theory-agent-security.test.js`, `src/theory-agent.js`
- **Verification:** Focused 60/60; security re-review MEDIUM=0.
- **Committed in:** `53e9fac`, `832bc08`

**Total deviations:** 2 auto-fixed Rule 1 security bugs. **Impact:** Both tightened the declared artifact-safe authority boundary without changing the public CLI contract or schema.

### Environment Checkpoint

- Sandboxed Playwright could not start its local web server because socket bind returned `PermissionError: [Errno 1] Operation not permitted` before browser assertions.
- This is not recorded as a pass or waiver. The parent orchestrator must run `npm run test:e2e` on the host Mac.

## Issues Encountered

- Repository-wide coverage passed execution but branch coverage is 69.60%, below the generic 80% target. Raising unrelated module branch coverage is outside this plan's declared file ownership; the changed authority paths have direct adversarial coverage.
- Fresh independent overall code review is intentionally left to the parent orchestrator after host E2E; this executor's ASVS/claim review is not substituted for that gate.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Executor-owned implementation, focused tests, build, complete Node suite, hygiene, locked digest, and ASVS/claim closure are green.
- Host Mac E2E and a fresh independent overall review with BLOCKER=0/HIGH=0/MEDIUM=0 remain required before Phase 1 is eligible for verified/complete status.
- No push, PR, live model request, wallet action, deployment, or Injective transaction occurred.

## Self-Check: PASSED

- All plan-owned production, test, handoff, and summary artifacts exist and are committed atomically by task.
- Both original RED and security-review RED failures were observed before their GREEN fixes.
- Final focused 60/60, build, and full Node 153/153 gates pass; locked digest and hygiene checks pass.
- ASVS/claim re-review reports zero BLOCKER, HIGH, MEDIUM, and LOW findings.
- The sandbox E2E denial and pending independent overall review are explicitly unwaived and handed to the orchestrator.
- `.planning/config.json` and `.codex/` remain unstaged and untouched; Phase 1 is not marked complete.

---
*Phase: ZZZ-01-trustworthy-theory-pipeline*
*Completed: 2026-07-24*
