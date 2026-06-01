# Spec - Workflow Modeling Support

| Field | Value |
|---|---|
| Date | 2026-05-29 |
| Status | Complete |
| Area | method / extension |
| Summary | Define POM support for modeling, validating, and guiding the implementation of domain workflows in target projects, without runtime engine, without live instance tracking, and without imposing a specific FSM library |

## Implementation Status

This spec describes the target shape of the capability and the current
canonical implementation in POM Source. The table below is authoritative
on what currently exists, what remains prompt-driven, and where validator
coverage is still partial.

| Area | Status | Where it lives today |
|---|---|---|
| YAML model schema (states, events, guards, transitions, invariants) | **Implemented** | `templates/WORKFLOW_TEMPLATE.yaml` and examples under `templates/examples/workflow/` |
| `re_entry_allowed` attribute on terminal states | **Implemented** | Schema + validator + applied to `spec-evolution.complete` and `ticket-lifecycle.closed` |
| Validator Error rules (E000–E017) | **Implemented** | `scripts/lint-workflows.mjs` |
| Validator Warning rules (W001–W004) | **Implemented** | `scripts/lint-workflows.mjs` |
| Validation report (`<name>.validation.md`) | **Implemented** | Markdown output of `lint-workflows.mjs` |
| Broken-fixture coverage (one per E and W rule, plus positive `re_entry_allowed`) | **Implemented** | `tests/workflow-validator/` fixtures and integration tests |
| Skill card with five modes | **Implemented** | `skills/workflow.md` |
| Canonical prompt for the skill | **Implemented** | `prompts/27-workflow-modeling.md` |
| Validator Info rules (cycles, naming conventions) | **Target for promotion** | Not implemented; explicitly out of scope of the stable validator pass |
| Mermaid diagram generator (`<name>.mmd`) | **Implemented** | `scripts/mermaid.mjs` shared renderer + `scripts/to-mermaid.mjs` CLI + integrated into the validator via `--mermaid-dir` so every `pom:workflow:lint` run also refreshes the diagrams. |
| Scenario derivation (`<name>.scenarios.md`) | **Prompt-driven** | `skills/workflow.md` + `prompts/27-workflow-modeling.md`; no stable script generator is shipped. |
| `pom:workflow:lint` npm wrapper | **Implemented** | `package.json` invokes `node scripts/lint-workflows.mjs` |
| Implementation guide for coding agents | **Implemented** | `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` |
| Integration & extension guide for adopters | **Implemented** | `templates/WORKFLOW_INTEGRATION_GUIDE.md` |
| TypeScript guided-implementation evidence (Hypothesis H4) | **Implemented** | `evidence/typescript/spec-evolution/` — 15 tests, all passing, Pattern A (transition table), zero added dependencies |
| `loop_guard` and `timeout` temporal primitives | **Implemented** | SPEC-0007; validator rules E060-E073 and W060 in `scripts/lint-workflows.mjs` |
| Dynamic Workflow control-plane/data-plane contract | **Accepted control-plane extension, partial validator coverage** | Accepted doctrine in `decisions/ADR-0004-dynamic-workflow-control-plane.md`; `fan_out_launch`, `await` with `join`/`k`/timeout, `react`, lifecycle propagation, cancel/detach, and compensation are part of the workflow contract. Validator coverage is currently strongest for handle lifecycle rules E080-E089; target projects own real data-plane execution. |
| Dynamic Workflow reference executors | **Implemented as examples** | Complete TypeScript and Python executors live under `experiments/dynamic-workflows/runtime/`. They prove the contract can run and guide adopters, but they are not a canonical POM runtime. |
| Promotion decision and consolidation | **Complete** | Canonical skill, prompt, templates, scripts, examples, and docs are under stable paths. |

The rest of this document describes the *target* shape. Read each section together with the row above before assuming a feature exists.

## Purpose

