# Prompt - Conclude a Loop/Goal Experiment

Use this prompt for an independent, adversarial evaluation of a loop/goal experiment against criteria accepted before results were known. The evaluator recommends a technical verdict (`confirmed`, `refuted`, or `inconclusive`); the user retains the promotion decision (`adopt`, `refine`, or `reject`) through `prompts/09-run-temporary-experiment.md`. A complete example is `templates/examples/workflow/loop-goal/EXAMPLE_EVALUATION.md`.

```text
Independently and adversarially evaluate the loop/goal experiment governed by <CRITERIA_PATH>.

`<CRITERIA_PATH>` is the repo-relative path of the criteria contract wherever it is located: the experiment's `EXPERIMENT.md` (its `## Criteria` section) or the frozen `criteria.md` copy at `workflows.loopGoal.criteriaPath`.

## Independence gate

This evaluation should run in a fresh session or separate agent that did not define the criteria, model the workflow, or conduct the experiment.

If you are in the same context:
- stop and request a fresh evaluator when possible;
- if the user explicitly chooses to continue, declare `independent_context: false` in the evaluation frontmatter, label the result `non-independent evaluation`, and explain the limitation; the verdict still stands, and the lint rule `loop-goal-evaluation-dependent` flags it so the limitation stays visible;
- adversarial posture alone does not satisfy structural independence;
- never declare `independent_context: true` to silence the warning.

Read experiment artifacts, not the criteria-definition conversation. Do not read `criteria.dialog.md`; the accepted contract must stand on its written terms.

## Preconditions

1. Read `pom.config.json`.
2. In a Target Project, continue only when both `workflows.enabled: true` and `workflows.loopGoal.enabled: true`. Otherwise stop and route to `skills/config.md`.
3. Read `skills/loop-goal.md` and the criteria contract at `<CRITERIA_PATH>`.
4. Confirm that the criteria status is `accepted`, contains `accepted_on`, and predates the evidence being judged. If not, return `inconclusive: criteria not frozen`.
5. Obtain the freezing commit with `git log -1 --format=%H -- <CRITERIA_PATH>` and compare it with the SHA recorded at acceptance (the Coordinator records it in the dialogue trace, which you do not read: ask for the SHA or take the latest commit that touches the contract). If the contract changed after acceptance, return `inconclusive: criteria changed after acceptance`.
6. Resolve artifact and evidence roots from `workflows.loopGoal.artifactsRoot` and `workflows.loopGoal.evidenceRoot`, then read only relevant source artifacts:
   - workflow YAML and validator results;
   - `.fit.md` audits;
   - `.scenarios.md` files and executable test results;
   - runtime outputs, measurements, logs, and evidence manifests;
   - current experiment results or closure document.
7. Use legacy numbered criteria only when the user explicitly identifies that experiment round.
8. Record missing, unreadable, stale, or mismatched evidence before evaluating claims.

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

Compare actual consumption with the accepted iteration, time, cost, or resource budget. State which exit stopped the experiment: `reached`, `stalled`, `exhausted`, or `falsified`.

If budget remains, you may record non-retroactive advice for a possible next round. Address it only to the Coordinator, the role that owns the experiment cycle (`skills/loop-goal.md`). Do not propose it directly to the user, open a new round, modify criteria, or let the advice affect the current verdict.

## Counter-analysis

Before writing the verdict, construct at least:
- one thesis for the strongest supportable conclusion;
- one antithesis showing the strongest misuse, alternative explanation, or failure case;
- a reasoned confutation or acceptance of the antithesis based on evidence.

If a material antithesis cannot be confuted, the experiment cannot be `confirmed`.

## Output

Propose the evaluation path from configuration or the experiment's design directory. Ask for approval before writing if the path is new, ambiguous, or approval-required.

Write only the evaluation artifact. Do not modify criteria, dialogue, workflow YAML, scenarios, evidence, results, decisions, or project state.

The evaluation document starts with this YAML frontmatter:

---
type: loop-goal-evaluation
evaluator: <agent or person identifier>
independent_context: true | false
criteria_path: <repo-relative path of the criteria contract (EXPERIMENT.md or criteria.md)>
criteria_commit: <full SHA of the commit that froze the accepted criteria>
---

Rules for the frontmatter:
- `independent_context: false` when the evaluator shares the executor's context; the verdict stands, the lint flags it;
- `criteria_path` is `<CRITERIA_PATH>` exactly as it resolves from the repository root;
- `criteria_commit` is the full SHA obtained with `git log -1 --format=%H -- <CRITERIA_PATH>` at acceptance time, never abbreviated or guessed;
- the lint rules `loop-goal-evaluation-frontmatter`, `loop-goal-criteria-drift`, and `loop-goal-evaluation-dependent` verify that the frontmatter is complete, that the commit exists and touches the criteria file, that the file has not changed since that commit, and that dependent evaluations are visible.

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
- the evaluator's independence is stated accurately in the frontmatter and in the declaration;
- `criteria_path` and `criteria_commit` point to the contract that was actually used;
- only accepted frozen criteria were used;
- every criterion has a cited refutation attempt and disposition;
- missing evidence is not treated as success;
- any observed falsification forces `refuted`;
- every material antithesis is confuted before `confirmed`;
- budget advice is non-retroactive and addressed only to the Coordinator;
- the evaluation did not alter source artifacts;
- the user, not the evaluator, retains the promotion decision.

Final response: state the evaluation path, technical verdict and reason, any falsification event, the exit that stopped the experiment, independence status, and that the promotion decision (`adopt`, `refine`, or `reject`) remains the user's decision.
```
