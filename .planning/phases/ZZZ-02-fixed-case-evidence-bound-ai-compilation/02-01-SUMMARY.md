---
phase: ZZZ-02-fixed-case-evidence-bound-ai-compilation
plan: "01"
subsystem: fixed-ai-compilation
tags: [minimax, evidence-binding, provenance, flock, tdd]

requires:
  - phase: ZZZ-01-05
    provides: Canonical reviewed Theory System and hardened persisted-run authority
provides:
  - One-call MiniMax M2.7 transport with bounded response parsing and sanitized provenance
  - Exact fixed-case evidence, language, semantic, numeric, Theory System, and provenance validation
  - Journaled fd-3 parent-flock publication with contention, conflict, recovery, and symlink regressions
  - Credential-free pre-live Mac gate and independent-review evidence
affects: [phase-2-live-compilation, ai-01, ai-02, ai-03, ai-04]

tech-stack:
  added: []
  patterns: [fixed-semantic-contract, exact-mode-provenance, bounded-stream-parse, cooperative-fd3-publication]

key-files:
  created:
    - tests/compile-scenario-cli-races.test.js
    - experiments/output/ai/.gitkeep
    - .planning/phases/ZZZ-02-fixed-case-evidence-bound-ai-compilation/02-VALIDATION.md
    - .planning/phases/ZZZ-02-fixed-case-evidence-bound-ai-compilation/02-01-SUMMARY.md
  modified:
    - src/ai-provider.js
    - src/scenario-compiler.js
    - src/compilation-pipeline.js
    - scripts/compile-scenario.js
    - tests/ai-provider.test.js
    - tests/scenario-compiler.test.js
    - tests/compilation-pipeline.test.js
    - tests/compile-scenario-cli.test.js
    - .planning/phases/ZZZ-02-fixed-case-evidence-bound-ai-compilation/02-02-PLAN.md

key-decisions:
  - "Use one non-streaming MiniMax-M2.7 request with reasoning_split=true, max_tokens=8192, a 120-second timeout, and a 1 MiB response-byte cap."
  - "Reject evidence-derived numeric bindings for this fixed case because the canonical sources contain no structured numeric observations; every supported numeric path uses an exact synthetic assumption."
  - "Allow no free model-authored factual text in the persisted fixed artifact: semantic fields, limitations, languages, provenance, and capabilities are exact contracts."
  - "Publish only through secure-run-output.py with the bound parent descriptor and release each helper-acquired flock before the next operation."

patterns-established:
  - "Fixed artifact authority: current canonical inputs plus exact model-output contracts govern both pre-write and disk-byte validation."
  - "Cooperative publication: every inspect, recover, commit, and finalize operation acquires a non-blocking parent-directory flock through fd 3."

requirements-completed: []

coverage:
  - id: D1
    description: MiniMax M2.7 transport performs one bounded non-streaming call and cannot persist reflected secret, prompt, response, or reasoning material.
    requirement: AI-01
    verification:
      - kind: unit
        ref: "tests/ai-provider.test.js"
        status: pass
    human_judgment: false
  - id: D2
    description: The fixed compiler rejects unsupported claims, theories, numbers, regions, languages, semantic text, and provenance.
    requirement: AI-02
    verification:
      - kind: unit
        ref: "tests/scenario-compiler.test.js and tests/compilation-pipeline.test.js"
        status: pass
    human_judgment: false
  - id: D3
    description: Compiled artifact publication is busy-safe, conflict-safe, recoverable, and no-clobber for cooperating local writers.
    requirement: AI-03
    verification:
      - kind: integration
        ref: "tests/compile-scenario-cli.test.js and tests/compile-scenario-cli-races.test.js"
        status: pass
    human_judgment: false
  - id: D4
    description: Exact zh-CN/en/ja review targets preserve direct-source boundaries without promoting translations or contextual pages.
    requirement: AI-04
    verification:
      - kind: unit
        ref: "tests/compilation-pipeline.test.js#fixed preparation and altered language authority"
        status: pass
    human_judgment: false

