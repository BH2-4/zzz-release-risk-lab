# Competition Mac MVP Outline

## One-line outcome

在当前 macOS 演示机上，用一个固定的《绝区零》公开历史事件，跑通“证据 -> AI 编译 -> 策略对照 -> 42 天回放 -> 3D 解释 -> 可选测试网核验”的 3-5 分钟闭环。

这是一条比赛交付路线，不是通用社会仿真平台，也不承诺跨平台。

## Fixed problem

- 历史锚点：1.4 “特定视角渐隐”公告、修复与公开拥有感 frame。
- 产品环境：3.1 露西时装官方信息。
- 前向输入：明确标记为 `synthetic-counterfactual` 的 3.1 异常渐隐假设。
- 约束：42 天、125 个合成代表、中英日目标、只使用公开证据。
- 输出：情景内策略相对差和假设敏感性，不是现实危机概率。

## Pre-competition path

### P0 - PR and trust baseline

- 功能分支承载修改，不直推 `main`。
- Theory Agent 的 provenance、路径、恢复和人工审批闭环全绿。
- 本地独立审查、build、Node、E2E 全绿后才开 PR。

### P1 - One real AI compilation

- 只调用一次有来源约束的 OpenAI-compatible 模型路径。
- 只编译固定 1.4/3.1 切片，不开放任意案例输入。
- 记录 provider、model、request ID、输入摘要与验证状态。
- 无可用 Token 或调用失败时，使用明确标记的 `recorded-model-output`；fixture 不得冒充模型输出。

### P2 - Reuse the stable simulation and observer

- 复用现有确定性 125 代表、42 天基线/候选策略和敏感性区间。
- 复用现有 3D 棋盘与正面/Reverse 可用性契约。
- 不在赛前新增混合认知、长期记忆、关系涌现或 125 x 42 模型调用。

### P3 - User-confirmed Injective evidence

- 只使用 Injective 测试网。
- 钱包、合约选择/部署与交易都需要用户显式确认。
- 只提交紧凑运行摘要；不上传大体积语料，不读取私钥。

### P4 - Mac field demo

- 支持平台：当前 macOS 演示机。
- 现场路径：证据边界 -> 策略选择 -> 42 天差异 -> 3D 下钻 -> 测试网核验或离线证据。
- 3-5 分钟讲清具体问题、原做法、AI 质变点与不能声称的内容。
- 赛内平台验收只以当前 macOS 演示机上的独立审查、`npm run build`、`npm test` 和 `npm run test:e2e` 为准。
- 本地全绿后才 push 功能分支并创建 PR；赛前 GitHub Actions 改为单一 macOS runner，只复验目标平台。
- 当前 Ubuntu workflow 在完成上述调整前不具备赛内验收效力；不在赛前增加 Linux/Windows jobs 或操作系统矩阵。

## Post-competition iterations

- macOS 之外的平台适配、CI 操作系统矩阵、浏览器兼容验证与跨平台复验。
- 多危机案例与任意公开 URL 输入。
- 具备立场、目标、记忆、关系和公开表达的混合认知 Agent。
- 关系传播、Reverse 声量与事件通道的真实运行时涌现。
- 新运行时驱动的 3D 演化、校准评测与地区直接证据扩展。

## Completion language

赛前只能称为“在明确威胁边界内完成的 Mac 比赛 MVP”。不得称为通用跨平台系统、真实玩家预测器、现实概率模型或通用文件系统事务安全实现。
