# Workflow Implementation Guide

This guide helps a coding agent translate a POM workflow YAML into code in the target project. It proposes implementation patterns and selection criteria. It never imposes a library and never installs dependencies on its own.

POM also ships target-adaptation runtime templates for the non-model responsibilities that remain project-owned: `templates/WORKFLOW_RUNTIME_TEMPLATE.ts` and `templates/WORKFLOW_RUNTIME_TEMPLATE.py`. They define ports for execution, persistence, timers, retry, tools, and side effects; copy and adapt them inside the target project when a workflow, Dynamic Workflow, or loop/goal model needs executable integration points.

POM defines and validates the control flow itself as a YAML finite-state machine. `templates/WORKFLOW_TEMPLATE.yaml` is a reference starting point for the schema shape, not a required file to copy. Existing projects may write or keep their own workflow YAML files as long as they validate with `scripts/lint-workflows.mjs` / `npm run pom:workflow:lint` for states, events, guards, transitions, invokes, temporal primitives, and Dynamic Workflow handle lifecycle.

The model file (`workflows/<name>.yaml`) is the source of authority. Code, tests, and diagrams derived from it must be kept in sync.

## Before Implementing

1. Read `pom.config.json`. Identify the target language, framework, and test runner.
2. Read the workflow YAML and its validation report. Do not proceed if Error-level findings exist.
3. Read the existing code that the workflow will replace or extend, if any.
4. Identify where in the target architecture the workflow belongs: a domain entity, a service, an aggregate, a reducer, a controller — depends on the project's style.
5. Decide which pattern fits (next section). Record the choice in the change description; if the choice introduces a library, also record it in an ADR.

## Pattern Catalogue

### Pattern A — Transition Table

Encode the workflow as a plain data structure (object, map, or array of records) mapping `(state, event)` to `next_state` and optional `guard`. Transitions are looked up by table.

Use when:

- the model has fewer than ~20 states and ~50 transitions;
- guards are simple predicates over the entity state;
- the team values portability and readability over visual tooling;
- there is no need for hierarchical states, parallel regions, or actions on entry/exit.

Pseudo-shape (language-neutral):

```
transitions := [
  { from: "draft",       to: "accepted",  event: "accept",   guard: "has_verification_gate" },
  { from: "accepted",    to: "complete",  event: "complete", guard: null                    },
]

function next(state, event, context):
  for t in transitions where t.from == state and t.event == event:
    if t.guard == null or evaluate(t.guard, context):
      return t.to
  return REFUSED
```

Tradeoff: refactoring is cheap, but no entry/exit hook, no first-class actions.

### Pattern B — Switch on State

The entity exposes methods named after events; each method does a `switch` on the current state and computes the next state. Guards are inline predicates.

Use when:

- the workflow is small (under ~10 states);
- guards depend heavily on the entity's instance data;
- the team prefers methods that read like business rules to data-driven lookups.

Tradeoff: easy to read for small models, easy to diverge from the YAML if not disciplined; requires a CI check that compares code structure with the model.

### Pattern C — Library-based

Use an FSM library available in the target language (xstate, robot3, machina-js for TypeScript; transitions, statesman for Python; etc.). The YAML model is translated into the library's configuration object.

Use when:

- the workflow has hierarchical or parallel sub-states;
- the team needs visual tooling, time-based transitions, or invocation of services from states;
- the target stack already uses a state-machine library for related concerns.

Tradeoff: adds a dependency (decision requires an ADR), brings non-trivial concepts (actor model, services), couples the team to the library's release cadence and learning curve.

## Selection Criteria

| Criterion | Favor |
|---|---|
| Model under 10 states, simple guards | Pattern A or B |
| Model 10–25 states, moderate guards | Pattern A |
| Model with hierarchical / parallel states | Pattern C |
| Need for entry/exit/timed actions | Pattern C |
| Team unfamiliar with FSM libraries | Pattern A or B |
| Need to keep dependencies minimal | Pattern A or B |
| Already using an FSM library | Pattern C with the same library |

When in doubt, start with Pattern A. It is the easiest to migrate to B or C later.

## Guards in Code

Guards in the YAML are named predicates with a textual description. In code they become functions over the entity context and external state. Convention:

```
guard_has_verification_gate(entity, context) -> boolean
```

- one file per workflow under the target's chosen location;
- guard names match the YAML one-to-one;
- the description from the YAML is reproduced as the function's docstring or top comment.

## Tests from Scenarios

The `workflows/generated/<name>.scenarios.md` file contains a language-agnostic list of cases:

- positive transitions (allowed);
- refused transitions (not allowed);
- guard-conditioned transitions (allowed under guard true, refused under guard false);
- final-state checks (no outgoing transitions, or only documented re-entries).

