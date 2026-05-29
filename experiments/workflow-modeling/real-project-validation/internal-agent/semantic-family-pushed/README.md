# Pushed modeling — Semantic Family rules

The forced flat model in `../semantic-family-rules.yaml` was a *forced fit* that validated clean but documented five fundamental losses. This folder pushes the modeling further: each of the seven representative families becomes an autonomous POM workflow, and a master FSM orchestrates them via seven consecutive synchronous state-invokes in precedence order.

Goal: see how far POM round 2 primitives carry when applied to a rule engine, *not* whether the artifact validates. Validator clean is the floor, not the ceiling.

## Files

| File | Role |
|---|---|
| `family-gating-or-clarification.yaml` | Terminator family, precedence position 1 |
| `family-cascade-bridge.yaml` | Cascade-bridge analytical family, position 2 |
| `family-yoy-driver-diagnosis.yaml` | Yoy driver diagnosis, position 3 |
| `family-rolling-trend-tradeoff.yaml` | Rolling trend with tradeoff, position 4 |
| `family-benchmark-vs-media.yaml` | Benchmark vs media, position 5 |
| `family-ratio-threshold-ranking.yaml` | Ratio threshold ranking, position 6 |
| `family-single-kpi-snapshot.yaml` | Single KPI snapshot fallback, position 7 |
| `semantic-family-master.yaml` | Master FSM with 7 consecutive state-invokes |

## Method

Each family workflow has the same minimal shape (5 states, 4 events, 4 guards, 4 transitions):

```
evaluating  ──entry_failed (entry_guards)──→  not_matched (terminal)
            ──scope_missing──→               needs_scope_clarification (terminal)
            ──semantic_ambiguity──→          needs_semantic_clarification (terminal)
            ──ready (ready_guards)──→        matched (terminal)
```

(The gating family also has a `blocked` terminal for the terminator semantics.)

Each family declares `context_schema` with input `{signals, scope_context, role_family}` and per-terminal output (analysis_type, comparison_mode, expected_answer_shape on `matched`; lighter payloads on the other terminals).

The master FSM has 7 `evaluating_<family>` states, each with a state-invoke on the corresponding family child workflow, and dispatches the master's next state based on the child's terminal:

- `matched` → `family_resolved` (master success terminal)
- `needs_scope_clarification` → `needs_scope_clarification` (master terminal)
- `needs_semantic_clarification` → `needs_semantic_clarification` (master terminal)
- `not_matched` → `evaluating_<next_family>` (cascade)
- `blocked` (only on gating) → `blocked` (master terminal)

If even the lowest-precedence fallback (`single_kpi_snapshot`) does not match, the master reaches `all_families_exhausted` (defensive terminal).

## Verdict

The validator accepts the construction: all 8 files PASS clean. The pattern of "7 consecutive synchronous state-invokes on 7 different child workflows" is a legitimate use of round 2 primitives at scale and demonstrates that the schema can support **sequential dispatcher** patterns.

What is faithful vs. what is still missing is documented in `../FINDINGS.md` under the "Pushed modeling" section.
