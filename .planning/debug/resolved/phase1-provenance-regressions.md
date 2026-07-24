---
status: resolved
trigger: "Phase 1 Wave 1 post-merge npm test found 12 new provenance compatibility regressions in addition to the five known Plan 01-02 CLI filesystem failures."
created: 2026-07-24T08:10:00+08:00
updated: 2026-07-24T08:35:46+08:00
phase: 1
plan: 01-01
---

# Debug Session: Phase 1 Provenance Regressions

## Symptoms

### Expected Behavior

After Plan 01-01, the complete Node suite should preserve all existing compilation and CLI behavior while adding the closed three-mode provenance contract. Only the five pre-existing Theory Agent CLI filesystem failures owned by Plan 01-02 may remain red at this intermediate wave.

### Actual Behavior

`npm run build` passes, but `npm test` reports 128 tests, 111 passing, and 17 failing. Five failures are the known Plan 01-02 Theory Agent CLI filesystem cases. Twelve additional failures appear in `tests/compilation-pipeline.test.js` and `tests/compile-scenario-cli.test.js` because legacy test providers/artifacts use `manual-test-fixture` or incomplete deterministic fixture provenance.

### Error Messages

- `Unsupported theory provenance mode: manual-test-fixture`
- `Theory provenance contains unknown field for deterministic-fixture: provider/model/requestId`
- `Deterministic fixture provenance requires a repository-relative fixturePath`
- `Deterministic fixture provenance requires a canonical fixtureDigest`

### Timeline

The complete Node suite was first run after commits `8764e9e`, `aebaf0f`, and review fix `afbb976`. Focused Plan 01-01 tests passed; the post-wave full-suite gate exposed the compatibility gap.

### Reproduction

From the repository root with lockfile dependencies restored, run `npm test`.

## Current Focus

hypothesis: Resolved. Two test-only fixture constructors remained on the pre-8764e9e provenance shape; migrating them to the existing deterministic-fixture contract removes all twelve regressions without weakening production validation.
test: Complete automated verification and archive the resolved session.
expecting: The resolved artifact records the accepted guardrail, required repository gates, scoped commits, and recurrence guard.
next_action: none; session resolved and archived.
bug_class: bohrbug
reasoning_checkpoint:
  hypothesis: The twelve failures occur because two test-only constructors emit obsolete provenance shapes that the Plan 01-01 validator correctly rejects before the tests reach their intended assertions.
  confirming_evidence:
    - The exact focused run fails deterministically 12 of 15 tests, and every stack reaches one of the two stale provenance objects.
    - validateTheoryProvenance accepts the proposed deterministic path/digest records, while passing contract/security tests assert the same shape and Plan 01-01 explicitly requires it.
  falsification_test: If migrating only those two provenance objects does not make all 15 focused tests pass, or requires a production validator change, the hypothesis is false or incomplete.
  fix_rationale: Updating fixture identity metadata addresses the schema drift at its source and preserves all production mode and field rejection behavior.
  blind_spots: Full-suite and E2E interactions have not yet been rerun; these are covered by the required post-fix gates.
  candidate_causes:
    - data: stale test fixture/provider metadata uses a removed mode or incomplete mode-specific fields.
    - code: a production validator regression could reject otherwise valid deterministic provenance.
    - environment: runtime or dependency drift could alter validation or digest behavior.
  and_gate: No. The stale fixture metadata alone reproduces all twelve failures; valid candidate metadata passes the same production validator in the current environment.
tdd_checkpoint: not-active

## Evidence

Evidence is ordered from final verification back to initial reproduction. Exact per-event wall-clock times were not retained, so this archive intentionally records no inferred timestamps.

- observation: git diff --check passes, tests/theory-agent-cli.test.js remains unchanged, and commit 8f03485 contains only the two intended test fixture migrations.
  implication: The final code diff is clean, atomic, Plan 01-01-scoped, and preserves unrelated worktree changes.
- observation: npm run test:e2e initially could not bind the local server inside the sandbox, then passes under approved local-server permissions with 10 passed, 4 skipped, and 0 failed.
  implication: The required E2E gate passes; the first attempt was an environment permission constraint rather than an application failure.