duration: 78 min
completed: 2026-07-24
status: complete
---

# Phase ZZZ-02 Plan 01: Credential-Free Fixed Compilation Summary

**A bounded MiniMax compiler and cooperative journaled publisher are fully green offline, leaving only the separately authorized live artifact closure.**

## Performance

- **Duration:** 78 min
- **Started:** 2026-07-24T12:37:00Z
- **Completed:** 2026-07-24T13:54:47Z
- **Tasks:** 3
- **Files modified:** 15 including the live-closure plan contract, summary, and progress metadata

## Accomplishments

- Added a dedicated MiniMax M2.7 adapter with exactly one request, fixed request shape, 120-second timeout, bounded tokens/bytes, sanitized errors, and safe body/trace identifiers.
- Pinned every fixed source digest and the frozen Theory System, then enforced exact evidence-language, theory, numeric-assumption, semantic-text, regional, capability, and mode-specific provenance contracts.
- Replaced direct scenario publication with the existing fd-3 `secure-run-output.py` protocol and proved cooperative busy, conflict, failpoint recovery, parent swap, symlink, non-regular target, and protected-input cases.
- Closed the initial 4 HIGH / 2 MEDIUM review and a later targeted 1 HIGH / 1 MEDIUM reopen, then reran all pre-live Mac gates.

## Task Commits

1. **Task 1: Fixed MiniMax transport and compiler authority** - `e55c550`
2. **Task 2: Journaled scenario publication and race closure** - `4afa0ee`
3. **Independent-review remediation** - `43261ad`
4. **Task 3: Pre-live validation evidence** - `56da427`
5. **Plan summary and progress metadata** - this metadata commit
6. **Targeted hidden-reasoning and live-signoff remediation** - this remediation commit

## Gate Results

| Gate | Result |
|------|--------|
| Task 1 focused suites | 25 passed, 0 failed after targeted remediation |
| Task 2 CLI/race suites | 23 passed, 0 failed |
| Five focused Phase 2 suites | 48 passed, 0 failed, 0 skipped |
| `npm run build` | Exit 0; `RiskCommitment` 556 bytes |
| `npm test` | 176 passed, 0 failed, 0 skipped |
| `npm run test:e2e` | Host Mac exit 0; 10 passed, 4 pre-existing complementary project/viewport exclusions, 9.9s |
| `git diff --check` | Exit 0 |
| Independent remediation re-review | BLOCKER=0, HIGH=0, MEDIUM=0, LOW=0; core 24/24 |
| Live artifact check | `compiled-scenario-v1.json` absent; output parent contains only `.gitkeep` |

## TDD Evidence

- Task 1 RED established that the dedicated M2.7 adapter and fixed authority fields were absent before implementation; the exact initial count was not persisted. GREEN finished at the then-current 23/23.
- Task 2 RED established that the bespoke publisher lacked real cooperative flock/conflict/failpoint coverage; the exact initial count was not persisted. GREEN finished at 23/23.
- Independent-review remediation has exact retained evidence: RED 18 passed / 6 failed, then GREEN 24/24 core and 47/47 combined focused suites.
- Targeted review reopen has exact retained evidence: RED 23 passed / 2 failed, then GREEN 25/25 core and 48/48 combined focused suites.

## Decisions Made

- The fixed prompt now carries an exact semantic contract. Numeric magnitudes remain explicit synthetic stress-test inputs, never evidence-derived effects.
- Live and recorded provenance use distinct exact field sets bound to the canonical evidence pack and Theory System. Cross-mode fields fail closed.
- Response IDs are accepted only as bounded identifier tokens and are rejected when reflected from credentials, prompts, `reasoning_content`, nested `reasoning_details`, or a stripped leading think wrapper.
- `02-02` disk verification uses the actual artifact-first validator signature and requires explicit live MiniMax provenance in addition to structural validity; recorded mode cannot close AI-01.
- The helper-acquired flock is explicitly released after every operation because inherited fd 3 shares the parent's open-file description; this preserves real per-operation contention semantics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Security] Independent review found six hard-gate gaps**

