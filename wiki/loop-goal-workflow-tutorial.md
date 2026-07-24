---
navTitle: Loop/Goal Tutorial
---

# Loop/Goal Workflow Tutorial

## Summary

Loop/goal workflows model agent-shaped controllers: a system receives a
goal, decides what to do next, acts, observes the result, and either
continues or terminates. The six YAML files under
`templates/examples/workflow/loop-goal/` are verified examples, not the
complete taxonomy of possible agent loops.

## Current State

The canonical `loop-goal` skill is the procedure for defining criteria,
modeling, auditing, deriving scenarios, guiding implementation, and
concluding loop/goal experiments. In a Target Project it is opt-in:
`pom.config.json` must enable both `workflows.enabled` and
`workflows.loopGoal.enabled`. This page is a human reading guide: it
helps a reader choose a starting pattern before using the skill.

Coding agents already have their own loop/goal behavior: they receive a
goal, inspect context, decide on actions, run tools, observe results, and
continue until they stop. POM does not replace that native agent loop and
does not become the agent runtime. POM provides the support layer for
realizing such loops in a controlled way: named states, declared
transitions, explicit terminal conditions, measurable criteria, scenario
coverage, and implementation guidance in the target project's own stack.

When a target application uses the same pattern internally, `loop-goal`
can model the control plane of a software self-improvement system: the
application or its agents observe behavior, propose or stage changes,
verify the result, and decide whether to continue, stop, or roll back.
This is an application pattern, not a POM-owned runtime. The workflow is
operating memory for the application's improvement control plane, while
the target project still owns execution, permissions, deployment,
rollback, safety checks, and persistence.

To realize such a system, the method must connect to two concrete
layers. First, the loop/goal shape is integrated with the generic POM
workflow model: the YAML is the finite-state-machine source of authority
and names the states, events, terminal states, guards, context,
invocations, loop bounds, timeouts, and any Dynamic Workflow handle
lifecycle. The workflow template is a reference starting point, not a
mandatory file to copy; the invariant is that the target YAML validates
with `pom:workflow:lint`. Second, the target project implements that
contract in real code. POM provides implementation guidance, optional
TypeScript and Python runtime seam templates for execution, persistence,
timers, retry, tools, and side effects, and verified reference evidence,
but the executable system lives in the target stack. The repository
contains two practical evidence lines: the `agent-loop-fsm` TypeScript
runtime candidate, which proves that a modeled agent loop can run
end-to-end, and the Dynamic Workflow TypeScript and Python reference
executors, which prove the control-plane and data-plane split with
launched handles, await, detach, cancel, and compensation.

The current verified examples cover six shapes:

| Example | Use It When |
|---|---|
| `agent-orchestrator.yaml` | The agent follows a compact ReAct-style loop: reason, act, observe, then continue or finish. |
| `agent-orchestrator-goal-lifecycle.yaml` | Planning, execution, reflection, and replan are meaningfully separate. |
| `agent-loop-table.yaml` | The whole control flow should stay flat: perception, planning, action, observation. |
| `agent-retry-bounded.yaml` | The key behavior is retrying a failed action with an explicit bound. |
| `agent-supervisor.yaml` | A parent controller delegates the goal to a synchronous child workflow and routes on the child terminal. |
| `agent-iteration-record.yaml` | The loop must verify and record each iteration before continuing, with a maximum of 50 visits. |

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
2. Model the workflow YAML from the accepted criteria and the closest verified example.
3. Run `pom:workflow:lint`.
4. Audit fit and conformance with `loop-goal audit`.
5. Generate scenarios with `loop-goal scenarios`.
6. Guide implementation with `loop-goal runtime-guide` and the workflow implementation guide; copy the TypeScript or Python runtime seam template only if it helps the target architecture.
7. Conclude the experiment against the frozen criteria.

Do not skip criteria when the work is experimental. The criteria file is
the measurement contract; without it, the audit can say the YAML is well
formed but cannot say whether the experiment succeeded.

## Using Agent Goal Tracking

Some coding agents expose an explicit goal tracker, while others only
provide the ordinary conversation plus tools. Use any native goal tracker
as the session-level state container for a loop/goal trial. It can record
the active objective, whether the session is still active, complete, or
blocked, and any consumed time or token budget. It does not replace the
POM loop/goal contract.

The useful split is:

| Layer | Responsibility |
|---|---|
| Agent goal tracker, when available | Tracks the active session objective, status, elapsed time, token use, or other agent-native budget data. |
| POM loop/goal | Defines the SUT, Experimenter, Iteration, SUT Goal, gate metrics, signal metrics, falsification event, stall exit, and budget exit. |
| POM workflow or explicit state note, when no tracker exists | Carries the current loop state, next event, and evidence pointer so the agent does not rely on chat memory alone. |

For a small trial, start the agent's native goal tracker after the POM
loop/goal contract is clear enough to measure. If the agent has no native
tracker, write the same state explicitly in a small note, task plan, or
workflow instance state: objective, current state, current iteration,
gate evidence, signal evidence, and next exit decision. Then run one
bounded iteration: read the SUT, execute the declared measurement, check
the gate and signal, decide whether the result is reached, stalled,
falsified, or still active, and only then close the native tracker or
update the explicit POM state.

This integration is optional and agent-specific. It is useful because
native tracking keeps session progress visible, while POM keeps the
meaning of progress verifiable. Do not treat agent-reported completion
as proof by itself; the POM gate and signal evidence still carry the
verdict.

A good invocation is explicit about both layers:

> Run this as a POM loop/goal trial. If your agent environment has a
> native goal tracker, use it to track the session objective; otherwise
> keep the loop state explicitly in a POM note, task plan, or workflow
> state. Define the SUT, Experimenter, Iteration, SUT Goal, gate, signal,
> falsification, stall exit, and budget exit before acting. Run one
> bounded iteration, then close the tracker or update the explicit state
> only after reporting the measured evidence.