Target projects increasingly need explicit, well-defined workflows: ticket lifecycle, document approval, request authorization, content publishing, internal spec evolution, and so on. The current POM method supports such workflows only as prose inside specs or wiki pages. Prose is good for context but fragile for verification, hard to keep in sync with the implementing code, and hard to hand to a coding agent for accurate translation.

POM should help teams:

- **define** the workflow in a small declarative form that survives sessions and agents;
- **validate** the model statically before any code is written;
- **visualize** the model as a diagram for human review;
- **derive** verification scenarios for the implementation;
- **guide** the coding agent in turning the model into production code in the project's own language and architecture.

POM must not become a runtime, must not execute workflows, must not impose a library, and must not track live instances on behalf of the target.

For Dynamic Workflow, POM Source still keeps two complete reference
executors in `experiments/dynamic-workflows/runtime/`: TypeScript and
Python. They are examples and verification evidence for target projects,
not a runtime dependency or execution service provided by POM.

## Non-goals

- runtime engine for workflows;
- POM-side tracking of live workflow instances;
- automatic code generation in the target project (POM produces guidance, not finished code);
- export to formal verification tools (TLA+, NuSMV, SPIN) in the first release;
- native parallel regions, distributed execution semantics, or hierarchical sub-machines in the first release;
- adapter or bundled support for a specific FSM library (xstate, robot3, etc.) in POM core.

Dynamic Workflow modeling is accepted as a control-plane extension to the
workflow model. It records launch, await, join, timeout, reaction,
lifecycle propagation, and compensation boundaries while leaving real
concurrent execution to target-owned infrastructure. That contract does
not make POM a runtime and does not add native parallel regions to the
FSM.

## Model Format

The canonical model is a single YAML file per workflow, by default under `workflows/<name>.yaml` in the target project. Format (draft, subject to change during the experiment):

```yaml
workflow: spec_evolution
version: 1
description: |
  POM SPEC lifecycle: from first draft to a completed, superseded, or withdrawn state.

initial_state: draft

states:
  - name: draft
    description: Spec being written, not yet reviewed.
    is_final: false
  - name: accepted
    description: Spec reviewed and approved. Implementation may begin.
    is_final: false
  - name: complete
    description: Spec fully implemented and verified.
    is_final: true
    re_entry_allowed: true        # admits supersede out-transition

events:
  - name: accept
    description: Reviewer approves the spec content.
  - name: complete
    description: Implementation and verification gate satisfied.

guards:
  - name: has_verification_gate
    description: The spec declares a completion verification gate.

transitions:
  - from: draft
    to: accepted
    event: accept
    guard: has_verification_gate
  - from: accepted
    to: complete
    event: complete

invariants:
  - description: A complete spec cannot return to draft. (Use supersede instead.)
```

The above fields are draft. The experiment compiles three realistic workflows (`spec-evolution`, `ticket-lifecycle`, `document-approval`) and adjusts the schema until all three model cleanly.

## Validation Rules

The validator must report, with severity, at least:

| Severity | Check |
|---|---|
| Error | Initial state missing or not declared in `states`. |
| Error | A transition references a state not declared in `states`. |
| Error | A transition references an event not declared in `events`. |
| Error | A transition references a guard not declared in `guards`. |
| Error | More than one initial state. |
| Warning | A state is declared but never reached by any transition (unreachable). |
| Warning | A non-final state has no outgoing transitions (silent dead-end). |
| Warning | A final state has outgoing transitions (re-entry from terminal). Suppressed when the state declares `re_entry_allowed: true`. |
| Warning | Two transitions share `(from, event)` without distinguishing guards (non-determinism). |
| Info | Cycles exist in the model. (Not always a defect, but worth flagging.) |
| Info | State or event names violate the naming convention (snake_case). |

The validator emits a Markdown report under `workflows/generated/<name>.validation.md`.

## Generated Artifacts

For each `workflows/<name>.yaml` the toolchain produces, on demand:

