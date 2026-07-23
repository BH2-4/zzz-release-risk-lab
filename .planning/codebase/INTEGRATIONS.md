# External Integrations

**Analysis Date:** 2026-07-24

## APIs & External Services

**Model provider:**
- `src/ai-provider.js` supports an OpenAI-compatible `/chat/completions` endpoint through Node's `fetch`.
- Authentication is a bearer token from `PROGRAM_E_AI_API_KEY`; HTTPS is mandatory except for loopback development.
- No key is configured in the repository. The checked-in mapping is a deterministic fixture with `realModelUsed: false`.

**Injective EVM Testnet:**
- `src/injective.js` targets chain ID 1439 (`0x59f`) and native chain `injective-888`.
- JSON-RPC: `https://k8s.testnet.json-rpc.injective.network/`.
- Explorer: `https://testnet.blockscout.injective.network/`.
- Faucet: `https://testnet.faucet.injective.network/`.
- The browser uses an injected EIP-1193 provider; the application never accepts private keys or mnemonics.

**Public research sources:**
- URLs, titles, publication dates, languages, and allowed uses are bound in `data/evidence/ledger.json` and `research/`.
- Checked local excerpts in `data/evidence/snapshots/` support reproducible review; they are evidence inputs, not live API dependencies.

## Data Storage

- No database, object store, cache, or user account system is present.
- JSON artifacts in `data/` and `experiments/output/` are the local content-addressed persistence layer.
- Generated artifacts must be reproducible and validated against manifests before browser replay.

## Authentication & Identity

- No application login exists.
- Wallet identity is returned by `eth_requestAccounts`; MetaMask or another injected wallet owns signing and approval.
- Human reviewer names in Theory Agent artifacts are local assertions, not cryptographic identities.

## Monitoring & Observability

- No external error tracking, analytics, or telemetry is integrated.
- Browser status is exposed through visible UI and test-only diagnostics such as `globalThis.__evolutionDiagnostics`.
- CLI failures use stderr and non-zero exits; sensitive source contents must be redacted from errors.

## CI/CD & Deployment

- GitHub Actions in `.github/workflows/ci.yml` runs build, unit/integration tests, installs Chromium, and runs E2E tests.
- No automatic production or Injective deployment exists.
- `docs/deployment.md` describes a manual testnet flow requiring wallet inspection and public Blockscout evidence.

## Environment Configuration

- `.env.example` documents model variables without credentials.
- `PROGRAM_E_AI_OUTPUT` optionally chooses a project-relative compiled artifact path.
- Injective network metadata is code-defined; no secret is required to read chain state.

## Webhooks & Callbacks

- No incoming or outgoing webhooks are implemented.
- Wallet requests are direct browser-provider calls: chain check/switch, account request, bytecode verification, and explicitly confirmed transactions.

---

*Integration audit: 2026-07-24*
