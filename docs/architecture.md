# Architecture

```mermaid
flowchart LR
    A["Public evidence<br/>papers, reports, community leads"] --> B["Evidence ledger<br/>A/B/C/F grading"]
    B --> C["Scenario definition<br/>event day, triggers, responsibility"]
    C --> D["125 synthetic agents<br/>threshold, trust, influence, activity"]
    D --> E["42-day simulation<br/>5 levels x 5 domains x 5 regions"]
    E --> F["Strategy comparison<br/>silence vs candidate"]
    E --> G["100-run ensemble<br/>P10/P50/P90"]
    E --> M["Agent trace<br/>42 days x 125 states"]
    M --> N["Visual replay contract<br/>front / Reverse / delta"]
    F --> H["Browser dashboard"]
    G --> H
    N --> H
    H --> I["SHA-256 scenario commitment"]
    I --> J["MetaMask / EIP-1193"]
    J --> K["RiskCommitment.sol<br/>Injective EVM Testnet 1439"]
    K --> L["Blockscout audit trail"]
```

## Components

| Component | Responsibility |
| --- | --- |
| `src/model.js` | Seeded population, 42-day propagation, comparisons, ensembles and evidence readiness |
| `src/visualization-data.js` | Renderer-neutral board identities, per-agent visual frames, unavailable Reverse channels and strategy deltas |
| `scripts/run-visual-replay.js` | Deterministically generate the versioned baseline/candidate/delta JSON artifact for future 2D/3D clients |
| `src/injective.js` | Network configuration, deterministic hashing, wallet switching, calldata and runtime-code verification |
| `contracts/RiskCommitment.sol` | Emit scenario hash, coarse risk band, test-INJ pulse and same-transaction refund |
| `app.js` | Scenario controls, visualization, evidence view and wallet workflow |
| `research/` | Academic mapping, crisis ledger, search log, model card and chain-source verification |
| `tests/` | Unit, contract, browser-module and desktop/mobile E2E verification |

## Trust boundaries

The browser owns no signing key. MetaMask is the signing boundary. The user supplies a contract address, but the commit button remains disabled until `eth_getCode` exactly matches the compiled runtime bytecode. Transaction hashes are validated and rendered with DOM text nodes, not inserted as HTML.

The evidence ledger is separate from model parameters. A source can establish that an event or statement exists; it does not establish a numeric trigger coefficient. Parameters remain explicit experiment assumptions until historical backtesting is added.
