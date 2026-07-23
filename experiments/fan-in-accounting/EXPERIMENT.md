# Experiment — Dynamic Workflow fan-in accounting

| Field | Value |
|---|---|
| Date | 2026-07-23 |
| Type | spike / workflow-method extension |
| Status | closed — minimal prompt guidance promoted |
| Branch / Path | `experiments/fan-in-accounting/` |
| Isolation | evidence remains under the experiment path; only supported rules were reimplemented in `prompts/27-workflow-modeling.md` |
| Owner | POM maintainer |

## Objective

Verify whether POM Dynamic Workflow guidance needs an explicit fan-in accounting contract in addition to the existing handle-lifecycle contract. The experiment models and deterministically executes a 60-item route audit with bounded concurrency, three batch reductions, identity reconciliation, and controlled missing, duplicate, failed, timed-out, and partial-result cases.

## Hypotheses

- H1: handle lifecycle alone cannot prove that every expected child result was received exactly once.
- H2: an identity-based reconciliation manifest can prevent a synthesis from silently presenting partial work as complete.
- H3: hierarchical fan-in can preserve counts and provenance without adding a new POM workflow primitive.
- H4: bounded concurrency, backpressure, idempotency, and physical retry remain Target Project data-plane responsibilities, while POM guidance can require their decisions to be explicit.

Minimum useful outcome:

- 40–100 deterministic items execute with a measured concurrency ceiling;
- complete input produces a complete layered report;
- missing, duplicate, failed, and timed-out inputs cannot produce a report labelled complete;
- explicitly allowed partial synthesis remains visibly incomplete and lists the unresolved identities;
- candidate prompt and implementation guidance can be stated without changing the accepted control-plane/data-plane boundary.

## Scope

Included:

- real-edge and shared-resource review questions;
- a POM workflow YAML representing launch, await, reconciliation, layered reduction, and complete/incomplete exits;
- deterministic data-plane evidence for 60 items in batches of 20;
- candidate changes for workflow design, scenario generation, and implementation guidance.

Excluded:

- real LLM/API calls;
- production scheduling, queues, persistence, retry, or rate limiting;
- canonical prompt, template, specification, ADR, validator, or Project State changes;
- claims about target runtime correctness.

## Isolation Plan

- Branch or worktree: current clean branch; artifacts confined to `experiments/fan-in-accounting/`.
- Temporary path: none.
- Dependency isolation: Node.js standard library only; no manifest changes.
- Environment/config isolation: no environment or config changes.
- Service/data isolation: synthetic route identities only; no network or external services.
- Import/build guardrail: stable source must not import this experiment.

## Commands / Procedure

```bash
node scripts/lint-workflows.mjs experiments/fan-in-accounting/workflow.yaml
node experiments/fan-in-accounting/test.mjs
node experiments/fan-in-accounting/run.mjs --scenario happy --count 60 --batch-size 20 --concurrency 8
```

## Evidence

