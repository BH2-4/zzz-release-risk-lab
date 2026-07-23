# Onboarding Summary

## Project State
- PROJECT.md: present
- REQUIREMENTS.md: present
- ROADMAP.md: present
- STATE.md: present

## Codebase Context
- Brownfield repo: yes
- Map readiness: complete
- Codebase map: `.planning/codebase/` with all 7 required documents
- Fast map available: yes

## Docs Context
- Existing ADR/PRD/SPEC/RFC candidates: 1
- Ingested source: `docs/mvp-v1-spec.md` as SPEC
- Conflict report: 0 blockers, 0 warnings, 0 info

## Workflow Policy
- Full GSD lifecycle: discuss -> plan -> execute -> verify -> review
- Phase completion gate: `npm run build`, `npm test`, and `npm run test:e2e`
- Autonomous `gsd--auto` operation: prohibited
- Injective deployment and wallet transactions: explicit user confirmation required

## Recommended Next Step
- `$gsd-discuss-phase 1`
