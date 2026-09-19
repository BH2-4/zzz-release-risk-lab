# TokenPlan / MiniMax M2.7 项目备忘录

## 用途

本项目通过 OpenAI-compatible provider 调用外部模型。TokenPlan 上的 MiniMax M2.7 应复用现有三项服务端环境变量，不新增另一套密钥命名：

| 项目变量 | 填写内容 |
|---|---|
| `PROGRAM_E_AI_BASE_URL` | `https://api.minimaxi.com/v1` |
| `PROGRAM_E_AI_API_KEY` | TokenPlan API Token |
| `PROGRAM_E_AI_MODEL` | `MiniMax-M2.7` |
| `PROGRAM_E_AI_OUTPUT` | 可选的项目内输出路径 |

以上 Base URL 与模型 ID 已于 2026-07-24 根据 MiniMax 官方 OpenAI SDK 和模型概览文档核验。

## 本地密钥文件

本地文件位于项目根目录：

```text
.env.tokenplan.local
```

该文件符合 `.gitignore` 中的 `.env.*` 规则，不会被 Git 跟踪。真实 Token 只能写入此文件或操作系统/部署平台的 Secret Store，不得写入 `.env.example`、源代码、测试、文档、Issue、提交信息或终端截图。

建议将文件权限保持为仅当前用户可读写：

```bash
chmod 600 .env.tokenplan.local
```

## 当前终端加载

项目不会自动读取 dotenv 文件。每次新开终端后，从项目根目录显式加载：

```bash
set -a
source .env.tokenplan.local
set +a
```

只检查变量是否存在，不回显真实值：

```bash
for name in PROGRAM_E_AI_BASE_URL PROGRAM_E_AI_API_KEY PROGRAM_E_AI_MODEL; do
  if [[ -n "${(P)name}" ]]; then
    echo "$name configured"
  else
    echo "$name missing"
  fi
done
```

## 调用路径

这三个变量由以下服务端 CLI 使用：

- `scripts/run-theory-agent.js`：Theory Agent 的真实模型映射路径。
- `scripts/compile-scenario.js`：证据约束的真实模型场景编译路径。
- `src/ai-provider.js`：向 `${PROGRAM_E_AI_BASE_URL}/chat/completions` 发送 Bearer Token 请求。

调用必须在 Phase 2 的真实模型验证阶段进行。当前 Phase 1 的 deterministic fixture 必须继续标记为 `realModelUsed: false`，不能仅因本地存在 Token 就改写 provenance。

## MiniMax M2.7 适配前置项

本地凭据配置已经完整，但当前通用 provider 还不能直接视为已通过 MiniMax M2.7 的真实调用验证：

1. MiniMax 官方文档说明 M2.x 的 thinking 无法关闭；原生 Chat Completions 响应可能把 thinking 放在 `content` 的 `<think>...</think>` 中。
2. 当前 `src/ai-provider.js` 直接把完整 `content` 当作 JSON 解析，尚未启用 MiniMax 的 `reasoning_split: true`。
3. 当前 provider 默认发送 `response_format: { type: "json_object" }`，但 MiniMax 官方 `ChatCompletionReq` schema 未声明该参数。

因此 Phase 2 首次真实调用前应先完成 MiniMax provider 适配：启用 `reasoning_split`、从最终文本字段解析 JSON，并取消或验证 `response_format`。在适配器测试通过前，不应消耗 TokenPlan 额度生成权威产物。

## 调用前检查

1. Base URL 必须是 HTTPS；只有 loopback 地址允许 HTTP。
2. 模型必须支持 OpenAI-compatible `chat/completions`，并能返回 JSON object。
3. Token 不得进入浏览器端 `app.js`、`simulation/`、构建产物或公开日志。
4. 首次调用先使用最小额度，确认 TokenPlan 的计费、限流和模型 ID。
5. 不在同一操作中执行 Injective 部署、钱包连接或交易。

确认本地密钥文件确实被忽略：

```bash
git check-ignore -v .env.tokenplan.local
git status --short
```

`git status` 不应列出 `.env.tokenplan.local`。

## 泄漏与轮换

如果 Token 曾出现在 Git、日志、截图或聊天内容中：

1. 立即在 TokenPlan 控制台撤销该 Token。
2. 创建新 Token 并只更新本地 `.env.tokenplan.local` 或部署平台 Secret Store。
3. 检查 Git 历史和 CI 日志；仅从当前文件删除并不能使旧 Token 失效。
4. 记录泄漏发生时间、撤销时间和受影响的调用范围，但不要记录 Token 本身。

## 项目约束

- 真实模型产物必须记录 `live-model` provenance 和可核验的模型标识。
- 公开证据、翻译内容和合成假设必须保持分层，不得让模型补造引用。
- 合成群体不是现实玩家样本；风险指数不是现实概率。
- Injective 操作仍需单独人工确认，TokenPlan Token 不提供任何链上授权。

## 官方资料

- [文档索引](https://platform.minimaxi.com/docs/llms.txt)
- [模型概览](https://platform.minimaxi.com/docs/guides/models-intro)
- [OpenAI SDK](https://platform.minimaxi.com/docs/api-reference/text-openai-api)
- [Chat Completions API](https://platform.minimaxi.com/docs/api-reference/text-chat-openai)
- [Token Plan 快速接入](https://platform.minimaxi.com/docs/token-plan/quickstart)
