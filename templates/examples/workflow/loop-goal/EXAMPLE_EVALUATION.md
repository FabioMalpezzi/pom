---
type: loop-goal-evaluation
evaluator: claude-code (fresh session, prompts/31-loop-goal-conclude.md)
independent_context: true
criteria_path: templates/examples/workflow/loop-goal/EXAMPLE_CRITERIA.md
criteria_commit: f80a006bdd4d0b64ada314ff147fe3754b799b87
---

# Evaluation - Bounded Retry For Flaky Tool Calls

Independent evaluation of the experiment governed by `templates/examples/workflow/loop-goal/EXAMPLE_CRITERIA.md`, written with `prompts/31-loop-goal-conclude.md`. The evidence paths below are the ones the contract declares; in a real experiment they live under the configured `workflows.loopGoal.evidenceRoot`.

## 1. Independence declaration

This evaluation ran in a fresh session that did not take part in the criteria dialogue, the workflow modeling, or the four experiment iterations. The criteria dialogue trace was not read. `independent_context: true` is declared accordingly.

## 2. Criteria acceptance and ordering check

| Check | Result |
|---|---|
| Contract status | `accepted`, `accepted_on: 2026-08-20` |
| Freezing commit | `f80a006bdd4d0b64ada314ff147fe3754b799b87`, obtained with `git log -1 --format=%H -- templates/examples/workflow/loop-goal/EXAMPLE_CRITERIA.md` |
| Contract unchanged since the freezing commit | yes: the same command returns the same SHA at evaluation time |
| Evidence produced after acceptance | yes: `evidence/replay-001.json` to `evidence/replay-004.json` are dated 2026-08-21 to 2026-08-24; the baseline `evidence/replay-000.json` predates acceptance, as the contract requires |

## 3. Evidence inventory

| Artifact | Producer | Iteration | Status |
|---|---|---|---|
| `evidence/replay-000.json` | `scripts/replay.mjs --seed 7`, no-retry policy | baseline | present |
| `evidence/replay-001.json` | `scripts/replay.mjs --seed 7`, cap 2, fixed backoff | 1 | present |
| `evidence/replay-002.json` | `scripts/replay.mjs --seed 7`, cap 3, exponential backoff | 2 | present |
| `evidence/replay-003.json` | `scripts/replay.mjs --seed 7`, cap 4, retryable classes narrowed | 3 | present |
| `evidence/replay-004.json` | `scripts/replay.mjs --seed 7`, cap 4, jitter added | 4 | present |
| `workflows/agent-retry-bounded.yaml` lint output | `npm run pom:workflow:lint` | 1-4 | present, 0 errors each iteration |
| `design/agent-retry-bounded.fit.md` | `prompts/29-loop-goal-audit.md` | after iteration 1 | present, 100% clean fit, criteria conformity `satisfied` for G1, G2, S1, S2; `not assessable` for G3 (runtime-owned) |

Gaps: none of the declared artifacts is missing. The iteration-4 replay was run twice (`replay-004.json` and a superseded `replay-004a.json` kept locally); only the file named by the contract convention is evaluated.

## 4. Criteria table

