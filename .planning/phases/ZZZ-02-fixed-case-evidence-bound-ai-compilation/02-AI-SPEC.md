# AI-SPEC - Phase 2: Fixed-Case Evidence-Bound AI Compilation

> AI design contract generated through `$gsd-ai-integration-phase`. Consumed by the Phase 2 planner and verifier.

## 1. System Classification

**System Type:** Structured extraction / constrained scenario compilation

**Description:** A trusted Node CLI sends one frozen ZZZ evidence-and-theory pack to MiniMax M2.7, then accepts the response only when deterministic validators prove that every claim, theory, parameter, language boundary, and provenance field belongs to the approved fixed slice.

**Critical Failure Modes:**

1. Unsupported facts, theory mappings, numeric values, or regional differences enter an accepted artifact.
2. The synthetic 3.1 fade-risk assumption is represented as a released event or reality forecast.
3. Fixture or recorded output is represented as a live model result.
4. Provider credentials, response reasoning, prompts, or raw error bodies leak into logs or artifacts.
5. Candidate, translated, or contextual English/Japanese material is represented as direct evidence for the exact Lucy outfit claim, which the approved ledger supports directly in zh-CN only.

## 1b. Domain Context

**Industry Vertical:** Live-service game global publishing and crisis-response stress testing

**User Population:** Global publishing, release operations, localization, community, and communications analysts. The simulated population is 125 synthetic representatives, never real-player samples.

**Stakes Level:** High

**Output Consequence:** The artifact selects the scenario and action vectors used by downstream strategy comparison. A false acceptance contaminates the simulation and makes an unsupported claim look operationally authoritative.

### What Domain Experts Evaluate Against

| Dimension | Good | Bad | Stakes | Source |
|-----------|------|-----|--------|--------|
| Evidence binding | Every field resolves to approved claim IDs or explicit synthetic assumptions | Free-floating claim, effect size, or regional difference | Critical | `AI-02`; `research/theory-library/core-stack.md` |
| Counterfactual discipline | 3.1 fade risk is always labeled synthetic; outfit remains product context | Wording implies a released issue or probability forecast | Critical | `research/model-card.md`; fixed vertical slice |
| Grievance specificity | Ownership/access is one observed frame among competing frames | Public posts are converted into prevalence | High | ledger claim boundaries; framing theory |
| Response auditability | Delay, explanation, correction, compensation, localization, and follow-up are explicit | Vague "better response" wording | High | fixed vertical slice strategy vectors |
| Multilingual provenance | The exact outfit claim reports direct zh-CN support and unavailable direct en/direct ja support | Candidate or translation fills either direct-source gap | High | `AI-04`; `02-RESEARCH.md` |
| Regional neutrality | Region factors remain `1.0` without direct approved evidence | Sparse public signals become national stereotypes | Critical | `research/theory-library/modeling-boundaries.md` |

### Known Failure Modes

- Treating the synthetic 3.1 fade event as official or predicted.
- Attributing a multi-issue compensation notice to the fade item alone.
- Turning public complaint frames into support-rate or prevalence claims.
- Using theory names as numeric evidence or effect sizes.
- Smuggling in undocumented regional behavior.

### Regulatory / Compliance Context

No specific external regulation is asserted for this internal MVP. The binding requirements are research integrity, provenance truthfulness, anti-stereotype handling, public-data-only use, and credential secrecy.

### Domain Expert Roles for Evaluation

| Role | Responsibility |
|------|----------------|
| Release or publishing strategist | Confirm response actions are operationally plausible |
| Community communications lead | Review frames, escalation signals, and public wording |
| Evidence and provenance reviewer | Verify every accepted claim and live/fixture distinction |
| Localization reviewer | Review language boundaries without promoting translation to direct evidence |

## 2. Framework Decision

**Selected Framework:** Native Node.js 20 `fetch` (no AI framework)

**Version:** Node.js 20.x repository runtime

