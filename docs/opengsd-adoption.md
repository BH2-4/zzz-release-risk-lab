# OpenGSD 接入边界

状态：本里程碑暂不安装

核验版本：`@opengsd/gsd-core@1.8.0`

日期：2026-07-23

## 它在本项目中的角色

OpenGSD 是 AI 编码过程的上下文工程与规格驱动工作流，不是 3D 引擎、社会模拟器或浏览器运行时依赖。它适合在后续里程碑管理讨论、规划、执行、验证和交付，但不应进入网页的 `dependencies`，也不能替代模型数据契约。

## 为什么现在不安装

官方安装器会为 Codex 添加技能、Agent 与命令。这个动作需要重启 Codex 才能可靠生效；在正在实现和验证的里程碑中途安装，会让同一次交付跨越两套执行环境。因此本次只记录采用决定，待当前 3D 演化观察器与 Beta 0.3 数据有干净提交后再接入。

## 下一里程碑的接入顺序

1. 确认工作树干净，并保留当前 E2E 基线。
2. 先用 `npx @opengsd/gsd-core@1.8.0 --help` 复核该版本参数。
3. 执行计划命令：`npx @opengsd/gsd-core@1.8.0 --codex --local`。
4. 重启 Codex。
5. 对现有仓库运行 `/gsd-onboard`，采用 brownfield 流程，不重新初始化业务代码。
6. 首个 GSD phase 只处理 Reverse 声量数据接入或历史回测之一，不能同时扩大两项范围。

## 验收

- 安装产物只影响本地 Agent 工作流，不进入前端产物。
- `npm test` 与 3D Playwright 基线在接入前后保持通过。
- 新增的 GSD 规格必须引用 `docs/visualization-data-contract.md` 的不可伪造边界。

## 来源

| 标题 | 网站 | URL | 发布时间 |
| --- | --- | --- | --- |
| GSD Core README | GitHub / open-gsd/gsd-core | https://github.com/open-gsd/gsd-core | 页面未注明；2026-07-23 核验 |
| @opengsd/gsd-core 1.8.0 | npm Registry | https://www.npmjs.com/package/@opengsd/gsd-core/v/1.8.0 | 2026-07-22 |

官方 README 明确要求使用安装器完成跨运行时安装，并为现有代码库提供 `/gsd-onboard`；npm 元数据确认 1.8.0 要求 Node.js 22 及以上。本机当前 Node.js 为 26，满足前置条件。
