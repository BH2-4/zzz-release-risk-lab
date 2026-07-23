---
phase: 1
slug: trustworthy-theory-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
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
| **Estimated runtime** | To be measured during Phase 1 execution |

---

## Sampling Rate

- **After every task commit:** Run the directly affected Theory mapper, agent, security, or CLI test file.
- **After every plan wave:** Run the four-file quick command plus `git diff --check`.
- **Before `$gsd-verify-work`:** `npm ci` must restore the exact lockfile environment without changing `package.json` or `package-lock.json`, then `npm run build`, `npm test`, and `npm run test:e2e` must all be green.
- **Max feedback latency:** 60 seconds for focused tests; the full browser gate may exceed this.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | TRUST-02 | T-01-PROV-S/T | Fixture provenance reaches the approved Theory System with false model capability | CLI tracer | `node --test --test-name-pattern="formal data completes" tests/theory-agent-cli.test.js` | yes | pending |
| 01-01-02 | 01 | 1 | TRUST-02 | T-01-PROV-S/T | All three modes validate distinctly and persisted semantic tampering fails closed | unit/integration | `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js` | yes | pending |
| 01-02-01 | 02 | 2 | TRUST-01 | T-01-PATH-T/S | Escaped, aliased, symlinked, and protected paths fail before provider access | CLI integration | `node --test --test-name-pattern="rejects input symlinks\|rejects symlinked output parents\|refuses to overwrite" tests/theory-agent-cli.test.js` | yes | pending |
| 01-02-02 | 02 | 2 | TRUST-01 | T-01-PATH-E/I | Exclusive atomic writes and redacted JSON errors satisfy the locked suite | CLI integration | `node --test tests/theory-agent-cli.test.js && node -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync('tests/theory-agent-cli.test.js')).digest('hex')==='53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23'?0:1)"` | yes | pending |
| 01-03-01 | 03 | 3 | TRUST-03 | T-01-REGEN-S/T/R | Public CLI lifecycle regenerates current READY lineage and content identity | integration | `node --test tests/theory-agent.test.js tests/theory-agent-security.test.js tests/compile-scenario-cli.test.js && npm run theory:agent -- status` | yes | pending |
| 01-03-02 | 03 | 3 | TRUST-03 | T-01-REGEN-S/T | Exact dependent references name current authority without unsupported claims | integration/diff | `node --test tests/theory-agent.test.js tests/theory-agent-security.test.js tests/compile-scenario-cli.test.js && git diff --check` | yes | pending |
| 01-04-01 | 04 | 4 | TRUST-01, TRUST-02, TRUST-03 | T-01-CLOSE-T/S | Focused trust contracts, locked test hash, and regenerated READY status remain green | integration | `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js tests/compile-scenario-cli.test.js && node -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync('tests/theory-agent-cli.test.js')).digest('hex')==='53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23'?0:1)" && npm run theory:agent -- status` | yes | pending |
| 01-04-02 | 04 | 4 | TRUST-04 | T-01-CLOSE-T/D | Exact-lockfile restoration, build, full Node, and desktop/mobile E2E all pass | environment/build/unit/E2E | `npm ci && npm run build && npm test && npm run test:e2e` | yes | pending |
| 01-04-03 | 04 | 4 | TRUST-04 | T-01-CLOSE-I/R/S | Diff, secret, claim-boundary, and ASVS L2 closure has no blocker | static/security review | `git diff --check && if git grep -lE '(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|sk-[A-Za-z0-9]{20,}|0x[0-9a-fA-F]{64})' -- app.js scripts src data experiments contracts tests ':(exclude)src/contract-artifact.js'; then exit 1; fi` | yes | pending |

*Status: pending -> green/red/flaky during execution.*

---

## Wave 0 Requirements

- [ ] Add negative provenance cases to `tests/theory-mapper.test.js`.
- [ ] Add persisted/finalized provenance tampering coverage to `tests/theory-agent-security.test.js` or `tests/theory-agent.test.js`.
- Existing test infrastructure covers every phase requirement. `npm ci` is required only to restore the exact checked lockfile environment; dependency additions and changes to `package.json` or `package-lock.json` are forbidden.

---

## Manual-Only Verifications

All Phase 1 behaviors have automated verification. Human review still confirms that regenerated artifact labels do not make synthetic groups look like player samples or risk indices look like probabilities.

---

## Validation Sign-Off

- [ ] All tasks have automated verification or explicit Wave 0 dependencies.
- [ ] Sampling continuity has no three consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing test references.
- [ ] No watch-mode flags are used.
- [ ] Focused feedback latency is below 60 seconds.
- [ ] All nine mapped task rows have actual green evidence and no row is skipped, flaky, waived, or pending.
- [ ] `npm ci`, focused gates, `npm run build`, `npm test`, `npm run test:e2e`, and closure reviews all have recorded green evidence.
- [ ] Only after the preceding checks are satisfied are `wave_0_complete: true`, `nyquist_compliant: true`, `status: complete`, and `Approval: approved` set; otherwise frontmatter remains false/draft and approval remains pending.

**Approval:** pending