- `workflows/generated/<name>.mmd` — Mermaid `stateDiagram-v2` rendering.
- `workflows/generated/<name>.validation.md` — validation report.
- `workflows/generated/<name>.scenarios.md` — prompt-derived verification scenarios in language-agnostic form (e.g., "from `draft` on `accept` with `has_verification_gate=true`, expect transition to `accepted`"; "from `complete` on `accept`, expect transition refused"). POM ships the scenario procedure, not a stable scenario generator script.

All generated files declare in the header that they are derived from the YAML and must not be hand-edited.

## Skill Surface

A single skill `skills/workflow.md` exposes the following modes:

| Mode | Purpose |
|---|---|
| `design` | Interview-style help to draft a new workflow YAML from informal description, surfacing ambiguities as open points instead of inventing rules. |
| `validate` | Run the validator and produce the report; declare what remains undecided. |
| `diagram` | Regenerate the Mermaid diagram. |
| `scenarios` | Regenerate the verification scenarios. |
| `implement` | Guide a coding agent to translate the YAML into code in the target stack, proposing implementation patterns (table-based, switch-based, library-based) with selection criteria — never imposing one. |

The skill follows the POM convention: short card, points to a canonical prompt under `prompts/`, refuses to operate without reading `pom.config.json`.

## Implementation Guidance

POM ships a `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` with:

- pattern catalogue for translating a workflow into code (transition table, switch statement, library-based);
- selection criteria (size of model, presence of guards, need for visual tooling in the target, language idiom);
- minimal pseudo-code per pattern, language-neutral;
- guidance on how guards map to predicate functions and where in the target's architecture they belong;
- guidance on test scenarios derived from the model.

The guide does not include language-specific implementations: those live in the target's codebase and remain the target team's responsibility.

## Configuration

A new optional section in `pom.config.json`:

```json
{
  "workflows": {
    "enabled": true,
    "root": "workflows/",
    "generatedRoot": "workflows/generated/",
    "namingConvention": "snake_case"
  }
}
```

When `enabled` is `false` or missing, POM skills and lint ignore the section. Following the "POM consiglia non impone" principle, workflow support is opt-in.

## Tooling

A single script: `scripts/lint-workflows.mjs`, invoked via `npm run pom:workflow:lint`. The script:

- parses every `workflows/*.yaml`;
- runs the validation rules;
- emits validation reports and, when requested with `--mermaid-dir`,
  Mermaid diagrams under `workflows/generated/`;
- exits non-zero on Error-level findings and zero on Warning/Info.

Scenario files are derived by the `workflow` skill's `scenarios` mode
using `prompts/27-workflow-modeling.md`. They are still generated
artifacts and must not be hand-edited, but they are prompt-driven rather
than produced by `lint-workflows.mjs`.

Dependencies are minimal. The stable parser dependency is `js-yaml`.

## Risks

- **Method bloat**: a workflow extension may exceed the weight POM tolerates. Mitigation: hard caps on skill and prompt size, and an explicit Goal-Backward Check during promotion.
- **Implicit framework**: the model format may become so detailed that adopting it effectively forces a particular implementation style. Mitigation: keep the YAML semantically minimal; expressivity beyond the three reference examples requires a new spec, not an in-place extension.
- **Drift between model and code**: a YAML is authoritative only if the team actually uses it. Mitigation: the `implement` mode tells the agent to update both YAML and code together, and the guide recommends a CI check that fails on divergence (recommendation, not POM-installed).

## Open Points

These are deliberately left undecided until the experiment provides evidence:

- representation of pause-like states (`Deferred`, `Blocked`, `Waiting`) — separate states, orthogonal flag, or out of scope;
- guard naming convention and how guards are wired to target code;
- relation between workflows and the existing POM spec / ADR / task-plan vocabulary (does `spec_evolution.yaml` replace or complement the current `## Status` field?);
- minimum / maximum size of the model that the validator accepts;
- whether one workflow file can declare composition with another (out of scope for v1 unless the three examples force it);
- effect of `re_entry_allowed: true` on a non-final state — currently ignored silently; may become an Info or Warning rule in a later pass.

