---
phase: 1
slug: trustworthy-theory-pipeline
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-24
verified: 2026-07-24
target_platform: current-macos-demo-machine
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js `node:test`; Playwright |
| **Config file** | `package.json`; `playwright.config.js` |
| **Quick run command** | `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js` |
| **Environment + full suite command** | `npm ci && npm run build && npm test && npm run test:e2e` |
| **Observed runtime** | Final full Node suite 3.5s; final host E2E 9.5s, excluding dependency restoration and sandbox checkpoint wait |

---

## Sampling Rate

- **After every task commit:** Run the directly affected Theory mapper, agent, security, or CLI test file.
- **After every plan wave:** Run the four-file quick command plus `git diff --check`.
- **Before `$gsd-verify-work`:** `npm ci` must restore the exact lockfile environment without changing `package.json` or `package-lock.json`, then `npm run build`, `npm test`, and `npm run test:e2e` must all be green.
- **Max feedback latency:** 60 seconds for focused tests; the full browser gate may exceed this.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status | Actual Evidence |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|-----------------|
| 01-01-01 | 01 | 1 | TRUST-02 | T-01-PROV-S/T | Fixture provenance reaches the approved Theory System with false model capability | CLI tracer | `node --test --test-name-pattern="formal data completes" tests/theory-agent-cli.test.js` | yes | green | Included in the fresh 39/39 focused pass; persisted fixture provenance and `realModelUsed: false` passed. |
| 01-01-02 | 01 | 1 | TRUST-02 | T-01-PROV-S/T | All three modes validate distinctly and persisted semantic tampering fails closed | unit/integration | `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js` | yes | green | Fresh focused suite passed 39/39, including closed three-mode provenance and persisted/finalized tampering cases. |
| 01-02-01 | 02 | 2 | TRUST-01 | T-01-PATH-T/S | Escaped, aliased, symlinked, and protected paths fail before provider access | CLI integration | `node --test --test-name-pattern="rejects input symlinks\|rejects symlinked output parents\|refuses to overwrite" tests/theory-agent-cli.test.js` | yes | green | All six locked CLI regressions passed in the fresh focused suite; the complete 146/146 suite also passed race/recovery coverage. |
| 01-02-02 | 02 | 2 | TRUST-01 | T-01-PATH-E/I | Exclusive atomic writes and redacted JSON errors satisfy the locked suite | CLI integration | `node --test tests/theory-agent-cli.test.js && node -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync('tests/theory-agent-cli.test.js')).digest('hex')==='53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23'?0:1)"` | yes | green | CLI cases passed and the observed SHA-256 was exactly `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23`. |
| 01-03-01 | 03 | 3 | TRUST-03 | T-01-REGEN-S/T/R | Public CLI lifecycle regenerates current READY lineage and content identity | integration | `node --test tests/theory-agent.test.js tests/theory-agent-security.test.js tests/compile-scenario-cli.test.js && npm run theory:agent -- status` | yes | green | Fresh 39/39 suite passed; status returned run `zzz-fade-20260724045215`, revision 3, `READY_FOR_COMPILATION`. |
| 01-03-02 | 03 | 3 | TRUST-03 | T-01-REGEN-S/T | Exact dependent references name current authority without unsupported claims | integration/diff | `node --test tests/theory-agent.test.js tests/theory-agent-security.test.js tests/compile-scenario-cli.test.js && git diff --check` | yes | green | Current ID reconstructed as `theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912`; diff check passed. |
| 01-04-01 | 04 | 4 | TRUST-01, TRUST-02, TRUST-03 | T-01-CLOSE-T/S | Focused trust contracts, locked test hash, and regenerated READY status remain green | integration | `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js tests/compile-scenario-cli.test.js && node -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync('tests/theory-agent-cli.test.js')).digest('hex')==='53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23'?0:1)" && npm run theory:agent -- status` | yes | green | 39/39 passed in 1.7s; locked digest and authoritative read-only status both exited 0. |
| 01-04-02 | 04 | 4 | TRUST-04 | T-01-CLOSE-T/D | Exact-lockfile restoration, build, full Node, and desktop/mobile E2E all pass | environment/build/unit/E2E | `npm ci && npm run build && npm test && npm run test:e2e` | yes | green | `npm ci` exited 0 with manifests unchanged; build exited 0; Node passed 146/146; host E2E passed 10 with 4 explicit project-matrix skips in 10.1s. |
| 01-04-03 | 04 | 4 | TRUST-04 | T-01-CLOSE-I/R/S | Diff, secret, claim-boundary, and ASVS L2 closure has no blocker | static/security review | `git diff --check && if git grep -lE '(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|sk-[A-Za-z0-9]{20,}|0x[0-9a-fA-F]{64})' -- app.js scripts src data experiments contracts tests ':(exclude)src/contract-artifact.js'; then exit 1; fi` | yes | green | Diff and filename-only secret scan exited 0 with no hits; claim and ASVS L2 review found no unresolved HIGH-or-above issue. |
| 01-05-01 | 05 | 5 | TRUST-01, TRUST-03 | T-01-05-T/S | Public status, review, resume, READY reconstruction, and historical review binding reject recomputed semantic tampering | adversarial unit/integration | `node --test tests/theory-agent-cli-authority.test.js tests/theory-agent-security.test.js tests/theory-agent.test.js tests/compile-scenario-cli.test.js tests/theory-agent-cli.test.js tests/theory-agent-cli-races.test.js` | yes | green | Two RED cycles first reproduced 5 authority failures and 2 ASVS failures; final focused suite passed 60/60 with the locked CLI digest unchanged. |
| 01-05-02 | 05 | 5 | TRUST-04 | T-01-05-D | Final Mac build, complete Node suite, and desktop/mobile E2E pass after authority fixes | build/unit/E2E | `npm run build && npm test && npm run test:e2e` | yes | green | Orchestrator rerun: build produced RiskCommitment 556 bytes; Node passed 153/153; Mac host E2E passed 10 with 4 explicit project-matrix skips in 9.5s. |
| 01-05-03 | 05 | 5 | TRUST-04 | T-01-05-I/R/S | Claim boundary, ASVS L2, current docs, and independent deep review close with no open finding | static/security review | `git diff --check` plus bounded filename-only secret scan and independent review | yes | green | Final review at source HEAD `007543d5875b18c41e9c176fb40c285c500ae61e` reports BLOCKER=0, HIGH=0, MEDIUM=0, LOW=0, INFO=0; seven historical findings remain preserved as resolved. |

