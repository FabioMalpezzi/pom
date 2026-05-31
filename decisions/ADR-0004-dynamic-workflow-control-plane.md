# ADR-0004 — Dynamic Workflow Control Plane

| Field | Value |
|---|---|
| Date | 2026-05-31 |
| Status | Accepted |
| Area | workflow modeling / dynamic workflows |
| Supersedes | n/a |

## Decision

Adopt the Dynamic Workflow contract as a **workflow-domain backlog
extension** to SPEC-0006, not as a runtime commitment in POM Source.

The POM workflow model remains the **control plane**: it records the
deterministic state machine, launch points, waits, joins, timeout exits,
control signals, and compensation semantics. Real concurrent execution
belongs to the target project's **data plane**: the target owns workers,
queues, schedulers, durable execution, thread/process cancellation, and
human-task execution.

The accepted backlog shape is additive:

- `fan_out_launch` on a state starts a batch externally and returns a
  handle without blocking the FSM.
- `await` on a state blocks the FSM on one or more handles with
  `join: all | quorum | first`, optional `k`, optional `timeout`, and an
  `on_timeout` wake-up event.
- Handles are workflow-local names. `await.handles` is selective:
  handles not named by an `await` remain active until they are awaited,
  cancelled with `cancel_handles`, or intentionally detached with
  `detach_handles`.
- `react` on a state lets the FSM react to each completion, early exit,
  or completion of the observed batch.
- `cancel`, `suspend`, and `resume` are standard lifecycle signals
  propagated to active children or launched batches.
- `compensation` is the one new workflow-level construct: an ordered
  undo saga run on cancellation.

Validator and executor implementation is deferred until a target project
needs the contract. The current canonical action is to keep the contract
visible in SPEC-0006 as backlog for a future SPEC-0007-style extension.

## Context

The `experiments/dynamic-workflows/` experiment tested whether SPEC-0006
could model Dynamic Workflows: orchestrators that launch many concurrent
tasks, wait for fan-in, and resume based on completion, timeout, or
control signals.

The original hypothesis was refuted in a precise way. Current SPEC-0006
cannot represent real parallelism inside the FSM, and that is deliberate:
asynchronous composition is rejected by the existing workflow pillars.
The experiment then found a lower-cost alternative: keep the FSM
deterministic and delegate concurrency to a target-owned data plane.

## Rationale

This preserves the four SPEC-0006 pillars while still giving target
projects a formal contract for Dynamic Workflows. POM describes what
must be true at the state-machine boundary; the target project decides
how to execute the concurrent work.

Adding native parallel regions to POM would reverse the accepted
no-async pillar, require scheduler semantics, and move POM toward a
runtime engine. The control-plane/data-plane split captures the useful
modeling contract without taking ownership of execution.

The experiment also showed that the contract is additive: current
workflow validation accepts the candidate YAML files because unknown
fields are ignored, and the deterministic stub runner exercised the
contract scenarios. Formal promotion still requires explicit validator
rules, documentation, and target-driven implementation evidence.

## Alternatives Considered

| Alternative | Rejection reason |
|---|---|
| Add native parallel states to SPEC-0006 | Breaks the no-async pillar and requires runtime scheduling semantics. |
| Model N-way fan-out as a counted invoke loop only | Preserves function but serializes work, losing the core Dynamic Workflow property. |
| Treat Dynamic Workflows as entirely out of scope | Too weak: the experiment produced a coherent additive contract that is useful to target projects. |
| Ship a POM reference runtime now | Violates the current "no runtime in POM" constraint and is premature without target deployment pressure. |

## Impacts

| Area | Impact |
|---|---|
| Specs | SPEC-0006 records the Dynamic Workflow contract as backlog, not as implemented schema. |
| Decisions | This ADR closes the control-plane/data-plane doctrine. |
| Templates | No immediate template changes; future SPEC-0007 work may extend workflow templates. |
| Tooling | Handle lifecycle rules E080-E089 are implemented. Remaining Dynamic Workflow fields should add explicit validator rules instead of relying on ignored fields. |

## Links

- Experiment: `experiments/dynamic-workflows/EXPERIMENT.md`
- Contract: `experiments/dynamic-workflows/design/CONTRACT.md`
- Fit evidence: `experiments/dynamic-workflows/design/fit.md`
- Evaluation: `experiments/dynamic-workflows/design/evaluation-dynamic-workflows.md`
- Spec: `specs/SPEC-0006-workflow-modeling.md`

## Completion Verification

### Step 0 — Goal-backward check

- [x] The decision keeps POM from owning runtime concurrency.
- [x] The Dynamic Workflow contract is still visible as future workflow
  work.
- [x] The accepted path does not weaken the existing SPEC-0006
  no-async pillar before validator work exists.

### Thesis

The control-plane/data-plane split is valid because it preserves the
current POM workflow model as deterministic operating memory while
capturing the launch, wait, timeout, cancellation, suspend, resume, and
compensation boundaries that target executors need.

### Antithesis

| Antithesis | Confutation |
|---|---|
| POM should add native parallel states directly. | That would reverse the accepted no-async pillar and force POM to define runtime scheduling, which SPEC-0006 explicitly excludes. |
| POM should ignore Dynamic Workflows entirely. | The experiment produced a small additive contract with runnable evidence; ignoring it would lose useful operating memory for a known target need. |

### Exception

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this doctrine changes
substantially, create a new ADR that supersedes this one instead of
rewriting it in place.
