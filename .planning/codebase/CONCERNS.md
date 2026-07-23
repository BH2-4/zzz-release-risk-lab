# Codebase Concerns

**Analysis Date:** 2026-07-24

## Immediate Blockers

**Theory Agent CLI filesystem and provenance hardening:**
- Files: `scripts/run-theory-agent.js`, `tests/theory-agent-cli.test.js`.
- Symptoms: six of 124 Node tests fail; fixture provenance is incomplete, symlink escapes are accepted, temporary files are predictable/non-exclusive, input overwrite is possible, and malformed JSON errors expose parser detail.
- Impact: an output path can corrupt authoritative evidence, and offline output can be under-specified or misrepresented.
- Fix approach: port the proven realpath, symlink-chain, protected-input, redacted-read, and exclusive atomic-write patterns from `scripts/compile-scenario.js`; then regenerate the approved Theory System lineage.

**Stale approved Theory System artifact:**
- File: `experiments/output/theory/zzz-1-4-fade-run.json`.
- Issue: the checked run predates the restored evidence digest/time lineage and is documented as debug-only.
- Impact: it must not be accepted as the current compile authority.
- Fix approach: after CLI hardening, rerun `start --demo -> review -> resume -> status` and update all content-addressed references.

## Product Capability Gaps

**No real model compilation:**
- Files: `src/ai-provider.js`, `scripts/compile-scenario.js`, `.env.example`.
- Current state: adapter and validation exist, but no key or checked live-model result exists.
- Impact: the project demonstrates an AI-ready boundary, not a completed real AI compilation loop.
- Fix approach: use BYOK in a trusted Node process, retain request provenance, and bind the generated artifact to reviewed sources.

**No hybrid multi-Agent runtime:**
- Files: `src/model.js`, `docs/mvp-v1-spec.md`.
- Current state: 125 entities are deterministic synthetic representatives without stance, memory, relationships, or generated public expression.
- Impact: Reverse voice and relationship propagation remain unavailable; the formula baseline cannot be described as a real Agent society.
- Fix approach: introduce a bounded hybrid runtime behind the existing visual contract and preserve deterministic replay/evaluation fixtures.

**Injective requirement not completed:**
- Files: `contracts/RiskCommitment.sol`, `src/injective.js`, `research/injective.md`.
- Current state: contract compiles and wallet requests are tested, but there is no confirmed public testnet deployment or event.
- Impact: the Injective competition requirement remains unmet.
- Fix approach: only after explicit user confirmation, deploy with a dedicated test wallet, verify runtime bytecode, submit one bounded commitment, and record Blockscout evidence.

## Fragile Areas

**Large central modules:**
- Files: `src/theory-agent.js` (594 lines), `src/model.js` (587), `simulation/scene.js` (529), `simulation/app.js` (491), `src/scenario-compiler.js` (433).
- Risk: tightly coupled validation/state changes can break lineage, deterministic artifacts, or rendering contracts.
- Safe modification: change one trust boundary at a time, add focused regression tests, and regenerate artifacts only through their scripts.

**Dual Node/browser module format:**
- Files: most `src/*.js` modules.
- Risk: changing exports can pass Node tests while breaking browser globals, or vice versa.
- Mitigation: `tests/browser-modules.test.js` and E2E checks must remain part of every phase gate.

**Checked generated artifacts:**
- Files: `src/contract-artifact.js`, `experiments/output/visual-data-beta0.*.json`, manifests.
- Risk: manual edits can create source/artifact drift.
- Mitigation: use `npm run build` and `npm run experiment:visual`; artifact tests compare bytes and SHA-256 values.

## Security Boundaries

- Never read, store, log, or request private keys or seed phrases. `src/injective.js` deliberately rejects those fields.
- Never auto-deploy the contract, auto-switch to mainnet, or initiate an unconfirmed transaction.
- Model keys are server-side only; browser code must not import `.env` values.
- Public research and local excerpts may contain untrusted text; prompts and validators must prevent instruction injection or unsupported claims.

## Epistemic Boundaries

- Synthetic populations are not real player samples and have no demographic representativeness.
- Scenario risk indices and P10/P50/P90 sensitivity bands are not crisis probabilities.
- A public quote demonstrates that a frame appeared, not its prevalence or acceptance.
- No region-specific coefficient may differ without direct source bindings in `research/` and the evidence ledger.

## Test and Delivery Risk

- CI will fail on the six current Theory Agent CLI regressions; no phase can be marked complete under the project gate until they pass.
- E2E requires an available Chromium/Chrome and a free local port; Playwright can reuse an existing server.
- `.codex/` is currently untracked local tooling. Keep GSD runtime changes separate from product and `.planning/` commits unless explicitly deciding to vendor it.

---

*Concerns audit: 2026-07-24*
