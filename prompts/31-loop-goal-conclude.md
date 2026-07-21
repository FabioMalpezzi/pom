# Prompt - Conclude a Loop/Goal Experiment

Use this prompt for an independent, adversarial evaluation of a loop/goal experiment against criteria accepted before results were known. The evaluator recommends a technical verdict; the user retains the Adopt/Refine/Reject promotion decision through `prompts/09-run-temporary-experiment.md`.

```text
Independently and adversarially evaluate the loop/goal experiment governed by <CRITERIA_PATH>.

## Independence gate

This evaluation should run in a fresh session or separate agent that did not define the criteria, model the workflow, or conduct the experiment.

If you are in the same context:
- stop and request a fresh evaluator when possible;
- if the user explicitly chooses to continue, label the result `non-independent evaluation` and explain the limitation;
- adversarial posture alone does not satisfy structural independence.

Read experiment artifacts, not the criteria-definition conversation. Do not read `criteria.dialog.md`; the accepted contract must stand on its written terms.

## Preconditions

1. Read `pom.config.json`.
2. In a Target Project, continue only when both `workflows.enabled: true` and `workflows.loopGoal.enabled: true`. Otherwise stop and route to `skills/config.md`.
3. Read `skills/loop-goal.md` and the criteria at `<CRITERIA_PATH>`.
4. Confirm that the criteria status is `accepted`, contains acceptance metadata, and predates the evidence being judged. If not, return `inconclusive: criteria not frozen`.
5. Resolve artifact and evidence roots from `workflows.loopGoal.artifactsRoot` and `workflows.loopGoal.evidenceRoot`, then read only relevant source artifacts:
   - workflow YAML and validator results;
   - `.fit.md` audits;
   - `.scenarios.md` files and executable test results;
   - runtime outputs, measurements, logs, and evidence manifests;
   - current experiment results or closure document.
6. Use legacy numbered criteria only when the user explicitly identifies that experiment round.
7. Record missing, unreadable, stale, or mismatched evidence before evaluating claims.

## Adversarial posture

Try to prove that the experiment did not meet its objective.

For every objective clause, gate, signal, and exit:
- state the strongest plausible refutation;
- cite the exact evidence for and against it;
- check whether the evidence was produced by the declared tool and observation boundary;
- check baseline comparability and measurement direction;
- look for cherry-picking, survivor bias, missing failures, proxy failure, and post-hoc reinterpretation;
- assign `holds`, `fails`, or `not proven`.

Do not soften a threshold, move a baseline, reinterpret a falsification event, or add a favorable exception after seeing results. Ambiguity counts against confirmation until resolved.

## Mandatory verdict rules

Return exactly one technical verdict:

- **confirmed**: every gate passes, required signals meet their accepted target or trend, the reached condition holds, no falsification event occurred, and evidence is sufficient;
- **refuted**: a declared falsification event occurred, a mandatory gate failed, or the accepted hypothesis is contradicted by valid evidence;
- **inconclusive**: required evidence is missing, incomparable, invalid, stale, or insufficient to decide under the accepted criteria.

A reached-looking result does not override falsification. Missing evidence never counts as a pass. Remaining budget never changes the verdict.

## Evidence and budget

For every cited item record:
- source path and, when relevant, line/range or measurement identifier;
- producer command or tool;
- experiment iteration;
- timestamp or version needed to prove ordering;
- relation to the criterion.

Compare actual consumption with the accepted iteration, time, cost, or resource budget. State whether the experiment stopped because it reached, stalled, exhausted budget, or was falsified.

If budget remains, you may record non-retroactive advice for a possible next round. Address it only to the Coordinator. Do not propose it directly to the user, open a new round, modify criteria, or let the advice affect the current verdict.

## Counter-analysis

Before writing the verdict, construct at least:
- one thesis for the strongest supportable conclusion;
- one antithesis showing the strongest misuse, alternative explanation, or failure case;
- a reasoned confutation or acceptance of the antithesis based on evidence.

If a material antithesis cannot be confuted, the experiment cannot be `confirmed`.

## Output

Propose the evaluation path from configuration or the experiment's design directory. Ask for approval before writing if the path is new, ambiguous, or approval-required.

Write only the evaluation artifact. Do not modify criteria, dialogue, workflow YAML, scenarios, evidence, results, decisions, or project state.

The evaluation must contain:

1. independence declaration;
2. criteria acceptance and ordering check;
3. evidence inventory with gaps;
4. table for every objective clause, gate, signal, and exit;
5. explicit falsification search;
6. thesis, antithesis, and disposition;
7. budget accounting and observed stop reason;
8. technical verdict: confirmed / refuted / inconclusive;
9. confidence and limitations;
10. optional `Advice to the Coordinator for a future round`, only when budget remains.

## Verification

Before finishing, verify that:
- the evaluator's independence is stated accurately;
- only accepted frozen criteria were used;
- every criterion has a cited refutation attempt and disposition;
- missing evidence is not treated as success;
- any observed falsification forces `refuted`;
- every material antithesis is confuted before `confirmed`;
- budget advice is non-retroactive and addressed only to the Coordinator;
- the evaluation did not alter source artifacts;
- the user, not the evaluator, retains the promotion decision.

Final response: state the evaluation path, technical verdict and reason, any falsification event, budget status, independence status, and that Adopt/Refine/Reject remains the user's decision.
```
