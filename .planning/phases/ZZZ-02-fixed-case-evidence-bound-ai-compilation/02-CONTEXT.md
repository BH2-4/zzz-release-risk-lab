# Phase 2: Fixed-Case Evidence-Bound AI Compilation - Context

**Gathered:** 2026-07-24 (assumptions mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase produces and validates one attributable live-model compiled artifact for the checked-in `zzz-3-1-fade-risk-v1` slice. It binds the approved Phase 1 Theory System to verified public evidence and explicit synthetic assumptions. It does not generalize evidence intake, regenerate the Theory System, add hybrid Agent behavior, change the deterministic simulation, create new 3D channels, or perform any Injective action.

</domain>

<decisions>
## Implementation Decisions

### Fixed slice and authority
- **D-01:** Keep Phase 2 locked to `data/scenarios/zzz-3-1-fade-risk-vertical-slice.json`; arbitrary cases and non-synthetic scenario types remain disabled.
- **D-02:** Treat `theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912` as the frozen upstream authority. The one required live-model call compiles the scenario; it does not relabel the deterministic Theory Agent run as live AI.
- **D-03:** Reject a compiled artifact unless every model-produced fact, theory mapping, numeric parameter, and regional difference resolves to the approved Theory System, an accepted ledger claim, or a declared synthetic assumption.

### MiniMax M2.7 provider contract
- **D-04:** Support the documented OpenAI-compatible endpoint `POST https://api.minimaxi.com/v1/chat/completions` with model `MiniMax-M2.7` and `reasoning_split: true`.
- **D-05:** Do not depend on `response_format` or JSON Schema for M2.7 because current official chat-completions documentation does not establish support. Request one JSON object in the prompt, separate reasoning when available, strip a leading `<think>...</think>` block only at the provider boundary, then apply the repository's deterministic JSON and schema validators.
- **D-06:** Record the response body `id` as the provider request identifier. Record a response-header `trace_id` only when actually present; do not invent or require an undocumented `x-request-id` header.
- **D-07:** Browser code never receives provider credentials. The trusted Node CLI reads only `PROGRAM_E_AI_BASE_URL`, `PROGRAM_E_AI_API_KEY`, and `PROGRAM_E_AI_MODEL`; logs and artifacts must not contain the key, request Authorization header, or hidden reasoning.

### Evidence and language boundary
- **D-08:** Keep three categories visibly separate: verified 1.4 historical facts, verified 3.1 product-context facts, and the 3.1 fade-risk `synthetic-counterfactual` assumption.
- **D-09:** Preserve evidence language and translation metadata. Chinese, English, and Japanese inputs may all be reviewed, but machine translation is not direct evidence. The approved ledger establishes the exact Lucy outfit claim (`Princess Holiday`) directly in zh-CN only; direct en and direct ja support for that exact claim are unavailable.
- **D-10:** Regional factors stay exactly `1.0` unless direct approved regional evidence exists. No region-specific stereotype or inferred player parameter may be generated.

### Completion and operator boundary
- **D-11:** Implement and test the provider and validation path without credentials first. Immediately before the one live request, pause for the user to supply the three `PROGRAM_E_AI_*` variables through their local process; never read `.env.*` automatically.
- **D-12:** A deterministic or recorded fixture may support offline tests and demo fallback but can never satisfy `AI-01` or be described as the real-model artifact.
- **D-13:** Phase 2 completes only after one live artifact has valid provider/model/request ID, source digests, Theory System ID, validation state, and claim bindings, followed by green `npm run build`, `npm test`, and `npm run test:e2e` plus one independent hard-gate review with no BLOCKER/HIGH/MEDIUM.

### the agent's Discretion
The agent may choose internal helper boundaries, retry-free error wording, artifact filenames, and focused test organization. The user explicitly delegated GSD discuss, planning, implementation, and test decisions; the choices above use that authorization and retain the user's credential and chain confirmation boundaries.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and acceptance
- `.planning/REQUIREMENTS.md` - `AI-01` through `AI-04` acceptance requirements.
- `.planning/ROADMAP.md` - Phase 2 goal and success criteria.
- `docs/mvp-v1-spec.md` - frozen competition MVP boundary.
- `.planning/phases/ZZZ-01-trustworthy-theory-pipeline/01-CONTEXT.md` - locked provenance and delivery decisions.

### Existing implementation and data
- `src/ai-provider.js` - current OpenAI-compatible transport.
- `src/scenario-compiler.js` - structured prompt and fail-closed compiled-scenario validator.
- `src/compilation-pipeline.js` - Theory System, ledger, and fixed-slice binding.
- `scripts/compile-scenario.js` - trusted Node CLI and protected artifact handling.
- `data/evidence/ledger.json` - approved multilingual claims and synthetic assumptions.
- `data/evidence/theory-catalog.json` - versioned theory catalog.
- `data/scenarios/zzz-3-1-fade-risk-vertical-slice.json` - only enabled Phase 2 scenario.
- `experiments/output/theory/zzz-1-4-fade-run.json` - authoritative READY Theory Agent run.

### External primary references
- `https://platform.minimaxi.com/docs/api-reference/text-chat-openai.md` - official M2.7 chat-completions endpoint, models, `reasoning_split`, response `id`, and response examples.
- `https://platform.minimaxi.com/docs/api-reference/text-openai-api.md` - official OpenAI SDK compatibility and `<think>` behavior.
- `https://platform.minimaxi.com/docs/api-reference/errorcode.md` - official `trace_id` support guidance.
- `https://www.hoyolab.com/article/35695591` - official ZZZ 1.4 known-issues article, published 2024-12-18.
- `https://zenless.hoyoverse.com/en-us/news/165249` - official English Version 3.1 page candidate, published 2026-07-18; not accepted as direct evidence for the exact outfit claim because the body was not directly extracted and the discovered English label conflicted with the approved zh-CN claim.
- `https://zenless.hoyoverse.com/ja-jp/news/165250` - official Japanese Version 3.1 program context, published 2026-07-17.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/scenario-compiler.js` already defines the complete `compiled-scenario/1.0` contract and rejects unsupported citations, theories, assumptions, regional multipliers, and unbound numeric parameters.
- `src/compilation-pipeline.js` already rebuilds the evidence pack from the approved ledger and validates the Phase 1 Theory System before provider invocation.
- `scripts/compile-scenario.js` already keeps credentials in Node, checks the READY lifecycle, verifies input digests, and writes a project-contained output atomically.
- Existing fixtures and tests provide an offline path that can remain explicitly non-live.

### Established Patterns
- Content-addressed digests and validation status are authoritative; provider output is untrusted input.
- Provenance modes must remain truthful end to end.
- Validation fails closed before simulation, and safe errors identify artifact labels without echoing content.
- Competition support is the current macOS machine and one macOS CI job only.

### Integration Points
- Extend `src/ai-provider.js` for M2.7 response normalization without weakening `src/scenario-compiler.js`.
- Extend `scripts/compile-scenario.js` only where provider options and auditable metadata must be passed or recorded.
- Store the accepted live artifact under `experiments/output/ai/` and update model/research documentation only after validation.

</code_context>

<specifics>
## Specific Ideas

- Use one provider request, not iterative repair calls. Malformed or unsupported output fails and must be rerun deliberately.
- Keep hidden reasoning out of the compiled artifact; only the final JSON object and declared provenance cross the provider boundary.
- Use exact source-language labels. For `claim-zzz-3-1-lucy-outfit-official`, mark direct zh-CN support true and direct en/direct ja support unavailable rather than filling either gap with a candidate page or translation.

</specifics>

<deferred>
## Deferred Ideas

- Generalized case intake, new crisis cases, and region calibration remain post-MVP.
- Hybrid cognition, relationship emergence, new Reverse voice simulation, and runtime-driven 3D channels remain post-competition.
- Injective deployment, wallet connection, signing, and transactions remain Phase 3 and require explicit user confirmation.
- Cross-platform support and Linux/Windows CI remain post-competition.

</deferred>
