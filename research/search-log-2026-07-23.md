# 检索日志：2026-07-23

## 方法

- 候选发现：博查 Web Search API，自然语言检索与关键词扩展。
- 核验顺序：官方原文 > 可直接读取的专业媒体原创报道 > 搜索索引。
- 不可访问、重定向或只有搜索摘要的页面不升级证据等级。

## 已核验

### 那维莱特机制修复回退

- 标题：米哈游《原神》道歉：角色技能问题修复后回退、补偿 1600 原石
- 网站：IT之家
- URL：https://www.ithome.com/0/782/509.htm
- 发布时间：2024-07-18 01:32:08
- 访问结果：正文可直接读取，包含官方声明全文、回退决定与 1600 原石补偿。
- 结论：维持 B 级；未找到稳定的官方公告 URL，不升级为 A。

## 未升级

### 首周年奖励期待落差

- 标题：miHoYo responds to Genshin Impact 1st anniversary rewards backlash
- 网站：GINX TV
- URL：https://www.ginx.tv/en/genshin-impact/mihoyo-responds-to-genshin-impact-1st-anniversary-rewards-backlash
- 搜索索引发布时间：2021-10-03
- 访问结果：旧文章 URL 当前返回游戏资料聚合页，无法读取原文。
- 结论：维持 C 级研究夹具。

### 纳塔文化代表争议

- 标题：Genshin Impact's own voice actors join backlash at lack of representation in new region Natlan's character designs
- 网站：Eurogamer
- URL：https://www.eurogamer.net/hoyoverse-voice-actors-speak-out-over-lack-of-diversity-in-genshin-impact-natlan-character-designs
- 发布时间：2024-07-15
- 访问结果：博查可发现标题、摘要和日期；直接访问返回 403，未找到公司正式回应。
- 结论：维持 C 级，不将搜索摘要当作事实原文。

## 新检索线索：英文配音供应链欠薪

- 标题：Genshin Impact voice actors speak out over "inexcusable" lack of pay
- 网站：Eurogamer
- URL：https://www.eurogamer.net/genshin-impact-voice-actors-speak-out-over-inexcusable-lack-of-pay
- 发布时间：2023-07-14
- 博查索引内容：报道包含米哈游发言人回应，称已向录音工作室付款、要求工作室支付演员报酬，并寻求替代方案。
- 访问结果：直接访问返回 403；GINX 的同题旧文章当前重定向到资料聚合页。
- 结论：仅作为 C 级候选。它很适合研究多语种发行中的第三方供应商、劳动关系和版本同步风险，但在取得稳定原文前不进入默认 Demo。

## 第二轮：TV Mode 旧垂直切片

目标：优先找到与《绝区零》直接相关、可用于 42 天版本发行压力测试的历史机制。

候选发现通过博查 Web Search API 完成，随后尝试直接访问原始页面。

### 已直接核验并进入旧 TV Mode 编译包

1. Zenless Zone Zero would be brilliant if it didn't keep wasting your time
   - 网站：Eurogamer
   - URL：https://www.eurogamer.net/zenless-zone-zero-would-be-brilliant-if-it-didnt-keep-wasting-your-time
   - 发布时间：2023-12-16
   - 结果：页面可达；博查正文索引与原页支持“节奏问题主要归因于 TV Mode”的媒体观点。B 级。
2. Zenless Zone Zero is toning down its divisive "TV mode" after "a lot of negative feedback," which means I can finally try this painfully gorgeous action RPG
   - 网站：GamesRadar+
   - URL：https://www.gamesradar.com/games/action-rpg/zenless-zone-zero-is-toning-down-its-divisive-tv-mode-after-a-lot-of-negative-feedback-which-means-i-can-finally-try-this-painfully-gorgeous-action-rpg/
   - 发布时间：2024-09-24
   - 结果：原页 HTML、标题、发布日期、文章 deck 和开发者引述可直接核验。B 级。

### 官方与日文候选

1. Version 1.4 "A Storm of Falling Stars" Update Details
   - 网站：HoYoLAB / Zenless Zone Zero
   - URL：https://www.hoyolab.com/article/35654082
   - 发布时间：2024-12-17
   - 结果：官方 URL 已确认，但本轮页面和公开文章 API 均返回 `region_block`；不得因为域名是官方就假装已读正文。C 级。
2. 『ゼンレスゾーンゼロ』音楽プロデューサー独占インタビュー “元祖シティポップ”は「日本での仕事」がインスピレーションに
   - 网站：Real Sound Tech
   - URL：https://realsound.jp/tech/2024/12/post-1878217.html
   - 发布时间：2024-12-22
   - 结果：博查摘要含 1.4 大型更新背景，直接正文提取未完成。只作日文语料线索，C 级。

### 获取失败记录

- Jina Reader 对 HoYoLAB、GamesRadar+ 和 Eurogamer 请求均超时，未将其输出当作证据。
- HoYoLAB 公开文章 API 返回 403 `Denied by region_block`。
- 博查对 `site:` 限定的官方检索结果噪声较大，因此仅作候选发现，不直接证明事实。

## 2026-07-24 续查：默认渐隐垂直切片

目标：冻结 1.4 “特定视角渐隐”历史机制，并为 3.1 合成反事实取得直接官方产品环境证据。检索仍先用博查 Web Search API 发现候选，随后核验官方或原始来源。

### 1.4 官方修复公告

- 标题：Version 1.4 Known Issues & Fixes
- 网站：Zenless Zone Zero / X `@ZZZ_EN`
- URL：https://x.com/ZZZ_EN/status/1869404766096515126
- 发布时间：2024-12-18 15:30:02 UTC
- 核验：通过两个公开 X 镜像 API 交叉核对正文，正式登记保留 canonical X URL。
- 可证明：官方确认“特定视角下代理人渐隐”调整在部分情况下显示不正确并已修复；同一公告列出四项问题并为整份公告提供 300 菲林补偿。
- 不可证明：完全撤销渐隐调整、300 菲林只补偿渐隐、官方存在审查动机，或任何玩家意见比例。
- 结论：A 级，进入默认 Evidence Review。

### 3.1 露西时装官方产品事实

- 标题：3.1版本「绝区零二周年庆典」福利速递
- 网站：Zenless Zone Zero Official Site / HoYoverse
- Canonical URL：https://zenless.hoyoverse.com/zh-cn/news/165249
- 发布时间：2026-07-17 20:25:00 UTC+8（官方公开内容 API `dtStartTime`）
- 核验：canonical 页面为动态 Nuxt 页面；标题、正文和时间来自该页面调用的 HoYoverse 官方公开内容 API。正文写明“参与活动「恰浪花逐夏而至」免费领取露西泳装「公主假日」”。
- 可证明：3.1 存在上述活动与免费时装产品环境。
- 不可证明：该时装会渐隐、会出现显示异常、会引发争议，或存在任何危机发生概率和地区差异。
- 结论：A 级，替代 IT之家成为露西时装事实的主证据；IT之家继续保留为 B 级旁证。

### 研究时点边界

以 2026-07-24 为研究时点，3.1 计划于 2026-07-29 上线，尚未发生。默认 Demo 中所有 3.1 渐隐、玩家 frame、传播路径和策略效果都必须标记为 `synthetic-counterfactual`。TV Mode 切片继续保留作旧技术基线，不再是默认编译入口。
