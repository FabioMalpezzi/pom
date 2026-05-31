---
experiment: agent-loop-fsm
hypothesis: H3
artifact: templates/examples/workflow/loop-goal/agent-retry-bounded.yaml
iteration: 1
date: 2026-05-30
pattern: Bounded retry via guarded self-transition
---

# Fit classification — agent-retry-bounded (H3 iter 1)

## States (5)

| State | Fit | Note |
|---|---|---|
| `idle` | clean | Standard initial. |
| `acting` | clean | Carries the self-transition; three domain exits well separated. |
| `observing` | clean | Standard intermediate. |
| `done` | clean | Terminal success. |
| `failed` | clean | Terminal failure on retry exhaustion. |

**5/5 clean fit.**

## Transitions (5, including 1 self)

| Transition | Fit | Note |
|---|---|---|
| `idle → acting` on `start` | clean | Standard. |
| `acting → acting` on `retry_after_error` (guard: has_attempts_left) | clean | The self-transition under verification. POM allows source == target, guard expresses the bound. |
| `acting → failed` on `retries_exhausted` (guard: no_attempts_left) | clean | Domain-meaningful exhaustion path. |
| `acting → success` on `success` | clean | Successful action. |
| `observing → done` on `goal_met` | clean | Standard terminal. |

**5/5 clean fit.** Self-transition + guarded counter is sufficient to express bounded retry without a new schema primitive.

## Gate results

| Gate | Esito |
|---|---|
| Validator pass | PASS (0/0) |
| Mermaid + mmdc | PASS |
| Self-transition presente | PASS (1, on `acting`) |
| Guard sul retry | PASS (2 guards declared, 1 applied to retry, 1 to exhaustion) |

## What H3 confirms vs what H6 will add

H3 confirms that **the structure of bounded retry is expressible today**: a state with a self-transition guarded by a context counter. The retry is bounded in the sense that the validator can verify the guard exists and runtime enforces the counter.

What H3 does **not** address (deliberately, as the H6 backlog item):
- the bound is implicit in `context.attempts_left` and in the guard `has_attempts_left`. There is no declarative way to say "this state may be entered at most N times" at schema level.
- the on-exhaustion exit is encoded as a separate event (`retries_exhausted`) that runtime must emit explicitly. H6 would let the schema generate it.
- no time-based bound (that is H7 `timeout`).

The H6 `loop_guard` primitive would replace the manual counter and the manual exhaustion event with a single declarative block:

    states:
      - name: acting
        loop_guard:
          max_visits: 3
          on_exhaustion: retries_exhausted

This is a **syntactic improvement**, not a structural necessity: H1's verdict (and H3's verdict here) hold without H6, but H6 makes the model more readable and shifts enforcement from runtime to schema.

## Verdict on H3

**CONFIRMED.** Bounded retry via guarded self-transition is expressible with the current POM workflow schema. No new structural primitive required. The H6 backlog item is motivated as a syntactic improvement, not as a falsification of H3.

## Signal

| Iter | Pattern | clean states | clean transitions | overall |
|---|---|---|---|---|
| 1 | bounded retry | 5/5 | 5/5 | **100%** |

Loop exits via "Raggiunto". Budget used: ~3 min of 30 min cap.
