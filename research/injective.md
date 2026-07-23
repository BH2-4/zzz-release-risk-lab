# Injective 集成核验

更新时间：2026-07-23

目标网络：Injective EVM Testnet

## 已核验参数

| 字段 | 值 |
| --- | --- |
| EVM Chain ID | `1439` / `0x59f` |
| 原生 Injective Chain ID | `injective-888` |
| JSON-RPC | `https://k8s.testnet.json-rpc.injective.network/` |
| WebSocket | `wss://k8s.testnet.ws.injective.network/` |
| 原生货币 | `INJ`，18 位小数 |
| Faucet | `https://testnet.faucet.injective.network/` |
| Explorer | `https://testnet.blockscout.injective.network/` |

官方文档明确说明原生链 ID 与 EVM 数字链 ID 不同，但映射到同一网络。2026-07-23 对 JSON-RPC 调用 `web3_sha3` 成功返回结果，证明当前运行环境可达测试网。

## 官方来源

### 网络信息

- 标题：Network Information
- 网站：Injective Documentation
- URL：https://docs.injective.network/developers-evm/network-information
- 站点地图更新时间：2026-07-20
- 核验内容：Chain ID、RPC、WS、原生链 ID、Faucet、Explorer。

### MetaMask 连接

- 标题：Connect with MetaMask
- 网站：Injective Documentation
- URL：https://docs.injective.network/developers-evm/dapps/connect-with-metamask
- 站点地图更新时间：2026-07-20
- 项目用途：通过浏览器钱包请求账户、切换/添加测试网、由用户签名；应用不接触私钥。

### 合约部署

- 标题：Deploy with Hardhat
- 网站：Injective Documentation
- URL：https://docs.injective.network/developers-evm/smart-contracts/deploy-hardhat
- 站点地图更新时间：2026-07-20
- 项目用途：核验 Solidity 合约可在 Injective EVM 部署；MVP 也可用 MetaMask 直接签署部署交易。

### 测试网 Faucet

- 标题：EVM Testnet Faucet / Testnet Faucet Integration
- 网站：Injective Documentation
- URL：https://docs.injective.network/developers-defi/testnet-faucet-integration
- 站点地图更新时间：2026-07-20
- 项目用途：只获取无经济价值的测试 INJ。

## 当前实现

- `src/injective.js`：网络配置、精确 INJ→wei 转换、承诺参数校验、ABI calldata 和稳定 SHA-256 情景哈希。
- `contracts/RiskCommitment.sol`：接收情景哈希与 1–5 风险档位，发出事件；`0.001–0.1` 测试 INJ 作为验证脉冲并在同一交易退回。
- 前端在启用提交前通过 `eth_getCode` 比对本地编译的运行时代码，避免把测试 INJ 发往仅“格式正确”的任意地址。
- 安全边界：不接受私钥/助记词，不使用主网资金，不构建投注或收益市场。

## 尚未完成的验收

- 合约尚未由用户钱包部署到 Injective EVM Testnet。
- 尚无可公开核验的合约地址和部署交易哈希。
- 前端钱包流程和 Blockscout 链接已实现并通过模拟钱包 E2E；尚待真实 MetaMask 签名验证。

只有合约完成测试网部署并留下可公开核验的交易记录后，项目才能声称“实际部署于 Injective 链”。
