# Coding Conventions

**Analysis Date:** 2026-07-24

## JavaScript Style

- Use `'use strict'` in CommonJS/UMD modules and scripts.
- Use two-space indentation, single quotes, trailing commas in multiline literals, and no semicolons.
- Prefer `const`; use `let` only for local state that changes.
- Use named functions for domain operations and short arrow callbacks for collection transforms or event handlers.
- Keep modules dependency-light and use Node built-ins through `node:` imports in scripts.

## Module Patterns

- Shared `src/` modules expose one frozen or plain API object via `module.exports` and `globalThis.ZZZ*` when browser use is required.
- Native ES modules are limited to the Three.js observer, notably `simulation/scene.js` and `simulation/piece-geometries.js`.
- CLI files export testable functions and invoke `main()` only under `require.main === module`.
- Resolve dependencies at module boundaries; keep pure transformations separate from filesystem, network, and DOM effects.

## Validation and Errors

- Treat model output, JSON artifacts, browser wallet responses, URLs, and filesystem paths as untrusted input.
- Validate closed fields and IDs rather than silently accepting unknown properties.
- Use `TypeError` for malformed shape/type, `RangeError` for bounded numeric violations, and clear non-zero CLI failures.
- Do not include raw malformed JSON, API responses, keys, or source documents in error messages.
- Prefer fail-closed behavior when provenance, approval lineage, citations, runtime bytecode, or regional evidence is missing.

## Data and Provenance

- Canonicalize JSON before SHA-256 content addressing; do not hash incidental formatting.
- Preserve explicit provenance modes: `live-model`, `recorded-model-output`, or `deterministic-fixture`.
- A deterministic fixture must keep `realModelUsed: false`; never infer a real model call from a reviewer label.
- Mark invented forward scenarios as `synthetic-counterfactual` and keep numeric assumptions separate from sourced facts.
- Regional differences require direct public evidence; neutral factors remain `1.0` otherwise.

## Browser and UI

- Render external hashes and errors with text nodes or `textContent`, not untrusted HTML.
- Keep controls accessible through labels, roles, and stable `data-testid` attributes used by Playwright.
- Use Lucide icons for tool buttons and Three.js for the unframed 3D scene.
- Keep fixed board, toolbar, and replay dimensions stable across dynamic states.
- The observer verifies artifact bytes before enabling replay.

## Filesystem and CLI

- Accept only project-relative paths and compare resolved realpaths against the project root.
- Reject input symlinks that escape the project and output paths containing symlinked parents.
- Write JSON through exclusive random temporary files followed by atomic rename.
- Refuse to overwrite any validated input artifact, including case-variant aliases on case-insensitive filesystems.

## Comments and Documentation

- Add comments only for non-obvious constraints or trust boundaries.
- Document product claims in `research/` with source title, site, URL, and publication date.
- Use repository-relative paths in committed docs except when an external archival path is intentionally identified.
- Keep `README.md`, `docs/mvp-v1-spec.md`, and GSD planning state aligned with actual test and deployment status.

---

*Convention analysis: 2026-07-24*