Each scenario becomes a test case in the target's test framework. Recommend:

- one test file per workflow under the test convention from `pom.config.json`;
- naming pattern that maps scenario id to test name for traceability;
- guards mocked or stubbed per scenario, not hard-coded.

## Keeping Model And Code In Sync

The workflow YAML is authoritative. The code must conform to the model, not the other way around.

Recommended practice (not POM-installed):

- when a transition or state changes, update the YAML first, regenerate diagrams and scenarios, then update the code and tests;
- add a CI check that runs the validator and refuses merges with Error-level findings;
- when the team wants a model change, prefer an ADR if the change alters business meaning.

## Runtime Port Templates

Use `WORKFLOW_RUNTIME_TEMPLATE.ts` or `WORKFLOW_RUNTIME_TEMPLATE.py` as optional starting points when the target implementation needs explicit seams for:

- execution: dispatching the next event or command in the project architecture;
- persistence: saving and restoring workflow snapshots and active handles;
- timers: scheduling timeout wake-up events and cancelling scheduled wake-ups;
- retry: tracking attempts, deciding whether another attempt is allowed, and computing the next delay;
- tools: calling project-owned tools, services, or agent capabilities;
- side effects: publishing domain events and running compensation steps.

These files are optional templates, not POM runtime. The target project may copy the appropriate language template, implement equivalent ports in its own style, or keep an existing runtime adapter. In every case, the POM YAML FSM remains the control-plane source of authority. The YAML is validated before implementation; the TypeScript or Python ports are only one target-owned adapter shape for realizing the validated FSM.

## Language Profiles

The patterns above (A, B, C) are language-agnostic in description. The mapping into idiomatic code of each target language is the job of the coding agent. This section lists the conventions, library options, and test-runner choices the guide expects per supported language. Each profile is additive: more languages can be appended without restructuring.

### TypeScript

| Concern | Idiomatic choice |
|---|---|
| Discriminated union for `Result<Terminal, Output>` | `type R = { terminal: 't1'; ... } \| { terminal: 't2'; ... };` |
| Transition table | `readonly Transition[]` with `as const`. |
| Guard predicates | Pure functions over an opaque `context` parameter. Names match `guards[].name`. JSDoc reproduces the YAML's `description:`. |
| State type | `Literal` union of state names. |
| Test runner | `node:test` (built-in, zero dependency) or the project's runner from `pom.config.json` (vitest, jest, mocha, etc.). |
| Optional library (Pattern C) | **xstate** v5. State-invoke / event-invoke / context injection map to XState `invoke` + `onDone` + `assign`. See `xstate-compat/COMPATIBILITY.md` for the mapping table. |

Evidence: `evidence/typescript/spec-evolution/` (Pattern A, 15 tests, exit 0).

### Python