## Closed Decisions

- **`re_entry_allowed: true` on a final state** suppresses W003. The attribute is opt-in, defaults to `false`, and was added after both compiled examples (`spec-evolution`, `ticket-lifecycle`) independently produced the same W003 on terminal states with a documented exception (`supersede`, `reopen`). See `EXPERIMENT.md` "Decisione: re_entry_allowed" for the evidence trail.

- **Synchronous composition primitives (linear pipeline; invoke from state; invoke from event)** are in scope. **Native asynchronous composition inside the FSM is permanently out of scope.** The decision rests on the invariant that a child workflow communicates with the parent only at the boundary (entry from a trigger, exit by terminal state name). Fire-and-forget composition implemented as internal parallel regions requires scheduler semantics that POM has declared off-limits since the v1 spec; teams that need native parallel states should adopt Pattern C (XState `invoke`/`spawn`). Dynamic Workflow fan-out is the separate accepted control-plane contract below: POM records launch, handle, await, timeout, reaction, lifecycle, and compensation boundaries while the target project owns real concurrent execution. Declaring `mode: async` or `mode: parallel` in a pipeline or invoke block is an Error (E029).

- **Context injection (`Result<Terminal, Output>` model)** is the chosen mechanism for a parent and child to exchange structured data. Each workflow has a **private context**. The parent extracts an `input` object and hands it to the child at invocation; the child elaborates on its own private context; on terminal, the child returns the terminal name (tag) and an `output` object (payload). The parent reads the output and integrates it via `assign:`. Shared context visibility between parent and child is rejected as a violation of FSM autonomy and is treated as Pattern C territory. The validator implements the documental level only (nominal coherence, no type-checking, no path evaluation). Full rationale in `CONTEXT-INJECTION.md` (closed design decision).

- **Four invariants of the composition model** (the pillars that distinguish POM-workflow from a YAML dialect of XState): (1) no asynchronous composition; (2) no shared global state; (3) no inheritance / override between workflows; (4) no runtime in POM itself.

- **Dynamic Workflow doctrine**: Dynamic Workflows are not modeled by
  adding native parallel regions to SPEC-0006. The accepted direction is
  a control-plane/data-plane split: the POM FSM records launch, await,
  join, timeout, reaction, lifecycle propagation, and compensation
  boundaries; the target project owns concurrent execution. See
  `decisions/ADR-0004-dynamic-workflow-control-plane.md`.

## Dynamic Workflow Contract

This section records the additive control-plane contract proven in
`experiments/dynamic-workflows/`. The contract is part of the workflow
modeling direction accepted by ADR-0004. POM Source currently validates
the handle lifecycle subset explicitly; additional validator rules and
implementation guidance can be added as target projects need stricter
automation.

### Control Plane And Data Plane

The POM workflow is the **control plane**: deterministic state, explicit
launch and wait states, named timeout exits, lifecycle signals, and
compensation rules. The target project supplies the **data plane**:
workers, queues, durable scheduling, cancellation mechanics, persistence
for long waits, and execution of software or human tasks.

The reference executors under `experiments/dynamic-workflows/runtime/`
show one TypeScript and one Python way to implement that split. They are
complete enough to execute the experiment scenarios, but they remain
examples: a target project may copy, adapt, replace, or ignore them
according to its own stack.

### Contract Fields

`fan_out_launch` on a state starts a batch externally and returns a
handle without blocking the FSM:

```yaml
states:
  - name: launching
    fan_out_launch:
      workflow: task-worker.yaml
      over: task_ids
      handle: task_batch
```

`await` on a state blocks the FSM on one or more handles until a join
policy succeeds or a timeout wakes the machine:

```yaml
states:
  - name: awaiting_tasks
    await:
      handles: [task_batch]
      join: quorum
      k: 80
      timeout: 30m
      on_timeout: tasks_timed_out
```

`await.handles` is selective. A workflow may launch four handles and
await only two of them in a given wait state. Handles not named by that
`await` remain active. Before any terminal state is reached, every active
handle must be resolved by one of three explicit choices:

