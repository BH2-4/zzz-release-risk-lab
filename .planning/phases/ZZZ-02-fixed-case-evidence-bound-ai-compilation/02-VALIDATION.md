---
phase: ZZZ-02
slug: fixed-case-evidence-bound-ai-compilation
status: pre-live-complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-24
---

# Phase 2 - Validation Strategy

> Per-phase validation contract for the serial offline implementation plan (`02-01`) and user-authorized live closure plan (`02-02`).

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js 20 `node:test`; Playwright E2E |
| **Config file** | `package.json`; `playwright.config.js` |
| **Quick run command** | `node --test tests/ai-provider.test.js tests/scenario-compiler.test.js tests/compilation-pipeline.test.js tests/compile-scenario-cli.test.js tests/compile-scenario-cli-races.test.js` |
| **Full suite command** | `npm run build && npm test && npm run test:e2e` |
| **Estimated runtime** | Under 4 minutes on the competition Mac |

## Sampling Rate

- After provider changes: run the provider and compiler focused tests.
- After CLI/provenance changes: run all five focused Phase 2 suites, including the cooperative parent-flock race suite.
- Before live request: the complete local three-gate suite must be green.
- After the accepted live artifact: rerun all three gates and the independent hard review.
- Maximum focused feedback latency: 60 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| ZZZ-02-01-01 | 01 | 1 | AI-01..AI-04 | T-02-S, T-02-I | M2.7 transport and fixed validators reject unsupported output without secret/reasoning leakage | unit | `node --test tests/ai-provider.test.js tests/scenario-compiler.test.js tests/compilation-pipeline.test.js` | Existing | Passed: 24/24 |
| ZZZ-02-01-02 | 01 | 1 | AI-01, AI-03 | T-02-T, T-02-R | Cooperative parent-flock publication is busy-safe, conflict-safe, recoverable, and no-clobber | integration/race | `node --test tests/compile-scenario-cli.test.js tests/compile-scenario-cli-races.test.js` | Race suite created by this task | Passed: 23/23 |
| ZZZ-02-01-03 | 01 | 1 | AI-01..AI-04 | T-02-S..T-02-E | Five focused suites and all three pre-live Mac gates are green without credentials/network | full pre-live gate | `node --test tests/ai-provider.test.js tests/scenario-compiler.test.js tests/compilation-pipeline.test.js tests/compile-scenario-cli.test.js tests/compile-scenario-cli-races.test.js && npm run build && npm test && npm run test:e2e` | Existing after Task 02 | Passed pre-live; see observed evidence |
| ZZZ-02-02-01 | 02 | 2 | AI-01 | T-02-I, T-02-R | User-authorized inherited environment exists immediately before the sole live request | manual checkpoint | Boolean variable-name presence only; no `.env.*` read | N/A | Pending |
| ZZZ-02-02-02 | 02 | 2 | AI-01..AI-04 | T-02-S, T-02-T, T-02-I | One live request produces disk bytes that revalidate against current canonical inputs | integration/manual | `npm run compile:scenario` once, then `validateFixedCompilationArtifact` | Existing production path after 02-01 | Pending |
| ZZZ-02-02-03 | 02 | 2 | AI-01..AI-04 | T-02-S..T-02-E | Post-live gates, ASVS L2, and independent review close with no blocking findings | full post-live gate | `npm run build && npm test && npm run test:e2e` | Existing | Pending |

## Wave 0 Requirements

Existing infrastructure covers all Phase 2 requirements. Plan `02-01` adds only the missing race-suite file; no test framework or dependency installation is needed.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One real MiniMax request | AI-01 | Requires user-supplied local BYOK credential and network access | User starts/resumes the executor with inherited `PROGRAM_E_AI_*`, authorizes one call, and the operator runs the trusted CLI once |
| Claim and framing spot review | AI-02, AI-04 | Domain wording requires human interpretation | Compare accepted artifact to ledger, fixed slice, Theory System, and model card |

## Observed Pre-Live Evidence (`02-01`)

Observed on 2026-07-24 on the competition Mac: macOS 26.5.2 (25F84), arm64, Node.js v26.5.0, npm 11.17.0. All provider calls were mocked or injected; no live endpoint, credential, wallet, contract, or chain action was used.

