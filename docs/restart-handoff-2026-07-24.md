# ProgramE 重启交接记录

日期：2026-07-24
状态：Phase 1 本地门禁已转绿；当前默认 Theory run 已重新生成并处于 `READY_FOR_COMPILATION`

## 不变的产品目标

ProgramE 要把《绝区零》全球发行中的公开证据、社会学理论、AI 情景编译、百人级代表 Agent、42 天传播与策略对照、3D 演化和 Injective 核验连成可现场运行的 MVP。

当前固定垂直切片是：

- 历史复演：《绝区零》1.4 版本“特定视角渐隐”调整、显示异常、公开玩家解释与官方修复。
- 3.1 压力测试：只把 HoYoverse 官方确认的露西泳装“公主假日”当作产品环境；所有渐隐、争议、传播和策略效果均是明确标注的 `synthetic-counterfactual`。
- 禁止表述：不预言 3.1 必然发生危机，不给出虚假现实概率，不把公开声量外推为玩家总体意见，不无证据设定地区差异。

## 已形成的资产

- 证据账本：22 个公开来源、22 条 claim，包含中英日语资料和候选证据隔离。
- 理论目录：6 项核心理论和 5 项条件理论；默认切片只批准 Framing、SCCT、Relative Deprivation 和 Image Repair。
- Evidence Review：已绑定 extraction 来源、claim 类型、语言和用途上限；人工 ledger 可收窄用途，不得新增用途。
- Theory System Agent：已有暂停、批准、退修、拒绝、目录缺口阻断、输入摘要、事件链和内容寻址。
- 编译入口：`compile-scenario.js` 已校验 READY 状态、重建审计/审批/Theory System 链，并防止输出覆盖任一输入。

当前没有模型 Key，也没有真实模型编译产物。离线理论映射是手写的 `deterministic-fixture`，必须保持 `realModelUsed: false`。人工 reviewer 名称是本地声明，不是密码学身份认证。

## 当前本地核验

本地已完成默认 Mac 门禁与 Theory CLI 生命周期：

- Focused Theory gates：
  `tests/theory-agent-cli.test.js`、`tests/theory-agent-cli-races.test.js`、`tests/theory-agent-security.test.js` 共 31/31 通过。
- 全量 Node tests：
  `npm test` 共 145/145 通过。
- Build gate：
  `npm run build` 通过。
- E2E gate：
  `npm run test:e2e` 在当前 Mac 上通过；首次未提权运行因 sandbox 端口绑定限制失败，提权后 Playwright 正常起服并完成 10 passed / 4 skipped。
- Hygiene：
  `git diff --check` 通过；本地未发现需要记录的新 HIGH 级阻断。

当前默认 Theory run 已按 `start --demo --replace -> review approve -> resume -> status` 串行重建：

- `runId = zzz-fade-20260724045215`
- `state = READY_FOR_COMPILATION`
- `revision = 3`
- `theorySystemId = theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912`
- `provenance.mode = deterministic-fixture`
- `realModelUsed = false`

证据账本已从 Codex 会话日志完整恢复并双重校验：

- `sources = 22`
- `claims = 22`
- `validateEvidenceLedger = valid`
- `digestValue = sha256:f3c80f1881c2e75583a0cd76c20ba5df6f5e603de926361ceb6b1e6ba6690e05`

## 当前边界

- 当前离线 Theory authority 仍然来自仓库内 `deterministic-fixture`，不是实时模型结果。
- `manual-demo-curator` 只是本地 reviewer 声明，不是密码学身份。
- 当前权威 run 只说明 Theory System、审批链、输入摘要和内容寻址已经恢复，不说明真实模型编译或链上提交已经完成。

## 下次启动的第一批任务

重启后先从本文件恢复上下文，并执行 `git status --short --branch` 确认工作树；不要再把旧 Theory System ID 当成当前权威。

1. 进入 Phase 2，补全固定案例的公开证据扩写、理论库映射和一次真实模型编译闭环；若无真实凭据，只能继续保留离线 fallback，不得宣称“真实 AI MVP 已完成”。
2. 把当前文档边界与 CI 实现对齐：赛前 PR 复验应迁移为单一 macOS GitHub Actions job，Ubuntu workflow 不可继续被表述为赛内验收依据。
3. 在进入链上闭环前继续保持用户确认：只允许 Injective testnet，且钱包连接、合约部署/选择、签名与交易都要人工确认。
4. 旧 ID `theory-system:sha256:5c22be0df832eacac9f41664c8905580f8f7d19223ce294d8be677631186f8f2` 已失效，只能作为历史记录；当前权威 ID 是 `theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912`。
5. 当前 `experiments/output/theory/zzz-1-4-fade-run.json` 已是默认可编译权威 run；后续如输入摘要、审批链或 Theory System 再变化，必须重新走完整 CLI 生命周期，不得手改 JSON 或 ID。
