# Guided Python implementation — spec-evolution

Evidence H4 for **multi-language support**: the same POM YAML model that the round-1 TypeScript evidence implements (under `evidence/typescript/spec-evolution/`) drives, without modification, an idiomatic Python implementation. One source of authority, two languages, two passing test suites with identical scenario coverage.

## Setup

- Source workflow: `experiments/workflow-modeling/examples/spec-evolution.yaml` (unchanged from round 1).
- Target language: Python 3.14 (anything ≥ 3.10 works for `match` statement and `Literal`).
- Target test runner: `unittest` (built-in, zero dependency, analogue of `node:test`).
- Procedure: the same `implement` mode of the workflow skill, applied to the same YAML, against a different `pom.config.json.language`.

## Pattern selection

Same Pattern A (transition table) as the TypeScript evidence, for the same reasons:

- model is small (7 states, 7 events, 2 guards) — under the threshold;
- guards are simple textual predicates over an opaque context;
- no hierarchical states, no entry/exit hooks, no FSM library already in use.

Pattern B (method dispatch on state) and Pattern C (library-based, e.g. `transitions` or `python-statemachine`) would be reasonable alternatives. Pattern A was picked for direct comparability with the TypeScript evidence.

## Files produced

| File | Purpose |
|---|---|
| `spec_evolution.py` | Types (Literal, TypedDict), transition table (tuple of `@dataclass`), `apply_transition` function, `evaluate_guard` dispatch with `match`/`case`. |
| `guards.py` | Named predicate functions with docstrings copied verbatim from the YAML's `description:`. |
| `test_spec_evolution.py` | 15 tests under `unittest`, parallel one-to-one to the TypeScript suite. |
| `test-output.txt` | Captured output of `python3 -m unittest -v`. |

## Idiomatic Python choices

- **Discriminated union** for `TransitionResult` is expressed as `Union[Allowed, Refused]` with two frozen `@dataclass` and a `kind: Literal["allowed" | "refused"]` field. In TypeScript this was a discriminated union literal type; in Python it is class-based, more in line with the language's idiom.
- **Transition table** is a tuple of `@dataclass(frozen=True)`. Tuple gives immutability; dataclass gives a clear shape with `from_state`, `to_state`, `event`, `guard`. The field name `from_state` is used instead of `from` because `from` is a Python keyword — small naming concession that the YAML's `from:` did not require.
- **Pattern matching** via `match`/`case` (Python 3.10+) for the guard dispatcher in `evaluate_guard`. Slightly more elegant than the TypeScript switch.
- **TypedDict** with `total=False` for `TransitionContext`. Optional keys map cleanly to the YAML's per-guard context fields.

## What the guide actually guided (same as TypeScript evidence)

- Pattern selection criteria (Pattern A for this size and shape).
- Guard naming: `guard_<yaml_name>` one-to-one.
- Docstring discipline: the YAML's `description:` text is reproduced verbatim as the function docstring.
- Test categories from the `scenarios` mode: positive transitions, refused (from, event) pairs, guard true/false, terminal-state checks, `re_entry_allowed` exception path.
- `re_entry_allowed: true` mapping at the code level (terminal that admits a documented exception).

## What was language-specific (the guide correctly did NOT prescribe)

- Choice of `@dataclass(frozen=True)` vs `NamedTuple` vs `Pydantic BaseModel`. The guide cannot decide for the target project; `@dataclass` was picked for zero dependency and standard-library purity.
- Choice of `unittest` vs `pytest`. The guide says "use the project's test runner from `pom.config.json`"; here `unittest` was chosen for zero dependency.
- Naming convention `snake_case` vs `camelCase`. Project-specific Python style.
- Renaming `from` to `from_state` to avoid the keyword conflict — language-level constraint, not a guide-level concern.

## H4 multi-language: assessment

The guide carries the same model into Python without losing any structural element. The test coverage is identical to TypeScript: 15 tests, all categories. The runtime result is identical: exit code 0, all tests pass.

| Metric | TypeScript evidence | Python evidence |
|---|---|---|
| Source YAML | `spec-evolution.yaml` | same |
| Pattern used | A (transition table) | A (transition table) |
| Test count | 15 | 15 |
| Tests passed | 15 | 15 |
| Exit code | 0 | 0 |
| Dependencies added | 0 | 0 |
| Test runner | `node:test` (built-in) | `unittest` (built-in) |
| Lines of code (3 source files) | ~210 | ~180 |

H4 is confirmed in TypeScript and Python on the same model, with Pattern A. Patterns B and C remain unverified by this evidence in either language — the same caveat as in round 1.

## How to reproduce

From this folder:

```bash
python3 -m unittest test_spec_evolution.py -v
```

Expected output: 15 tests, all OK, exit 0. The recorded output is in `test-output.txt`.
