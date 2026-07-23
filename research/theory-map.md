# 社会学理论到模型参数的映射

更新时间：2026-07-23

元数据状态：六篇均经 Crossref 核验
用途：MVP 的可解释机制，不是对理论的完整计算社会科学复刻

## 映射总表

| 理论构件 | 在沙盘中回答的问题 | 当前参数/机制 | 可观察的公开代理变量 | 主要限制 |
| --- | --- | --- | --- | --- |
| 相对剥夺 | 玩家为何把“少”理解为“不公平” | `economic`、`social` 触发强度；后续 `fairnessGap` | 公告承诺与实际奖励差距、跨区补偿差异、公开讨论中的比较对象 | 讨论量不等于人群比例 |
| 框架理论 | 同一变更被描述成 bug 修复、削弱还是程序不公 | 五领域触发向量；后续 `frameMix` | 官方公告措辞、媒体标题、社区高频归因 | LLM 标注需人工复核 |
| 集体行为阈值 | 为什么早期少数意见会突然越过群体临界点 | 每个合成角色的 `threshold`、`influence` | 转发/评论网络的时间序列与集中度 | 当前拓扑为简化网络，不是真实社交图 |
| 连接行动 | 个性化表达如何在松散网络中汇聚 | `networkActivity`、网络动量、国际层溢出 | 跨平台标签、模因、创作者接力、跨语种复述 | 平台 API 缺失会造成观测偏差 |
| 情境危机沟通 | 责任归因与应对方式是否匹配 | `controllability`、`priorCrisis`、响应延迟、透明度、纠正与补偿 | 响应时间、是否解释、是否回退、是否补偿 | 参数关系为启发式，尚未历史校准 |
| 利益相关者显著性 | 哪些声音应先被发行团队处理 | `influence`；后续权力/合法性/紧迫性三元评分 | 社区规模、议题相关性、时间敏感性、制度角色 | “影响力”不得等同“意见更正确” |

## T1 集体行为阈值

- 标题：*Threshold Models of Collective Behavior*
- 作者：Mark Granovetter
- 期刊：American Journal of Sociology
- 发布：1978-05
- 网站：University of Chicago Press / DOI
- URL：https://doi.org/10.1086/226707
- 证据等级：A
- 模型用法：每个合成角色拥有不同阈值；网络平均风险越过阈值后，角色影响力才放大传播。

## T2 框架理论

- 标题：*Framing: Toward Clarification of a Fractured Paradigm*
- 作者：Robert M. Entman
- 期刊：Journal of Communication
- 发布：1993-12-01
- 网站：Oxford University Press / DOI
- URL：https://doi.org/10.1111/j.1460-2466.1993.tb01304.x
- 证据等级：A
- 模型用法：把公开文本中的问题定义、因果归因、道德评价和解决建议映射到领域触发；不直接从情绪词推断现实风险。

## T3 情境危机沟通理论（SCCT）

- 标题：*Protecting Organization Reputations During a Crisis: The Development and Application of Situational Crisis Communication Theory*
- 作者：W. Timothy Coombs
- 期刊：Corporate Reputation Review
- 发布：2007-09
- 网站：Springer / DOI
- URL：https://doi.org/10.1057/palgrave.crr.1550049
- 证据等级：A
- 模型用法：将可控性、既往危机与响应延迟作为风险压力，将透明、纠正、补偿和参与作为缓解输入。

## T4 连接行动逻辑

- 标题：*The Logic of Connective Action*
- 作者：W. Lance Bennett、Alexandra Segerberg
- 期刊：Information, Communication & Society
- 发布：2012-06
- 网站：Taylor & Francis / DOI
- URL：https://doi.org/10.1080/1369118X.2012.670661
- 证据等级：A
- 模型用法：解释无需强组织中心的跨平台扩散，将个体网络活跃度与国际层溢出显式建模。

## T5 相对剥夺

- 标题：*Relative Deprivation*
- 作者：Heather J. Smith、Thomas F. Pettigrew、Gina M. Pippin、Silvana Bialosiewicz
- 期刊：Personality and Social Psychology Review
- 发布：2011-12-22
- 网站：SAGE / DOI
- URL：https://doi.org/10.1177/1088868311430825
- 证据等级：A
- 模型用法：把“期待与结果”“本区与他区”“过去与现在”的可见差距视为公平感输入，而非单纯奖励绝对值。

## T6 利益相关者显著性

- 标题：*Toward a Theory of Stakeholder Identification and Salience: Defining the Principle of Who and What Really Counts*
- 作者：Ronald K. Mitchell、Bradley R. Agle、Donna J. Wood
- 期刊：The Academy of Management Review
- 发布：1997-10
- 网站：Academy of Management / DOI
- URL：https://doi.org/10.2307/259247
- 证据等级：A
- 模型用法：后续把权力、合法性和紧迫性拆开评分，避免单用声量决定响应优先级。

## 尚未实现

- 基于公开文本的框架自动标注与人工复核队列。
- 权力/合法性/紧迫性三元利益相关者评分。
- 真实历史时间序列的参数校准和留出回测。
- 多语种语义等价与翻译漂移测量。
