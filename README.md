# ZZZ Release Risk Lab / 绝区零地区发行风险沙盘

> ProgramE · macOS 比赛 MVP 建设中 · 固定案例 · 3D 演化观察器数据 Beta 0.4 · 非官方研究原型

一个用社会学理论、公开历史案例和合成利益相关者，对《绝区零》下一个 42 天全球发行周期进行情景压力测试的 MVP。当前默认问题已经收窄为：复演 1.4 的“特定视角渐隐”事件，再把同一机制迁移到 3.1 露西时装的合成反事实中。

## 一句话

它不回答“下个版本会不会爆发公关危机”，而是回答：

> 如果同一个发行决策同时触发公平感、群体身份、文化代表和社交网络扩散，哪些机制与群体状态会先上升，哪种发行应对最可能缓解它？地区差异只有取得直接证据后才展开。

## 默认垂直切片

- **历史复演**：1.4 官方公告确认存在“特定视角下代理人渐隐”的调整，并修复了部分情况下渐隐效果显示不正确的问题。它没有说明完全撤销渐隐调整；300 菲林对应同一公告列出的四项问题，不能只归因于渐隐。
- **前向压力测试**：3.1 官方福利页确认，参与活动“恰浪花逐夏而至”可免费领取露西泳装“公主假日”。Demo 额外假设该时装出现异常渐隐并触发拥有感 frame；这个事件没有发生，是 `synthetic-counterfactual`。
- **研究时点**：截至 2026-07-24，3.1 尚未上线。官方时装信息只证明产品环境，不证明会渐隐、会引发争议或存在某种危机概率。
- **旧切片**：`data/scenarios/zzz-tv-mode-vertical-slice.json` 保留作早期技术基线，不再是默认 Demo。

默认配置见 `data/scenarios/zzz-3-1-fade-risk-vertical-slice.json`，案例边界见 [1.4 渐隐事件到 3.1 角色展示风险切片](research/cases/zzz-1.4-fade/README.md)。

## MVP 边界

- 合成群体不是真实玩家样本，不具有人口统计代表性。
- 输出是情景风险、相对比较与参数敏感性，不是现实世界概率预测。
- 不对国家、族群或文化群体贴本质化标签；没有直接地区证据时系数一律为 `1.0`，技术夹具也不得用于地区结论。
- Injective 只使用测试网与无经济价值的测试代币；不保存私钥，不实现现金或投机市场。
- 项目与米哈游、HoYoverse 和 Injective 无隶属或授权关系。
- 赛前目标平台与验收边界只覆盖当前 macOS 演示机；PR 复验目标是单一 macOS CI job，但当前 workflow 仍是 Ubuntu，需先迁移到 macOS runner。跨平台适配、非 macOS jobs 与复验属于赛后迭代。
- 赛前复用现有确定性 125 代表推演和 3D 回放，不宣称已经实现混合认知 Agent 或能力涌现。

## 双赛道验收

- 米哈游：可现场运行，咬住 42 天、多语同步与地区差异，只用公开数据。
- Injective：必须真实集成测试网或主网；最终 Demo 不能只有本地假代币。

## 开发状态

- [x] 旧方向归档
- [x] 11 项学术理论目录：6 项核心理论与 5 项条件理论
- [x] 1.4 渐隐案例的人工 Evidence Review、Claim 解析与 SHA-256 输入摘要
- [x] Theory System Agent：自动提议、确定性审计、人工批准/退修/拒绝、暂停恢复与目录缺口阻断
- [x] 人工批准映射的内容寻址 Theory System；情景编译器只接受该批准制品
- [x] 百人级合成利益相关者
- [x] 42 天多层扩散引擎
- [x] Round-0 快速实验与一代校准
- [x] 42 天逐 Agent 可视回放数据与 Reverse 空值契约
- [x] 独立 3D 演化观察器（125 个棋子、42 天回放、策略差值与 Agent 下钻）
- [x] 100 组配对运行的逐日 P10/P50/P90 假设敏感性数据
- [x] 42 天层级、领域、地区 P10/P50/P90 随机访问数据
- [x] 现场可操作界面（桌面与移动端 E2E 已通过）
- [x] 机器可验证的公开证据账本、11 项学术理论目录与三语目标契约
- [x] OpenAI-compatible BYOK 适配器与证据受限情景编译契约
- [ ] 使用真实模型完成一次有来源的情景编译（当前没有模型 Key）
- [ ] 赛后：具备立场、目标、记忆、关系与公开表达的混合 Agent 运行时
- [ ] 赛后：由新运行时驱动 Reverse 声量与关系传播的 3D 回放
- [ ] 赛后：非 macOS 平台适配、CI 矩阵与跨平台复验
- [ ] Injective 测试网承诺记录
- [x] 公开 GitHub 仓库

