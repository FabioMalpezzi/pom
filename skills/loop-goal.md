---
name: loop-goal
description: Use when modeling or evaluating an agent-shaped controller that iterates toward a measurable goal.
---

# Skill - loop-goal

## When To Use

Use this skill when:

- an agent-shaped controller receives a goal, decides, acts, observes, and iterates or concludes;
- the controller has measurable success criteria and bounded retry, replan, suspend/resume, or a distinct goal lifecycle;
- the team wants accepted criteria, workflow YAML, fit audit, scenarios, and an evidence-based conclusion.

Do not use it for:

- ordinary domain workflows or static state models: use `skills/workflow.md`;
- ordinary feature work or bug fixes without a measurable experiment;
- open-ended exploration: use `skills/spike.md`;
- native concurrent FSM regions or implicit asynchronous transitions.

Dynamic Workflow control-plane modeling is supported when `workflows.dynamic.enabled` is true. It may declare launch, await/join, timeout reaction, cancellation, detachment, compensation, suspend, and resume boundaries. Target Project code still owns workers, scheduling, persistence, timers, side effects, cancellation mechanics, and runtime execution.

When uncertain, use the generic `workflow` skill. The routing boundary is recorded in `decisions/ADR-0003-workflow-vs-loop-goal-skill.md`.

## Config Gate

Read `pom.config.json` first.

In a Target Project, continue only when:

- `workflows.enabled: true`; and
- `workflows.loopGoal.enabled: true`.

Otherwise stop and route to `skills/config.md`. Resolve criteria, dialogue, evidence, and derived-artifact paths from `workflows.loopGoal` instead of assuming POM Source paths.

## Roles

- **Coordinator**: the agent role that owns the experiment cycle. It conducts the criteria dialogue with the user, freezes the accepted contract, runs the rounds, and is the only addressee of the evaluator's non-retroactive advice. It is not the evaluator and does not take the promotion decision.
- **Evaluator**: an independent agent or person that judges the frozen contract against the evidence and returns a technical verdict.
- **User**: accepts the criteria, owns budget and thresholds, and takes the promotion decision.

## Criteria Contract

The experiment contract is the `## Criteria` section of the experiment's `EXPERIMENT.md`, in the shape given by `templates/EXPERIMENT_TEMPLATE.md`: system under test, observation boundary, gates, signals with threshold/target/trend, the four exits (`reached`, `stalled`, `exhausted`, `falsified`), budget, decision owner and date, and `status: proposed | accepted` with the acceptance date. A loop/goal experiment always keeps an `EXPERIMENT.md`.

A separate `criteria.md` is allowed only as a frozen copy of that section when the project configures `workflows.loopGoal.criteriaPath`. Audit, scenarios, and conclusion read the contract wherever it is located and cite its path. A complete example is `templates/examples/workflow/loop-goal/EXAMPLE_CRITERIA.md`.

## Lifecycle

Follow this order:

1. `define-criteria` — agree on, freeze, and commit the criteria contract;
2. model the workflow YAML from the accepted contract with `skills/workflow.md` in `design` mode;
3. `audit` — assess structural fit and criteria conformity;
4. `criteria-scenarios` — derive happy, failure, loop, misuse, and edge paths with criteria-exit coverage;
5. implement and collect evidence in the Target Project when requested, with `skills/workflow.md` in `implement` mode;
6. `conclude` — independently and adversarially evaluate the frozen contract.

Do not model before criteria are explicitly accepted. Do not weaken criteria after evidence exists.

## Modes

| Mode | Purpose | Canonical prompt |
|---|---|---|
| `define-criteria` | Define context, objective, gates, signals, baselines, exits, and budget through reasoned dialogue; freeze and commit the contract. | `prompts/28-loop-goal-define-criteria.md` |
| `audit` | Classify structural fit and separately check criteria conformity. | `prompts/29-loop-goal-audit.md` |
| `criteria-scenarios` | Derive path-based scenarios with terminal and criteria-exit coverage. | `prompts/30-loop-goal-scenarios.md` |
| `conclude` | Independently attempt to falsify the experiment against the frozen contract. | `prompts/31-loop-goal-conclude.md` |

