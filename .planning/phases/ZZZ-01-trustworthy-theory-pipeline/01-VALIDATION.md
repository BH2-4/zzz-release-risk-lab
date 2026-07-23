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
| **Full suite command** | `npm run build && npm test && npm run test:e2e` |
| **Estimated runtime** | To be measured during Phase 1 execution |

---

## Sampling Rate

- **After every task commit:** Run the directly affected Theory mapper, agent, security, or CLI test file.
- **After every plan wave:** Run the four-file quick command plus `git diff --check`.
- **Before `$gsd-verify-work`:** `npm run build`, `npm test`, and `npm run test:e2e` must all be green.
- **Max feedback latency:** 60 seconds for focused tests; the full browser gate may exceed this.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | TRUST-02 | T-01-PROV | Contradictory provenance fails closed | unit | `node --test tests/theory-mapper.test.js tests/theory-agent-security.test.js` | yes | pending |
| 01-01-02 | 01 | 1 | TRUST-02 | T-01-PROV | Valid mode-specific provenance survives finalization | unit/integration | `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js` | yes | pending |
| 01-02-01 | 02 | 2 | TRUST-01 | T-01-PATH | Escapes, aliases, symlinks, and predictable temp attacks are rejected | CLI integration | `node --test tests/theory-agent-cli.test.js` | yes | pending |
| 01-02-02 | 02 | 2 | TRUST-01 | Safe project-local atomic writes preserve reviewed inputs | CLI integration | `node --test tests/theory-agent-cli.test.js` | yes | pending |
| 01-03-01 | 03 | 3 | TRUST-03 | Full CLI lifecycle produces current reviewed lineage and content ID | integration | `node --test tests/theory-agent.test.js tests/theory-agent-security.test.js tests/compile-scenario-cli.test.js` | yes | pending |
| 01-04-01 | 04 | 4 | TRUST-04 | Build, full Node suite, and desktop/mobile E2E all pass | build/unit/E2E | `npm run build && npm test && npm run test:e2e` | yes | pending |

*Status: pending -> green/red/flaky during execution.*

---

## Wave 0 Requirements

- [ ] Add negative provenance cases to `tests/theory-mapper.test.js`.
- [ ] Add persisted/finalized provenance tampering coverage to `tests/theory-agent-security.test.js` or `tests/theory-agent.test.js`.
- Existing test infrastructure covers every phase requirement; no package installation is planned.

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
- [ ] `nyquist_compliant: true` is set in frontmatter after execution evidence is recorded.

**Approval:** pending
