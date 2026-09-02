# Experiment - Title

| Field | Value |
|---|---|
| Date | YYYY-MM-DD |
| Type | one-shot / spike / refactoring / LLM model / API library / benchmark / research / loop-goal |
| Status | under evaluation / consolidated / discarded |
| Branch / Path | exp/<topic> / experiments/<topic> / /tmp |
| Isolation | branch / worktree / /tmp / local manifest / container |
| Owner | name or role |

## Objective

Describe what should be verified and why this is not stable project material yet.

## Hypotheses

- Hypothesis to verify
- Minimum criterion for saying that the experiment has value

For a loop/goal experiment the minimum criterion is not enough: fill in the `## Criteria` section below and accept it before any evidence exists.

## Scope

Included:

- What is being tested

Excluded:

- What is not being touched

## Budget And Stop Rule

Every experiment declares how much it may consume and when it stops, even when it has no `## Criteria` section.

| Field | Value |
|---|---|
| Attempt budget | maximum number of attempts, runs, or revisions (for example "3 attempts") |
| Time budget | maximum wall-clock or calendar time (for example "one working day") |
| Cost budget | tokens, money, or external resources, or `none` |
| Stop rule | the observable condition that ends the experiment before the budget is consumed (for example "first attempt that passes the smoke test", "two attempts without improvement") |

Runtime bounds such as `loop_guard` and `timeout` in a workflow YAML limit the system under test, not the experiment; do not reuse them as the experiment budget.

## Criteria

Optional for one-shot work, spikes, and trials. Mandatory for loop/goal experiments (`skills/loop-goal.md`, `prompts/28-loop-goal-define-criteria.md`): an agent-shaped controller that iterates toward a measurable goal cannot be judged without an accepted contract.

This section is the canonical criteria contract. A separate `criteria.md` is allowed only as a frozen copy of this section, at `workflows.loopGoal.criteriaPath`, when the project configures it. The independent evaluation (`prompts/31-loop-goal-conclude.md`) cites the contract it used by path and by commit.

Freeze before evidence: `status: accepted` with its acceptance date must be recorded, and the accepted section committed, before any workflow YAML, runtime code, or measurement result exists. After acceptance, thresholds, baselines, exits, and the objective do not change; a material change opens a new experiment round with a new contract. See `templates/examples/workflow/loop-goal/EXAMPLE_CRITERIA.md` for a complete example.

```yaml
status: proposed | accepted
accepted_on: YYYY-MM-DD   # required when status is accepted
```

### System under test

| Field | Value |
|---|---|
| System under test (SUT) | the controller, workflow, method, or product behavior being evaluated |
| Experimenter | who changes the SUT or its environment between experiment iterations |
| Experiment iteration | one complete comparable cycle, with explicit start and end |
| SUT goal | the runtime goal pursued by the controller, or `not applicable` |
| Observation boundary | what evidence belongs to one iteration and what stays outside it |

### Objective

One measurable objective sentence: what should improve or be proven, for whom or for which system, under which boundary, and how success is distinguished from failure.

Out of scope:

- explicit exclusions

### Gates

A gate protects non-regression or a hard constraint; it is pass/fail or bounded by a threshold. At least one gate is required.

| Gate | Measurement (tool, command, or query) | Unit | Baseline | Threshold | Direction | Objective link | Frequency | Owner |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

### Signals

A signal measures progress toward the objective across comparable iterations; it needs a direction and a threshold, target, or expected trend. At least one signal is required.

| Signal | Measurement (tool, command, or query) | Unit | Baseline | Threshold / target | Expected trend | Direction | Objective link | Frequency | Owner |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |

Baseline evidence or calibration plan:

- the run that produced each baseline, or the calibration step that will, before acceptance

### Exits

All four exits are required.

| Exit | Definition |
|---|---|
| `reached` | Boolean expression over green gates and signal targets. |
| `stalled` | Bounded number of experiment iterations without the required signal progress. |
| `exhausted` | The iteration, time, or cost budget below is consumed. |
| `falsified` | One specific observable event that makes the hypothesis false. |

Falsifying example:

- one concrete observation that falsifies the hypothesis

Non-falsifying counterexample:

- one similar observation that does not

### Budget

| Budget | Value |
|---|---|
| Iterations | maximum number of experiment iterations |
| Time | wall-clock or calendar limit |
| Cost | tokens, money, or external resources, or `none` |
| Human attention | calibration checkpoints and acceptance points |

### Decision

| Field | Value |
|---|---|
| Decision owner | who takes the promotion decision (`adopt`, `refine`, or `reject`); never the evaluator |
| Decision date | when the decision is due or was taken |

Unresolved warnings:

- warnings raised during the criteria dialogue that the user accepted knowingly, or `none`

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

Evidence convention:

- track only the run-level summary this document cites (a report, a table, a short log excerpt);
- keep raw runs, transcripts, dumps, and dependencies under `experiments/<topic>/evidence/` ignored by Git and local;
- keep every tracked evidence file under 1 MB; summarize instead of committing the raw file;
- in the POM Source repository, `npm run pom:experiments:clean` lists the ignored weight and removes it with `--delete` once the experiment has closed.

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Security |  |  |
| Privacy |  |  |
| License |  |  |
| Costs |  |  |
| Maintainability |  |  |

## Outcome

| Field | Value |
|---|---|
| Stop reason | reached / stalled / exhausted / falsified, or the stop rule that fired |
| Technical verdict | confirmed / refuted / inconclusive (loop/goal experiments: from the independent evaluation, with its path) |
| Promotion decision | `adopt` / `refine` / `reject` |
| Decision owner | name or role; the user, not the evaluator |
| Decision date | YYYY-MM-DD |

The technical verdict describes what the evidence supports; the promotion decision is what the project does with it. They are separate: a `confirmed` verdict may still be rejected for cost or risk, and an `inconclusive` verdict may lead to `refine`.

- `adopt`: promote the approved artifacts into the stable project;
- `refine`: keep the experiment open for one more bounded round with an amended or new contract;
- `reject`: discard the experiment and keep at most a Git/branch reference.

Consolidation actions (only for `adopt`, respecting the adoption profile):

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
