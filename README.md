# ZZZ Release Risk Lab / 绝区零地区发行风险沙盘

> ProgramE · 3D 演化展示 Beta 0.2 · 非官方研究原型

一个用社会学理论、公开历史案例和合成利益相关者，对《绝区零》下一个 42 天全球发行周期进行情景压力测试的 MVP。

## 一句话

它不回答“下个版本会不会爆发公关危机”，而是回答：

> 如果同一个发行决策同时触发公平感、群体身份、文化代表和社交网络扩散，哪些地区与群体的风险会先上升，哪种发行应对最可能缓解它？

## MVP 边界

- 合成群体不是真实玩家样本，不具有人口统计代表性。
- 输出是情景风险、相对比较与参数敏感性，不是现实世界概率预测。
- 不对国家、族群或文化群体贴本质化标签；地区参数必须有公开证据或显式标记为夹具。
- Injective 只使用测试网与无经济价值的测试代币；不保存私钥，不实现现金或投机市场。
- 项目与米哈游、HoYoverse 和 Injective 无隶属或授权关系。

## 双赛道验收

- 米哈游：可现场运行，咬住 42 天、多语同步与地区差异，只用公开数据。
- Injective：必须真实集成测试网或主网；最终 Demo 不能只有本地假代币。

## 开发状态

- [x] 旧方向归档
- [x] 学术映射与分级历史危机样本
- [x] 百人级合成利益相关者
- [x] 42 天多层扩散引擎
- [x] Round-0 快速实验与一代校准
- [x] 42 天逐 Agent 可视回放数据与 Reverse 空值契约
- [x] 独立 3D 演化沙盘（125 个棋子、42 天播放、策略差值与 Agent 下钻）
- [x] 现场可操作界面（桌面与移动端 E2E 已通过）
- [ ] Injective 测试网承诺记录
- [x] 公开 GitHub 仓库

## 提交材料

- [米哈游赛道一页说明](docs/one-page.md)
- [商业路演版本索引](roadshow/README.md)
- [可直接播放的路演 Beta 0.1](roadshow/beta0.1/index.html)
- [Beta 0.1 完整讲稿](roadshow/beta0.1/speaker-notes.md)
- [系统架构与信任边界](docs/architecture.md)
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
npm run experiment
npm run experiment:visual
npm run test:e2e
npm start
```

浏览器打开：

- `http://127.0.0.1:4173/`：参数实验、证据库与 Injective 工作台。
- `http://127.0.0.1:4173/simulation/`：独立的 42 天 3D 演化展示；不加载路演目录。

- [Round-0 实验记录](experiments/round-0.md)
- [研究库与证据等级](research/README.md)
- `src/model.js`：42 天多层情景模拟与集合区间。
- `src/visualization-data.js`：渲染器无关的棋盘定位、正面/Reverse 通道与策略差值数据。
- `src/visualization-bundle.js`：浏览器可逐日随机访问的紧凑整数帧编码与解码器。
- `experiments/output/visual-data-beta0.2.json`：由 3D 页面直接消费的确定性演化数据包。
- `experiments/output/visual-data-manifest.json`：数据包字节长度、SHA-256 与能力边界清单。
- `simulation/`：Three.js 运行态演化沙盘，不属于 `roadshow/beta0.1`。
- `src/injective.js`：Injective EVM Testnet 配置、钱包连接与无私钥交易编码。
- `contracts/RiskCommitment.sol`：可编译的最小测试网承诺合约，尚未部署。
- `index.html`：可现场操作的情景比较、证据审计与测试网提交界面。
