# Phase 2: Fixed-Case Evidence-Bound AI Compilation - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md`; this log preserves the analysis.

**Date:** 2026-07-24
**Phase:** ZZZ-02-fixed-case-evidence-bound-ai-compilation
**Mode:** assumptions
**Areas analyzed:** fixed slice scope, provenance boundary, evidence and language boundary, provider compatibility

## Assumptions Presented

### Fixed Slice Scope
| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Phase 2 stays locked to `zzz-3-1-fade-risk-v1` and does not open arbitrary cases or non-synthetic scenario types. | Confident | `.planning/ROADMAP.md`; `src/compilation-pipeline.js`; `src/scenario-compiler.js`; `data/scenarios/zzz-3-1-fade-risk-vertical-slice.json` |

### Provenance Boundary
| Assumption | Confidence | Evidence |
|------------|------------|----------|
| The live-model requirement applies to compiled scenario output while the approved Phase 1 Theory System remains the upstream authority. | Likely | `.planning/ROADMAP.md`; `scripts/compile-scenario.js`; `tests/compile-scenario-cli.test.js`; `experiments/output/theory/zzz-1-4-fade-run.json` |

### Evidence And Language Boundary
| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Verified 1.4 facts, verified 3.1 product facts, and synthetic 3.1 fade assumptions remain separate; no direct three-language parity is implied. | Likely | `data/scenarios/zzz-3-1-fade-risk-vertical-slice.json`; `research/model-card.md`; `research/cases/zzz-1.4-fade/3.1-transfer.md`; `src/scenario-compiler.js` |

## Corrections Made

No corrections were requested. The user had already delegated all GSD discussion and implementation choices and instructed the agent to proceed. The assumptions were therefore accepted within the previously locked goal boundary.

## External Research

- MiniMax official documentation establishes `POST https://api.minimaxi.com/v1/chat/completions`, model `MiniMax-M2.7`, `reasoning_split`, `<think>` response behavior, and top-level response `id`.
- Current official chat-completions documentation does not establish M2.7 support for `response_format` or JSON Schema. The implementation must use local deterministic parsing and validation.
- The approved ledger establishes the exact Lucy `Princess Holiday` outfit claim directly in zh-CN only. The discovered English page remains unapproved context because its body was not directly extracted and its indexed outfit label conflicted with the approved claim; Japanese sources establish 3.1 and Lucy identity context only. Direct en and direct ja exact-outfit support remain unavailable.

Primary references and full source metadata are recorded in `02-RESEARCH.md`.
