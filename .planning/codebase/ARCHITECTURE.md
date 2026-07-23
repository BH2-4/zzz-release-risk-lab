# Architecture

**Analysis Date:** 2026-07-24

## Overall Pattern

The repository is an evidence-bounded offline compilation and deterministic simulation pipeline with two static browser surfaces. Node modules prepare and validate artifacts; browsers consume checked artifacts and optionally request wallet signatures.

```text
research + evidence ledger
  -> extraction/review/theory mapping
  -> approved Theory System
  -> bounded scenario compiler
  -> deterministic 42-day baseline
  -> replay + sensitivity bundles
  -> dashboard / 3D observer
  -> optional Injective testnet commitment
```

## Layers

**Research and input layer:**
- `research/` records public-source interpretations and modeling boundaries.
- `data/evidence/` separates sources, claims, reviewed extraction, and theory catalog.
- `data/scenarios/` holds explicit historical and synthetic-counterfactual inputs.

**Trust and compilation layer:**
- `src/evidence-ledger.js` validates source/claim provenance and creates closed evidence packs.
- `src/evidence-extractor.js`, `src/theory-mapper.js`, `src/theory-agent.js`, and `src/theory-system.js` implement proposed mapping, deterministic audit, human approval, state lineage, and content addressing.
- `src/compilation-pipeline.js` and `src/scenario-compiler.js` prevent unapproved citations, theories, regional claims, or numeric bindings from reaching simulation.
- `scripts/run-theory-agent.js` and `scripts/compile-scenario.js` are the command boundaries for filesystem inputs and outputs.

**Model and artifact layer:**
- `src/model.js` creates 125 synthetic stakeholders and deterministic 42-day comparisons; output is scenario risk, not a real-world probability.
- `src/visualization-data.js`, `src/visualization-bundle.js`, and `src/sensitivity-data.js` transform model output into renderer-neutral, content-verifiable replay data.
- `scripts/run-data-beta04.js` is the current artifact generator; `experiments/output/visual-data-beta0.4.json` is the current replay.

**Presentation layer:**
- `index.html` + `app.js` render controls, comparisons, evidence, and the wallet workbench.
- `simulation/index.html` + `simulation/app.js` fetch and verify the replay manifest before delegating rendering to `simulation/scene.js`.
- `roadshow/beta0.1/` is an independent archived pitch surface and is not a dependency of the observer.

**Chain boundary:**
- `src/injective.js` validates network, addresses, stake bounds, scenario hashes, and deployed bytecode.
- `contracts/RiskCommitment.sol` emits a coarse commitment and refunds the bounded test-INJ pulse in the same transaction.
- `app.js` requests transactions only through `globalThis.ethereum`; no server signer exists.

## Module Contracts

- Shared browser/Node modules use a UMD-style API: CommonJS exports plus a named `globalThis.ZZZ*` object.
- Pure validators return `{ valid, errors }` where callers need collected failures; unsafe public operations throw typed errors.
- Content identity uses canonical JSON and SHA-256 through `src/artifact-digest.js` or equivalent browser Web Crypto code.
- Generated browser data carries schema versions and capability declarations so unavailable Reverse or relation channels remain explicit.

## Data Flow and State

- The authoritative mutable state during development is checked-in JSON, not a database.
- Theory Agent runs move through audited events and human checkpoints; only READY artifacts can enter scenario compilation.
- Browser state is ephemeral. It is reconstructed from inputs or fetched artifacts each page load.
- Wallet state is limited to the connected account and verified contract address in `app.js`; keys remain inside the wallet.

## Entry Points

- `npm run build` -> `scripts/build-contract.js`.
- `npm test` -> all `tests/*.test.js` via `node:test`.
- `npm run test:e2e` -> Playwright against the static server.
- `npm run theory:agent -- <command>` -> Theory Agent lifecycle.
- `npm run compile:scenario -- <options>` -> evidence-bound model compilation.
- `npm run experiment:visual` -> Beta 0.4 replay generation.
- `npm start` -> static UI at `/`, `/simulation/`, and `/roadshow/beta0.1/`.

## Architectural Boundaries

- Never describe synthetic agents as sampled players or risk indices as probabilities.
- Every research conclusion must resolve to a public source recorded under `research/` and the evidence ledger.
- Model output is untrusted until validated against closed evidence, theory, field, and provenance contracts.
- Injective deployment, network changes, and transactions remain explicit human actions.

---

*Architecture analysis: 2026-07-24*