| Command | Exit | Observed result |
|---------|------|-----------------|
| `node --test tests/ai-provider.test.js tests/scenario-compiler.test.js tests/compilation-pipeline.test.js` | 0 | 24 passed, 0 failed |
| `node --test tests/compile-scenario-cli.test.js tests/compile-scenario-cli-races.test.js` | 0 | 23 passed, 0 failed |
| `node --test tests/ai-provider.test.js tests/scenario-compiler.test.js tests/compilation-pipeline.test.js tests/compile-scenario-cli.test.js tests/compile-scenario-cli-races.test.js` | 0 | 47 passed, 0 failed, 0 skipped |
| `npm run build` | 0 | Hardhat build passed; `RiskCommitment` size 556 bytes |
| `npm test` | 0 | 175 passed, 0 failed, 0 skipped |
| `npm run test:e2e` (sandbox attempt) | non-zero before assertions | Local web-server bind to `127.0.0.1:4173` was denied by the sandbox; this was not treated as a product failure or as a pass |
| `npm run test:e2e` (host Mac retry) | 0 | 10 passed, 4 pre-existing complementary project/viewport matrix exclusions, 0 failed, 10.5s |
| `git diff --check` | 0 | No whitespace errors |

The four Playwright exclusions are existing test-declared complementary project/viewport matrix cases, not flaky or newly skipped coverage. They are recorded explicitly because the plan's gate language treats skipped evidence conservatively; every runnable configured case passed on the target Mac.

### Fixed Evidence Boundary

- The exact Lucy Princess Holiday outfit claim is accepted as direct `zh-CN` evidence only. Direct `en` and direct `ja` remain explicitly unavailable; translations and contextual product pages remain non-direct.
- Approved direct English support for other claims remains intact. Unsupported region multipliers remain exactly `1.0`.
- Canonical preparation pins scenario digest `sha256:e8ca8fad4e2a45ec4ac19a0b9b1f4bc7efc52f6178bb1c2bfbe4bb92b0b8f987` and Theory System `theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912` before provider construction.
- Recorded and fixture outputs retain non-live provenance and cannot satisfy AI-01.

### Publication Boundary

- Real fd-3 helper tests exercised non-blocking parent-directory flock acquisition, cooperative contention, expected-target identity conflict, failpoint recovery, parent swaps, symlinks, non-regular targets, and protected-input hardlinks.
- A busy preflight fails before provider construction; conflict and recovery cases preserve writer-owned or pre-existing bytes and leave no transaction debris.
- Guarantees remain scoped to cooperating local writers. A non-cooperating same-UID process with project write access remains an explicit residual risk.

### Independent Review And Remediation

- Initial independent read-only review reported BLOCKER=0, HIGH=4, MEDIUM=2: unbound evidence-derived numeric values, incomplete canonical provenance, unconstrained semantic text, identifier reflection, non-exact languages, and unbounded response bytes.
- TDD remediation RED was observed at 18 passed / 6 failed across the three provider/compiler/pipeline suites. The six failures directly exercised the missing completion bound, identifier rejection, semantic prompt contract, numeric binding rejection, provenance authority, and exact language set.
- Commit `43261ad` rejects evidence-derived fixed-case numbers, requires canonical synthetic path/value assumptions, fixes all persisted semantic fields and limitations, enforces exact mode-specific provenance/capabilities, constrains identifiers, requests at most 8192 completion tokens, and caps streamed response bytes at 1 MiB before JSON parsing.
- Post-fix focused verification passed 47/47; build, full Node, and host E2E were rerun from the corrected implementation.
- Fresh independent read-only re-review ran the three core suites at 24/24 and reports BLOCKER=0, HIGH=0, MEDIUM=0, LOW=0. All six original findings are resolved; no waiver remains.

### Offline Safety Confirmation

- The five Phase 2 suites contain no `.env.*` reader or sourcing path. No `.env.*` file was located, opened, parsed, hashed, copied, staged, or committed during execution.
- No `PROGRAM_E_AI_*` value was inspected or printed. No live request or network-dependent provider test ran.
- `experiments/output/ai/compiled-scenario-v1.json` does not exist. The output parent contains only the checked-in `.gitkeep`; no lock, temporary, journal, or backup debris remains.
- No push, PR, deployment, signature, wallet, Injective, or other transaction action occurred.

## Validation Sign-Off

- [x] All implementation tasks have automated focused verification.
- [x] No three consecutive tasks lack an automated check.
- [x] Existing infrastructure covers all references.
- [x] No watch-mode flags are used.
- [x] Focused feedback latency target is under 60 seconds.
- [x] `nyquist_compliant: true` is set.

**Approval:** `02-01` pre-live implementation evidence accepted 2026-07-24. Live request, persisted artifact, post-live gates, ASVS L2 closure, and final independent review remain pending in `02-02`; AI-01 through AI-04 and Phase 2 are not complete.
