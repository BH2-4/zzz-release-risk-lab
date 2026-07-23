# Project Structure

**Analysis Date:** 2026-07-24

## Directory Layout

```text
./
├── app.js, index.html, styles.css        # Main static dashboard
├── simulation/                           # Standalone 3D evolution observer
├── roadshow/beta0.1/                     # Archived pitch deck
├── src/                                  # Shared domain, validation, and adapter modules
├── scripts/                              # Build, generation, and CLI entry points
├── contracts/                            # Solidity source
├── data/                                 # Evidence, theory, and scenario inputs
├── research/                             # Public-source research and modeling boundaries
├── experiments/                          # Reproducible fixtures, outputs, and notes
├── docs/                                 # Architecture, MVP, deployment, and handoff docs
├── tests/                                # Node test suite and Playwright journeys
└── .github/workflows/                    # CI pipeline
```

## Key Locations

**Evidence and theory:**
- Add or revise public-source conclusions in `research/` first.
- Add machine-readable source/claim bindings in `data/evidence/ledger.json`.
- Keep reviewed extraction and human approval artifacts under `data/evidence/`.
- Place closed theory definitions in `data/evidence/theory-catalog.json`; explanatory theory notes live in `research/theory-library/`.

**Domain implementation:**
- Put reusable pure logic and validators in `src/`.
- Put filesystem and command parsing at `scripts/`; do not mix it into browser modules.
- Use `src/model.js` only for deterministic synthetic scenario mechanics.
- Use `src/visualization-*.js` and `src/sensitivity-data.js` for renderer-neutral data contracts.

**Browser implementation:**
- Main operational UI changes belong in `index.html`, `styles.css`, and `app.js`.
- 3D observer UI belongs under `simulation/`; scene mechanics stay in `simulation/scene.js` and shape construction in `simulation/piece-geometries.js`.
- Do not import `roadshow/` assets into either application surface.

**Artifacts:**
- Keep generated replay payloads and manifests in `experiments/output/`.
- Keep small deterministic generator inputs under `experiments/fixtures/`.
- Generated Solidity runtime data belongs in `src/contract-artifact.js` and must match `contracts/RiskCommitment.sol` after `npm run build`.

**Tests:**
- Name Node tests `tests/<subject>.test.js` and mirror the source responsibility.
- Put browser journeys only in `tests/e2e/*.spec.js`.
- Add regression tests near the affected CLI or module before implementing a bug fix.

## Naming Conventions

- Source and test filenames use lowercase kebab-case, for example `scenario-compiler.js` and `scenario-compiler.test.js`.
- Functions and local variables use camelCase; constants use UPPER_SNAKE_CASE.
- Browser globals use the `ZZZ` prefix, for example `globalThis.ZZZRiskModel`.
- Artifact schemas and IDs are explicit strings such as `theory-agent-run/1.0` and `synthetic-counterfactual`.
- GSD planning files use uppercase names under `.planning/`.

## Adding New Work

- New research claim: update `research/`, ledger source/claim, allowed uses, and evidence tests together.
- New model parameter: update scenario validation, compiler closed fields, assumptions, model tests, and presentation contract.
- New visual channel: update capabilities, encoder/decoder, artifact generator, manifest, and E2E diagnostics.
- New external integration: isolate it in `src/`, keep secrets server-side, document it in `research/` or `docs/`, and add mocked tests.
- New chain action: require explicit wallet confirmation and never introduce private-key handling or automatic deployment.

## Generated and Local-Only Content

- `node_modules/`, `artifacts/`, `playwright-report/`, `test-results/`, `.env*`, and logs are ignored by `.gitignore`.
- `.codex/` contains the local OpenGSD runtime in this worktree and is currently untracked; planning commits must select `.planning/` files explicitly.

---

*Structure analysis: 2026-07-24*
