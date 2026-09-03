# Experiment - Does POM Change The Outcome, Not Only The Route

| Field | Value |
|---|---|
| Date | 2026-09-03 |
| Type | benchmark / LLM model / research |
| Status | halted — pilot 2026-09-03 invalidated both tasks; the stop rule fired before any campaign |
| Branch / Path | `main` / `experiments/pom-outcome-ab/` |
| Isolation | experiment-local fixtures, arms, and evidence; reuses the session runner only |
| Owner | POM maintainer |

## Objective

Answer the question every previous POM measurement left open: does POM change the **outcome** of work, or only the route taken to it?

`pom-skill-behavior-evals` judges routing conformance. `pom-block-step-cost` measured what the always-loaded block costs in steps. Neither says whether an agent finishes a task correctly more often with POM than without. The research POM is answering to (*Evaluating AGENTS.md*, arXiv 2602.11988v2) finds no gain in task success for repository context files - but it measures one task inside one session, on benches where the task is solvable by reading the code. POM's claim is different: it is about continuity, about knowing the decision taken three months ago and the road that was rejected. This experiment measures that claim, and says plainly that it is not the same claim the paper tested.

## Hypotheses

- On tasks whose correct outcome depends on a decision recorded in earlier sessions, an agent whose memory is empty chooses the rejected alternative or invents its own, and fails the automatic check more often than one with the accumulated memory.
- Structured memory with routing (POM) does not beat unstructured memory carrying the same facts (`flat`) by much on a single task; if it does not beat it at all, POM's discipline is not paid for by outcomes and its value has to rest on something else, which must then be stated honestly.
- The gap between `empty` and the two arms carrying the facts is larger than the gap between `flat` and `pom`.

Minimum value criterion:

- every task passes the selection criterion below, written before the candidates were examined;
- every task has a decisive fact, present in `flat` and `pom`, absent in `empty`, and stated in the task record;
- the automatic check judges the produced artifact only, never the path taken to it;
- the failure modes of the `empty` arm are classified by hand: a task failed for lack of format or structure rather than lack of the decisive fact is removed from the bench and the removal is recorded.

## Task Selection Criterion

Fixed on 2026-09-03, before any candidate was assessed. A task enters the bench only if all five hold:

1. **Recorded**: a decision or convention exists in the project's memory (an ADR, a wiki page, the project state) and predates the task.
2. **Not derivable**: the decisive fact cannot be deduced from the files the task touches, nor from a sibling example in the code. If a reviewer reading only the code could tell which alternative the project adopted, the task is out. In particular, anything findable with a grep of `package.json` or a twin file is out: that measures reading, not memory.
3. **Automatically checkable**: a deterministic check separates the correct outcome from the incorrect one, judging the artifact and not the style, the wording, or the route.
4. **Realistic**: it matches a change the project actually made, or plausibly would.
5. **Discriminating**: both alternatives - the one adopted and the one rejected - are plausible for a competent agent that lacks the memory. A task whose correct answer is obvious without the record does not discriminate and is out.

Candidates rejected by the criterion are recorded with the reason, so the bench can be audited for the tautology it must avoid: a bench assembled to prove the memory useful proves nothing.

## Arms

| Arm | The project contains |
|---|---|
| `empty` | POM installed at day zero: the method, the templates, the empty memory folders, an index and log with no entries - the structure, and none of the accumulated content |
| `flat` | the same day-zero structure, plus a single `NOTES.md` holding the decisive facts in plain prose - no index, no routing, no procedures |
| `pom` | the repository as it stands: the same structure with its accumulated memory, decisions, wiki pages, and project state |

The control arm holds the **structure** and lacks the **content**. That is a deliberate choice, taken on 2026-09-03, and it changes what the experiment claims.

