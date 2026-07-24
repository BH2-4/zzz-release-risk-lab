# Project Agent Instructions

## Research and claims

- 联网调查优先使用博查 Web Search API；密钥只从 `BOCHA_API_KEY` 读取，不得回显或写入仓库。
- 所有研究结论必须绑定 `research/` 中的公开来源，并保留来源标题、网站、URL 与发布时间。
- 合成群体不得表述为真实玩家样本；情景风险指数不得表述为现实概率。

## Competition MVP boundary

- 赛前 MVP 的支持平台是当前 macOS 演示机。跨平台适配与跨平台复验属于赛后迭代。
- 赛前只做固定的《绝区零》1.4 渐隐历史事件与 3.1 合成反事实闭环。
- 复用现有确定性 125 代表、42 天推演和 3D 回放；不得把它们表述为已实现的混合认知 Agent 或能力涌现。
- 混合认知 Agent、关系/Reverse 涌现、新运行时驱动的 3D 与场景泛化均为赛后能力。

## Chain and credentials

- 不得自动部署 Injective 合约、切换主网、读取私钥或发起未经确认的交易。
- `.env.*`、Token、API Key、助记词与私钥不得读取、回显、暂存或提交。只允许检查文件是否被忽略、权限是否安全、变量是否存在。
- Injective 赛前闭环必须保持用户确认；TokenPlan/MiniMax 配置不提供任何链上授权。

## GSD workflow

- 使用完整 GSD discuss -> research -> plan -> checker -> execute -> test -> verify -> review 流程。
- 不得使用 `gsd--auto`。
- 依赖计划不得并行执行；只允许对后续计划做只读 preflight。
- 本地单用户文件系统边界采用协作写者契约：项目写命令必须遵守 parent-directory `flock`。
- 非协作、同 UID、可任意修改项目目录的恶意并发进程是明确 residual risk；不得宣称通用敌对文件系统事务安全。

## PR-first release gate

- 不得把已知红灯推送到 `main`。
- 固定顺序：实现完成 -> 独立审查无 BLOCKER/HIGH/MEDIUM -> 在当前 macOS 演示机上 `npm run build` -> `npm test` -> `npm run test:e2e` 全绿 -> push 功能分支 -> 创建 PR -> 单一 macOS GitHub Actions 复验 -> 合并 `main`。
- 每个本地阶段必须通过上述三门才可标记完成。
- 赛前 GitHub Actions 只能复验目标 macOS；当前 Ubuntu workflow 在改为 macOS runner 前不具备赛内验收效力。Linux/Windows jobs、操作系统矩阵及跨平台复验统一延后到赛后。
