# API Coverage - MiniMax OpenAI-Compatible Surface

> Full coverage by default. Opt-outs are explicit because Phase 2 is a fixed single-call compiler, not a general MiniMax client.

| capability | decision | reason |
|------------|----------|--------|
| `POST /v1/chat/completions` non-streaming request | INTEGRATE | Required for the one real M2.7 compilation |
| `reasoning_split` response normalization | INTEGRATE | Required to keep hidden reasoning out of the compiled artifact |
| response body `id` provenance | INTEGRATE | Required by `AI-03` as the attributable request identifier |
| optional response header `trace_id` | INTEGRATE | Record only when supplied; useful for provider support diagnostics |
| usage metadata | OPT-OUT | Nonessential to AI-01..AI-04; ignoring it keeps the accepted provenance contract minimal |
| streaming | OPT-OUT | Partial JSON cannot satisfy the fail-closed artifact contract |
| tool calls / function calling | OPT-OUT | The fixed compiler uses no tools and must emit one JSON object |
| multi-turn conversations | OPT-OUT | Phase 2 is one stateless request |
| automatic retries / repair calls | OPT-OUT | Would break the explicit one-call audit boundary |
| embeddings | OPT-OUT | No RAG or vector retrieval in the fixed slice |
| image, audio, video generation | OPT-OUT | Not part of evidence-bound scenario compilation |
| fine-tuning | OPT-OUT | No model training in the competition MVP |
| file upload / batch APIs | OPT-OUT | Fixed checked-in public evidence is serialized directly by the trusted CLI |
| `response_format` / JSON Schema on M2.7 chat completions | OPT-OUT | Not established by the verified official M2.7 chat-completions documentation |
| main browser integration | OPT-OUT | Credentials stay in the trusted Node CLI and never enter browser code |