Removing the structure as well would have been a purer "POM versus no POM" comparison, but it makes every task whose artifact is a memory document unfair: that arm would fail for having nowhere to write rather than for not knowing, which fairness protocol point 3 forbids. It left two eligible tasks in a single area - a feasibility probe, not a measurement.

With structure held constant in all three arms, the experiment measures what POM actually claims: that memory accumulated across earlier sessions changes what an agent does later, and that structuring it is worth more than writing it down loosely. It does not measure whether installing POM beats installing nothing, and no result here should be reported that way.

`flat` is what makes the comparison worth running. Against `empty` alone the result would be "written memory beats none", which surprises nobody. `flat` carries the same facts in the cheapest possible form; POM has to beat it, or admit that on single tasks it does not.

## Fairness Protocol

1. Each task declares its **decisive fact**: the one piece of knowledge that determines the correct outcome.
2. That fact appears in `flat` and in `pom`, and nowhere in `empty`.
3. Anything about **format** - schemas, templates, code examples, existing tests, empty memory folders - is present in all three arms, because it is structure, not memory. An arm must never fail for not knowing the shape of the artifact or for having nowhere to put it.
4. The task prompt is byte-identical across arms and mentions neither POM nor any memory file.
5. `NOTES.md` is built by extracting the deciding sentences from the POM memory without rewriting them into instructions: the same facts, stripped of method.
6. Runs are interleaved across arms rather than run arm by arm, so provider-side drift over the session does not land on one arm.

## Scope

Included:

- tasks drawn from this repository's own recorded history, since it is the project whose memory is richest and whose decisions are documented;
- three arms, identical prompts, several repetitions per task and arm;
- outcome (the automatic check), plus the steps and tokens already recorded by the runner.

Excluded:

- SWE-bench-style one-shot bug fixing: it measures what POM does not claim, and the literature already reports the answer;
- any judgment of style, prose quality, or route: the check looks at the artifact;
- cross-harness claims: Pi only, as in every earlier POM measurement;
- promoting any canonical change from a first round.

## Budget And Stop Rule

| Field | Value |
|---|---|
| Attempt budget | one round on the selected tasks, three arms, repetitions agreed before starting |
| Time budget | one working session per round |
| Cost budget | to be fixed with the owner once task count and session length are known; sessions here are longer than the routing suite's 0.13 USD |
| Stop rule | stop the round when the `empty` arm fails for reasons the by-hand classification attributes to structure or format rather than the decisive fact: that means the bench is unfair and must be repaired before more money is spent |

## Isolation Plan

- Fixtures, arms, tasks, checks, and evidence live under `experiments/pom-outcome-ab/`; nothing in `templates/`, `skills/`, or `prompts/` changes.
- Each run works on a disposable copy of the fixture; no run touches the repository itself.
- Runs use the operator's Pi credentials; transcripts are redacted and raw transcripts are never committed.

## Commands / Procedure

To be written with the harness, once the tasks are selected.

## Evidence

### Pilot, 2026-09-03: two tasks, three arms, one repetition, 8.28 USD

| Arm | T1 runtime boundary | T3 synthesis page |
|---|---|---|
| `empty` | timed out; added `scripts/lib/workflow-runtime.mjs` | pass |
| `flat` | timed out; added `scripts/lib/workflow-machine.mjs` | pass |
| `pom` | timed out; added `extensions/workflow-runtime.mjs` **and opened `decisions/ADR-0008`** | pass |

T1 sessions cost 2.16-2.66 USD each and consumed the full 420 s timeout in all three arms; T3 cost 0.28-0.44 USD.

**T3 does not discriminate, and the reason matters.** All three arms produced a page declaring `derivedFrom` and `verified` with a generated decision block. The convention is not only in ADR-0006: it is in `templates/WIKI_PAGE_TEMPLATE.md`, whose frontmatter carries both fields as comments, and in `skills/wiki.md`. Those are method, and method is present in every arm by design. The task measured that POM's method carries its conventions to a day-zero project - which it does, and which is a point in POM's favor - not that accumulated memory changes an outcome. Removed from the bench.