| Item | Accepted rule | Evidence | Strongest refutation attempted | Disposition |
|---|---|---|---|---|
| G1 workflow validates | 0 lint errors | 0 errors, 0 warnings in every iteration | The workflow could have been edited after the last lint run; checked `git log` on the YAML: last change precedes the iteration-4 lint. | `holds` |
| G2 attempt cap honored | 0 calls above 4 attempts | `jq` count 0 in iterations 1-4 | Iteration 2 (cap 3) shows 0 by construction; iteration 3-4 with cap 4 also show 0, so the `loop_guard` is exercised at the bound. | `holds` |
| G3 replay latency | p95 at most 1230 ms | 910, 1045, 1180, **1290** ms | None needed: iteration 4 exceeds the threshold by 60 ms. Verified that the number is the p95 field of the declared file, not the mean. | `fails` |
| S1 failed share | target at most 5.0, decreasing at least 1 pp per iteration | 12.5, 9.0, 6.5, 5.5, 4.5 | The 4.5 could come from fewer completed calls being counted; `total` is 200 in every file, so the denominator did not move. | `holds` (target met once, in iteration 4) |
| S2 mean attempts per completed call | at most 1.60, non-increasing after iteration 1 | 1.00, 1.31, 1.42, 1.38, 1.36 | The reduction could be bought with blanket retries; 1.36 shows it was not. | `holds` |
| `reached` | all gates pass and S1 at most 5.0 for two consecutive iterations | S1 met the target only in iteration 4, and G3 failed in the same iteration | A "reached-looking" S1 does not satisfy a rule that requires two consecutive iterations and green gates. | not reached |
| `stalled` | two consecutive iterations with S1 improving by less than 1 pp | improvements: 3.5, 2.5, 1.0, 1.0 pp | Iteration 3 improved by exactly 1.0 pp, which is "at least 1 pp", so the stall rule did not fire. | not stalled |
| `exhausted` | 5 iterations or 45 minutes | 4 iterations, 38 minutes | Budget remains: 1 iteration, 7 minutes. | not exhausted |
| `falsified` | a retried call changes its result payload | `payload_changed` count is 0 in every replay file | Checked that `create_*` calls were retried at most once as the scope requires; 11 such calls, all with unchanged payloads. | not falsified |

## 5. Falsification search

The declared falsification event did not occur: no retried call produced a payload different from its first successful attempt. The non-falsifying counterexample from the contract (`get_status` with a newer timestamp) appears 23 times and is correctly excluded by the replay tool's `payload_changed` rule.

## 6. Thesis, antithesis, disposition

- Thesis: the bounded retry policy reduces the failed share below 5% without exceeding the attempt cap or corrupting results; the objective's failure-share clause is met in iteration 4.
- Antithesis: the reduction is paid with latency the contract forbids. Iteration 4 is the only iteration that meets the S1 target, and it is also the only iteration that fails G3; the two are plausibly the same cause (jitter lengthening the tail).
- Disposition: the antithesis stands on the evidence. A mandatory gate failed in the iteration that met the target, and the contract does not allow trading a gate for a signal.

## 7. Budget accounting and stop reason

| Budget | Accepted | Consumed |
|---|---|---|
| Iterations | 5 | 4 |
| Time | 45 minutes | 38 minutes |
| Cost | none | none |
| Human attention | one calibration checkpoint plus acceptance | one checkpoint after iteration 1 |

The experiment stopped because the Coordinator ended the round after the G3 failure, with budget remaining. No exit fired: the observed stop is a gate failure, which the verdict rules below treat as `refuted`.

## 8. Technical verdict

**refuted**. A mandatory gate (G3 replay latency) failed in iteration 4 with 1290 ms against a threshold of 1230 ms. The S1 target being met in the same iteration does not override a gate failure, and `reached` requires two consecutive green iterations that never occurred.

## 9. Confidence and limitations

Confidence is high for the verdict: the failing value comes from the declared file, field, and tool, and the contract leaves no room to soften the threshold. Limitation: G3 was `not assessable` in the fit audit because latency is runtime-owned, so the gate has evidence only from replays, not from the workflow model; this does not weaken the failure.

## 10. Advice to the Coordinator for a future round

Non-retroactive, addressed only to the Coordinator, and without effect on this verdict: budget remains for one iteration and seven minutes. The iteration-3 policy (cap 4, narrowed retryable classes, no jitter) met every gate with S1 at 5.5; a next round could keep that policy and revisit the S1 target or the backoff shape instead of adding jitter. Any such change is a new contract, not an amendment of this one.

The promotion decision (`adopt`, `refine`, or `reject`) remains with the decision owner named in the contract.
