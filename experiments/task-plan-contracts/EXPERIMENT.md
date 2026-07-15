# Experiment - Task Plan Global Constraints And Task Contracts

| Field | Value |
|---|---|
| Date | 2026-07-13 |
| Type | LLM model / research |
| Status | under evaluation |
| Branch / Path | `exp/pom-skill-evolution` / `experiments/task-plan-contracts/` |
| Isolation | branch + experiment-only prompt/template variants |
| Owner | POM maintainer |

## Objective

Test whether explicit Global Constraints and dependency/interface contracts make POM Task Plans more executable and less ambiguous without forcing artificial structure onto independent, small, documentation-only, or non-code work.

## Hypotheses

- A positive output contract will propagate exact version floors, dependency limits, naming rules, and compatibility constraints more reliably than the current general planning prose.
- Explicit `Consumes`, `Produces`, `Used by`, and `Contract` fields will reduce cross-task signature and dependency inconsistencies.
- A task-boundary rule based on an independent test/review cycle will reduce setup/config/documentation micro-tasks without weakening verification.

Minimum value criterion:

- every applicable candidate plan preserves all planted global constraints;
- every dependent task pair uses consistent interface names and contracts;
- candidate plans preserve POM goal-backward and scenario/semantic verification;
- small and non-code fixtures can state `not applicable` without invented interfaces;
- task fragmentation does not increase without an independently testable benefit.

## Scope

Included:

- current `skills/plan.md`, `prompts/05-create-task-plan-from-spec.md`, and `templates/TASK_PLAN_TEMPLATE.md` as baseline;
- four representative planning fixtures from TASK-0004;
- baseline and candidate plan generation;
- deterministic scoring plus fresh-context executability review.

Excluded:

- implementing generated plans;
- changing Task Plan status semantics;
- forcing code snippets into every POM plan;
- linting judgment calls;
- canonical prompt/template edits before approval.

## Isolation Plan

- Branch or worktree: `exp/pom-skill-evolution` in the current checkout.
- Temporary path: generated plan samples and raw model transcripts stay in run-specific temporary/evidence paths.
- Dependency isolation: consume the behavioral evaluator; no new root runtime dependency.
- Environment/config isolation: fixed model and repetitions across baseline and candidate.
- Service/data isolation: synthetic reusable specifications with no client data.
- Import/build guardrail: canonical plan workflow never reads the experiment candidate.

## Commands / Procedure

Planned interface:

```bash
node experiments/task-plan-contracts/generate.mjs --variant baseline --repetitions 5
node experiments/task-plan-contracts/generate.mjs --variant global-constraints-interfaces --repetitions 5
node experiments/task-plan-contracts/score.mjs --input <run-directory>
```

Procedure:

1. define four source fixtures and their exact expected constraints/contracts;
2. generate and score current-format baseline plans;
3. author an experiment-only positive output contract;
4. generate candidate plans under identical conditions;
5. score exact propagation, interface consistency, task count, and retained verification;
6. have a fresh reviewer judge executability and process weight;
7. challenge the candidate before promotion.

## Evidence

Baseline source observations:

- current Task Plans strongly cover origin, objective, goal-backward checks, scenario tests, thesis/antithesis, risks, and closure;
- the current template has generic Steps but no required project-wide constraint table or cross-task interface map;
- absence of headings alone is not evidence of a behavioral failure, so baseline generation is mandatory.

Planned committed evidence:

- reusable fixture specifications;
- expected constraint/interface manifests;
- machine score summaries;
- sanitized plan samples required to explain results;
- independent review verdict.

## Falsification And Promotion Gate

Reject or narrow the candidate if:

- baseline already propagates constraints and interfaces equally well;
- new fields cause invented contracts in independent/non-code cases;
- goal-backward or scenario verification is omitted more often;
- task count increases without a separate testable deliverable;
- reviewer evidence does not show lower reconstruction effort;
- the proposal mostly adds document weight.

Promotion requires improvement over baseline in exact constraint and interface fidelity, no verification regression, no artificial-interface regression, independent review, and explicit user approval.

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Security | Security constraints are summarized incorrectly | Exact-value/source fields and deterministic scoring |
| Privacy | Fixtures accidentally model a private project | Generic synthetic fixtures only |
| License | External plan template copied verbatim | Adapt concepts to POM terminology and document shape |
| Costs | Twenty baseline plus twenty candidate generations are expensive | Run dry/static fixture validation first; use fixed bounded outputs |
| Maintainability | Template becomes too large | Promote only fields with measured benefit; allow `not applicable` |
| Validity | Reviewer rewards preferred formatting | Combine exact deterministic checks with blinded fresh-context review |

## Outcome

Decision: pending; generation starts only after the shared evaluator contract is stable enough to record real model outcomes.

Promotion path:

- clean reimplementation in the canonical planning prompt and Task Plan template;
- update the plan skill only if trigger or references change;
- add stable tests only for mechanical invariants proven useful.

## Consolidation

| Artifact | Destination | Action |
|---|---|---|
| Proven constraint guidance | `prompts/05-create-task-plan-from-spec.md` | clean reimplementation after approval |
| Proven document fields | `templates/TASK_PLAN_TEMPLATE.md` | clean reimplementation after approval |
| Mechanical regression fixtures | accepted test location | selective promotion |

## Follow-up

- [x] Define the four planning fixtures and expected manifests (`fixtures/01..04`, 2026-07-15): multi-task code feature with a version floor + shared API (interfaces applicable); documentation-only governance change (interfaces not applicable); small independent correction (single-task, over-fragmentation trap); mixed migration with ordering/compatibility/rollback (ordering contracts applicable).
- [x] Author the experiment-only candidate (`candidate-contract.md`, 2026-07-15): Global Constraints table + Dependency/Interface Map + per-task contract fields, with `not applicable` as a first-class answer and explicit anti-bloat guardrails.
- [ ] Build `generate.mjs`/`score.mjs`, freeze baseline generation and scoring (requires Pi sessions).
- [ ] Compare fidelity, task sizing, and retained verification; fresh-context executability review.
