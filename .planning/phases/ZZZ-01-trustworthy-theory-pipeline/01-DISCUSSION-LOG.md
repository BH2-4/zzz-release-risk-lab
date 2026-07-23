# Phase 1: Trustworthy Theory Pipeline - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md; this log preserves the analysis.

**Date:** 2026-07-24
**Phase:** 01-Trustworthy Theory Pipeline
**Mode:** assumptions
**Areas analyzed:** filesystem boundary, provenance contract, compatibility and regeneration, completion gate

## Assumptions Presented

### Filesystem boundary

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Reuse the safe path and atomic-write behavior already proven by the compile CLI | Confident | `scripts/compile-scenario.js`, `tests/compile-scenario-cli.test.js` |
| Protect every validated input before provider creation | Confident | `tests/theory-agent-cli.test.js`, `docs/restart-handoff-2026-07-24.md` |

### Provenance contract

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Fixture provenance needs relative path, canonical digest, and `realModelUsed: false` | Confident | `tests/theory-agent-cli.test.js`, `docs/mvp-v1-spec.md` |
| Live provenance must require provider, model, request ID, and a real-model capability flag | Likely | `src/ai-provider.js`, `src/theory-mapper.js`, `src/theory-system.js` |

### Compatibility and regeneration

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Preserve the current four-command lifecycle and regenerate rather than edit content-addressed output | Confident | `scripts/run-theory-agent.js`, `src/theory-agent.js` |
| Redact malformed JSON detail at the read boundary | Confident | `tests/theory-agent-cli.test.js` |

### Completion gate

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| All six regressions and all repository gates must pass before the phase completes | Confident | `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/codebase/TESTING.md` |

## Corrections Made

No corrections. The user delegated GSD discuss, implementation, and workflow decisions to the agent; all assumptions were accepted as agent-discretion decisions without using autonomous `gsd--auto` execution.