- **Found during:** Task 3 independent review
- **Issue:** Evidence-derived numeric rebinding, incomplete provenance, free semantic text, reflected identifiers, extra languages, and unbounded response bytes could pass or exhaust the fixed boundary.
- **Fix:** Added exact synthetic bindings, semantic/provenance/language contracts, identifier reflection checks, `max_tokens`, and a streamed 1 MiB limit with adversarial tests.
- **Verification:** RED 18/24; GREEN core 24/24, focused 47/47, full 175/175; fresh review has no finding.
- **Committed in:** `43261ad`

**2. [Rule 3 - Blocking] Shared inherited flock required per-operation release**

- **Found during:** Task 2 real helper contention testing
- **Issue:** The helper's lock on inherited fd 3 shares the parent's open-file description and otherwise survives helper exit, preventing later operations from exercising true contention.
- **Fix:** Release the helper-acquired flock after each helper operation while retaining mandatory helper-side `LOCK_EX|LOCK_NB` acquisition.
- **Verification:** CLI/race suites 23/23, including held-lock busy and between-operation identity conflict.
- **Committed in:** `4afa0ee`

**3. [Rule 1 - Security/Correctness] Targeted review found hidden-reasoning ID channels and a stale live verifier**

- **Found during:** Post-completion targeted review
- **Issue:** Body/trace IDs were not compared with nested `reasoning_details` or leading think content, and `02-02` passed the validator an object wrapper with no independent live-mode assertion.
- **Fix:** Added local hidden-reasoning collection, four body/trace reflection regressions, corrected both disk commands, and added offline live-versus-recorded signoff coverage.
- **Verification:** RED 23/25; GREEN core 25/25, focused 48/48, full 176/176, host E2E 10 passed; targeted review is BLOCKER/HIGH/MEDIUM=0 and its LOW test-strength note is closed.
- **Committed in:** this remediation commit

**Total deviations:** 3 auto-fixed items. **Impact:** All tighten the declared fixed-case, provenance, and cooperating-writer boundaries without adding generalized cases, credentials, live requests, or chain scope.

## Issues Encountered

- Sandboxed Playwright could not bind `127.0.0.1:4173`; the host Mac retry passed. The sandbox failure was never treated as a product pass.
- Playwright reports four pre-existing complementary project/viewport exclusions. All 10 runnable configured cases passed; the exclusions are recorded rather than hidden.

## User Setup Required

Plan `02-01` requires none. Plan `02-02` separately requires inherited `PROGRAM_E_AI_*` names and explicit authorization for exactly one live request; credentials must not be entered in chat or repository files.

## Next Phase Readiness

- The credential-free production path, focused tests, full Node suite, build, host E2E, hygiene checks, and independent review are green.
- `02-02` remains the only Phase 2 plan: user authorization, one live request, disk revalidation, bounded documentation, post-live gates, ASVS L2, and final independent review.
- AI-01 through AI-04 and Phase 2 remain pending. No live artifact, credential access, network model call, push, PR, wallet action, deployment, signature, or transaction occurred.

## Self-Check: PASSED

- All plan-owned production, test, output-parent, validation, summary, state, and roadmap artifacts exist and are assigned to explicit commits.
- Final focused 48/48, build, full Node 176/176, host E2E, and whitespace gates pass after targeted remediation.
- Independent re-review reports zero BLOCKER, HIGH, MEDIUM, and LOW findings.
- `experiments/output/ai/compiled-scenario-v1.json` and transaction debris are absent; `.planning/config.json` and `.codex/` remain unstaged.
- Phase 2 and AI requirements are not marked complete while `02-02` remains pending.

---
*Phase: ZZZ-02-fixed-case-evidence-bound-ai-compilation*
*Completed: 2026-07-24*