**Rationale:** The phase performs one linear OpenAI-compatible request and already owns deterministic parsing, provenance, replay, and validation. An orchestration framework would widen dependencies and obscure the exact trust boundary without adding useful capability.

**Alternatives Considered:**

| Framework | Ruled Out Because |
|-----------|------------------|
| LangChain.js 1.x | Adds abstraction for a single call; reserve for future multi-step provider/tool composition |
| OpenAI Agents SDK | Agent orchestration and OpenAI-specific tracing are not needed for a MiniMax fixed-slice compiler |

**Vendor Lock-In Accepted:** Partial. Transport stays OpenAI-compatible, while the competition run deliberately targets MiniMax M2.7.

## 3. Framework Quick Reference

### Installation

No new package. Use Node 20 built-ins.

### Core Imports

```js
const { setTimeout: delay } = require('node:timers/promises')
```

The production path uses global `fetch`, `AbortSignal.timeout`, and the repository's CommonJS modules. No delay or retry is used by default.

### Entry Point Pattern

```js
const response = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({ model, messages, temperature: 0.1, reasoning_split: true, stream: false }),
  signal: AbortSignal.timeout(120_000),
})
```

### Key Abstractions

| Concept | What It Is | When Used |
|---------|------------|-----------|
| Provider boundary | Network transport and MiniMax response normalization | Before any provider content reaches domain validation |
| Compiled-scenario validator | Closed deterministic contract | On every live, replay, or test output |
| Provenance | Provider/model/request and source digest record | Only after successful transport and validation |
| Evidence pack | Fixed approved claims selected from the ledger | The only factual input sent to the provider |

### Common Pitfalls

1. Sending undocumented M2.7 `response_format` or assuming `reasoning_split` disables thinking.
2. Persisting `reasoning_content`, `<think>` content, prompts, or raw provider errors.
3. Accepting syntactically valid JSON without deterministic claim and parameter validation.
4. Streaming partial JSON or silently issuing repair/retry calls.
5. Trusting an undocumented `x-request-id` instead of the response body `id`.

### Recommended Project Structure

```text
src/ai-provider.js             transport and response normalization
src/scenario-compiler.js       prompt contract and deterministic validation
src/compilation-pipeline.js    fixed evidence/theory selection
scripts/compile-scenario.js    trusted CLI and atomic artifact write
tests/                         provider, compiler, pipeline, and CLI contracts
```

## 4. Implementation Guidance

**Model Configuration:** `MiniMax-M2.7`, temperature `0.1`, non-streaming, `reasoning_split: true`, one request, 120-second timeout, bounded completion tokens supported by current official schema.

**Core Pattern:** Require HTTP success, a non-empty top-level body `id`, one complete final content string, then strip at most one complete leading `<think>...</think>` block and at most one JSON Markdown fence. Parse once and reject anything other than a JSON object. Hidden reasoning is discarded and never recorded.

**Tool Use:** None. The model receives no tools and performs no retrieval.

**State Management:** The request is stateless. Accepted provenance and source digests are written into the content-addressed compiled artifact.

**Context Window Strategy:** Send only the frozen vertical slice's evidence pack, approved catalog entries, Theory System mappings, brief, and contract guide. Do not send the full ledger or add memory/RAG.

## 4b. AI Systems Best Practices

### Structured Outputs

Pydantic is not applicable to this CommonJS project. The equivalent trust boundary is `parseModelObject()` followed by `validateCompiledScenario()`, including closed-field checks, scenario-model validation, approved claim/theory resolution, explicit assumption checks, and exhaustive numeric bindings. Invalid output receives no automatic repair call.

### Async-First Design

Use one awaited, non-streaming fetch with a bounded timeout. Let sanitized failures propagate to the trusted CLI. Partial streaming content is never accepted.

### Prompt Engineering Discipline

Keep immutable policy in the system message and serialize only the fixed evidence/theory payload in the user message. Request one bare JSON object. Forbid invented claims, mechanisms, regional differences, and forecast language.

### Context Window Management

