---
navTitle: Loop/Goal Tutorial
---

# Loop/Goal Workflow Tutorial

## Summary

Loop/goal workflows model agent-shaped controllers: a system receives a
goal, decides what to do next, acts, observes the result, and either
continues or terminates. The five YAML files under
`templates/examples/workflow/loop-goal/` are verified examples, not the
complete taxonomy of possible agent loops.

## Current State

The canonical `loop-goal` skill is the procedure for defining criteria,
modeling, auditing, deriving scenarios, guiding implementation, and
concluding loop/goal experiments. This page is a human reading guide: it
helps a reader choose a starting pattern before using the skill.

The current verified examples cover five shapes:

| Example | Use It When |
|---|---|
| `agent-orchestrator.yaml` | The agent follows a compact ReAct-style loop: reason, act, observe, then continue or finish. |
| `agent-orchestrator-goal-lifecycle.yaml` | Planning, execution, reflection, and replan are meaningfully separate. |
| `agent-loop-table.yaml` | The whole control flow should stay flat: perception, planning, action, observation. |
| `agent-retry-bounded.yaml` | The key behavior is retrying a failed action with an explicit bound. |
| `agent-supervisor.yaml` | A parent controller delegates the goal to a synchronous child workflow and routes on the child terminal. |

These examples were validated during the `agent-loop-fsm` experiment.
They are safe starting points, but they do not exhaust the design space.

## Working Taxonomy

Use the dimensions below to decide whether one of the verified examples
is enough or whether the target project needs a new loop/goal workflow.
The dimensions are not mutually exclusive; a real agent may combine
several of them.

| Dimension | Question | Typical Starting Point |
|---|---|---|
| Compact ReAct loop | Can reasoning, tool action, and observation be represented as three recurring stages? | `agent-orchestrator.yaml` |
| Explicit planning lifecycle | Does the model need separate planning, execution, reflection, and replan states? | `agent-orchestrator-goal-lifecycle.yaml` |
| Flat control table | Is the priority a small, inspectable transition table without sub-workflows? | `agent-loop-table.yaml` |
| Bounded retry | Does the agent need a hard cap on retries or loop visits? | `agent-retry-bounded.yaml`; use `loop_guard` when the bound should be declarative. |
| Supervisor delegation | Does a parent workflow coordinate a child agent workflow and branch on the child's terminal? | `agent-supervisor.yaml` |
| Suspend and restore | Can the loop pause across sessions or long waits and resume from named state plus context? | Start from the closest example and apply the snapshot/restore convention. |
| Tool-using agent | Are external tools part of the loop contract rather than hidden implementation detail? | Start from ReAct or Goal Lifecycle; model tool outcomes as events. |
| Evaluator or critic loop | Does a critic, verifier, or reflection step decide whether to continue, replan, or fail? | Start from Goal Lifecycle; keep the critic decision as an explicit state or child workflow. |
| Human-in-the-loop | Can the loop block on a human decision or long-running manual task? | Start from Goal Lifecycle; use `timeout` for residence bounds and target-owned scheduling. |
| Dynamic fan-out | Does the controller launch many concurrent child tasks and wait for fan-in? | Do not force it into native parallel FSM states; use the Dynamic Workflow control-plane/data-plane contract. |

The last row is the boundary that matters most. POM workflow modeling
does not add native parallel regions. Dynamic fan-out belongs to the
Dynamic Workflow contract: the POM FSM records launch, await, timeout,
reaction, cancellation, and compensation boundaries; the target project
owns concurrent execution.

## How To Choose

Start with the simplest example that preserves the domain meaning.

Use `agent-orchestrator.yaml` when the agent's control flow is mostly
ReAct and the internal planning details are not part of the contract.
This is the smallest readable loop/goal model.

Use `agent-orchestrator-goal-lifecycle.yaml` when planning and replan are
not implementation details. If reviewers need to see when the agent
plans, executes, reflects, retries, or declares the goal impossible,
model those as named states.

Use `agent-loop-table.yaml` when the team wants one flat surface for
review and implementation. This is useful when the loop is simple but
needs to be translated directly into a table-driven runtime.

Use `agent-retry-bounded.yaml` when the central question is not the whole
agent architecture but a bounded retry behavior. If the bound is part of
the reusable workflow contract, prefer `loop_guard` over an implicit
counter in target code.

Use `agent-supervisor.yaml` when a parent must treat an agent workflow as
an autonomous child. The parent should see only the child's terminal
state and output, not the child's private internal context.

## Operating Sequence

For an experiment or target adoption, the order matters:

1. Define criteria with `loop-goal define-criteria`.
2. Model the workflow YAML from the closest verified example.
3. Run `pom:workflow:lint`.
4. Audit fit and conformance with `loop-goal audit`.
5. Generate scenarios with `loop-goal scenarios`.
6. Guide implementation with the workflow implementation guide.
7. Conclude the experiment against the frozen criteria.

Do not skip criteria when the work is experimental. The criteria file is
the measurement contract; without it, the audit can say the YAML is well
formed but cannot say whether the experiment succeeded.

## Defining The Measurement Contract

Before choosing the YAML shape, define the experiment contract. This is
not paperwork: it is the table that tells the loop what it is trying to
prove, what must not regress, what progress looks like, and when to
stop. The contract lives in `experiments/<topic>/design/criteria.md`.

