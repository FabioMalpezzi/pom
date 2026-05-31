# POM Workflow ↔ XState Compatibility

## Purpose

External verification: does the POM workflow YAML map cleanly onto the XState model, so that the same business workflow can be expressed in either format without information loss on the parts both formats support?

This document is *not* an endorsement of XState as a target. The user has stated they may or may not adopt XState for their own projects. The compatibility check serves two purposes: (1) sanity-check that POM is not inventing a private formalism with no precedent, and (2) give projects that *do* use XState a path to share a single source of authority.

## Audience

Technical maintainers and coding agents working with POM workflow models,
workflow validation, or target projects that may implement a POM workflow
with XState.

## Content

## XState's JSON definition: where it lives

- The XState repo (`statelyai/xstate`) ships a JSON Schema at `packages/core/src/machine.schema.json` (338 lines, JSON Schema draft-07). Snapshot in `xstate-machine.schema.json` next to this file.
- That schema describes the **serialized state node format** — the runtime representation produced after `createMachine()` has resolved a config. State node `type` is one of `atomic | compound | parallel | final | history`; transitions are `transitionObject` with `eventType`, `source`, `target`, optional `cond` and `actions`.
- The **input format** of `createMachine()` (the "human" config a developer writes) is documented through TypeScript types (`MachineConfig`, `StateNodeConfig`, `TransitionConfig`), not through a published JSON Schema. The official docs at `stately.ai/docs/transitions` and `stately.ai/docs/states` describe it.

Both formats are JSON-serializable. The relevant one for compatibility with POM is the **input MachineConfig**, because POM's role is to *guide a developer* to write a config, not to interoperate with an XState runtime directly.

## The two formats side by side

### POM workflow (YAML)

```yaml
workflow: spec_evolution
initial_state: draft
states:
  - name: draft
    description: "..."
    is_final: false
  - name: complete
    description: "..."
    is_final: true
    re_entry_allowed: true
events:
  - name: accept
    description: "..."
guards:
  - name: has_completion_verification_gate
    description: "..."
transitions:
  - from: draft
    to: under_review
    event: submit_for_review
  - from: accepted
    to: complete
    event: implement_and_verify
    guard: has_completion_verification_gate
invariants:
  - description: "..."
```

### XState input MachineConfig (JSON)

```json
{
  "id": "spec_evolution",
  "initial": "draft",
  "states": {
    "draft": {
      "on": {
        "submit_for_review": "under_review"
      }
    },
    "accepted": {
      "on": {
        "implement_and_verify": {
          "target": "complete",
          "guard": "has_completion_verification_gate"
        }
      }
    },
    "complete": {
      "on": {
        "supersede": {
          "target": "superseded",
          "guard": "superseding_spec_accepted"
        }
      }
    }
  }
}
```

## Field-by-field mapping

