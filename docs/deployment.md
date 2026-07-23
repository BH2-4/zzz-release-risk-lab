# Injective Testnet Deployment

## Prerequisites

- MetaMask with a dedicated test account.
- Injective EVM Testnet selected: chain ID `1439` (`0x59f`).
- A small amount of faucet-only test INJ.
- The project served over HTTP, for example `npm start`.

Never paste a private key or seed phrase into this application, a terminal command, an issue, or a chat.

## Deploy from the demo

1. Open the Injective tab and connect MetaMask.
2. Confirm the wallet shows Injective EVM Testnet, chain ID 1439.
3. Click “部署测试合约” and inspect the wallet transaction. Contract creation must have no recipient and zero value.
4. After confirmation, open the deployment transaction in Blockscout and copy the created contract address.
5. Paste the address into the demo. Wait for “合约代码核验通过”.
6. Submit a commitment with `0.001`, `0.01`, or `0.1` test INJ. Confirm the recipient, amount, and network in MetaMask.
7. Record the contract address, deployment transaction hash, commitment transaction hash, UTC timestamp, and Blockscout URLs in `research/injective.md`.

## Acceptance check

The Injective track requirement is complete only when the public Blockscout page shows the deployed bytecode and at least one `RiskCommitted` event from the demo workflow.