### Iteration Records

For a short synchronous trial, the criteria and evidence artifacts may be
enough. For an autonomous, persistent, resumable, or artifact-mutating loop,
keep one target-owned record per iteration. It makes progress auditable and
lets a later run distinguish a measured attempt from an agent's claim.

Every iteration that advances or remains active names its verification and
links the evidence used for the decision. Automation is preferred; semantic or
human validation is valid when the accepted criteria require it.

A minimal example is:

```yaml
iteration_id: 7
state: verifying
action_or_candidate: benchmark_candidate_7
observation: score_improved
verification:
  method: benchmark
  status: passed
evidence_ref: evidence/iteration-007.json
decision: keep
```

Use `keep`, `reject`, `rollback`, or `inconclusive` only when the loop really
has mutable candidates. Parent iteration, metric values, budget usage, and
artifact/state hashes are additional fields for resumable or reproducible
loops. This record is target-owned; it is not a new POM workflow primitive.

Shell commands usually cannot create or close an agent-native goal
tracker. They still matter inside the loop because they measure the POM
contract: lint, tests, audits, benchmark scripts, scenario counters,
source reads, or other declared measurement tools. When no tracker
exists, a POM workflow YAML can model the loop and a small state record
can carry the active state, iteration count, evidence links, and terminal
decision.

## Defining The Measurement Contract

Before choosing the YAML shape, define the experiment contract. This is
not paperwork: it is the table that tells the loop what it is trying to
prove, what must not regress, what progress looks like, and when to
stop. The contract lives in `experiments/<topic>/design/criteria.md`.

Start with four context rows. They remove the most common ambiguity:

| Row | Question It Answers | Good Shape |
|---|---|---|
| SUT | What exact artifact is under test? | A workflow YAML, schema primitive, validator rule, runtime pattern, or decision. |
| Experimenter | Who or what runs the loop? | User plus coding agent, autonomous agent, CI pipeline, or another explicit executor. |
| Iteration | What counts as one loop step for measurement? | One YAML revision, one lint-and-diff pass, one benchmark run, or one modeled workflow. |
| SUT Goal | What goal does the artifact pursue, if any? | Executed goal, modeled-only goal, or `n/a` for artifacts without a lifecycle. |

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
| Name | Short name for the control. |
| Measurement tool | The command, script, review rule, or artifact read that measures it. |
| Threshold | The pass/fail threshold. |
| Baseline | Current value, or an explicit calibration note if no value exists yet. |
| Link to objective | Why this control protects the stated objective. |

Signal metrics measure progress. A signal should be able to move between
iterations. If it cannot move, it is probably a gate, not a signal.

| Column | Meaning |
|---|---|
| Name | Short name for the progress measure. |
| Measurement tool | The command, script, review rule, or artifact read that measures it. |
| Direction | Expected direction: up, down, or stable. |
| Trend | One of `assoluto`, `relativo`, or `statistico`, with a justified threshold. |
| Baseline | Current value, or `TBD calibrata al run 1` when the first run must establish it. |
| Link to objective | Why movement in this number means movement toward the objective. |

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
| Reached | The exact condition under which the experiment succeeds. |
| Stall exit | The visit or duration bound that stops a loop whose signal is not moving. |
| Budget exit | The budget condition that stops even if no technical falsification occurred. |
| Falsification | One concrete observation that falsifies the hypothesis, plus one similar observation that does not. |

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

Keep the frozen contract lean, but also keep the dialogue trace. The
`define-criteria` mode writes the trace at
`workflows.loopGoal.dialogPath` when configured. In POM Source, the
usual fallback is `experiments/<topic>/design/criteria.dialog.md`; a
Target Project must follow its configured path or declared convention
instead of inheriting that source-specific location. Historical
experiments may still use numbered
`criteria-experiment-<N>-<HID>.dialog.md` traces. The evaluator reads the
frozen criteria and evidence, not this dialogue trace; the trace exists
so the reasoned dialogue is inspectable later and can improve the
method.

## Boundaries

Use the generic `workflow` skill instead of `loop-goal` for ordinary
domain workflows such as ticket lifecycle, document approval, or spec
evolution.

Do not model real concurrency as native parallel states inside a POM
workflow. If the controller launches multiple active children, use the
Dynamic Workflow control-plane/data-plane contract and make handle
lifecycle explicit: awaited, cancelled, or detached before terminal
states.

Do not treat the six verified examples as a closed category list. They
are regression-safe anchors. New loop/goal shapes should still go
through criteria, modeling, lint, audit, scenarios, and conclusion before
being promoted as examples.

## Sources

| Source | Use |
|---|---|
| `skills/loop-goal.md` | Canonical operating procedure and modes for loop/goal work. |
| `templates/examples/workflow/loop-goal/README.md` | Catalog of the six verified YAML examples. |
| `experiments/agent-loop-fsm/RESULTS.md` | Evidence behind H1-H5 and the verified examples. |
| `specs/SPEC-0006-workflow-modeling.md` | Workflow schema, composition rules, and Dynamic Workflow backlog doctrine. |
| `specs/SPEC-0007-loop-guard-timeout.md` | Declarative loop bound and timeout primitives. |
| `decisions/ADR-0003-workflow-vs-loop-goal-skill.md` | Boundary between generic workflow modeling and the loop/goal skill. |
| `decisions/ADR-0004-dynamic-workflow-control-plane.md` | Control-plane/data-plane doctrine for Dynamic Workflows. |

## Related Links

- [[skills-and-prompts]]
- [[current-specs]]
- [[experiments-and-extension]]
