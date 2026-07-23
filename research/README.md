# 研究库索引

本目录是沙盘的“证据层”，用于把学术概念、公开历史案例和链上技术要求分开管理。它不负责证明模型具有现实预测能力。

## 文件

- [核心理论栈](theory-library/core-stack.md)：Framing、SCCT、STOPS、Threshold、SMCC、SARF 六项核心机制。
- [条件理论模块](theory-library/conditional-modules.md)：沉默螺旋、相对剥夺、利益相关者显著性、连接行动、Image Repair 五项条件机制。
- [学术来源登记表](theory-library/source-register.md)：11 项理论的题名、网站/出版社、URL 与发布时间。
- [建模与推断边界](theory-library/modeling-boundaries.md)：历史复演、3.1 迁移和禁止外推规则。
- [旧社会学理论映射](theory-map.md)：早期六构件参数映射说明，保留作历史参考。
- [历史案例账本](crisis-cases.md)：公开争议案例、来源等级和可建模边界。
- [1.4 渐隐到 3.1 的默认案例](cases/zzz-1.4-fade/README.md)：时间线、来源登记和反事实边界。
- [Injective 技术核验](injective.md)：测试网、钱包、合约与验收状态。
- [模型卡](model-card.md)：模型目的、输入、输出、局限与禁用场景。
- [2026-07-23 检索日志](search-log-2026-07-23.md)：博查候选发现、原文可访问性和证据升降级记录。
- [`../data/evidence/ledger.json`](../data/evidence/ledger.json)：运行时消费的来源与 Claim 账本。
- [`../data/evidence/theory-catalog.json`](../data/evidence/theory-catalog.json)：运行时消费的理论白名单。
- [`../data/evidence/reviews/zzz-1-4-fade-evidence-review.json`](../data/evidence/reviews/zzz-1-4-fade-evidence-review.json)：人工 Evidence Review 与提取摘要绑定。
- [`../experiments/output/theory/zzz-1-4-fade-run.json`](../experiments/output/theory/zzz-1-4-fade-run.json)：人工批准后生成的内容寻址 Theory System；当前为确定性夹具运行。

## 当前首切片

默认垂直切片复演《绝区零》1.4 “特定视角渐隐”事件，并把机制迁移到 3.1 露西时装的合成反事实压力测试。历史事实来自 `@ZZZ_EN` 官方公告（A）；拥有感 frame 来自游民星空可直接读取的媒体记录（B）；3.1 产品环境来自 HoYoverse 官方福利页（A）。

HoYoverse 官方页《3.1版本「绝区零二周年庆典」福利速递》发布于 2026-07-17 20:25:00 UTC+8，写明参与活动“恰浪花逐夏而至”可免费领取露西泳装“公主假日”。它只证明产品环境，不证明时装会渐隐、会引发危机或存在任何发生概率。以本项目研究时点 2026-07-24 计，3.1 尚未上线。

`data/scenarios/zzz-tv-mode-vertical-slice.json` 是旧 TV Mode 切片，继续保留作技术回归，不再是默认编译入口。中英材料已经进入本切片，日文直接材料和三语语义比较仍是证据缺口。

## 理论自动化状态

- 11 项理论目录已完成：6 项核心理论和 5 项按证据启用的条件理论。
- 本切片已完成人工 Evidence Review，把批准的提取 proposal 解析到证据账本 Claim，并用 SHA-256 绑定输入。
- Theory System Agent 已实现提议、审计、人工暂停/批准/退修/拒绝、恢复、目录缺口阻断和内容寻址。
- 当前离线运行已生成 `theory-system:sha256:*`，但 provenance 是 `deterministic-fixture`、`realModelUsed: false`。
- 真实模型情景编译与具备记忆、关系、目标和公开表达的真实多 Agent 运行时仍未完成。

## 证据等级

| 等级 | 定义 | 当前允许用途 |
| --- | --- | --- |
| A | 官方页面、原始论文、Crossref DOI 元数据 | 定义理论构件、技术参数或事实字段 |
| B | 可直接读取的专业媒体原创报道 | 构建历史情景，但必须保留转述误差说明 |
| C | 搜索索引、社区讨论、无法直接读取的报道 | 只能作为检索线索或明确标记的实验夹具 |
| F | 无来源或来源冲突 | 不进入默认 Demo |

## 模型使用规则

1. 来源事实与模型参数分开记录；报道说“发生了什么”，参数表达“本次实验假设多强”。
2. 地区参数不得来自国籍、族群或文化刻板印象。
3. 无真实回测时，只输出情景指数、策略差值和敏感性区间。
4. 新增案例必须记录标题、网站、URL、发布时间、访问时间和证据等级。
5. C/F 级来源不会解锁“预测准确率”声明。

## 本轮检索方法

- 候选发现：博查 Web Search API，2026-07-23；2026-07-24 继续核验默认渐隐切片。
- 学术核验：Crossref Works API 对 DOI 元数据逐条核验。
- 产品事实核验：直接读取 HoYoverse canonical 页面调用的官方公开内容 API；标题、正文与 `dtStartTime` 均来自官方接口。
- 技术核验：直接读取 Injective 官方文档、站点地图和测试网 RPC。
- 已知缺口：日文直接材料和三语 frame 对比尚未完成；未用搜索摘要或二次转载冒充官方原文。