*Status: pending -> green/red/flaky during execution.*

---

## Wave 0 Requirements

- [x] Add negative provenance cases to `tests/theory-mapper.test.js`.
- [x] Add persisted/finalized provenance tampering coverage to `tests/theory-agent-security.test.js` or `tests/theory-agent.test.js`.
- Existing test infrastructure covers every phase requirement. `npm ci` is required only to restore the exact checked lockfile environment; dependency additions and changes to `package.json` or `package-lock.json` are forbidden.

---

## Manual-Only Verifications

All Phase 1 behaviors have automated verification. Human claim review confirmed that regenerated artifact labels keep synthetic groups distinct from player samples and scenario indices distinct from probabilities.

## Closure Evidence

| Gate | Actual Result |
|------|---------------|
| `npm ci` | Exit 0; 14 packages restored; `package.json` and `package-lock.json` SHA-256 values and git diff remained unchanged. |
| Focused Theory + compile | Exit 0; 60 tests passed, 0 failed, 0 skipped. |
| Locked CLI digest | Exit 0; exact baseline SHA-256 `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23`. |
| `npm run theory:agent -- status` | Exit 0; revision 3 `READY_FOR_COMPILATION`, deterministic fixture, `realModelUsed: false`. |
| `npm run build` | Exit 0; `RiskCommitment` built at 556 bytes. No deployment or transaction occurred. |
| `npm test` | Exit 0; 153 passed, 0 failed, 0 skipped. |
| `npm run test:e2e` | Exit 0 on the Mac host; 10 passed and 4 explicit desktop/mobile project-matrix skips in 9.5s. The earlier sandbox-only bind denial is not counted as a pass or waiver. |
| Diff and secret scan | Exit 0; no whitespace defect and no filename hit in the bounded executable/data/generated scan. |
| Claim, ASVS L2, and independent deep review | Green; fixture/non-live, synthetic-group, scenario-index, cooperative-writer, and same-UID residual-risk boundaries remain explicit; current findings BLOCKER=0, HIGH=0, MEDIUM=0, LOW=0, INFO=0. |

The only non-product worktree entries observed before closure were the preserved user-owned `.planning/config.json` modification and untracked local `.codex/` runtime. Neither is part of the closure commit. Feature-branch push and PR creation remain downstream actions after independent review; this record is local macOS target-platform evidence, not cross-platform verification.

---

## Validation Sign-Off

- [x] All tasks have automated verification or explicit Wave 0 dependencies.
- [x] Sampling continuity has no three consecutive tasks without automated verification.
- [x] Wave 0 covers all missing test references.
- [x] No watch-mode flags are used.
- [x] Focused feedback latency is below 60 seconds.
- [x] All nine mapped task rows have actual green evidence and no row is skipped, flaky, waived, or pending.
- [x] `npm ci`, focused gates, `npm run build`, `npm test`, `npm run test:e2e`, and closure reviews all have recorded green evidence.
- [x] Only after the preceding checks are satisfied are `wave_0_complete: true`, `nyquist_compliant: true`, `status: complete`, and `Approval: approved` set; otherwise frontmatter remains false/draft and approval remains pending.

**Approval:** approved
