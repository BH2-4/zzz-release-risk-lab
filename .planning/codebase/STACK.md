# Technology Stack

**Analysis Date:** 2026-07-24

## Languages

**Primary:**
- JavaScript (ES2022-era APIs) - browser application, deterministic model, evidence pipeline, CLIs, and tests.
- HTML5 and CSS3 - dashboard, roadshow, and standalone 3D observer.

**Secondary:**
- Solidity `^0.8.24` - minimal `RiskCommitment` event contract in `contracts/RiskCommitment.sol`.
- JSON and Markdown - checked-in evidence, scenarios, replay artifacts, research, and operating documentation.

## Runtime

**Environment:**
- Node.js 22 in `.github/workflows/ci.yml`; local verification currently runs on Node.js 26.5.0.
- Modern browser with Web Crypto, ES modules, WebGL, and optionally an EIP-1193 wallet.
- Python 3 is used only for the static development server in `package.json`.

**Package Manager:**
- npm with `package-lock.json` committed; CI uses `npm ci`.

## Frameworks

**Core:**
- No application framework or bundler. `index.html`, `app.js`, and `styles.css` are served as static assets.
- Three.js 0.185.1 powers `simulation/scene.js`; Lucide 1.26.0 supplies interface icons.

**Testing:**
- Node's built-in `node:test` and `node:assert/strict` for unit, integration, artifact, and CLI tests under `tests/`.
- Playwright 1.61.1 for desktop/mobile browser journeys in `tests/e2e/dashboard.spec.js`.

**Build/Dev:**
- solc 0.8.30 compiles `contracts/RiskCommitment.sol` through `scripts/build-contract.js`.
- `python3 -m http.server` serves the repository on `127.0.0.1:4173`.

## Key Dependencies

- `three` - instanced 3D board, procedural pieces, interaction, and pixel diagnostics.
- `lucide` - browser icon library.
- `solc` - deterministic contract artifact generation.
- `@playwright/test` - full UI and wallet-mock verification.

## Configuration

- Server-side model access uses `PROGRAM_E_AI_BASE_URL`, `PROGRAM_E_AI_API_KEY`, and `PROGRAM_E_AI_MODEL`; names and placeholders are documented in `.env.example`.
- `.env` and `.env.*` are ignored, except `.env.example`; browser files must never receive model credentials.
- `playwright.config.js` defines desktop/mobile projects and the local static server.
- There is no TypeScript, lint, or formatter configuration; style is enforced by local convention and tests.

## Platform Requirements

**Development:** Node.js 22+, npm, Python 3, and a Chromium-compatible browser. macOS can reuse installed Chrome.

**Production/Demo:** Static hosting is sufficient for the UI and replay observer. Live model compilation requires a trusted Node-side process. Injective actions require an injected wallet and explicit user confirmation.

---

*Stack analysis: 2026-07-24*
