# ProgramE 重启交接记录

日期：2026-07-24
状态：阶段性收尾，等待新项目结构接管

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

## 本次收尾核验

已通过 26 项专项测试：

- `compile-scenario` CLI：11/11。
- Theory Agent lineage 安全：6/6。
- Evidence Review 与 Theory Agent 主流程：9/9。

已执行全量 `npm test`：

- 总计 124 项，118 项通过，6 项失败。
- 6 项失败全部来自 `tests/theory-agent-cli.test.js`，且与下节刻意保留的红灯逐项对应。
- `git diff --check` 通过；公开仓库敏感凭据模式扫描未发现命中。
- 独立 checkpoint 复审未发现 HIGH/CRITICAL 阻断问题。

证据账本已从 Codex 会话日志完整恢复并双重校验：

- `sources = 22`
- `claims = 22`
- `validateEvidenceLedger = valid`
- `digestValue = sha256:f3c80f1881c2e75583a0cd76c20ba5df6f5e603de926361ceb6b1e6ba6690e05`

## 刻意保留的红灯

`tests/theory-agent-cli.test.js` 新增的 6 项回归测试尚未驱动实现完成：

1. 离线 Theory System provenance 必须保留夹具相对路径和 SHA-256。
2. 输入符号链接的 realpath 不得逃出项目。
3. 输出目录任一层不得是符号链接。
4. 临时文件必须使用随机名、`wx` 独占创建和原子替换。
5. run 输出不得覆盖 ledger、extraction、Evidence Review、理论目录或夹具输入。
6. JSON 解析错误不得回显原始内容。

其中第 5 项已确认可在旧 CLI 上触发；回归测试已改为只攻击临时 ledger 副本，不再触碰正式数据。

## 下次启动的第一批任务

重启后先从本文件恢复上下文，并执行 `git status --short --branch` 与 `npm test` 确认接管基线；不要基于旧 Theory System ID 继续编译。

1. 用 `compile-scenario.js` 已验证的安全路径和原子写入模式改造 `run-theory-agent.js`，使上述 6 项 CLI 测试转绿。
2. 收紧 Theory mapping/System provenance：`live-model` 必须同时具有 provider、model、requestId 且 `realModelUsed: true`；`deterministic-fixture` 必须包含 fixturePath/fixtureDigest 且不得装成模型输出。
3. 在 CLI 全绿后重跑 `start --demo -> review -> resume -> status`，生成新的 Theory System ID。
4. 旧 ID `theory-system:sha256:5c22be0df832eacac9f41664c8905580f8f7d19223ce294d8be677631186f8f2` 已因证据摘要与时间链变化而失效，不得继续引用。
5. 最后执行全量测试、覆盖率、`git diff --check`、独立代码/安全复审，清除所有 HIGH finding 后再宣称该阶段完成。

`experiments/output/theory/zzz-1-4-fade-run.json` 是旧输入下的过期产物，只能当调试记录，不是当前可编译的权威 run。
