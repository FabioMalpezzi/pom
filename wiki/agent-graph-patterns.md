---
navTitle: Agent Graph Patterns
---

# Agent Graph Patterns

## Summary

A workflow whose work is produced by agents, run in parallel, or re-entered
by a runtime fails differently from a domain workflow. The state machine
still validates, the diagram still looks right, and the system still degrades
— quietly, because the parts that broke were never written down.

POM models three of those parts explicitly: who judges produced work and on
what context (`guards[].evidence`), how a runtime re-enters the workflow and
what closes a cycle (`runtime_loop`), and whether the model describes an
observed process or a designed one (`metadata.provenance`). A fourth is
enforced as a question rather than a field: before any `fan_out_launch`, the
worker workspace, the merge policy, and the disagreement policy must be
decided or recorded as named open points.

All of it is optional. A ticket lifecycle needs none of it, and all 130
workflow and pipeline YAML files that predate the change raise none of the
new codes.

## Current State

Two verified examples ship under
`templates/examples/workflow/agent-graph/`, with a `README.md` cataloguing
them. Both validate at zero errors and zero warnings, and
`tests/workflow-validator/integration/test-verification-and-runtime-loop.mjs`
lints them on every `pom:test` run so they cannot rot silently.

The canonical procedure is `prompts/27-workflow-modeling.md`, reachable
through `skills/workflow.md`. Rule coverage is recorded in
`specs/SPEC-0006-workflow-modeling.md`.

## When The Guard Is Not Actually Verifying

`templates/examples/workflow/agent-graph/security-sweep.yaml` runs one agent
per source file looking for missing authorization checks, then gates
publication behind a guard:

```yaml
guards:
  - name: findings_confirmed
    description: |
      Every reported finding was confirmed, and every expected file identity
      is accounted for.
```

That reads like a verification. Nothing in the model says who confirms the
findings. If the confirming agent is the one that produced them, the graph is
not verifying anything — it is approving itself at the single point where one
decision covers the output of every worker in the batch. The validator says
so:

```
- **W006** `transitions[2]` (from=collecting, guard=findings_confirmed) —
  A guard on a transition leaving an await state declares no evidence block,
  so the fan-in verification has no declared source of truth.
```

The shipped example resolves it by naming the source of truth and the context
it runs on:

```yaml
    evidence:
      source: model_judgment
      independent_context: true
      description: |
        One verifier per finding. It receives the file and the authorization
        rule said to be violated, and never the conversation of the worker
        that produced the finding.
```

Declare `model_judgment` without `independent_context: true` and the
validator raises W005 instead. The warning is not there to be silenced:
`prompts/27-workflow-modeling.md` forbids declaring an independence the
target project cannot actually run, and directs the gap to an open point.

Prefer `source: deterministic` wherever a test run, schema validation, query,
diff, or build result can decide. A model judging a model is a fallback, not
a default.

## Where The Loop Stops Being A Loop

`templates/examples/workflow/agent-graph/nightly-test-repair.yaml` takes the
red suite on main, forms a hypothesis, patches, and runs again. The state
graph for that is ten minutes of work and the validator accepts it.

What the graph never said is what starts a cycle, what evidence decides
success, what a failed cycle hands to the next one, and who owns the run when
the bound is spent. Those four gaps are the difference between a managed
process and an unbounded retry with no owner:

```yaml
runtime_loop:
  trigger:
    kind: schedule
    description: |
      The 02:00 nightly job starts a cycle when the suite on main is red.
      The agent deciding to continue is not a trigger.
  goal: |
    The suite on main is green again without modifying the tests themselves.
  evidence: |
    Exit code of `npm test` plus the JUnit report, and no test deleted or
    marked skip relative to the starting commit.
  feedback: |
    The names of the still-failing tests, the first line of each error, and
    the diff attempted in the previous cycle. Not the transcript.
  stop:
    on_success: green
    on_exhaustion: escalated
    escalation: |
      The owning team of the module receives the branch with the last diff
      and the tests still red.
```

The clause "without modifying the tests themselves" carries real weight. It
is the guard against this agent's known failure mode, which is discovering
that the fastest route to a green suite is deleting the tests that fail. The
`evidence` line makes the clause checkable instead of aspirational. Without
the block, that condition lives in whoever wrote the prompt and disappears at
the first rewrite.

Omit `feedback` and the validator raises W007: the next cycle restarts
without knowing what went wrong, which is a `while (true)` wearing an
architecture. Omit `stop.escalation` and it raises W008: the budget runs out
at three in the morning and the work sits unowned until somebody notices.

`runtime_loop` declares what happens at exhaustion; it counts nothing. The
counting stays with `loop_guard` and `timeout` on the states that repeat, and
with the target project's runtime.

## Where Parallel Workers Collide

Before any `fan_out_launch` is modeled, three questions must be answered or
recorded as named open points: where each worker does its work, how results
are merged, and what happens when two workers contradict each other on the
same identity.

This is not a validator rule, because POM does not model workspaces and does
not choose the isolation mechanism. It is a refusal to leave the decision
implicit. The precedent is public: Bun's Zig-to-Rust port fanned a large
migration across many agents and the first run failed operationally, because
the agents shared git commands in one workspace and overwrote each other. The
fix was structural — forbid the unsafe commands, give each group its own
isolated worktree — not better prompting.

The shipped sweep example answers what it can and leaves the rest visible:

```yaml
metadata:
  open_points:
    - "Merge policy: findings are collected per file identity. The dedup rule for two workers reporting the same line is undecided."
    - "Worker disagreement: if a worker and its verifier disagree on the same finding, whether the finding is dropped, escalated, or published as contested is undecided."
```

A related failure sits on the timeout path. Closing the sweep when the batch
overruns leaves workers running and spending; the handle-lifecycle rule E089
refuses a final state reached with active handles, so the example routes
through a `cancelling` state that declares `cancel_handles`.

## The Model Nobody Watched Run

`metadata.provenance` records whether a model was drawn from an observed
process — runs, traces, logs, an existing implementation, a procedure people
already follow — or designed from intention alone.

Both are legitimate; modeling ahead of implementation is ordinary work. What
is not legitimate is silence, because six months later a speculative model is
read as a description of how the process actually behaves. `design` mode also
asks which parts nobody has confirmed, and those become open points rather
than invisible assumptions inside an authoritative-looking file.

Both shipped examples declare `speculative`, which is the honest value for a
teaching model.

## When None Of This Applies

Most workflows are domain workflows and need none of it. No agent produces
the work, so there is no self-review to fear. No runtime re-enters on its
own, so there is no cycle to contract. No fan-out, so there are no workers to
isolate.

That is why every block is optional and none of them warns when absent. The
rules activate only where a model declares itself agent-shaped — an `await`,
a model-judged guard, a `runtime_loop` — which is exactly where these systems
are known to break.

## Sources

- `prompts/27-workflow-modeling.md` — canonical procedure, `design` and `validate` modes
- `skills/workflow.md` — skill card and key rules
- `templates/WORKFLOW_TEMPLATE.yaml` — schema of the three blocks
- `templates/examples/workflow/agent-graph/` — the two verified examples and their README
- `specs/SPEC-0006-workflow-modeling.md` — rule coverage and status
- `scripts/lib/workflow-lint-agent-rules.mjs` — the validators for E090/E091, E100-E106, W005-W008
