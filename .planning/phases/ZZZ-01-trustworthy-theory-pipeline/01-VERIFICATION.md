---
status: gaps_found
score: 62
phase: ZZZ-01-trustworthy-theory-pipeline
verified_at: 2026-07-24T16:39:39+08:00
severity_counts:
  blocker: 0
  high: 2
  medium: 2
  low: 1
  info: 0
branch: gsd/phase-1-trustworthy-theory-pipeline
head: 6dafd78c80a4d1e1a5ce0d0580b512e5689bb1d1
review_reconciled_with: .planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-REVIEW.md
---

# Phase 1 Verification

## Findings

- `HIGH`: `scripts/run-theory-agent.js:524-531` lets `status` summarize a persisted run without validating current inputs or reconstructing READY authority. Per `.planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-REVIEW.md`, a tampered run can still be presented as `READY_FOR_COMPILATION` with false `realModelUsed` and Theory System ID fields.
- `HIGH`: `scripts/run-theory-agent.js:531-558` and `src/theory-agent.js:314-329,492-495` let `review` persist `APPROVED` for a semantically tampered mapping because `applyTheoryReview` validates without current inputs. The review reproduced an invented theory path that became `APPROVED` before `resume` would later reject it.
- `MEDIUM`: `src/theory-agent.js:567-597` does not rebuild the finalized Theory System from the approved mapping during READY validation. A schema-valid, recomputed System can diverge semantically from the reviewed mapping and still pass `validateTheoryAgentRun(...)`.
- `MEDIUM`: `src/theory-agent.js:452-475` does not bind historical review decisions to their paired review-event states. The review reproduced a prior `REVISION_REQUESTED` event whose stored review history was changed to `approve` and still validated.
- `LOW`: `docs/restart-handoff-2026-07-24.md:30-37` still reports focused `31/31` and full Node `145/145`, while `.planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-VALIDATION.md:74-79` and verifier reruns show `39/39` focused and `146/146` full Node.

## Scope Decision

Phase 1 is not independently verified at branch `gsd/phase-1-trustworthy-theory-pipeline` / `6dafd78c80a4d1e1a5ce0d0580b512e5689bb1d1`.

Before this verifier pass, project-level state still correctly kept Phase 1 uncompleted:

- `.planning/ROADMAP.md:29-34,100-103` marked Phase 1 as `ready for independent verification`.
- `.planning/STATE.md:7-8,30-35` marked the lifecycle as `verifying` with `completed_phases: 0`.

That project-level boundary remains correct. The executor closure record and my earlier verifier pass were too optimistic because they did not falsify persisted-run tampering paths through public `status` and `review`.

## Why The Earlier Verification Missed These Gaps

My earlier independent validation exercised only the clean checked-in authoritative fixture and green regression gates:

- focused suite on the clean run
- locked CLI digest check
- `npm run theory:agent -- status` on the untampered persisted run
- read-only `validateTheoryAgentRun(...)` on the untampered persisted run
- `npm run build`
- `npm test`
- diff and bounded secret scan

That verified the happy-path baseline and the checked artifact's internal consistency. It did not exercise adversarial persisted-run mutations with recomputed structural digests across:

- stale or semantically tampered READY runs presented through `status`
- semantically tampered pending mappings presented through `review`
- semantically detached Theory Systems that remain self-consistent after recomputed IDs
- contradictory historical review/event combinations

The completed code review did exercise those tampered persisted-run paths and reproduced 2 `HIGH` and 2 `MEDIUM` failures. Those findings supersede my earlier pass decision.

## Must-Have Evidence

### Regression Baseline That Still Holds

These green checks remain valid as regression baseline evidence. They show that the clean fixture and current branch still satisfy the recorded happy-path gates, even though persisted-run authority validation is incomplete.

#### TRUST-01 baseline

- Filesystem containment, protected-input collision checks, descriptor-bound reads, journaled writes, and cooperative directory locking are implemented in `scripts/run-theory-agent.js:81-180,191-413`, `scripts/secure-input-read.py:31-68`, and `scripts/secure-run-output.py:383-516`.
- The cooperative lock boundary is explicit in `scripts/secure-run-output.py:478-481` via `fcntl.flock(... LOCK_EX | LOCK_NB)`.
- CLI attack coverage remains green in `tests/theory-agent-cli.test.js:15-153` and recovery/race coverage in `tests/theory-agent-cli-races.test.js:54-509`.
- Verifier reruns preserved:
  - focused trust+compile suite: `39/39` passed
  - locked CLI digest: exact SHA-256 `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23`
  - `git diff --check`: exit `0`
  - bounded secret scan: no hits

#### TRUST-02 baseline

- Closed provenance validation is implemented in `src/theory-mapper.js:16-97`.
- Finalization and post-persistence revalidation are implemented in `src/theory-system.js:136-219` and `src/theory-agent.js:478-597`.
- The clean authoritative run at `experiments/output/theory/zzz-1-4-fade-run.json` still records:
  - `runId = zzz-fade-20260724045215`
  - `revision = 3`
  - `mapping.provenance.mode = deterministic-fixture`
  - `mapping.capabilities.realModelUsed = false`
  - `theorySystem.provenance.mode = deterministic-fixture`
  - `theorySystem.provenance.realModelUsed = false`
  - `theorySystem.provenance.fixturePath = data/theory-agent/zzz-1-4-fade-mapping-fixture.json`
  - `theorySystem.provenance.fixtureDigest = sha256:76e6880eff48c263f8481ad2440ebdc2068dc1b8f0b5878c3bba5ea31905aea2`