- observation: Full npm test reports 128 tests, 123 passing, and exactly 5 failing; every compilation-pipeline and compile-scenario-cli case passes, and the only failures are the five known locked tests/theory-agent-cli.test.js Plan 01-02 filesystem cases.
  implication: The full-suite acceptance threshold is met and no new regression remains in Plan 01-01 scope.
- observation: npm run build exits 0 and builds RiskCommitment at 556 bytes.
  implication: The required build gate passes after the fixture-only migration.
- observation: Reapplying the same fixture migration returns the focused command to 15 tests, 15 passing, and 0 failing.
  implication: Guardrail revert-and-reconfirm passes with bug_returned_on_revert and fixed_on_reapply both true.
- observation: Temporarily reversing only the fixture migration restores exactly 12 failures and 3 passes, with the original unsupported-mode, unknown-field, missing-path, and missing-digest errors.
  implication: Guardrail revert-and-reconfirm has proven the migrated fixture metadata is causally necessary; reapplication remains to confirm sufficiency.
- observation: Adjacent provenance, Theory Agent, and security suites report 22 tests, 22 passing, and 0 failing, including unknown-mode, malformed capability, and tamper rejection cases.
  implication: Guardrail adjacent-tests signal passes and the fixture migration does not weaken the closed production contract.
- observation: The fix diff is 10 additions and 2 replacements confined to fixture metadata/imports; it deletes no assertion or production behavior, and tests/theory-agent-cli.test.js has an empty diff.
  implication: Guardrail no-op/deletion signal passes and the locked attack/CLI test remains unchanged.
- observation: The exact post-fix reproduction reports 15 tests, 15 passing, and 0 failing.
  implication: Guardrail target-test signal passes and all twelve original regressions are removed by the fixture-only migration.
- observation: After replacing both stale provenance records, all four compilation-pipeline tests pass; the ten CLI tests now fail only because tests/compile-scenario-cli.test.js did not previously import digestValue.
  implication: The provenance migration fixes the original schema failures; one test-helper import is required to compute the canonical checked fixture digest.
- observation: Phase 1.25 SBFL was skipped because Node's configured coverage command provides aggregate process coverage, not the required per-test execution spectrum.
  implication: Direct stack traces and the two shared fixture constructors provide unambiguous localization without inventing an Ochiai ranking.
- observation: Plan 01-01 and passing theory-mapper/security tests require deterministic-fixture provenance to carry fixturePath plus digestValue(fixture), and explicitly retain fail-closed unknown-mode/unknown-field behavior.
  implication: Fixture migration is the specified compatibility fix; relaxing src/theory-mapper.js would violate the production contract.
- observation: Git history shows the affected tests last changed in 56a203b, while 8764e9e later tightened the provider contract without migrating them; both proposed provenance records validate successfully in isolation.
  implication: Differential evidence confirms stale test data rather than a validator or environment defect.
- observation: No debug knowledge-base entry exists for a prior matching resolution.
  implication: The diagnosis rests on current direct evidence rather than an assumed known pattern.
- observation: The focused command `node --test tests/compilation-pipeline.test.js tests/compile-scenario-cli.test.js` deterministically reports 15 tests, 3 passing, and exactly 12 failing.
  implication: The symptom is a reproducible Bohrbug suitable for direct fixture migration and before/after comparison.
- observation: Both compilation-pipeline failures stop at theorySystemFixture provenance mode manual-test-fixture; all ten CLI failures stop while mappingProvider deterministic provenance supplies provider/model/requestId but lacks fixturePath/fixtureDigest.
  implication: All failures converge on two test-only constructors before their intended assertions, with no observed production validator defect.
- observation: No project-defined skills or configured gsd-debugger agent skills were found; the worktree already contains unrelated .planning/config.json and .codex changes.
  implication: Follow the repository debugger protocol directly and constrain edits to stale test fixtures plus this debug artifact, preserving unrelated worktree state.
- observation: The exact `gsd-debugger` agent type is unavailable in this runtime; the session manager dispatched the required fresh generic/default-agent workaround, with `.codex/agents/gsd-debugger.toml` as mandatory first reading.
  implication: Role separation is preserved through the documented generic-agent workaround; investigation and edits remain delegated to a fresh debugger context.
