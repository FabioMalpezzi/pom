# ADR-0004 - Dynamic Workflow Control Plane

| Field | Value |
|---|---|
| Date | 2026-05-31 |
| Status | Accepted |
| Category | architecture |
| Area | workflow modeling / dynamic workflows |
| Summary | Dynamic Workflows are an additive control-plane extension of SPEC-0006: POM models launch, await, join, timeout, cancel, suspend, resume, and compensation boundaries; the target project owns the data plane that executes concurrent work |
| Replaces | none |
| Replaced by | none |
| Driver | technical constraint |
| Scope | architecture / workflow modeling |

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

## Decision

Adopt the Dynamic Workflow contract as a **workflow-domain control-plane
extension** to SPEC-0006, not as a runtime commitment in POM Source.

The POM workflow model remains the **control plane**: it records the
deterministic state machine, launch points, waits, joins, timeout exits,
control signals, and compensation semantics. Real concurrent execution
belongs to the target project's **data plane**: the target owns workers,
queues, schedulers, durable execution, thread/process cancellation, and
human-task execution.

The accepted contract shape is additive:

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

Validator coverage is partial and grows as target projects need stricter
automation. POM Source currently validates the handle lifecycle subset;
the rest of the Dynamic Workflow contract is still a contract, not an
implicit runtime feature.

POM Source includes two complete reference executors for the contract,
one in TypeScript and one in Python, under
`experiments/dynamic-workflows/runtime/`. They are executable examples and
test evidence for adopters, not a canonical runtime owned by POM.

## Rationale

This preserves the four SPEC-0006 pillars while still giving target
projects a formal contract for Dynamic Workflows. POM describes what
must be true at the state-machine boundary; the target project decides
how to execute the concurrent work.

Adding native parallel regions to POM would reverse the accepted
no-native-async-inside-the-FSM pillar, require scheduler semantics, and
move POM toward a runtime engine. The control-plane/data-plane split
captures the useful modeling contract without taking ownership of
execution.

The experiment also showed that the contract is additive: the
deterministic stub runner exercised the contract scenarios without
requiring native parallel regions inside the FSM. Tooling promotion is
incremental: each contract field should gain explicit validator rules
instead of relying on ignored fields.

## Alternatives Considered

| Alternative | Rejection reason |
|---|---|
| Add native parallel states to SPEC-0006 | Breaks the no-native-async-inside-the-FSM pillar and requires runtime scheduling semantics. |
| Model N-way fan-out as a counted invoke loop only | Preserves function but serializes work, losing the core Dynamic Workflow property. |
| Treat Dynamic Workflows as entirely out of scope | Too weak: the experiment produced a coherent additive contract that is useful to target projects. |
| Ship a POM reference runtime now | Violates the current "no runtime in POM" constraint and is premature without target deployment pressure. |

## Impacts

| Area | Impact |
|---|---|
| Specs | SPEC-0006 records the Dynamic Workflow contract as an accepted control-plane extension with partial validator coverage. |
| Decisions | This ADR closes the control-plane/data-plane doctrine. |
| Templates | No immediate template changes; future workflow work may extend workflow templates. |
| Tooling | Handle lifecycle rules E080-E089 are implemented. Remaining Dynamic Workflow fields should add explicit validator rules instead of relying on ignored fields. TypeScript and Python reference executors remain in `experiments/dynamic-workflows/runtime/` as examples, not as POM runtime. |

## Links

- Experiment: `experiments/dynamic-workflows/EXPERIMENT.md`
- Contract: `experiments/dynamic-workflows/design/CONTRACT.md`
- Fit evidence: `experiments/dynamic-workflows/design/fit.md`
- Evaluation: `experiments/dynamic-workflows/design/evaluation-dynamic-workflows.md`
- Spec: `specs/SPEC-0006-workflow-modeling.md`

## Follow-up

- [ ] Add explicit validator rules for the Dynamic Workflow fields that are still contract-only (`fan_out_launch`, `await` with `join`/`k`/`timeout`, `react`, `compensation`), following the handle lifecycle rules E080-E089 already implemented. The candidate design is `specs/SPEC-0008-workflow-control-plane-verification.md` (Draft).
- [ ] Keep the TypeScript and Python reference executors under `experiments/dynamic-workflows/runtime/` aligned with the contract when validator rules are added; they remain examples, not a POM runtime.

## Completion Verification

### Step 0 — Goal-backward check

- [x] The decision keeps POM from owning runtime concurrency.
- [x] The Dynamic Workflow contract is visible as accepted workflow
  control-plane doctrine.
- [x] The accepted path does not weaken the existing SPEC-0006
  no-native-async pillar while validator coverage grows incrementally.

### Thesis

The control-plane/data-plane split is valid because it preserves the
current POM workflow model as deterministic operating memory while
capturing the launch, wait, timeout, cancellation, suspend, resume, and
compensation boundaries that target executors need.

### Antithesis

| Antithesis | Confutation |
|---|---|
| POM should add native parallel states directly. | That would reverse the accepted no-native-async-inside-the-FSM pillar and force POM to define runtime scheduling, which SPEC-0006 explicitly excludes. |
| The existing SPEC-0006 schema already expresses a Dynamic Workflow control plane, so no new fields are needed: fan-out is a counted `invoke` loop and fan-in is a context counter. | The experiment tested exactly this and refuted it (`experiments/dynamic-workflows/EXPERIMENT.md`, rounds 1 and 2): the counted invoke loop (`workflows-candidate/04b-fanout-counted.yaml`) expresses N dynamic tasks but runs them sequentially, `04-fanout` with `--n 100` launches one real task, and E036 forbids `mode: parallel` inside the FSM (`broken-fixtures/state-invoke-parallel-E036.yaml`). What the schema could not express was not the fan-out function but the concurrency; only a non-blocking `fan_out_launch` plus a blocking `await` with a handle lets the FSM stay deterministic while N tasks run elsewhere. |

### Exception

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this doctrine changes
substantially, create a new ADR that supersedes this one instead of
rewriting it in place.