Modeling and implementation guidance are not modes of this skill: they go through `skills/workflow.md` (`design` and `implement`, both on `prompts/27-workflow-modeling.md`), which reads the accepted contract before drafting.

## Five Things Called "Loop"

Use one term for each so a sentence never mixes them:

| Thing | Term to use | Where it lives |
|---|---|---|
| The controller's own perceive-decide-act-observe cycle | **runtime loop** | workflow YAML (`runtime_loop` declares its stop rules) and Target Project code |
| One round of define-criteria, model, audit, scenarios, evidence, conclude | **experiment round**; one comparable measurement inside it is an **experiment iteration** | `EXPERIMENT.md`, `criteria.dialog.md`, evaluation |
| The per-state visit bound | **`loop_guard`** (a loop bound, never "the loop") | workflow YAML, validated by `pom:workflow:lint` |
| The target-owned record of one runtime iteration | **Iteration Record** | Target Project evidence; not a workflow primitive |
| The evaluator's advice feeding a possible next round | **method improvement round** | `Advice to the Coordinator` in the evaluation, read by the next `define-criteria` |

## Key Rules

- YAML is the Source Authority for control flow; diagrams, audits, scenarios, and runtime code are derived.
- POM is a deterministic control-plane method, not a workflow runtime.
- `loop_guard` and `timeout` are validated schema contracts; their counters, clocks, scheduling, and event emission remain Target Project responsibilities. They bound the runtime loop, not the experiment: the experiment budget lives in the criteria contract.
- Never invent business rules, runtime behavior, evidence, baselines, or user approval.
- Every iteration that advances or remains active must name its verification and evidence; automation is preferred, while semantic or human validation is allowed when the accepted criteria require it.
- For autonomous, persistent, or artifact-mutating runtime loops, use an explicit Iteration Record; keep it target-owned and do not add it to the workflow schema.
- The criteria dialogue must record material consequences and user calibrations in `criteria.dialog.md`; it is not a transcript.
- The accepted contract is frozen for the experiment round and committed at acceptance; the freezing commit is what the evaluation cites as `criteria_commit`.
- Audit stops when the root or an invoked workflow fails validation and never edits YAML.
- Scenarios use only declared workflow elements and expose missing behavior as a modeling gap.
- The concluding evaluator runs in a fresh context when possible, reads evidence but not the criteria dialogue, tries to falsify rather than confirm, and declares `independent_context` truthfully in the evaluation frontmatter.
- Missing evidence yields `inconclusive`; an observed accepted falsification yields `refuted`.
- Advice from the evaluator is non-retroactive and addressed only to the Coordinator for a possible next round.
- The evaluator recommends a technical verdict (`confirmed | refuted | inconclusive`); the user retains the Adopt/Refine/Reject promotion decision (`adopt | refine | reject`) through `prompts/09-run-temporary-experiment.md`.

## Output

Depending on mode:

- accepted `## Criteria` section in `EXPERIMENT.md` (plus the frozen `criteria.md` copy when configured) and concise `criteria.dialog.md` with the freezing commit SHA;
- derived `<name>.fit.md`;
- derived `<name>.scenarios.md`;
- independent evaluation with `loop-goal-evaluation` frontmatter and a `confirmed | refuted | inconclusive` verdict.

## Memory Impact

The accepted contract and workflow YAML are Operating Memory for the active experiment. Fit audits and scenarios are derived artifacts and may be regenerated when their source YAML changes. Runtime state is not POM memory.

## References

- `skills/workflow.md`
- `skills/spike.md`
- `templates/EXPERIMENT_TEMPLATE.md`
- `templates/examples/workflow/loop-goal/EXAMPLE_CRITERIA.md`
- `templates/examples/workflow/loop-goal/EXAMPLE_EVALUATION.md`
- `decisions/ADR-0003-workflow-vs-loop-goal-skill.md`
- `decisions/ADR-0004-dynamic-workflow-control-plane.md`
- `specs/SPEC-0006-workflow-modeling.md`
- `specs/SPEC-0007-loop-guard-timeout.md`
- `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`