#### TRUST-03 baseline

- `npm run theory:agent -- status` on the clean persisted run returned:
  - `runId = zzz-fade-20260724045215`
  - `state = READY_FOR_COMPILATION`
  - `revision = 3`
  - `realModelUsed = false`
  - `theorySystemId = theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912`
- Read-only validation on the clean persisted run with `validateTheoryAgentRun(...)` returned `valid: true` and exact input digest matches for:
  - `approvedExtractions = sha256:f9a216da460893abc01de40844295e51a2f638f89a292056420bb24f87ea1ec1`
  - `evidenceReview = sha256:493e99eaf49090ee48211fed824a91d78af8d922db3f6c3e456656e5da1762d8`
  - `ledger = sha256:f3c80f1881c2e75583a0cd76c20ba5df6f5e603de926361ceb6b1e6ba6690e05`
  - `theoryCatalog = sha256:9296e439d7a610302bc7e0ae19afc7c95697af99d4a85265cb2f73ca9b93f3e6`
- Reconstructed unsigned Theory System ID on the clean run exactly matched `theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912`.

This baseline no longer proves the full TRUST-03 authority claim because `status` and reusable READY validation both fail under tampered persisted-run paths.

#### TRUST-04 baseline

- Verifier reruns preserved:
  - `npm run build`: exit `0`, `Built RiskCommitment (556 bytes)`
  - `npm test`: exit `0`, `146/146` passed
- Authoritative recorded target-machine evidence remains:
  - `.planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-VALIDATION.md:73-81`
  - `.planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-04-SUMMARY.md:24-37,52-66`
  - These record `npm ci` exit `0`, `npm run build` exit `0`, `npm test` `146/146`, and Mac host `npm run test:e2e` as `10 passed` with `4 explicit project-matrix skips`.

## Commands And Artifact Checks Used

### Earlier verifier reruns on the clean authoritative fixture

- `git rev-parse HEAD`
  - matched expected `6dafd78c80a4d1e1a5ce0d0580b512e5689bb1d1`
- `node --test tests/theory-mapper.test.js tests/theory-agent.test.js tests/theory-agent-security.test.js tests/theory-agent-cli.test.js tests/compile-scenario-cli.test.js`
  - exit `0`; `39/39` passed
- `node -e "...sha256(theory-agent-cli.test.js)..."`
  - exact digest match `53ca63c48afb367691caa492cb478823575473e922719e9cafd63c97effe8e23`
- `npm run theory:agent -- status`
  - exit `0` on the clean run; matched expected `runId`, `revision`, `state`, `realModelUsed`, and Theory System ID
- read-only Node validation of `validateTheoryAgentRun(...)` plus digest reconstruction
  - exit `0` on the clean run; run and Theory System validated against current inputs
- `npm run build`
  - exit `0`; built `RiskCommitment (556 bytes)`
- `npm test`
  - exit `0`; `146/146` passed
- `npm run test:e2e`
  - sandbox rerun failed before browser assertions with Python `http.server` bind `PermissionError: [Errno 1] Operation not permitted`
  - treated as execution-environment limitation only; did not contradict recorded Mac host pass
- `git diff --check`
  - exit `0`
- `git grep -lE '(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|sk-[A-Za-z0-9]{20,}|0x[0-9a-fA-F]{64})' -- app.js scripts src data experiments contracts tests ':(exclude)src/contract-artifact.js'`
  - exit `1`; no filename hits

### Independent code review evidence now incorporated

- `.planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-REVIEW.md`
  - reproduced 2 `HIGH` and 2 `MEDIUM` tampered persisted-run failures
  - these findings are accepted here as authoritative independent falsification of the earlier pass decision

## Claim-Boundary Assessment

- The implementation and planning records still keep `deterministic-fixture` explicit and do not relabel the clean checked fixture as live-model output.
- The reviewer label `manual-demo-curator` remains a local declaration, not cryptographic identity.
- Synthetic representatives and scenario indices remain bounded away from player-sample and probability claims in the authoritative closure docs and clean run artifact.
- Filesystem safety claims remain correctly bounded to local cooperative writers using the parent-directory `flock`; no universal hostile same-UID transaction-safety claim should be made.
- However, persisted-run authority claims are currently too strong. The public `status` command and reusable READY validation do not fail closed under all tampered persisted-run paths reproduced by the review.

## Residual Risks

- Non-cooperating same-UID writers remain an explicit residual risk by design; this is documented and not overstated.
- The verifier did not rerun `npm ci`; exact-lockfile restoration is still accepted from recorded closure evidence in `01-VALIDATION.md`.
- The verifier could not reproduce Mac host E2E inside the sandbox because local port binding is denied here; the authoritative host pass remains recorded and internally consistent with the rest of the closure evidence.
- Low-severity restart-handoff count drift remains in `docs/restart-handoff-2026-07-24.md:30-37`.

## Human Verification Needed

Phase 1 requires code fixes and re-review before an independent verification pass can be granted.

After fixes, rerun independent review specifically against:

- tampered persisted-run `status` behavior
- tampered persisted-run `review` behavior
- READY validation with reconstructed Theory System equality
- historical review decision/event binding