**T1's check was wrong, and the arms did not differ the way it reported.** The check looked for new executable files under `scripts/`, `src/`, `runtime/`, `lib/`. All three arms in fact wrote a runtime: `empty` and `flat` under `scripts/lib/`, `pom` under `extensions/`, which the check did not watch, so `pom` was scored as having kept the boundary when it had not. The check measured which folder was chosen, not whether the boundary held.

**The one real difference the pilot found was not the one being measured.** Only the `pom` arm opened a decision record, `ADR-0008-optional-pi-workflow-execution-adapter.md`, to justify the extension it was adding. The other two arms wrote the runtime silently. That is a behavioral difference between accumulated memory and none, it is deterministically checkable (does a new `decisions/ADR-*.md` exist?), and no check in this round was looking for it. It is a single observation and proves nothing on its own.

**Stop rule fired.** Both tasks are invalid: one does not discriminate, the other was mis-scored and too large to finish inside a session in any arm. Spending on a campaign with this bench would have bought noise.

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Validity | A bench built by someone who knows the memory proves the memory useful. | The selection criterion was fixed before the candidates were assessed, rejected candidates are recorded with reasons, and criterion 5 removes tasks whose answer is obvious without the record. |
| Validity | The `none` arm fails for missing format rather than missing knowledge. | Fairness protocol point 3, and a stop rule that halts the round when the by-hand classification finds it happening. |
| Cost | Longer sessions, three arms, several repetitions. | Task count and repetitions agreed with the owner before the round; a pilot fixes the per-session cost first. |
| Privacy | Fixtures are copies of a real repository. | The repository is the operator's own POM source; transcripts are redacted by the runner. |
| Interpretation | A positive result would be read as "POM works" or as "POM beats no POM", both more than the bench supports. | The claim is scoped in the objective and in the arms table: accumulated memory against empty memory, structured against loose, on tasks whose outcome depends on recorded decisions, on one project, one harness, one model. |

## Outcome

| Field | Value |
|---|---|
| Stop reason | the stop rule fired: the pilot showed the bench unfair and mis-scored before any campaign was run |
| Technical verdict | inconclusive on the question asked; two findings worth keeping (below) |
| Decision | do not run a campaign on this bench. Rebuild it around the distinction the pilot exposed, or stop and say the outcome question is open |

## Consolidation

Nothing is consolidated into canonical POM. Two findings are worth carrying out of the experiment even though it answered nothing:

1. **POM's method and POM's memory are not separable the way the design assumed.** Conventions live in the templates and skill cards, which travel with the method to a day-zero project; only decisions, rejected roads, and project-particular constraints live in the accumulated memory. A bench that wants to measure memory must exclude everything the method already teaches, and that is a much thinner residue than it appears from the outside.
2. **The measurable difference may be procedural rather than substantive.** In the pilot the arm with memory did not avoid the forbidden change; it opened a decision record for it. If that reproduces, what POM changes is not primarily what an agent builds but whether it makes the choice visible - and that is checkable deterministically, cheaply, and without judging prose.

## Follow-up

- [x] Apply the selection criterion to the candidate list and record accepted and rejected tasks with reasons (`candidates.md`: seven of nine rejected).
- [x] Build the three arms of the fixture and the automatic check for each accepted task.
- [x] Pilot the tasks across the three arms (2026-09-03): both invalidated, stop rule fired.
- [ ] Decide whether to rebuild the bench around "does the agent open a decision when the request collides with a project constraint", which the pilot suggests is the difference that exists and is deterministically checkable.
- [ ] If rebuilt: tasks must be small enough to finish inside a session (all three T1 runs hit the 420 s timeout at about 2.50 USD each), and every check must be validated against a deliberately wrong artifact before the round, the way `pom-skill-behavior-evals` validated its evaluator with a broken control.