- await it with `await.handles`;
- cancel it with `cancel_handles`;
- detach it with `detach_handles`.

```yaml
states:
  - name: awaiting_primary
    await:
      handles: [primary_batch]
      join: all
  - name: detaching_audit
    detach_handles: [audit_batch]
```

Handles are workflow-local names declared by `fan_out_launch.handle`.
They must be snake_case identifiers and unique within the workflow. The
name is the durable reference used by later `await`, `cancel_handles`,
and `detach_handles` blocks; it is not inferred from the child workflow
name or the launched collection.

`react` on a state supports stream-like collection:

```yaml
states:
  - name: collecting
    react:
      on_each: task_completed
      on_early: enough_results_collected
      on_done: all_results_collected
```

`compensation` at workflow level defines the undo saga used when a
`cancel` lifecycle signal is propagated:

```yaml
compensation:
  - undo: release_reserved_capacity
  - undo: mark_launched_tasks_cancelled
```

### Validator Coverage To Complete

Future validator and implementation-guidance work should add explicit
checks for the rest of the already-accepted Dynamic Workflow contract:

- shape checks for `fan_out_launch.workflow`, `over`, and `handle`;
- shape checks for `await.handles`, `join`, `k`, `timeout`, and
  `on_timeout`;
- shape checks for `react.on_each`, `on_early`, and `on_done`;
- how `cancel`, `suspend`, and `resume` propagate through active
  invokes and launched batches;
- how `compensation` order is declared and when it is considered
  complete;
- how Dynamic Workflow timeout syntax aligns with the accepted SPEC-0007
  `timeout` primitive;
- how retry after timeout aligns with the accepted SPEC-0007
  `loop_guard` primitive;
- which generated scenarios prove launch, wait, timeout, cancellation,
  suspend, resume, and compensation behavior.

Implemented handle-lifecycle validator rules:

| Code | Check |
|---|---|
| E080 | `fan_out_launch` is a mapping when declared on a state. |
| E081 | `fan_out_launch.workflow` is a non-empty string. |
| E082 | `fan_out_launch.handle` is a snake_case identifier. |
| E083 | `fan_out_launch.handle` is unique within the workflow. |
| E084 | `await` is a mapping when declared on a state. |
| E085 | `await.handles` is a non-empty list of snake_case handle identifiers. |
| E086 | `await.handles[]` references handles declared by an earlier `fan_out_launch`. |
| E087 | `cancel_handles` is a non-empty list of declared active handles. |
| E088 | `detach_handles` is a non-empty list of declared active handles. |
| E089 | A final state is not reachable with active handles that were not awaited, cancelled, or detached. |

## Composition: Linear Pipeline (synchronous)

A pipeline file declares a sequence of POM workflows that activate one after the other. The handoff happens when a member reaches a declared terminal state; the pipeline file says which successor (if any) starts next.

```yaml
pipeline: order_processing
sequence:
  - workflow: workflows/cart-flow.yaml
    completes_on:
      - state: cart_completed
        next: workflows/checkout-flow.yaml
      - state: cart_abandoned
        next: null
  - workflow: workflows/checkout-flow.yaml
    completes_on:
      - state: checkout_confirmed
        next: workflows/payment-flow.yaml
      - state: checkout_canceled
        next: null
```

Validator detects pipeline files via the root key `pipeline:` (mutually exclusive with `workflow:`). New Error rules:

| Code | Check |
|---|---|
| E020 | Pipeline name is missing. |
| E021 | Sequence is missing or empty. |
| E022 | A member has no `workflow` path. |
| E023 | Member workflow file does not exist. |
| E024 | A member has no `completes_on`. |
| E025 | `completes_on[].state` is not declared as `is_final: true` in the referenced member workflow. |
| E026 | `completes_on[].next` is not null and does not reference another member of the same pipeline. |
| E027 | Cycle in the pipeline graph. |
| E028 | Root declares both `workflow` and `pipeline`. |
| E029 | Asynchronous mode declared. Out of scope. |

