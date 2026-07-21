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

## Lifecycle

Follow this order:

1. `define-criteria` — agree on and freeze measurable criteria;
2. `model` — design workflow YAML from accepted criteria;
3. `audit` — assess structural fit and criteria conformity;
4. `scenarios` — derive happy, failure, loop, misuse, and edge paths;
5. implement and collect evidence in the Target Project when requested;
6. `conclude` — independently and adversarially evaluate frozen criteria.

Do not model before criteria are explicitly accepted. Do not weaken criteria after evidence exists.

## Modes

| Mode | Purpose | Canonical prompt |
|---|---|---|
| `define-criteria` | Define context, objective, gates, signals, baselines, and exits through reasoned dialogue. | `prompts/28-loop-goal-define-criteria.md` |
| `model` | Design or revise the workflow YAML from accepted criteria. | `prompts/27-workflow-modeling.md` in `design` mode |
| `audit` | Classify structural fit and separately check criteria conformity. | `prompts/29-loop-goal-audit.md` |
| `scenarios` | Derive path-based scenarios with terminal and criteria-exit coverage. | `prompts/30-loop-goal-scenarios.md` |
| `runtime-guide` | Guide Target Project implementation without adding a POM runtime. | `prompts/27-workflow-modeling.md` in `implement` mode |
| `conclude` | Independently attempt to falsify the experiment against frozen criteria. | `prompts/31-loop-goal-conclude.md` |

## Key Rules

- YAML is the Source Authority for control flow; diagrams, audits, scenarios, and runtime code are derived.
- POM is a deterministic control-plane method, not a workflow runtime.
- `loop_guard` and `timeout` are validated schema contracts; their counters, clocks, scheduling, and event emission remain Target Project responsibilities.
- Never invent business rules, runtime behavior, evidence, baselines, or user approval.
- The criteria dialogue must record material consequences and user calibrations in `criteria.dialog.md`; it is not a transcript.
- Accepted `criteria.md` is frozen for the experiment round.
- Audit stops when the root or an invoked workflow fails validation and never edits YAML.
- Scenarios use only declared workflow elements and expose missing behavior as a modeling gap.
- The concluding evaluator runs in a fresh context when possible, reads evidence but not the criteria dialogue, and tries to falsify rather than confirm.
- Missing evidence yields `inconclusive`; an observed accepted falsification yields `refuted`.
- Advice from the evaluator is non-retroactive and addressed only to the Coordinator for a possible next round.
- The evaluator recommends a technical verdict; the user retains the Adopt/Refine/Reject promotion decision through `prompts/09-run-temporary-experiment.md`.

## Output

Depending on mode:

- accepted `criteria.md` plus concise `criteria.dialog.md`;
- validated workflow YAML;
- derived `<name>.fit.md`;
- derived `<name>.scenarios.md`;
- Target Project implementation guidance and evidence;
- independent evaluation with confirmed / refuted / inconclusive verdict.

## Memory Impact

The accepted criteria and workflow YAML are Operating Memory for the active experiment. Fit audits and scenarios are derived artifacts and may be regenerated when their source YAML changes. Runtime state is not POM memory.

## References

- `skills/workflow.md`
- `decisions/ADR-0003-workflow-vs-loop-goal-skill.md`
- `decisions/ADR-0004-dynamic-workflow-control-plane.md`
- `specs/SPEC-0006-workflow-modeling.md`
- `specs/SPEC-0007-loop-guard-timeout.md`
- `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`