当前 Theory Agent 的可复现实例使用仓库内确定性夹具，制品明确记录 `realModelUsed: false`。已有的公式模型和 3D 页面是比赛 Mac MVP 复用的技术基线；二者都不等于真实模型编译、混合认知 Agent 或能力涌现。当前路线见 [比赛 Mac MVP 大纲](docs/competition-mac-mvp-outline.md)，逐项门槛见 [比赛 Mac MVP 规格](docs/mvp-v1-spec.md)。

## 提交材料

- [米哈游赛道一页说明](docs/one-page.md)
- [商业路演版本索引](roadshow/README.md)
- [可直接播放的路演 Beta 0.1](roadshow/beta0.1/index.html)
- [Beta 0.1 完整讲稿](roadshow/beta0.1/speaker-notes.md)
- [系统架构与信任边界](docs/architecture.md)
- [比赛 Mac MVP 大纲](docs/competition-mac-mvp-outline.md)
- [比赛 Mac MVP 规格](docs/mvp-v1-spec.md)
- [3D 前端可视化数据契约](docs/visualization-data-contract.md)
- [3D 引擎选型记录](docs/3d-engine-decision.md)
- [OpenGSD 接入边界](docs/opengsd-adoption.md)
- [Injective 测试网部署手册](docs/deployment.md)
- [安全说明](SECURITY.md)

## 历史输入

- [AdventureX 2026 赛道表](/Users/arco/Documents/advx26/AdventureX-2026-赛道表.md)
- [旧方向归档](../archive/README.md)
- [ProgramB 历史赛题知识库](../programB/README.md)

## 当前可复现内容

```bash
npm install
npm test
npm run theory:agent -- status
npm run compile:scenario -- --help
npm run experiment
npm run experiment:visual
npm run test:e2e
npm start
```

浏览器打开：

- `http://127.0.0.1:4173/`：参数实验、证据库与 Injective 工作台。
- `http://127.0.0.1:4173/simulation/`：独立的 42 天 3D 演化观察器；只回放离线产物，不在浏览器内运行模型，也不加载路演目录。

- [Round-0 实验记录](experiments/round-0.md)
- [Beta 0.3 配对敏感性与回放产物记录](experiments/beta0.3.md)
- [Beta 0.4 逐日分层演化数据记录](experiments/beta0.4.md)
- [研究库与证据等级](research/README.md)
- `data/evidence/ledger.json`：来源与 Claim 分离的机器证据账本。
- `data/evidence/theory-catalog.json`：11 项理论构件、启用条件、允许映射路径和局限。
- `data/evidence/reviews/zzz-1-4-fade-evidence-review.json`：人工 Evidence Review，把审核后的提取结果解析到证据账本 Claim。
- `experiments/output/theory/zzz-1-4-fade-run.json`：经人工批准并恢复完成的内容寻址 Theory System；当前来自确定性 Demo 夹具，不是真实模型输出。
- `data/scenarios/zzz-3-1-fade-risk-vertical-slice.json`：当前默认的 1.4 历史复演 + 3.1 合成反事实切片。
- `data/scenarios/zzz-tv-mode-vertical-slice.json`：保留的旧 TV Mode 技术切片，不再作为默认入口。
- `src/evidence-ledger.js`：证据等级、引用和默认编译包校验。
- `src/ai-provider.js`：服务端模型无关适配器，不把 Key 暴露到浏览器。
- `src/scenario-compiler.js`：证据受限的 AI 情景编译与参数绑定验证。
- `src/theory-agent.js`：Theory System 状态机、人工审批检查点、输入防篡改与内容寻址。
- `src/model.js`：42 天多层情景模拟与集合区间。
- `src/visualization-data.js`：渲染器无关的棋盘定位、正面/Reverse 通道与策略差值数据。
- `src/visualization-bundle.js`：浏览器可逐日随机访问的紧凑整数帧编码与解码器。
- `src/sensitivity-data.js`：聚合与分层假设敏感性区间的版本化编码及随机访问解码器。
- `experiments/output/visual-data-beta0.4.json`：3D 页面消费的确定性逐 Agent 回放、聚合与逐日分层敏感性数据包。
- `experiments/output/visual-data-manifest.json`：数据包字节长度、SHA-256 与能力边界清单。
- `simulation/`：Three.js 演化回放观察器（目录名为兼容 URL 保留），不属于 `roadshow/beta0.1`。
- `src/injective.js`：Injective EVM Testnet 配置、钱包连接与无私钥交易编码。
- `contracts/RiskCommitment.sol`：可编译的最小测试网承诺合约，尚未部署。
- `index.html`：可现场操作的情景比较、证据审计与测试网提交界面。