Source stimulus: [Graph Engineering: How to Run 1,000 AI Agents in Parallel From One Prompt](https://x.com/0xWast3/status/2079899723947712845).

Baseline before the experiment:

- `npm run pom:lint` — OK.
- `npm run pom:test` — 1,063 passed, 0 failed across 13 test files.

Experiment results:

- all three workflow YAML files pass `scripts/lint-workflows.mjs` with 0 errors and 0 warnings;
- the first parent-workflow model failed E089 on both timeout paths because each path reached an incomplete terminal with an active handle; adding explicit cancellation states made the lifecycle valid;
- 60 audits completed through three batches of 20 with observed peak concurrency 8, exactly matching the configured ceiling;
- 100 audits completed through four batches of 25 with observed peak concurrency 10;
- 9 deterministic scenarios passed: two positive scale cases plus missing, duplicate, equal-count duplicate/missing, failed, timed-out, unknown, and explicitly partial outcomes;
- the equal-count case had 60 observed records for 60 expected records but still exposed missing `route-007` and duplicate `route-008`, demonstrating that scalar count equality is insufficient;
- partial synthesis was available only when explicitly enabled and produced label `incomplete` with unresolved identity `route-007`;
- layered summaries preserved represented identities and reconciled them again before the complete report.

Hypothesis assessment:

- H1 supported: E089 proves handle closure, while the equal-count scenario shows it cannot prove result completeness by identity.
- H2 supported in deterministic evidence: identity reconciliation blocked every silent-completeness case tested.
- H3 supported: hierarchical reduction used existing launch/await composition; no new workflow primitive was needed.
- H4 supported as a method boundary: bounded concurrency was implemented and measured entirely in experiment data-plane code while the YAML retained only control-plane states and handle lifecycle.

### Prompt A/B checkpoint

An experiment-local Pi evaluator now lives under `ab/`. It compares the canonical `prompts/27-workflow-modeling.md` baseline with the same prompt plus `candidate-method-changes.md`, using eight critical fixtures and `openai-codex/gpt-5.4-mini`. The matrix covers independent work, shared writes, shared API capacity, hierarchical fan-in, equal-count missing/duplicate results, quorum versus reporting completeness, ambiguous partial policy, and an ordinary-workflow regression.

Verified checkpoint:

- `node experiments/fan-in-accounting/ab/run.mjs --dry-run --variant both --repetitions 5` passes fixture validation and rejects the planted bad response;
- four one-repetition A/B calibration runs completed with no dropped sessions;
- candidate check-rate improvements over baseline were respectively +15.4, +11.1, +18.5, and +11.1 percentage points;
- candidate absolute check rates were 73.1%, 81.5%, 85.2%, and 74.1%, so every calibration run failed the provisional 90% absolute gate even though every run passed the targeted-improvement gate;
- calibration exposed evaluator false negatives around semantic equivalents and negated phrases; those matchers were corrected before the final checkpoint;
- calibration also exposed a genuine batch-handle ambiguity: agents sometimes modeled one handle per item. The candidate now states that `fan_out_launch` creates one named batch handle and item identities belong in the result manifest;
- the candidate now also states explicitly that satisfying a join threshold may wake the control plane without authorizing a report labelled complete.

Two complete five-repetition matrices are now frozen:

1. **Evaluator revision 0.1** — `evidence/2026-07-23T14-34-53-939Z-ab-5x/`: 80/80 sessions; baseline 67.4%; candidate 83.7%; +16.3 points; absolute 90% gate failed. Independent review classified 18 lexical false negatives, 4 genuine failed checks, and 7 material unscored violations.
2. **Evaluator revision 0.2** — `evidence/2026-07-23T14-57-25-028Z-ab-v0.2-5x/`: independently identified matcher defects were corrected for both variants, the candidate response contract was strengthened, and input hashes were recorded. The run completed 80/80 sessions; baseline 71.9%; candidate 94.8%; +23.0 points; all three aggregate gates passed.

Revision 0.2 still failed semantic review. Seven recorded candidate failed checks contained 3 genuine failures and 4 lexical false negatives. Passing outcomes also hid per-item handles, incomplete hierarchical reconciliation, and invented failure-reporting rules. Nine distinct candidate outcomes contained critical semantic violations, while the stated acceptance condition required no critical failures across five repetitions.

Independent reviews live beside each frozen report as `independent-review.md`. Do not rewrite either score, lower the threshold, or tune matchers to manufacture a pass.

### Structured contract and model comparison

The prose diagnosis led to a separate experiment-local structured contract under `structured/`. It asks the model for one JSON control-plane artifact, validates it deterministically, and permits one feedback cycle containing only validator errors and the prior response. It compares `gpt-5.4-mini` and `gpt-5.4` on the same eight fixtures.

Calibration found and corrected two specification defects before the frozen run: mandatory Dynamic Workflow scenarios were initially hidden only in fixture expectations, and ordinary workflows were incorrectly required to list Dynamic Workflow runtime responsibilities. Later adversarial review added structured identity eligibility, reduction-source lineage, placeholder rejection, and ordinary-boundary checks. Each change received a new runner revision; earlier evidence remains frozen.

Frozen revision 0.5 — `evidence-structured/2026-07-23T16-45-38-289Z-structured-v0.5-5x/`:

- 80/80 first calls completed, with no dropped repairs;
- `gpt-5.4-mini`: 34/40 first-pass valid (85%); 40/40 after one repair;
- `gpt-5.4`: 38/40 first-pass valid (95%); 40/40 after one repair;
- all eight repairs corrected the validator-reported structural defect;
- final artifacts eliminated the earlier per-item-handle, open-policy, identity-source, placeholder, and ordinary-workflow contamination failures;
- independent review still found one weak hierarchical-provenance artifact and one capacity-classification error;
- quorum status eligibility remains unspecified by the fixture: success-only and all-terminal interpretations both pass, so ten quorum outcomes are semantically undecidable.

Conclusion: structured contract plus lint and one repair loop is supported for declared structural conformance. The sample shows a descriptive first-pass advantage for `gpt-5.4`, but not enough evidence for a general model-quality claim. Later revisions exposed semantic-oracle and example-anchoring limits, so the structured schema and validator remain experiment-local.

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Security | Synthetic executor may be mistaken for production orchestration. | Label it deterministic evidence and keep it under `experiments/`. |
| Privacy | None; all route identities are generated. | No project or client data. |
| License | Article concepts may be confused with copied implementation. | Implement independently with standard-library code and cite only the supplied article in evaluation notes. |
| Costs | Unbounded real concurrency could create API cost. | No network calls; enforce and measure a local concurrency ceiling. |
| Maintainability | Premature schema fields could make POM heavier. | Test prompt/guide-level changes first; defer schema and lint decisions. |

## Outcome

Current decision: **close the experiment with a minimal prompt-level promotion only**.

The full prose candidate was rejected, and the structured schema/validator remain experimental. The supported rules were reimplemented compactly in `prompts/27-workflow-modeling.md`: dependency classification, one batch handle, identity-set reconciliation at every reduction layer, readiness versus completeness, task-supplied capacity only, control-plane/data-plane ownership, and fan-in scenario coverage. `skills/workflow.md` already routed correctly and was intentionally unchanged.

A frozen one-repetition run of the updated canonical prompt completed 8/8 sessions at `evidence/2026-07-23T21-53-37-139Z-ab-v0.2-1x/`. The lexical evaluator reported 81.5% and four scenario failures; direct semantic inspection classified all four as matcher false negatives. The previously weak hierarchical fixture now explicitly used bounded groups, per-layer accounting, and final summary reconciliation. No critical semantic violation was found in that frozen sample. The five-attempt user budget is exhausted; no further tuning or model runs are authorized by this experiment.

Canonical schema, validator, guide, skill, and `SPEC-0008` changes remain deferred.

## Consolidation

| Artifact | Destination | Action |
|---|---|---|
| Supported design/scenario rules | `prompts/27-workflow-modeling.md` | Promoted minimally |
| Skill routing | `skills/workflow.md` | Keep unchanged |
| Structured contract and validator | `experiments/fan-in-accounting/structured/` | Keep as experimental evidence |
| Target-runtime guidance and `SPEC-0008` | canonical guide/spec | Defer; no demonstrated need |

## Follow-up

- [x] Run workflow lint and all experiment scenarios.
- [x] Record whether each hypothesis is supported or refuted.
- [x] Build and dry-run the isolated prompt A/B evaluator.
- [x] Run one-shot calibration and correct documented instrumentation defects.
- [x] Complete two frozen five-repetition baseline/candidate runs.
- [x] Independently classify failed checks and unscored semantic gaps.
- [x] Compare a structured contract on `gpt-5.4-mini` and `gpt-5.4` with one deterministic repair cycle.
- [x] Independently review final structured artifacts and validator soundness.
- [x] Resolve the supported prompt-level rules within a five-attempt budget and freeze the final behavioral sample.
- [x] Promote only the minimal agent procedure to `prompts/27-workflow-modeling.md`; leave the skill, schema, validator, guide, and spec unchanged.
- [x] Stop further experiment tuning.
