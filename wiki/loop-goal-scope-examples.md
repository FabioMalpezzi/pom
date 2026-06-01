---
navTitle: Loop/Goal Scope Examples
---

# Loop/Goal Scope Examples

## Summary

This page helps users choose possible objectives, gate metrics, signal
metrics, baselines, stall exits, and falsification events for loop/goal
experiments across the ten POM scopes.

These examples are usage aids, not rules. They do not replace
`prompts/28-loop-goal-define-criteria.md`, and they are not criteria to
copy mechanically. A real experiment still needs its own objective,
measurement tools, baseline, exit conditions, and user acceptance.

## Current State

The loop/goal criteria prompt already defines the procedure for creating
the measurement contract: choose a scope, write the objective, declare
out-of-scope items, select gate and signal metrics, register baselines,
and define success, stall, budget, and falsification exits.

The examples below add a practical starting catalog. They are useful
when the user or agent knows the scope but needs help turning it into
measurable criteria. They are intentionally lightweight so the prompt
remains the operating procedure and this page remains a Persistent Wiki
guide.

## How To Use This Page

Use the examples to find plausible measurements, compare gate and signal
choices, calibrate falsification events, and notice when open-ended work
is really exploration rather than a measured loop/goal experiment.

Do not use the examples to satisfy criteria mechanically, override the
frozen criteria prompt, treat a metric as valid without linking it to the
objective, or force open-ended work into a measurable loop.

## Example Shape

Each row follows the same compact shape:

| Field | Meaning |
|---|---|
| Objective | What the experiment could try to demonstrate. |
| Possible gate | A non-regression condition that protects the loop. |
| Possible signal | A progress measure that can move across iterations, with direction and trend shape. |
| Measure with | A plausible command, script, artifact read, benchmark, scan, or review rule. |
| Baseline | A starting value or calibration posture. |
| Falsification | A concrete observation that could make the hypothesis false. |
| Does not falsify | A nearby observation that should not be treated as falsifying by itself. |
| Stall exit | A possible no-progress exit condition. |

## 1. POM Experiments

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| Workflow schema primitive | Show that a new workflow primitive covers a class of agent-loop cases without weakening existing validation. | Existing workflow fixtures pass. | New valid fixtures covered without custom exceptions (`↑`, absolute). | `npm run pom:workflow:lint` plus fixture count. | Current fixture count. | A minimal target case requires an unrelated schema escape hatch. | A target case needs a field already accepted in the primitive backlog. | No new fixture passes after 2 iterations. |
| Prompt revision | Show that a prompt revision produces measurable criteria more reliably than the current prompt. | Existing prompt output shape is preserved. | Correction rounds per criteria draft decrease (`↓`, statistical if LLM output varies). | Review log comparing prompt runs against the required criteria sections. | First two runs calibrated manually. | The prompt removes a required check or creates ambiguous exits. | The prompt needs wording edits while preserving all checks. | No reduction in correction rounds after 3 trials. |
| Wiki method improvement | Show that a wiki guide helps users choose valid loop metrics faster. | No new normative rule is introduced in the wiki. | Blank or discarded metrics decrease (`↓`, absolute or statistical). | `criteria.dialog.md` review: count proposed metrics, discarded metrics, and accepted metrics. | TBD calibrated at first use. | Users treat examples as mandatory templates. | Users adapt examples and still rewrite objective-specific metrics. | No usable metric examples after 3 sessions. |

## 2. Technical Spikes And Proofs Of Concept

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| Library fit spike | Show that a candidate library can implement the target loop contract. | Existing test suite remains green. | Required use cases implemented by the spike (`↑`, absolute). | Spike scenario checklist plus target test command. | Zero use cases implemented. | A required use case depends on unsupported library behavior. | Extra glue code is needed while the contract still holds. | No new use case works after 2 iterations. |
| API integration PoC | Show that an external API can support a bounded agent action loop. | Credentials stay out of committed files. | Successful end-to-end API actions increase (`↑`, absolute). | Integration script output plus secret scan. | First dry run result. | The API cannot expose the state needed for retry or resume. | The first request shape needs adapter code. | Same failing API boundary after 3 attempts. |
| Performance feasibility spike | Show that a prototype can stay within an acceptable latency envelope. | Functional smoke tests pass. | Median or p95 latency improves (`↓`, statistical). | Benchmark script with repeated runs and variance recorded. | First benchmark run. | Minimum achievable latency remains above the hard threshold. | One noisy run exceeds threshold while the window still improves. | Latency improvement below threshold for 3 benchmark windows. |

