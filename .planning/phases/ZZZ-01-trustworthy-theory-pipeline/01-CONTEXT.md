# Phase 1: Trustworthy Theory Pipeline - Context

**Gathered:** 2026-07-24 (assumptions mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase fixes the six exposed Theory Agent CLI security/provenance regressions, tightens fixture/live provenance through the approved Theory System, regenerates the authoritative offline run, and restores all three repository quality gates. It does not add a real model call, hybrid Agent behavior, new 3D channels, or any Injective transaction.

</domain>

<decisions>
## Implementation Decisions

### Filesystem boundary
- **D-01:** Port the realpath containment, symlink-chain rejection, protected-input comparison, and atomic output approach from `scripts/compile-scenario.js` into `scripts/run-theory-agent.js` instead of introducing a second security design.
- **D-02:** Temporary JSON output must use a random project-local filename, exclusive `wx` creation, mode `0600`, fsync/close, and atomic rename with cleanup on failure.
- **D-03:** Every command that can write a run must reject output aliases of ledger, extraction, Evidence Review, theory catalog, fixture, or existing symlink targets before reading a model/fixture provider.

### Provenance contract
- **D-04:** `deterministic-fixture` provenance must record the repository-relative fixture path and canonical SHA-256 digest and must keep `realModelUsed: false` through mapping, run, and Theory System.
- **D-05:** `live-model` is valid only with a non-empty provider, model, and request ID and `realModelUsed: true`; recorded output remains a distinct mode and may not be relabeled.
- **D-06:** Provenance validation fails closed at the earliest reusable domain boundary, with CLI tests covering the final observable error.

### Compatibility and regeneration
- **D-07:** Preserve the existing `start`, `review`, `resume`, and `status` CLI surface and environment variable names.
- **D-08:** Do not patch the stale run or Theory System ID manually. After implementation passes focused tests, regenerate the complete demo lifecycle through the CLI and update dependent references from the new content-addressed output.
- **D-09:** JSON read errors identify the artifact and safe path context but never echo raw file content, parser snippets, credentials, or secret test markers.

### Completion gate
- **D-10:** Phase 1 completes only when focused security tests, `npm run build`, full `npm test`, and `npm run test:e2e` all pass from a clean worktree.
- **D-11:** No expected-failure waiver is allowed; all six current red tests must become green without weakening the tests.

### the agent's Discretion
The agent may choose helper names, internal function boundaries, and exact safe error wording while preserving the behaviors above and existing public CLI syntax. The user explicitly delegated discuss and implementation choices to the agent for this GSD lifecycle.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and acceptance
- `docs/mvp-v1-spec.md` - frozen MVP boundaries and completion contract.
- `.planning/REQUIREMENTS.md` - TRUST-01 through TRUST-04 acceptance requirements.
- `.planning/ROADMAP.md` - Phase 1 goal and success criteria.

### Existing implementation
- `scripts/run-theory-agent.js` - vulnerable CLI to harden.
- `scripts/compile-scenario.js` - proven project-boundary and atomic-write reference.
- `src/theory-agent.js` - run state, audit, review, resume, and lineage validation.
- `src/theory-mapper.js` - mapping validation and provenance entry point.
- `src/theory-system.js` - final content-addressed system validation.

### Tests and authoritative data
- `tests/theory-agent-cli.test.js` - six required CLI regressions.
- `tests/theory-agent-security.test.js` - lineage and temporal security behavior.
- `tests/theory-agent.test.js` - Evidence Review and lifecycle behavior.
- `data/evidence/ledger.json` - authoritative 22-source/22-claim ledger; never use as an overwrite test target.
- `data/theory-agent/zzz-1-4-fade-mapping-fixture.json` - deterministic mapping fixture.
- `docs/restart-handoff-2026-07-24.md` - recovered digest, stale-ID warning, and prior verification state.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/compile-scenario.js`: `resolveRealProjectRoot`, `resolveInputPath`, `ensureSafeOutputParent`, `assertSafeOutputTarget`, protected-input checks, and random exclusive atomic writes.
- `src/artifact-digest.js`: canonical JSON and SHA-256 digest generation.
- `src/theory-agent.js`: complete run validation can be extended rather than duplicated in the CLI.

### Established Patterns
- Public artifacts use closed schemas, exact content digests, and fail-closed validation.
- CLIs expose `runCommand` for direct Node tests and keep `main()` side effects behind `require.main`.
- Security regressions use temporary copies and must not mutate checked-in evidence.

### Integration Points
- Fixture provider creation in `scripts/run-theory-agent.js` must add path/digest provenance before `startTheoryAgent` receives the model object.
- Mapping validation in `src/theory-mapper.js` and finalization in `src/theory-system.js` must agree on provenance modes and capability flags.
- A regenerated run can become the default input to `scripts/compile-scenario.js` only after READY lineage validation succeeds.

</code_context>

<specifics>
## Specific Ideas

- Treat `scripts/compile-scenario.js` as the behavioral reference, not a module to import wholesale if that would couple two CLIs.
- Keep error assertions semantic enough to allow safe wording changes but specific enough to prove the correct boundary rejected the operation.

</specifics>

<deferred>
## Deferred Ideas

- Real model invocation and recorded-model replay belong to Phase 2.
- Hybrid memory, relationships, public expression, and Reverse generation belong to Phase 3.
- 3D integration belongs to Phase 4.
- Injective deployment or transaction execution belongs to Phase 5 and remains user-confirmed.

</deferred>

---

*Phase: 1-Trustworthy Theory Pipeline*
*Context gathered: 2026-07-24*