| Concern | Idiomatic choice |
|---|---|
| Discriminated union for `Result<Terminal, Output>` | `Union[Allowed, Refused]` with frozen `@dataclass` + a `kind: Literal["allowed" \| "refused"]` field. Pydantic v2 is also an option when the project already uses it. |
| Transition table | Tuple of `@dataclass(frozen=True)` records. |
| Guard predicates | Module-level functions over a `TypedDict(total=False)` context. Docstrings reproduce the YAML's `description:`. |
| State type | `Literal[...]` of state names. |
| Pattern matching | `match`/`case` on the `event` or on `guard` name (Python 3.10+). |
| Test runner | `unittest` (built-in, zero dependency) or `pytest` if the project already uses it. |
| Naming caveat | The YAML field `from:` cannot be a Python identifier (keyword). Convention: rename to `from_state` in code. |
| Optional library (Pattern C) | **transitions** ([pytransitions](https://github.com/pytransitions/transitions)) for simple FSMs; **python-statemachine** for declarative + serialization; **statemachine** for callbacks-heavy designs. POM YAML `states[].invoke` maps to the library's nested machine / actor concept where supported, otherwise to a callback that runs the child workflow synchronously. |

Evidence: `evidence/python/spec-evolution/` (Pattern A, 15 tests, exit 0).

### Adding a new language profile

To add Go, Rust, Java/Kotlin, C#, etc., follow the same template:

1. Pick idiomatic types for the discriminated `Result<Terminal, Output>` (e.g., Rust `enum` with variants, Go struct + tag, Java sealed class).
2. Pick an idiomatic immutable container for the transition table.
3. Decide where guard functions live (free functions, struct methods, etc.) and how they receive the opaque context.
4. List the candidate FSM libraries for Pattern C (`looplab/fsm`, `qmuntal/stateless` for Go; `rust-fsm`, `state_machine` for Rust; Spring Statemachine, Squirrel-foundation for Java).
5. Pick the default test runner from the standard library.
6. Produce at least one evidence under `evidence/<language>/<example>/` with the same scenario coverage the existing evidence has. The guide's promise of multi-language portability is only verified once an evidence exists.

### Anti-patterns across all languages

Independent of the target language, the guide discourages:

- Encoding the guard predicate logic inside the YAML — the YAML keeps names + descriptions only, the predicates live in code.
- Hard-coding the transition table in code instead of deriving it from the YAML — the YAML is the source of authority. Whenever the YAML changes, the table is regenerated, not patched.
- Mixing Pattern A with Pattern C in the same machine. Pick one consistently per workflow.

## Loop Guards And Timeouts

`loop_guard` and `timeout` are schema contracts, not POM-owned runtime
services. The validator checks shape, duration grammar, declared target
states, and documented coherence. Target code owns counters, timers,
scheduling, persistence, and event emission.

### `loop_guard`

`loop_guard` bounds a loop as a whole. Target code enforces it by
tracking visits and/or elapsed wall-clock duration for the current loop
entry.

Pattern A and B implementation shape:

```
if entering loop from a different state:
  reset _loop_guard_<state>__visit_count
  reset _loop_guard_<state>__started_at

if taking a self-transition inside the loop:
  increment visit count
  compare visit count and elapsed wall-clock duration
  route to on_visits_exhausted, on_duration_exhausted, or on_exhaustion
```

Pattern C implementation shape:

- use the target FSM library's guard/action hooks for visit counters;
- use the target runtime's timer/scheduler for elapsed wall-clock checks;
- keep POM YAML as the structural source of authority and map library
  actions back to the named exit states.

### `timeout`

`timeout` bounds residence in a single non-loop state. Target code emits
the event or performs the transition to `on_timeout` when the declared
duration elapses.

Pattern A and B implementation shape:

- persist `entered_at` for the state in the target entity or snapshot;
- on wake-up, polling, or command handling, compare wall-clock elapsed
  time with `timeout.duration`;
- when expired, dispatch the target-owned timeout event or jump through
  the implementation's normal transition mechanism.

Pattern C implementation shape:

- map `timeout.duration` to the library's delayed transition or timer
  primitive when available;
- keep persistence decisions in target infrastructure, especially for
  waits longer than process lifetime.

Do not implement an in-POM scheduler to satisfy either primitive.

## Dynamic Workflow in Target Projects

Dynamic Workflow fields are control-plane contracts, not POM-owned runtime services. Use them only when `pom.config.json` declares `workflows.dynamic.enabled: true`.

The model records:

- where the control plane launches target-owned work with `fan_out_launch`;
- which workflow-local handles identify active work;
- where the control plane waits with `await` and `join: all | quorum | first`;
- how timeout wake-ups re-enter the FSM;
- which handles must be cancelled or intentionally detached;
- which ordered `compensation` steps run on cancellation boundaries.

The target project owns:

- worker, queue, process, thread, or service execution;
- durable scheduling and timeout event emission;
- persistence of active handles and snapshots;
- cancellation semantics for real work;
- idempotency, retry, backoff, observability, and compensation implementation.

POM provides `WORKFLOW_RUNTIME_TEMPLATE.ts` and `WORKFLOW_RUNTIME_TEMPLATE.py` as adaptation templates for those seams. They are useful starting points for execution, persistence, timer, retry, tool, and side-effect ports, but the concrete adapters remain target-owned.

Implementation guidance:

1. keep the POM YAML as the control-plane source of authority;
2. implement a target data-plane adapter that translates `fan_out_launch` into project-native work submissions and returns durable handles;
3. persist active handles with the workflow state so suspend/restore can resume without losing in-flight work;
4. enforce the handle lifecycle invariant in target code: before a final state, every active handle is awaited, cancelled, or detached;
5. treat `detach_handles` as an explicit ownership transfer. Document who monitors and cleans up the detached work;
6. do not add native parallel states to the POM model to simulate runtime concurrency. If the project needs richer runtime semantics, adopt a target-owned workflow engine and record that library decision in an ADR.

## Suspend and Restore

Long-running workflows (orders waiting for shipment, approvals waiting for signature, agent orchestrators waiting for user input) must survive process restarts, container redeploys, and across-time pauses. POM workflow does not own a persistence layer (that violates the "no runtime" pillar), but the Pattern A code POM produces is **naturally suspend-friendly**: the machine is a pure function and the caller owns the state.

### The principle

Pattern A's `applyTransition(state, event, context)` has no running thread, no callbacks pending, no scheduler attached. Between two events the machine is materialized only by two values: `state` and `context`. Suspend is "write those two values somewhere". Restore is "read them and keep calling the function".

This is by design, not a happy accident. The same property holds in TypeScript, Python, and any language Pattern A targets.

### Snapshot shapes

**Single machine**:

```json
{
  "workflow": "spec_evolution",
  "version": 1,
  "state": "accepted",
  "context": { "has_completion_verification_gate": true }
}
```

The `version` field comes from the YAML `version:` and matters when the model evolves: a snapshot from `version: 1` is not necessarily valid against `version: 2`.

**Composed machine (state-invoke or event-invoke)**: a stack of frames, one per active invoke level. The bottom of the stack is the leaf currently executing; restoring walks the stack outward, re-applying transitions only on the frame that needs progress.

```json
{
  "stack": [
    { "workflow": "operational_fsm",        "state": "analyzer",           "context": {...} },
    { "workflow": "analyzer_fsm",           "state": "family_enforcement", "context": {...} },
    { "workflow": "clean_family_repair_fsm","state": "evaluating_attempt", "context": {...} }
  ]
}
```

**Pipeline**: pipeline name + current member index + the member's own snapshot (which is itself a single-machine or composed snapshot).

```json
{
  "pipeline": "order_processing",
  "current_member_index": 1,
  "current_member_workflow": "checkout_flow",
  "member_snapshot": { "workflow": "checkout_flow", "version": 1, "state": "reviewing", "context": {...} }
}
```

### Storage options

POM does not prescribe storage. Common targets:

| Storage | Fit |
|---|---|
| Relational DB columns (`state TEXT`, `context JSONB`, `snapshot JSONB`) | Production default; transactional updates align with business writes. |
| Document DB (Mongo, DynamoDB, Firestore) | Snapshots map naturally to documents. |
| KV store (Redis, etcd) | Fast restore for in-flight workflows; pair with a durable store. |
| JSON file on disk | Single-machine setups, tests, CLI tools. |
| Distributed log (Kafka, EventStore) | Event-sourced workflows; the snapshot becomes a periodic projection. |

In all cases the rule is the same: write `(workflow_id, snapshot)` atomically with the business write that the transition produced.

### The suspend / restore contract

**Suspend** is a single function:

```ts
function suspend<Snap>(snap: Snap, storage: Storage): void {
  storage.write(serialize(snap));
}
```

**Restore** is the inverse plus a validation step against the current YAML:

```ts
function restore<Snap>(storage: Storage): Snap {
  const raw = storage.read();
  const snap = JSON.parse(raw);
  assertSnapshotMatchesModel(snap, currentModel);   // workflow name, version, state existence
  return snap;
}
```

`assertSnapshotMatchesModel` enforces three invariants:

1. `snap.workflow` equals the model's `workflow:` field;
2. `snap.version` equals the model's `version:` (or is explicitly upgraded);
3. `snap.state` exists in the model's `states[]`.

If any invariant fails, restore raises an explicit error. **The implementation guide forbids "best-effort restore"**: a snapshot that does not match the model is a bug to surface, not silently coerce.

### Cycles, retries, and counters

When the YAML has a bounded loop (`MAX_LLM_ATTEMPTS`, `MAX_FAMILY_REPAIR_ATTEMPTS`), the retry counter belongs in `context`, not in a global. Suspend writes the counter; restore reads it. The bound is still enforced in target code (no POM primitive for it), but the counter survives restarts.

This is the practical answer to the "bounded retry" open point raised by the internal AI agent analyzer FSM: the cycle is structural in the YAML, the bound is enforced by target code, and the counter survives suspend/restore because it lives in `context`.

### What POM does NOT do

- No persistence layer. POM never writes anything.
- No scheduling, no timer, no dead-letter. A workflow that waits N days uses the target's scheduling stack (cron, BullMQ, Temporal, EventBridge).
- No instance identification. POM does not know that there are N orders in flight. The target owns `workflow_id` and the persistence keyspace.
- No automatic snapshot versioning beyond exposing the YAML `version:` field. Migrations between versions are target-code logic.

### XState comparison

XState v5 has `actor.getSnapshot()` and `createActor(machine, { snapshot })` as native primitives. When persistence requirements drive the choice, that becomes a concrete reason to pick Pattern C (XState) over Pattern A. POM-built Pattern A code can do the same thing but the developer writes the serialize/deserialize plumbing explicitly (see the evidences at `evidence/typescript/spec-evolution-suspend/` and `evidence/python/spec-evolution-suspend/`).

## What This Guide Does Not Do

- It does not generate code automatically. Code generation belongs to the coding agent, supervised by the team.
- It does not maintain runtime instances. Instance state lives in the target's storage layer.
- It does not enforce a pattern. Selection is the team's responsibility.
- It does not bless a single target language. Each language profile is opt-in and additive.