## 3. Architecture Decisions And Migrations

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| Runtime pattern migration | Show that a new runtime pattern preserves behavior while simplifying loop state handling. | Golden scenario tests pass. | States migrated to the new pattern (`↑`, absolute or percent of total). | Scenario test suite plus migrated-state inventory. | Current migrated-state count. | A required transition cannot be represented without hidden global state. | A transition needs a local adapter but remains explicit. | No additional states migrate after 2 iterations. |
| Storage migration | Show that loop snapshots can move to a new store without losing restore semantics. | Restore regression tests pass. | Snapshot cases verified on the new store (`↑`, absolute). | Restore scenario tests covering suspend, resume, failure, and terminal output. | Existing file-backed cases. | Atomic state plus business write cannot be achieved. | A specific store needs transaction wrapper code. | No new restore case passes after 2 attempts. |
| Boundary refactor | Show that control-plane logic can be separated from data-plane execution. | Public behavior tests pass. | Direct control-to-data couplings decrease (`↓`, absolute). | Static search or architecture review list of forbidden imports/calls. | Initial coupling count. | A control decision requires inspecting private execution internals. | A data-plane event needs a clearer public payload. | Coupling count does not decrease for 3 iterations. |

## 4. Measurable Improvement Work

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| Latency improvement | Show that the loop can reduce response latency without losing correctness. | Correctness tests pass. | p95 latency decreases (`↓`, statistical). | Test command plus benchmark script with repeated windows. | Current p95. | Correctness fails before any latency win is achieved. | A single benchmark window regresses while correctness and trend recover. | p95 does not improve for 3 benchmark windows. |
| Test coverage improvement | Show that critical loop paths can gain scenario coverage. | Existing tests remain green. | Positive and misuse scenarios covered increase (`↑`, absolute). | Test suite output plus scenario coverage checklist. | Current scenario count. | A critical path cannot be observed or asserted. | A path needs a new fixture before assertion is possible. | No new meaningful scenario after 2 iterations. |
| Complexity reduction | Show that a loop controller can be simplified without changing behavior. | Scenario tests pass. | Complexity, file size, or branch count decreases (`↓`, absolute). | Complexity checker, line count, or explicit branch inventory. | Current complexity or line count. | Simplification removes an explicit terminal or guard. | Code moves between files while total complexity still decreases. | Complexity does not decrease after 2 refactors. |

## 5. Security And Compliance

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| Secret handling | Show that an agent loop can run without persisting secrets in unsafe places. | Secret scan reports zero committed secrets. | Unsafe secret paths decrease (`↓`, absolute). | Secret scanner plus review of environment, logs, snapshots, and generated files. | Current scan and path list. | A required step can only run by storing a secret in repo state. | A secret is required at runtime but stays outside persisted artifacts. | No unsafe path removed after 2 iterations. |
| Permission boundary | Show that a loop respects a declared approval boundary. | Denied actions remain blocked in tests. | Covered permission cases increase (`↑`, absolute). | Policy tests or approval-boundary scenario table. | Existing permission tests. | The loop can perform a denied action without approval. | The loop requests approval and then performs the action after approval. | No new boundary case covered after 2 iterations. |
| Dependency risk reduction | Show that the loop can reduce actionable dependency risk. | Build and tests remain green. | High or critical actionable findings decrease (`↓`, absolute). | Package audit plus triage list that separates actionable from accepted risk. | Current audit output. | Fixing the finding requires an unacceptable unsupported fork. | A finding is accepted with documented mitigation outside dependency upgrade. | Finding count does not move after 2 remediation attempts. |

## 6. Bug Investigation And RCA

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| Reproduction loop | Show that a bug can be reproduced deterministically. | Existing tests remain green. | Reproduction reliability increases (`↑`, statistical or absolute). | Reproduction script with repeated runs and observed failure rate. | Current flaky or manual reproduction rate. | The reported behavior cannot be triggered with available inputs. | The bug is intermittent but the reproduction rate improves. | No reliability gain after 3 attempts. |
| Causal chain | Show that the investigation identifies the failing causal hop. | Reproduction fixture remains valid. | Suspected hops eliminated or confirmed (`↑`, absolute). | Hypothesis table with evidence per hop and reproduction fixture output. | Initial hypothesis list. | Evidence contradicts the assumed failure domain. | A hypothesis is wrong but narrows the next causal hop. | No hypothesis removed after 2 iterations. |
| Regression guard | Show that the fix prevents recurrence of the bug class. | Fix does not break current behavior. | Regression scenarios added and passing (`↑`, absolute). | Test suite plus regression scenario checklist. | Zero or current regression scenarios. | The bug class cannot be asserted without invasive test-only hooks. | A narrower bug instance can be asserted while the broader class remains open. | No new guard after 2 iterations. |

## 7. MVPs And New Features

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| Thin vertical slice | Show that the feature covers the smallest real user journey. | Existing smoke tests pass. | Verified journey steps increase (`↑`, absolute). | User-journey checklist plus smoke or browser test. | Zero or current journey steps. | The journey requires a missing product decision. | A minor step needs copy or UI polish but the journey remains testable. | No additional journey step after 2 iterations. |
| Error-path readiness | Show that the MVP handles expected misuse paths. | Happy path remains working. | Misuse cases covered increase (`↑`, absolute). | Misuse scenario table plus tests or manual run evidence. | Current misuse-case count. | A common misuse case cannot be represented in the design. | A rare misuse case is deferred out of scope. | No new misuse case covered after 2 iterations. |
| Adoption signal | Show that the feature produces a measurable user-facing outcome. | No critical workflow error in smoke run. | Completion, conversion, or task-success rate improves (`↑`, statistical). | Instrumented event log, analytics query, or moderated task run. | First instrumented run. | The outcome cannot be instrumented without changing scope. | The first sample is too small but instrumentation works. | Signal flat for 3 measurement windows. |