Start with four context rows. They remove the most common ambiguity:

| Row | Question It Answers | Good Shape |
|---|---|---|
| SUT | What exact artifact is under test? | A workflow YAML, schema primitive, validator rule, runtime pattern, or decision. |
| Sperimentatore | Who or what runs the loop? | User plus coding agent, autonomous agent, CI pipeline, or another explicit executor. |
| Iteration | What counts as one loop step for measurement? | One YAML revision, one lint-and-diff pass, one benchmark run, or one modeled workflow. |
| Goal del SUT | What goal does the artifact pursue, if any? | Executed goal, modeled-only goal, or `n/a` for artifacts without a lifecycle. |

Then write one objective. It should name the artifact and the class of
cases it must cover. Avoid vague verbs such as "explore" or "understand".
If the work is exploratory, use the lighter spike procedure instead of
pretending it is a measured loop.

The controls table has two parts: gate metrics and signal metrics. They
are deliberately different.

Gate metrics are non-regression controls. If a gate fails, the loop
stops immediately because the work is no longer preserving the minimum
safe conditions.

| Column | Meaning |
|---|---|
| Nome | Short name for the control. |
| Strumento | The command, script, review rule, or artifact read that measures it. |
| Soglia | The pass/fail threshold. |
| Baseline | Current value, or an explicit calibration note if no value exists yet. |
| Legame con obiettivo | Why this control protects the stated objective. |

Signal metrics measure progress. A signal should be able to move between
iterations. If it cannot move, it is probably a gate, not a signal.

| Column | Meaning |
|---|---|
| Nome | Short name for the progress measure. |
| Strumento | The command, script, review rule, or artifact read that measures it. |
| Direzione | Expected direction: up, down, or stable. |
| Trend | One of `assoluto`, `relativo`, or `statistico`, with a justified threshold. |
| Baseline | Current value, or `TBD calibrata al run 1` when the first run must establish it. |
| Legame con obiettivo | Why movement in this number means movement toward the objective. |

Budget is also part of the contract. It should answer three separate
questions:

| Budget Row | What It Controls | Example Shape |
|---|---|---|
| Visit bound | How many iterations may run before stalling out. | `loop_guard.max_visits = 5` for five modeling attempts. |
| Time bound | How much wall-clock time the experiment may consume. | `loop_guard.max_duration = 45min`. |
| Human budget | How much user attention or decision time is acceptable. | "One calibration checkpoint plus final acceptance." |

The exit table closes the loop. It should be written before modeling,
because changing it after seeing the result moves the goalposts.

| Exit | Required Definition |
|---|---|
| Raggiunto | The exact condition under which the experiment succeeds. |
| Forfait per stallo | The visit or duration bound that stops a loop whose signal is not moving. |
| Forfait per budget | The budget condition that stops even if no technical falsification occurred. |
| Falsificazione | One concrete observation that falsifies the hypothesis, plus one similar observation that does not. |

Finally, run the consistency check. Four checks catch most bad
contracts:

| Check | What To Compare | Failure Smell |
|---|---|---|
| Budget vs loop guard | Visit count, expected iteration time, and duration budget. | The declared number of visits cannot fit inside the time budget. |
| Signal vs gate | Every metric classified as progress or non-regression. | A "signal" has only pass/fail values and cannot show progress. |
| Falsification vs backlog | The falsification event against accepted backlog primitives. | The experiment would be falsified by needing a primitive already admitted as expected work. |
| Objective vs backlog | The objective against the original reason for opening the work. | The objective silently became narrower or stronger than what the backlog asked. |

If a warning remains, record the consequence explicitly and get user
acceptance. Silent "OK" is not enough when the contract is logically
weak.

## Boundaries

Use the generic `workflow` skill instead of `loop-goal` for ordinary
domain workflows such as ticket lifecycle, document approval, or spec
evolution.

Do not model real concurrency as native parallel states inside a POM
workflow. If the controller launches multiple active children, use the
Dynamic Workflow control-plane/data-plane contract and make handle
lifecycle explicit: awaited, cancelled, or detached before terminal
states.

Do not treat the five verified examples as a closed category list. They
are regression-safe anchors. New loop/goal shapes should still go
through criteria, modeling, lint, audit, scenarios, and conclusion before
being promoted as examples.

## Sources

| Source | Use |
|---|---|
| `skills/loop-goal.md` | Canonical operating procedure and modes for loop/goal work. |
| `templates/examples/workflow/loop-goal/README.md` | Catalog of the five verified YAML examples. |
| `experiments/agent-loop-fsm/RESULTS.md` | Evidence behind H1-H5 and the verified examples. |
| `specs/SPEC-0006-workflow-modeling.md` | Workflow schema, composition rules, and Dynamic Workflow backlog doctrine. |
| `specs/SPEC-0007-loop-guard-timeout.md` | Declarative loop bound and timeout primitives. |
| `decisions/ADR-0003-workflow-vs-loop-goal-skill.md` | Boundary between generic workflow modeling and the loop/goal skill. |
| `decisions/ADR-0004-dynamic-workflow-control-plane.md` | Control-plane/data-plane doctrine for Dynamic Workflows. |

## Related Links

- [[skills-and-prompts]]
- [[current-specs]]
- [[experiments-and-extension]]