Invariants of the pipeline primitive:
- members are mutually isolated: a child knows nothing of the pipeline or its siblings;
- the boundary is named — only the terminal state name, no event-bus or shared context;
- the schema admits no async mode; E029 rejects it.

## Composition: Invoke from State (synchronous)

A state of a parent workflow may declare an `invoke:` block. When the parent enters that state, a child workflow starts; while the child runs, the parent is blocked in the invoking state. When the child reaches one of its terminal states, the parent receives the declared `next_event` and applies its own normal transitions.

```yaml
states:
  - name: validating
    description: parent is blocked while the child runs
    is_final: false
    invoke:
      workflow: workflows/validation-flow.yaml
      on_completion:
        - terminal_state: validated
          next_event: validation_passed
        - terminal_state: refused
          next_event: validation_failed
```

New Error rules:

| Code | Check |
|---|---|
| E030 | Invoke block has no `workflow` path or non-string path. |
| E031 | Invoke `workflow` references a file that does not exist. |
| E032 | Invoke has no `on_completion` or it is empty. |
| E033 | `on_completion[].terminal_state` is not declared as `is_final: true` in the child workflow. |
| E034 | `on_completion[].next_event` is not declared in the parent's `events[]`. |
| E035 | Invoke declared on a state that is `is_final: true`. Terminal states cannot host an invoke. |
| E036 | Invoke declares an asynchronous mode (`async` / `parallel`). Out of scope. |

Invariants of the invoke-from-state primitive:
- the parent's state blocks until the child terminates (synchronous);
- the child knows nothing of the parent: it does not receive context, events, or callbacks during its lifetime;
- the boundary is named — only the child's terminal state name and the parent's `next_event`;
- a child workflow must validate as a standalone POM workflow on its own;
- the schema admits no async mode; E036 rejects it.

Use case in mind: an orchestrator parent whose lifecycle includes a state like `validating_payment`, `running_kyc_check`, `awaiting_sub_agent_decision`. The child runs a self-contained mini-workflow and reports its outcome only via terminal state name. This is the building block for an "orchestrator that calls one sub-agent synchronously per state" pattern. Orchestrators that need to fan out to N sub-agents use the Dynamic Workflow control-plane contract: POM records handles, wait policy, lifecycle, and compensation boundaries, while the target project supplies the real concurrent executor.

## Composition: Invoke from Event (synchronous)

A transition may declare an `invoke:` block in place of a direct `to:`. When the event fires from the source state, the child workflow starts; while the child runs, the parent is blocked in the source state. When the child terminates, the parent jumps to the `target` declared in `on_completion` for that terminal.

```yaml
transitions:
  - from: drafting
    event: submit_for_review
    invoke:
      workflow: workflows/validation-flow.yaml
      on_completion:
        - terminal_state: validated
          target: accepted
        - terminal_state: refused
          target: rejected
```

A transition has **exactly one** of: a direct `to:`, or an `invoke:` block whose `on_completion` supplies the targets. Declaring both is E045.

New Error rules:

| Code | Check |
|---|---|
| E040 | Invoke block has no `workflow` path or non-string path. |
| E041 | Invoke `workflow` references a file that does not exist. |
| E042 | Invoke has no `on_completion` or it is empty. |
| E043 | `on_completion[].terminal_state` is not declared as `is_final: true` in the child workflow. |
| E044 | `on_completion[].target` is not declared as a state in the parent workflow. |
| E045 | Transition declares both `invoke` and `to`. |
| E046 | Invoke declares an asynchronous mode (`async` / `parallel`). Out of scope. |

The reachability analysis (W001) is updated to treat `invoke.on_completion[].target` as a reachable target alongside the direct `to`, so parents that route exclusively through invokes do not raise false-positive unreachable warnings.

