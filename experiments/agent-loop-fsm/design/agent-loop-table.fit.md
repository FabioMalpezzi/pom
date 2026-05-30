---
experiment: agent-loop-fsm
hypothesis: H2
artifact: templates/examples/workflow/loop-goal/agent-loop-table.yaml
iteration: 1
date: 2026-05-30
pattern: Perception-Planning-Action-Observation (flat transition table)
---

# Fit classification — agent-loop-table (H2 iter 1)

## States (6)

| State | Fit | Note |
|---|---|---|
| `perception` | clean | Initial state, two domain exits (`sensed`, `perception_failed`). |
| `planning` | clean | Single forward exit (`plan_ready`). |
| `action` | clean | Two outcomes (`action_done`, `action_failed`) on distinct events. |
| `observation` | clean | Loop hub: `observed` returns to perception, `goal_met` exits. |
| `done` / `failed` | clean | Standard terminals. |

**6/6 clean fit.**

## Transitions (7)

All seven transitions map to event-driven primitives without `invoke`, sub-workflow, or composition. **7/7 clean fit.**

## Gate results

| Gate | Esito |
|---|---|
| Validator pass | PASS (0 errors, 0 warnings) |
| Mermaid + mmdc | PASS (`.mmd` 600+ B, SVG rendered) |
| `invoke` count | 0 — flat transition table preserved |
| Unreachable states | 0 (no W001 warning) |

## Verdict on H2

**CONFIRMED.** The agent decision loop `perception → planning → action → observation` is expressible as a flat POM transition table:

- 6 states, 7 transitions, no `invoke`, no sub-workflow;
- single loop edge `observation → perception`, expressed by a standard event transition;
- two failure paths (`perception_failed`, `action_failed`), one success path (`goal_met`);
- readable end-to-end without scrolling, as a single table.

No concept forcing: the canonical SPAO loop maps to the POM schema as-is.

## Signal — clean fit count

| Iter | Pattern | clean states | clean transitions | overall |
|---|---|---|---|---|
| 1 | flat SPAO | 6/6 | 7/7 | **100%** |

Loop exits via "Raggiunto" at iter 1. Budget used: ≈ 4 min of 1h cap.