No RAG, summarization, memory, or agent loop. The checked preparation pipeline is the context reducer.

### Cost and Latency Budget

One standard M2.7 call. Provider usage metadata is outside the Phase 2 contract and may be ignored; do not invent a monetary estimate without an approved pricing source. No caching or model routing is required for the one-run MVP.

## 5. Evaluation Strategy

### Dimensions

| Dimension | Rubric | Measurement | Priority |
|-----------|--------|-------------|----------|
| Contract validity | PASS only when `validateCompiledScenario(...).valid === true` | Code | Critical |
| Evidence binding | PASS only when every citation and numeric path has one approved binding | Code | Critical |
| Theory integrity | PASS only when every mapping exactly matches the approved Theory System | Code | Critical |
| Regional neutrality | PASS only when unsupported region factors equal `1.0` | Code | Critical |
| Provenance truthfulness | PASS only with live mode plus provider, model, body request ID, evidence pack ID, and Theory System ID | Code + human | Critical |
| Non-forecast framing | PASS only when limitations preserve synthetic stress-test language | Code + human | High |

### Eval Tooling

**Primary Tool:** Existing `node:test` suites and deterministic validators

**CI/CD Integration:**

```bash
npm run build && npm test && npm run test:e2e
```

Promptfoo, Phoenix, and LLM judges are out of scope: they add infrastructure without improving the fixed-slice, single-call acceptance decision. No uncalibrated LLM judge is used.

### Reference Dataset

**Size:** 10 focused cases

**Composition:** one valid fixture plus invented citation, missing binding, strategy-binding gap, unsupported regional factor, missing languages, unknown field, unapproved mechanism, unapproved path, and missing live request ID.

**Labeling:** Deterministic expected pass/fail labels, with the single accepted live artifact reviewed by a publishing/domain reviewer and a provenance reviewer.

## 6. Guardrails

### Online

| Guardrail | Trigger | Intervention |
|-----------|---------|--------------|
| Fixed-slice input | Any non-approved slice | Block |
| One-object parse | Missing/malformed/truncated content | Block |
| Evidence/theory validator | Unknown or unsupported binding | Block |
| Regional neutrality | Unsupported non-`1.0` factor | Block |
| Provenance truthfulness | Missing provider/model/body request ID | Block live sign-off |
| Secret/reasoning hygiene | Any key, Authorization, raw error body, prompt, or reasoning persistence | Block and investigate |

### Offline

| Metric | Sampling Strategy | Action on Degradation |
|--------|-------------------|----------------------|
| Reference dataset pass rate | Every PR | Block phase completion |
| Full repository gates | Before live call and phase close | Block phase completion |
| Accepted live artifact review | 100% of accepted live runs | Reject artifact or request explicit rerun |

## 7. Production Monitoring

**Tracing Tool:** Artifact-centric provenance only. External tracing is intentionally not added for the one-call MVP.

**Key Metrics:** offline validator pass rate, reference dataset pass rate, live provenance completeness, rejected compile count, secret leak incidents, unsupported regional acceptances, and unapproved theory acceptances.

**Alert Thresholds:** Accepted artifact rates for secret leaks, missing provenance, unsupported regional factors, or unapproved mappings must remain zero. Any violation blocks release.

**Smart Sampling Strategy:** Review 100% of live attempts and 100% of accepted live artifacts. Fixtures never count toward `AI-01`.

## Checklist

- [x] System type classified
- [x] Critical failure modes identified
- [x] Domain context researched
- [x] Compliance context explicitly bounded
- [x] Domain evaluator roles defined
- [x] Framework selected with rationale
- [x] Alternatives considered
- [x] Quick reference and pitfalls documented
- [x] JavaScript structured-output boundary documented in place of Pydantic
- [x] Evaluation dimensions grounded in domain requirements
- [x] Deterministic reference dataset specified
- [x] CI/CD eval integration specified
- [x] Online guardrails defined
- [x] Artifact-centric monitoring and 100% sampling specified