- observation: `npm run build` exits 0 and builds RiskCommitment at 556 bytes.
  implication: The regression is runtime/test-contract compatibility, not compilation failure.
- observation: `npm test` exits non-zero with 17 failures; 12 are outside the five locked Plan 01-02 filesystem cases.
  implication: Wave 1 cannot close until the twelve new regressions are fixed.

## Eliminated

- hypothesis: The closed production validator is rejecting valid deterministic provenance.
  reason: The proposed exact path/digest records and the checked security fixture pass the same validator, while the plan requires rejection of the observed obsolete shapes.
- hypothesis: Node, dependency, or filesystem environment drift causes the failures.
  reason: Failures reproduce deterministically at schema validation, and both replacement records validate in the current runtime before any filesystem-dependent CLI behavior.
- hypothesis: The five Theory Agent CLI filesystem failures were introduced by Plan 01-01.
  reason: They match the pre-existing Plan 01-02 acceptance set and were already red before Wave 1.

## Resolution

root_cause: Two legacy test fixture constructors were not migrated when 8764e9e replaced ad hoc provenance with the closed three-mode, mode-specific contract.
fix: Migrated both test-only providers to deterministic-fixture provenance with repository-relative fixturePath and canonical digestValue-derived fixtureDigest; imported digestValue in the CLI test.
verification:
  target_test: { result: pass }
  mutation_check: { result: skipped, reason_if_skipped: "No Stryker dependency or configuration; changed sites are test fixture data rather than production behavior." }
  no_op_deletion: { result: pass, deletion_justified_by_rca: false }
  adjacent_tests: { result: pass, suites_run: ["tests/theory-mapper.test.js", "tests/theory-agent.test.js", "tests/theory-agent-security.test.js"] }
  revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true }
  guardrail_verdict: accepted
  focused_reproduction: "15 passed, 0 failed"
  focused_provenance_agent_security: "22 passed, 0 failed"
  build: "pass; RiskCommitment 556 bytes"
  full_node_suite: "acceptance pass; 123 passed and only the five known Plan 01-02 tests/theory-agent-cli.test.js failures remain"
  e2e: "pass after approved local-server permission; 10 passed, 4 skipped, 0 failed"
  diff_check: pass
oracle_type: specified
files_changed:
  - tests/compilation-pipeline.test.js
  - tests/compile-scenario-cli.test.js
commit: 8f03485

## Prevention

### Blameless Branching 5-Whys

- data branch: The compilation fixtures carried legacy provenance values because they predated the closed mode-specific schema. The Plan 01-01 focused suites covered the new validator and authoritative provider path, but these downstream fixture consumers were outside that focused set, so their schema drift remained latent until the full Node suite ran.
- process branch: The production contract change was correctly fail-closed, but the compatibility scan searched production/provider paths rather than every test fixture constructor. The phase's full-suite gate ran after the implementation commits, which detected the drift but not before the initial completion record.
- environment branch: Runtime and filesystem differences were investigated and eliminated; the same obsolete values failed deterministically, and valid deterministic records passed in the same environment.
- AND-gate conclusion: No multi-cause runtime condition was required. Stale test fixture metadata alone caused all twelve regressions; the process gap explains why it was not caught earlier rather than contributing to the runtime failure.

### Why Not Caught

The Plan 01-01 focused test command did not include `tests/compilation-pipeline.test.js` or `tests/compile-scenario-cli.test.js`; only the post-wave full `npm test` gate exercised these downstream fixture consumers.

### Recurrence Guard

The existing tests `tests/compilation-pipeline.test.js` and `tests/compile-scenario-cli.test.js` now carry contract-valid deterministic provenance and pass in the full suite, while `tests/theory-mapper.test.js` continues to reject unknown modes, unknown fields, missing fixture identity, and malformed capabilities. Future provenance schema changes must run the full Node suite before Plan completion.

## Specialist Review

The fixture-only migration preserved the closed three-mode production contract; focused provenance, Theory Agent, and security suites pass without changing production or locked attack-test files.
