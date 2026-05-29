# Workflow Implementation Guide (draft)

This guide helps a coding agent translate a POM workflow YAML into code in the target project. It proposes implementation patterns and selection criteria. It never imposes a library and never installs dependencies on its own.

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

## What This Guide Does Not Do

- It does not generate code automatically. Code generation belongs to the coding agent, supervised by the team.
- It does not maintain runtime instances. Instance state lives in the target's storage layer.
- It does not enforce a pattern. Selection is the team's responsibility.