| POM YAML | XState MachineConfig | Notes |
|---|---|---|
| `workflow` (string) | `id` (string) | Direct map. |
| `version` (integer) | (no equivalent at config level) | XState has runtime versioning concepts but no `version` field on the input config. Preserve in `meta`. |
| `description` (top-level) | `description` (top-level) | XState's `description` field is supported on state nodes and transitions; at the machine level it's idiomatic via `meta`. |
| `initial_state` (string) | `initial` (string) | Direct map. |
| `states` (array of `{name, description, is_final, re_entry_allowed}`) | `states` (object keyed by name) | Structural transformation: array → keyed object. |
| `states[].name` | object key under `states` | The name becomes the key. |
| `states[].description` | `states[<name>].description` | Direct map. XState supports `description` on state nodes. |
| `states[].is_final: true` + no `re_entry_allowed` | `states[<name>].type: "final"` | XState's `final` state has no outgoing transitions. |
| `states[].is_final: true` + `re_entry_allowed: true` | (no equivalent) | XState has no "terminal admitting a documented exception". Workaround: model as an atomic state (no `type: "final"`), losing the visual "this is terminal" hint. Preserve POM intent in `meta`. |
| `events[]` (first-class array with name + description) | (no global declaration) | XState events are string keys under `on`. The textual description of an event has no canonical XState slot. Preserve `events[].description` in machine-level `meta`. |
| `guards[]` (first-class array with name + description) | (no global declaration) | XState guards are referenced by name (string) under `guard:` (or `cond:` in older versions). The textual description has no slot; XState expects the predicate function to be supplied to `createMachine(config, options.guards)`. Preserve `guards[].description` in `meta`. |
| `transitions[]` (flat array of `{from, to, event, guard, description}`) | distributed under `states[<from>].on[<event>]` | Structural transformation: flat array → nested. |
| `transitions[].from` | container state | Determines under which state's `on` the transition lives. |
| `transitions[].event` | event key inside `on` | Becomes the key. |
| `transitions[].to` | `target` of the transition object | Direct map. |
| `transitions[].guard` | `guard` of the transition object | Direct map. (XState v4 used `cond`; v5 uses `guard`. We target v5 syntax.) |
| `transitions[].description` | `description` of the transition object | Direct map. |
| Multiple transitions sharing `(from, event)` | array under `states[<from>].on[<event>]` | XState accepts an array of transition objects; first one whose guard evaluates to true wins. |
| `invariants[]` | (no equivalent) | Textual assertions about the model; XState does not check them at runtime. Preserve in `meta`. |
| `metadata.open_points` / `metadata.closed_points` | (no equivalent) | Preserve in `meta`. |

## What XState has that POM does not

XState's expressive surface is much larger than the POM workflow schema. The POM schema is deliberately a *subset*; the implementation guide explicitly tells the agent that Pattern C (library-based) is the place to reach for XState features when the model needs them.

Features XState supports that POM does not currently model:

- **Compound (hierarchical) states**: nested `states` inside a state.
- **Parallel regions**: a state with concurrent sub-machines.
- **History states**: shallow/deep memory of the last visited sub-state.
- **Entry / exit actions**: side effects bound to state entry/exit, not to transitions.
- **Transition actions**: side effects fired during a transition.
- **Invoke / actors**: long-running services or child machines invoked from a state.
- **`context`**: extended state (variables) carried alongside the finite state.
- **`assign` and `raise` actions**: in-machine effects to mutate context or emit events.
- **After / delayed transitions** (`after: { 5000: "timeout" }`): timer transitions.

POM's stance on these:

- The POM workflow schema is intentionally minimal for a method that aims to stay light.
- The `WORKFLOW_IMPLEMENTATION_GUIDE.md` says: pick Pattern C (library-based) when you need hierarchical states, parallel regions, entry/exit hooks, or invoked services. That is exactly XState's territory.
- A workflow modeled in POM YAML can be implemented with XState if the team prefers; the converse — taking an XState machine that uses parallel regions and putting it back into POM YAML — is *not* in scope and would require schema growth.

## What POM has that XState does not

| POM concept | Purpose | XState equivalent |
|---|---|---|
| `events[]` global declaration with `description` | Documentation of business meaning of each event | None at config level. Lives in `meta` or external docs. |
| `guards[]` global declaration with `description` | Documentation of guard semantics, separate from the predicate function | None. The predicate function lives in `options.guards` at `createMachine` call. |
| `invariants[]` | Plain-text rules expected to hold across the workflow | None. Would live in tests or external docs. |
| `re_entry_allowed: true` on a terminal state | Schema-level acknowledgment of "this state is terminal but admits one documented exception" | None. XState would force the choice between `final` (no outgoing) and `atomic` (not terminal). |
| `metadata.open_points` / `closed_points` | Lifecycle of design decisions on the model itself | None. Would live in external project memory. |

These are POM's "documentation discipline" markers; XState is a runtime library and does not need them. Both can coexist via the `meta` field, which XState explicitly supports as an open object.

## Compatibility verdict

