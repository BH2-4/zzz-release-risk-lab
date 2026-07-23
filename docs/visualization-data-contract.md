# 3D 前端可视化数据契约

状态：`Beta 0.2`
数据契约：`agent-trace/1.1`（可解释模式）→ `visual-comparison/1.0` → `visual-bundle/1.0`

## 目标

让模拟器产生真实的逐 Agent 时间线，再由独立 Three.js 场景消费经过定点编码和完整性校验的数据。渲染器不得自行编造风险、声量、情绪或 Agent 关系。

## 四层数据

1. `runSimulation()`：保留原有轻量聚合输出，用于仪表盘和集合实验。
2. `runSimulationTrace({ includeDrivers: true })`：额外输出 42 帧、125 个 Agent 状态及 13 项有符号公式贡献。
3. `createVisualComparison()`：把模型状态映射成渲染器无关的棋盘、正面、Reverse、驱动项和策略差值契约。
4. `createVisualBundle()`：把对齐后的帧编码成固定宽度整数数组，供浏览器按天解码；不添加模型判断。

`runSimulation()` 默认不返回 `agentTimeline`，避免 100 次集合实验为不使用的视觉数据分配内存。

Trace 同时包含 `simulationSeed` 和 `populationFingerprint`。指纹覆盖 Agent 顺序、身份、阈值、信任、影响力与网络活跃度；前端适配器会拒绝与 Trace 不一致的群体，防止棋子身份与模拟状态错配。该 FNV-1a 指纹只用于确定性一致性检查，不是密码学承诺。

## Agent trace 字段

| 字段 | 范围 | 语义 |
| --- | --- | --- |
| `risk` | `0..1` | 响应缓冲后的逐 Agent 残余情景风险 |
| `pressure` | `0..1` | 应用响应缓冲前的模型压力 |
| `networkPressure` | `0..1` | 网络放大机制对当前 Agent 的压力贡献 |
| `responseBuffer` | `0..1` | 当日公开响应对该 Agent 的模型缓冲 |

可解释模式的 13 个 `drivers` 之和必须等于该 Agent 展示风险。它们解释的是模型公式，不是对现实因果关系的证明。

这些数值仍是模型情景指数，不是真实世界概率、人数或帖子数。

## 棋盘定位

125 个合成 Agent 形成完整的 `5 x 5 x 5` 组合：

- `row`：社会层级（个人、群体、地区、国家、国际）。
- `column`：议题领域（经济、政治、文化、社会、互联网）。
- `slot`：地区槽位（东亚、北美、欧洲、东南亚、拉丁美洲）。

数据层只提供语义槽位，不提供 Three.js 世界坐标。相机角度、棋盘间距和移动端重排属于渲染器职责。

## 正面与 Reverse

`front.integrity` 与 `front.dissolve` 是由 `risk` 派生的有界视觉通道：

- 低于阈值的日常波动不会造成明显消融。
- `integrity` 最低保留 `0.2`，避免把合成群体绘制成“消失”。
- 映射只改变视觉通道，不回写或改变模型值。

`reverse.voice` 和 `reverse.heat` 当前固定为 `null`，`status` 为 `unavailable`。现有 `networkActivity` 是 Agent 的静态特征，不能当作真实声量。

## 策略比较

`createVisualComparison()` 要求两个策略使用相同：

- 情景 ID。
- 随机种子。
- 周期长度。
- Agent 总体与身份。

输出同时包含 `baseline`、`candidate` 和 `deltaFrames`。这使前端可以用单棋盘切换三种模式，无需在渲染循环中计算业务差值。

## 前端接入规则

- 按 `id` 关联棋子和帧状态，不依赖数组位置作为身份。
- 时间轴只读取 `frames[day - 1]`，不在前端重跑模拟。
- Reverse 为 `unavailable` 时只能显示中性占位或关闭，不得呈现黑到红的数据动画。
- `relationEdges` 为 `unavailable` 时不得绘制 Agent 间传播边。
- 渲染器可以平滑插值帧之间的视觉数值，但点击查看时必须显示原始日帧数据。
- 差值模式使用候选方案的几何状态，仅用 `riskDelta` 表示改善、持平或恶化颜色。
- 任何字段语义变更都必须升级 `schemaVersion`。

## 产物与复现

```bash
npm run experiment:visual
```

产物：

- `experiments/output/visual-data-beta0.2.json`：约 1.08 MB 的紧凑数据包。
- `experiments/output/visual-data-manifest.json`：字节长度、SHA-256、125 个 Agent 与 42 天能力声明。

浏览器必须先校验清单，再创建 3D 场景。脚本不写入时间戳；相同代码、参数与种子会生成完全一致的字节。

旧版完整对象帧仍可用 `npm run experiment:visual:v1` 生成，供调试契约本身；3D 运行页只读取 Beta 0.2，不读取路演文件。
