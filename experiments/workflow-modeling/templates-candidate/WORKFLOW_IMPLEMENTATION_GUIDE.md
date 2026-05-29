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

## What This Guide Does Not Do

- It does not generate code automatically. Code generation belongs to the coding agent, supervised by the team.
- It does not maintain runtime instances. Instance state lives in the target's storage layer.
- It does not enforce a pattern. Selection is the team's responsibility.
- It does not bless a single target language. Each language profile is opt-in and additive.