Use case in mind: a precondition that requires its own sub-workflow before the parent can decide its next state. Example: a content publishing parent where `submit_for_review` invokes a content validation child workflow; the parent's next state (`accepted` vs `rejected`) is determined by the child's terminal.

## Composition: Context Injection (Result<Terminal, Output>)

A child workflow may declare a `context_schema:` block that documents its **input** (what the parent must provide at invocation) and **output_by_terminal** (what the parent reads back, one set of fields per terminal). The parent, on `invoke:`, may declare `input:` (map of `child_field: parent_path`) and on each `on_completion[]` entry an `assign:` (map of `parent_field: child_path`).

The two channels — `input` in, `assign` out — are the **only** boundary between parent and child. There is no shared context, no mid-flight event passing, no callbacks. Full design rationale is in `CONTEXT-INJECTION.md` (closed decision).

Child declares its interface:

```yaml
workflow: payment_validation
context_schema:
  input:
    - { name: amount, type: number }
    - { name: method, type: string }
  output_by_terminal:
    validated:
      - { name: validation_token, type: string }
      - { name: timestamp,        type: string }
    refused:
      - { name: refusal_reason,   type: string }
```

Parent maps its context across the boundary:

```yaml
transitions:
  - from: drafting
    event: submit_payment
    invoke:
      workflow: payment-validation.yaml
      input:
        amount: order.total_cents
        method: order.payment_method
      on_completion:
        - terminal_state: validated
          target: accepted
          assign:
            validation_token: child.validation_token
            timestamp: child.timestamp
        - terminal_state: refused
          target: rejected
          assign:
            refusal_reason: child.refusal_reason
```

New Error rules:

| Code | Check |
|---|---|
| E050 | `context_schema.input[]` entry has no `name` or non-string name. |
| E051 | `context_schema.input[]` entry has no `type` or non-string type. |
| E052 | `context_schema.output_by_terminal` key does not name an `is_final: true` state of this workflow. |
| E053 | `context_schema.output_by_terminal[<terminal>][]` entry has no `name`. |
| E054 | `context_schema.output_by_terminal[<terminal>][]` entry has no `type`. |
| E055 | `invoke.input` field name is not declared in the child's `context_schema.input`. |
| E056 | `on_completion[].assign` field name is not declared in the child's `context_schema.output_by_terminal[terminal_state]`. |
| E057 | An `input` or `assign` value is not a non-empty string (must be a documental path). |
| E058 | The parent declares `input` or `assign` but the child has no `context_schema` (cannot validate nominal coherence). |

**Validator behavior is documental, not strict.** The `type:` declaration on a field is documentation; the validator does not type-check across the boundary. Path strings (`order.total_cents`, `child.validation_token`) are not evaluated at lint time. The target language's type system is the source of truth.

**Mental model**: a child workflow is a `Result<Terminal, Output>` function — terminal is the discriminating tag, output is the payload that travels with the tag. The parent's `on_completion` is a typed pattern match on the result. The implementation guide will translate this into TypeScript discriminated unions or equivalent in the target language.

The four invariants of the composition model remain enforced: no async (E029/E036/E046), no shared global state (no schema slot for it; only `input` / `assign` channels), no inheritance (no `extends:` slot), no runtime in POM (the validator runs, the workflow does not).

## Promotion Path

If promoted, this draft becomes `SPEC-0006-workflow-modeling.md` and the artefacts move out of `experiments/workflow-modeling/`:

| From | To |
|---|---|
| `specs/SPEC-0006-workflow-modeling.md` | `specs/SPEC-0006-workflow-modeling.md` |
| `skills/workflow.md` | `skills/workflow.md` |
| `templates/WORKFLOW_TEMPLATE.yaml` | `templates/WORKFLOW_TEMPLATE.yaml` |
| `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` | `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` |
| `scripts/lint-workflows.mjs` | `scripts/lint-workflows.ts` |
| (new) | `prompts/27-workflow-modeling.md` |

Promotion proceeds through `skills/extend.md` and `prompts/12-extend-pom.md`, after `skills/challenge.md` review.
