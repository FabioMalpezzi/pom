# Experiment - Title

| Field | Value |
|---|---|
| Date | YYYY-MM-DD |
| Type | one-shot / spike / refactoring / LLM model / API library / benchmark / research |
| Status | under evaluation / consolidated / discarded |
| Branch / Path | exp/<topic> / experiments/<topic> / /tmp |
| Isolation | branch / worktree / /tmp / local manifest / container |
| Owner | name or role |

## Objective

Describe what should be verified and why this is not stable project material yet.

## Hypotheses

- Hypothesis to verify
- Minimum criterion for saying that the experiment has value

## Scope

Included:

- What is being tested

Excluded:

- What is not being touched

## Isolation Plan

Describe how the experiment stays separate from stable source and memory.

- Branch or worktree:
- Temporary path:
- Dependency isolation:
- Environment/config isolation:
- Service/data isolation:
- Import/build guardrail:

## Commands / Procedure

```bash
# main commands
```

## Evidence

- Observed result
- Links to logs, screenshots, benchmarks, or notes

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Security |  |  |
| Privacy |  |  |
| License |  |  |
| Costs |  |  |
| Maintainability |  |  |

## Outcome

Decision:

- discard;
- archive synthesis in `analysis/`;
- update `wiki/`;
- create/update spec;
- create ADR;
- generate task plan;
- leave only Git/branch reference.

Promotion path:

- selective cherry-pick;
- clean reimplementation on a feature branch;
- move approved artifacts out of `experiments/`;
- no promotion.

## Consolidation

| Artifact | Destination | Action |
|---|---|---|
|  |  |  |

## Follow-up

- [ ] Next action
