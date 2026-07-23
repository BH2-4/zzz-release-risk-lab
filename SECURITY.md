# Security

## Demo boundary

This project targets Injective EVM Testnet only. Test INJ has no intended economic value. Do not use a mainnet wallet or real funds with this prototype.

## Wallet handling

- The application requests signatures through an injected EIP-1193 wallet provider.
- It never asks for, stores, transmits, or logs private keys or seed phrases.
- A commitment is enabled only after `eth_getCode` matches the locally compiled `RiskCommitment` runtime bytecode.
- Verification pulses are limited to `0.001-0.1` test INJ and the contract refunds them in the same transaction.
- Users must still inspect every wallet confirmation before signing.

## Reporting

Do not publish an exploitable issue before maintainers have had a reasonable chance to investigate it. Include the affected file, a minimal reproduction, and the expected impact. Never include private keys, seed phrases, or live credentials in a report.
