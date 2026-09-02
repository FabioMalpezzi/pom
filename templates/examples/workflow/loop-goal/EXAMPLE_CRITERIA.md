# Criteria - Bounded Retry For Flaky Tool Calls

This file is the `## Criteria` section of an experiment's `EXPERIMENT.md` (`templates/EXPERIMENT_TEMPLATE.md`), kept here as a standalone example in the form a project would use for the frozen `criteria.md` copy at `workflows.loopGoal.criteriaPath`. Everything below was accepted before any workflow YAML, runtime code, or measurement existed.

```yaml
status: accepted
accepted_on: 2026-08-20
```

## System under test

| Field | Value |
|---|---|
| System under test (SUT) | The retry controller of the `tool-runner` service, modeled by `agent-retry-bounded.yaml` and implemented in `src/tools/retry.ts`. |
| Experimenter | The service maintainer plus a coding agent, working on branch `exp/bounded-retry`. |
| Experiment iteration | One revision of the retry policy (attempt cap, backoff, retryable error classes) followed by one full replay of the recorded fixture set `fixtures/tool-calls-200.json` under the deterministic fault injector `scripts/replay.mjs --seed 7`. |
| SUT goal | Complete each tool call with a valid result within the attempt cap; `failed` is the terminal for calls that cannot be completed. |
| Observation boundary | Only the replay log `evidence/replay-<iteration>.json` produced by `scripts/replay.mjs` counts. Production traffic, manual retries, and calls outside the 200 recorded fixtures are outside the boundary. |

## Objective

Reduce the share of recorded tool calls that end in the `failed` terminal from 12.5% to at most 5% for the `tool-runner` service, under the seeded fault injector, without letting any call exceed four attempts and without slowing the replay by more than half.

Out of scope:

- changing the fault injector or the fixture set;
- retrying non-idempotent tool calls (`create_*`, `send_*`) more than once;
- latency of the production service.

## Gates

| Gate | Measurement (tool, command, or query) | Unit | Baseline | Threshold | Direction | Objective link | Frequency | Owner |
|---|---|---|---|---|---|---|---|---|
| G1 workflow validates | `npm run pom:workflow:lint -- workflows/agent-retry-bounded.yaml` | errors | 0 | 0 errors | binary pass | The retry policy must stay a valid, bounded workflow. | every iteration | coding agent |
| G2 attempt cap honored | `jq '[.calls[] \| select(.attempts > 4)] \| length' evidence/replay-<iteration>.json` | calls | 0 | 0 calls | binary pass | Protects the `loop_guard.max_visits: 4` contract of the modeled workflow. | every iteration | coding agent |
| G3 replay latency | `jq '.p95_ms' evidence/replay-<iteration>.json` | ms | 820 | at most 1230 (1.5 x baseline) | lower | Retries must not make the runner unusably slow. | every iteration | coding agent |

## Signals

| Signal | Measurement (tool, command, or query) | Unit | Baseline | Threshold / target | Expected trend | Direction | Objective link | Frequency | Owner |
|---|---|---|---|---|---|---|---|---|---|
| S1 failed share | `jq '.failed / .total * 100' evidence/replay-<iteration>.json` | percent of calls | 12.5 (25 of 200) | target at most 5.0 | decreasing by at least 1 percentage point per iteration until the target | lower | Direct measure of the objective. | every iteration | coding agent |
| S2 mean attempts per completed call | `jq '.mean_attempts_completed' evidence/replay-<iteration>.json` | attempts | 1.00 | at most 1.60 | non-increasing after the first retry policy is introduced | lower | Shows the reduction is not bought with blanket retries. | every iteration | coding agent |

Baseline evidence or calibration plan:

- baseline run `evidence/replay-000.json` produced with the current no-retry policy on 2026-08-19 (`scripts/replay.mjs --seed 7`), summarized in `EXPERIMENT.md` under Evidence.

## Exits

| Exit | Definition |
|---|---|
| `reached` | G1, G2, and G3 pass and S1 is at most 5.0 for two consecutive iterations. |
| `stalled` | Two consecutive iterations in which S1 improves by less than 1 percentage point. |
| `exhausted` | Five experiment iterations completed, or 45 minutes of wall clock consumed, whichever comes first. |
| `falsified` | A retried call in the replay log produces a result payload different from the payload of its first successful attempt (`jq '[.calls[] \| select(.retried and .payload_changed)] \| length' > 0`): retrying is not observation-neutral for this service. |

Falsifying example:

- `create_ticket` call 143 succeeds on attempt 2 and the replay log shows two tickets created for one call.

Non-falsifying counterexample:

- `get_status` call 88 succeeds on attempt 2 with a newer `observed_at` timestamp but an identical `status` payload; the timestamp is excluded from `payload_changed` by the replay tool.

## Budget

| Budget | Value |
|---|---|
| Iterations | 5 experiment iterations |
| Time | 45 minutes of wall clock |
| Cost | none (local replay, no paid API calls) |
| Human attention | one calibration checkpoint after iteration 1, plus final acceptance |

The workflow's own `loop_guard.max_visits: 4` bounds attempts inside one call; it is not the experiment budget.

## Decision

| Field | Value |
|---|---|
| Decision owner | service maintainer (user); never the evaluator |
| Decision date | 2026-08-27 |

Unresolved warnings:

- S2 can look good while S1 stalls if the policy retries only cheap read calls; accepted knowingly, S1 remains the objective signal.