## 8. Onboarding And Setup

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| First successful setup | Show that a new contributor can reach a working local environment. | Supported setup command exits successfully. | Time to first working run decreases (`↓`, statistical or absolute). | Setup script output plus timed dry run or contributor session notes. | First observed setup time. | A required step depends on undocumented private access. | A prerequisite is documented and obtainable by the target audience. | Setup time does not improve after 2 edits. |
| First pull request | Show that onboarding leads to a minimal correct change. | Tests for the touched area pass. | Steps to first PR decrease (`↓`, absolute). | Onboarding checklist count plus a dry-run change. | Current documented step count. | The process requires a manual decision not documented anywhere. | A review decision is documented as part of the PR workflow. | Step count flat after 2 iterations. |
| Error recovery | Show that common setup failures have actionable recovery paths. | Normal setup path still works. | Known setup errors with documented fixes increase (`↑`, absolute). | Setup failure inventory plus verified recovery commands. | Current known-error list. | An error depends on an unsupported local environment. | An environment-specific error has a clear unsupported-platform note. | No new recoverable error documented after 2 iterations. |

## 9. Documentation And Knowledge Management

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| Question coverage | Show that the wiki answers recurring project questions from source-backed pages. | Pages cite current source files. | Recurring questions answered without re-reading raw sources increase (`↑`, absolute). | Question list plus source-backed answer review. | Current answered-question list. | A core answer cannot be grounded in any current source. | An answer needs a new source read before it can be filed. | No new question covered after 2 updates. |
| Stale page cleanup | Show that outdated wiki claims can be reconciled. | No generated reader files are edited directly. | Stale claims resolved increase (`↑`, absolute). | Wiki stale-claim list plus source reads. | Current stale-claim list. | The source authority is missing or contradictory. | A claim is deferred because the source authority is outside current scope. | No stale claim resolved after 2 passes. |
| Cross-link improvement | Show that related memory pages become easier to navigate. | Existing pages keep their source summaries. | Useful source-backed related links increase (`↑`, absolute). | Link review against a question set, not raw link count alone. | Current link map or manual count. | Links would imply an authority relationship that is not true. | A link is added as related context without implying authority. | No useful link added after 2 passes. |

## 10. Open-Ended Work

Scope 10 examples are mostly routing examples, not normal loop/goal
experiments. They help decide whether to use loop/goal criteria or move
the work to a lighter temporary experiment, spike, or Open Discussion.

| Example | Objective | Possible gate | Possible signal | Measure with | Baseline | Falsification | Does not falsify | Stall exit |
|---|---|---|---|---|---|---|---|---|
| Exploration triage | Decide whether the work is measurable enough for loop/goal or should stay a spike. | No criteria file is frozen before the objective is measurable. | Concrete questions converted into measurable hypotheses increase (`↑`, absolute). | Question list plus candidate hypothesis list. | Initial question list. | The user wants exploration, not a hypothesis test. | The user starts broad but accepts a measurable hypothesis. | No measurable hypothesis after one framing pass. |
| Decision discovery | Turn an open discussion into candidate decisions without pretending the decision is made. | Open Discussion remains non-authoritative. | Decision options with consequences identified increase (`↑`, absolute). | Open Discussion review table: option, consequence, unresolved question. | Current option list. | The work needs stakeholder judgment outside the loop. | The loop can prepare options while the user keeps decision authority. | No option clarified after 2 passes. |
| Scope narrowing | Narrow broad work until a smaller experiment can be named. | No unrelated implementation starts. | Out-of-scope items and candidate experiment boundaries increase (`↑`, absolute). | Scope list plus candidate experiment statement review. | Initial broad request. | The remaining work still has no observable success condition. | One sub-area becomes measurable while the broader work stays open. | No narrower boundary after 2 passes. |

## Sources

| Source | Use |
|---|---|
| `prompts/28-loop-goal-define-criteria.md` | Procedure for loop/goal criteria, ten scopes, gate/signal structure, baseline, and exit conditions. |
| `skills/loop-goal.md` | Canonical loop/goal modes and boundaries. |
| `wiki/loop-goal-workflow-tutorial.md` | Existing human guide for choosing loop/goal workflow patterns. |
| `experiments/agent-loop-fsm/notes/2026-05-30-prompt-criteria-critical-review.md` | Records that a dedicated catalog of the ten scopes was still open. |

## Linked Decisions

| Decision | Impact |
|---|---|
| ADR-0003 | Keeps loop/goal as the agentic subtype of generic workflow modeling. |

## Open Questions

| Question | Status |
|---|---|
| Should any example graduate into a prompt rule? | Open; only after repeated evidence shows it is broadly necessary. |
| Should a future public guide include a shorter version of this catalog? | Open; this page is the current Persistent Wiki guide. |

## Related Links

- [[loop-goal-workflow-tutorial]]
- [[skills-and-prompts]]
- [[experiments-and-extension]]
