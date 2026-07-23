# 3D 引擎选型记录

状态：已采用

日期：2026-07-23

决定：使用锁定版本 `three@0.185.1`，直接以浏览器 ES Modules 构建独立 `/simulation/` 页面。

## 要解决的不是路演 3D 化

这块前端用于观察一个 42 天发行周期如何推进：125 个合成 Agent 从常态进入事件冲击，再进入响应和恢复。它与 `roadshow/beta0.1` 是两个产品面，前者是可操作的运行态观察器，后者是 3-5 分钟讲述材料。

## 为什么选择 Three.js

| 需求 | Three.js 对应实现 |
| --- | --- |
| 同时绘制 125 个棋子及压力、碎片 | 五个 `InstancedMesh` 复用五类棋子几何，额外效果也使用实例化 |
| 棋子形态必须不同 | `BufferGeometryUtils.mergeGeometries()` 合并圆柱、圆环、多面体等程序化部件 |
| 45-60 度观察，不是 90 度俯视 | `PerspectiveCamera` 与受限极角的 `OrbitControls` |
| 点击单个代表者 | `Raycaster` 返回实例编号，再映射到稳定 Agent ID |
| 42 天连续变化 | 业务帧保持逐日离散，渲染层只在相邻两天之间做视觉插值 |
| 现场离线、快速加载 | 无外部 3D 模型和纹理请求；运行依赖随项目锁定 |

官方对 `InstancedMesh` 的定位是：在大量对象共享几何体和材质、但拥有不同世界变换时减少 draw call。这个结构正好对应“同一社会层级共享一种棋子轮廓、每个 Agent 状态不同”。

## 没有选择的方案

| 方案 | 本阶段不采用的原因 |
| --- | --- |
| React Three Fiber | 当前应用不是 React 项目；引入 React 只为包装已有 Three.js API，会扩大构建与状态边界 |
| Babylon.js | 完整引擎能力更广，但本 MVP 不需要物理、场景编辑器或资产管线，收益不足以抵消迁移成本 |
| Unity WebGL | 构建体积、启动路径和浏览器数据联调更重，不利于现场快速打开和审计 JSON 契约 |
| CSS 3D / Canvas 2D | 难以同时提供实体遮挡、程序化棋子、空间碎片和稳定的轨道相机交互 |

这不是对其他引擎的一般性优劣结论，只是针对当前 125 个实例、一个棋盘、一个浏览器数据包的约束选择。

## 实现边界

- Reverse 只绘制独立黑色静态暗面。`voice` 与 `heat` 未建模，因此不能由黑变红。
- 当前网络项来自群体均值放大，不是 Agent 间边，因此场景不绘制传播连线。
- 正面风险控制倾斜、缩放与碎片分离；点击面板始终回到原始日帧，不显示插值数值。
- 差值视图使用候选方案的实体状态；绿色表示相对沉默方案风险下降，红色表示上升。

## 来源

| 标题 | 网站 | URL | 发布时间 |
| --- | --- | --- | --- |
| InstancedMesh | Three.js 官方文档 | https://threejs.org/docs/#InstancedMesh | 页面未注明；2026-07-23 核验 |
| OrbitControls | Three.js 官方文档 | https://threejs.org/docs/#OrbitControls | 页面未注明；2026-07-23 核验 |
| three.js r185 | GitHub / mrdoob/three.js | https://github.com/mrdoob/three.js/releases/tag/r185 | 2026-07-01 |

候选来源首先通过博查 Web Search API 发现；由于结果混入较多二手教程，最终判断只使用以上官方来源和仓库内锁定的 `three@0.185.1` 源码。
