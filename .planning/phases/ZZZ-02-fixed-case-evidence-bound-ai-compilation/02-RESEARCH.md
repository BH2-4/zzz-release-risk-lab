# Phase 2: Fixed-Case Evidence-Bound AI Compilation - Research

**Generated:** 2026-07-24
**Method:** Bocha Web Search API for candidate discovery, followed by official/original-source verification
**Confidence:** Medium-high for provider contract; medium for ZZZ page-body claims because some official pages were region-blocked or JavaScript-rendered

## Research Questions

1. Which documented MiniMax M2.7 OpenAI-compatible contract can safely support one auditable Node request?
2. Does M2.7 officially support `response_format` or JSON Schema on `/v1/chat/completions`?
3. Which official sources support the ZZZ 1.4 fading event and Version 3.1 Lucy outfit context?
4. Is there direct Japanese source parity for the exact Lucy outfit claim?

## Findings

### MiniMax M2.7 transport

- MiniMax documents `POST /v1/chat/completions` on `https://api.minimaxi.com`, with OpenAI SDK base URL `https://api.minimaxi.com/v1`.
- The documented model enum includes `MiniMax-M2.7` and `MiniMax-M2.7-highspeed`.
- `reasoning_split` is documented. It separates reasoning into `reasoning_content` and `reasoning_details`; it does not disable reasoning.
- Without split reasoning, official examples show `<think>...</think>` in `choices[].message.content`.
- Successful responses contain a top-level body `id`. A header `trace_id` is documented for support diagnostics, but an OpenAI-style `x-request-id` header was not found in the verified official chat-completions documentation.

### Structured output boundary

- The verified OpenAI-compatible M2.7 chat-completions schema does not document `response_format`.
- A separate legacy text endpoint documents `response_format: { type: json_schema }` only for `MiniMax-Text-01`.
- Therefore the repository must not claim M2.7 JSON Schema support. It should request one JSON object in prompt text, normalize documented reasoning wrappers, parse JSON once, and rely on the existing local schema/claim validators.

### ZZZ fixed case

- The official 1.4 known-issues article identifies agents appearing partially transparent or faded at particular camera angles and states that a later fix was planned.
- The checked-in approved ledger directly verifies the official zh-CN claim that participating in `Summer Waves Arrive` provides Lucy's swimsuit outfit `Princess Holiday` for free.
- Search discovery surfaced an official English Version 3.1 page, but its JavaScript-rendered body was not directly extracted and the indexed English outfit label conflicted with the approved zh-CN claim. It is therefore candidate context only and is not direct evidence for the exact outfit claim.
- Japanese official pages establish Version 3.1 program context and Lucy's official character identity, but not the exact approved outfit sentence.
- Phase 2 must report direct zh-CN support for the exact outfit claim and direct en/direct ja as unavailable. Candidate, translated, or contextual pages may not be promoted to direct claim evidence.

## Source Register

| Title | Site | URL | Published | Accessed | Language | Tier | Supports | Limitations |
|-------|------|-----|-----------|----------|----------|------|----------|-------------|
| Chat Completions API | MiniMax Docs | https://platform.minimaxi.com/docs/api-reference/text-chat-openai.md | Not shown | 2026-07-24 | zh-CN | Official docs | Endpoint, model IDs, `reasoning_split`, `<think>` example, body `id` | Does not document M2.7 `response_format` |
| OpenAI SDK | MiniMax Docs | https://platform.minimaxi.com/docs/api-reference/text-openai-api.md | Not shown | 2026-07-24 | zh-CN | Official docs | SDK base URL, split reasoning, M-series `<think>` behavior | Retrieved examples were primarily Python |
| 错误码查询 | MiniMax Docs | https://platform.minimaxi.com/docs/api-reference/errorcode.md | Not shown | 2026-07-24 | zh-CN | Official docs | Header `trace_id` support guidance | Does not establish `x-request-id` |
| 文本生成 | MiniMax Docs | https://platform.minimaxi.com/docs/api-reference/text-post.md | Not shown | 2026-07-24 | zh-CN | Official docs | `MiniMax-Text-01` legacy JSON Schema boundary | Not an M2.7 chat-completions contract |
| Zenless Zone Zero Version 1.4 Known Issues and In-Game Optimization | HoYoLAB | https://www.hoyolab.com/article/35695591 | 2024-12-18 | 2026-07-24 | en | Official game community | 1.4 special-angle transparency/fading issue | Live page returned regional 403; official indexed content was used for verification |
| Rewards Overview for Version 3.1 | Zenless Zone Zero Official Site | https://zenless.hoyoverse.com/en-us/news/165249 | 2026-07-18 | 2026-07-24 | en | Official game site candidate | English Version 3.1 context only | Body was not directly extracted; discovered outfit wording conflicted with the approved zh-CN `Princess Holiday` claim, so it is not admitted as direct outfit evidence |
| 『ゼンレスゾーンゼロ』Ver.3.1予告番組「The Long Goodbye」配信登録してポリクロームと名刺をゲットしよう | Zenless Zone Zero Official Site | https://zenless.hoyoverse.com/ja-jp/news/165250 | 2026-07-17 | 2026-07-24 | ja | Official game site | Japanese official Version 3.1 context | Does not state the Lucy outfit claim |
| ルーシー | Zenless Zone Zero Official Site | https://zenless.hoyoverse.com/ja-jp/character/detail?id=138378 | Not shown | 2026-07-24 | ja | Official game site | Japanese official Lucy identity | Does not state the Version 3.1 outfit claim |

## Planning Consequences

- Add M2.7-specific request/response normalization without weakening the compiled-scenario validator.
- Do not send undocumented `response_format` for the M2.7 path.
- Capture body `id` and optional `trace_id` in provenance; never fabricate missing metadata.
- Add tests for split reasoning, leading `<think>` removal, malformed JSON, missing response `id`, and secret-safe errors.
- Preserve the exact-outfit boundary in the artifact and model card: direct zh-CN only; direct en/direct ja unavailable.