- **Lossless conversion POM → XState (config)** is achievable for every workflow that fits the POM schema, *if* POM metadata (event descriptions, guard descriptions, invariants, `re_entry_allowed`) is preserved in the `meta` field of the XState config. The behavior at runtime is identical for the parts XState executes.
- **Lossless conversion XState → POM** is *not* achievable in general: any XState machine that uses compound states, parallel regions, entry/exit actions, services, or context cannot be flattened into POM YAML without losing semantics. POM YAML can only represent the flat-FSM subset of XState.
- **Practical reading**: POM YAML is a tightly scoped specification language for the flat-FSM portion of XState, plus documentation slots XState does not have. A project using XState can keep the POM YAML as the source of authority for the flat-FSM shape, generate the XState config from it on demand, and add XState-only concerns (actions, invoked services, context, hierarchy) directly in the XState code that consumes the generated config.

## PoC: `to-xstate.mjs`

`to-xstate.mjs` in this folder is a small transformer (no dependencies beyond the experiment's local `js-yaml`) that turns a POM workflow or pipeline YAML into an XState v5 input MachineConfig JSON, preserving POM-specific metadata under `meta`. It does **not** call `createMachine()`; runtime validation against XState is left as a follow-up (would require installing `xstate` as a dependency).

Round-2 coverage (added after the synchronous composition primitives landed):

| POM construct | XState mapping in `to-xstate.mjs` |
|---|---|
| `states[].invoke` (state-invoke) | `node.invoke = { id, src, input, onDone: [...] }`. Each `on_completion[]` entry becomes an `onDone` branch keyed by a synthetic guard `_terminal_eq_<terminal_state>`. If the POM entry has `next_event` (state-invoke), an `actions: raise(<next_event>)` is appended so the parent's normal transitions can fire. If it has `target` + `assign`, those map to `branch.target` and `branch.actions: assign(params)`. |
| `transitions[].invoke` (event-invoke) | Synthesized: an intermediate state `__invoking_<event>_from_<state>` is inserted in the machine. The original `from` state gets `on: { <event>: { target: <intermediate> } }`. The intermediate carries the `invoke` block with `onDone` branches that dispatch to the `target` declared in each `on_completion[]` entry. The intermediate's `meta.pom.synthetic_event_invoke = true` so the round-trip semantics is visible to readers. |
| Pipeline file (root key `pipeline:`) | Produces a root machine `id: <pipeline>` with one state `__member_<i>_<name>` per pipeline member. Each member state has `invoke` on the child workflow and `onDone` branches keyed by `_terminal_eq_<state>` that target either the next member's `__member_*` state or a synthetic `__pipeline_completed` final state. |
| `context_schema` (input + output_by_terminal) | Preserved verbatim under `meta.pom.context_schema`. XState v5 strict-typed setup (`setup({ types: {...} })`) lives in TypeScript and is not generated by this JSON transformer; the documental schema is sufficient for a stately.ai visualization. |
| `invoke.input` mapping | Passed verbatim to `invoke.input` (XState accepts an arbitrary object). Path strings (e.g., `"order.total_cents"`) remain documental; target code resolves them. |
| `on_completion[].assign` mapping | Mapped to `branch.actions: { type: 'assign', params: { ... } }`. XState `assign` consumes a function or a record; the JSON form uses the action-record style to stay JSON-serializable for stately.ai. |
| `re_entry_allowed: true` on a terminal | Output state retains `on:` (no `type: "final"`) and `meta.pom.re_entry_allowed = true`. |

What the transformer does **not** do (consistent with the round-2 four pillars):

- emit XState `spawn` or parallel regions — POM has no parallel primitive;
- generate TypeScript wrapping code (`setup({ types: {...} })`) — the JSON form is target-language-agnostic;
- enforce the bounded-retry budget (the cycle is structurally present, the bound lives in target code).

## Using stately.ai for visualization and online review

The JSON output of the transformer is in the **MachineConfig** shape that the Stately editor at `stately.ai` accepts via "Import JSON". Practical workflow:

1. Run the transformer on a POM YAML:
   ```bash
   node xstate-compat/to-xstate.mjs examples/loan-application/loan-application.yaml \
     --out /tmp/loan-application.xstate.json
   ```
2. Open `stately.ai`, sign in, create a new machine, choose "Import" → JSON, paste the file content.
3. The editor renders the machine with all states, transitions, `invoke` blocks, `onDone` branches, and guards as XState v5 normally would. The synthetic `__invoking_*` and `__member_*` states are explicit and labeled with the synthetic flag in their `meta`.
4. Useful Stately features that become available "for free" once imported:
   - **graphical layout** of the machine (state nodes + edges with guard labels);
   - **simulation**: send events and watch transitions, including invoke chains (where Stately resolves child machine references by name);
   - **inspection of `meta.pom`**: all POM-only data (events with descriptions, guards with descriptions, invariants, open_points, context_schema) is visible in the side panel without being executable;
   - **export** to PNG/SVG/Mermaid for documentation purposes.

Two practical caveats:

- The transformer emits actor `src` names like `clean_family_repair_fsm` or `payment_validation`. For Stately to resolve a hierarchical chain (operational → analyzer → repair), you have to import each child machine separately and reference them in the parent — the same way you would in an XState multi-machine project.
- Strict typing (`setup({ types: ... })`) is a TypeScript construct; the imported JSON shows only the documental schema in `meta.pom.context_schema`. The target code that consumes the same YAML can still produce strict types via the implementation guide.

## XState as a real implementation target (Pattern C)

The implementation guide already lists Pattern C (library-based) as an option for projects with hierarchical / parallel / library-already-adopted constraints. With round-2 primitives + this transformer, choosing XState as the actual runtime becomes a concrete option:

| POM artifact | Drives in the XState target |
|---|---|
| `<workflow>.yaml` | `createMachine(config)` where `config` is the JSON the transformer produced (possibly hand-augmented with TS types). |
| `context_schema.input` | `setup({ types: { input: {...} } })`. |
| `context_schema.output_by_terminal` | Strict typing of the `output` field of `onDone` actions; discriminated union by `terminal_state`. |
| `states[].invoke` | `invoke: { src: <childActor>, input, onDone }`. |
| `transitions[].invoke` | Synthetic intermediate state (as in the transformer output) or, equivalently, an `invoke` declared on the same state with an explicit entry guard. |
| `<pipeline>.yaml` | A root machine that invokes member machines in `onDone` sequence. |
| Guards | XState `guards: { ... }` map; the POM guard names become the keys, the predicates are written in target code. |

When this path is chosen, POM YAML stays the source of authority for the structural model; XState supplies the runtime. The POM workflow validator continues to enforce structural invariants on the YAML, and the transformer is the bridge.

Output JSON for each compiled example is saved under `experiments/workflow-modeling/evidence/xstate/` (round-1 examples) and `evidence/xstate/round2/` (round-2 toys + real examples + internal-agent validation files). The three-level chain (operational → analyzer → clean-family-repair) is fully round-trippable to JSON, including the synthetic intermediate states for the event-invokes that occur in the loan-application example.

## Gaps And Open Decisions

- Runtime validation against XState is still a follow-up because the
  transformer does not install or call XState.
- Strict TypeScript `setup({ types: ... })` generation is not part of
  this JSON compatibility document; it belongs in target code or future
  implementation guidance.
- Dynamic Workflow constructs accepted by ADR-0004 are backlog doctrine,
  not part of the current XState compatibility transformer contract.

## Sources And Decisions

- Spec: `specs/SPEC-0006-workflow-modeling.md`
- ADR: `decisions/ADR-0002-workflow-context-injection.md`
- ADR: `decisions/ADR-0004-dynamic-workflow-control-plane.md`
- Tooling: `scripts/to-xstate.mjs`
- Experiment evidence: `experiments/workflow-modeling/evidence/xstate/`
