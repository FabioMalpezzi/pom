# Prompt - Define Loop/Goal Experiment Criteria

Use this prompt before modeling or implementing an agent-shaped controller that iterates toward a measurable goal. Do not use it for ordinary features, bug fixes, static domain workflows, or open-ended exploration; route those to the normal coding workflow, `skills/workflow.md`, or `skills/spike.md`.

## Purpose

Create an accepted, measurable experiment contract before results can influence its criteria. The procedure is a reasoned dialogue between the user and the Coordinator, not a questionnaire or a form-completion exercise.

```text
I want to define the criteria for a loop/goal experiment before modeling or implementation begins.

## Preconditions

1. Read `pom.config.json`.
2. In a Target Project, continue only when both `workflows.enabled: true` and `workflows.loopGoal.enabled: true`. Otherwise stop and route to `skills/config.md`.
3. Read `skills/loop-goal.md` and the current experiment brief or source description.
4. Resolve locations from:
   - `workflows.loopGoal.criteriaPath`;
   - `workflows.loopGoal.dialogPath`;
   - `workflows.loopGoal.evidenceRoot`;
   - `workflows.loopGoal.artifactsRoot`.
   Use project conventions when a value is absent. POM Source examples are fallbacks, not Target Project requirements.
5. If a criteria file already exists, do not overwrite it. Read it and ask whether this is a review, an amendment before acceptance, or a new experiment round.
6. If a previous independent evaluation contains advice for the Coordinator, read that advice as input to the dialogue. It does not change an earlier verdict and does not become a criterion without user agreement.

## Dialogue discipline

Work through one decision at a time.

For each decision:
- propose a concrete first option;
- explain its consequence for measurement, scope, cost, or falsifiability;
- present a meaningful alternative when one exists;
- ask the user to accept, reject, or calibrate it;
- record inconsistencies and resolve them before moving on.

Allow the user to ask questions outside the current section. Answer them and record any calibration that changes the contract.

Do not merely restate the user's answer. Challenge vague objectives, vanity metrics, thresholds without baselines, signals disconnected from the objective, and exits that cannot be observed.

Do not decide on the user's behalf. Do not treat silence as approval. If the user has not accepted a material choice, leave it open and wait.

## 1. Define the experiment context

Agree on:
- **System under test (SUT)**: the controller, workflow, method, product behavior, or other system being evaluated.
- **Experimenter**: who changes the SUT or its environment between experiment iterations.
- **Experiment iteration**: one complete comparable cycle, with explicit start and end.
- **SUT goal**: the runtime goal pursued by the controller, if different from the experiment objective. State `not applicable` when there is no separate runtime goal.
- **Observation boundary**: what evidence belongs to one iteration and what remains outside it.

Prevent category errors: an experiment iteration is not automatically one workflow transition, one retry, one model call, or one user message.

## 2. Select the scope

Choose the closest scope and explain why:
1. POM method or governance;
2. workflow/FSM modeling;
3. implementation or architecture;
4. testing and quality;
5. performance and reliability;
6. developer experience;
7. product capability or MVP;
8. onboarding and setup;
9. documentation or knowledge quality;
10. other, named explicitly.

If more than one scope is material, choose one primary scope and name the secondary scope. Do not hide two unrelated experiments in one objective.

## 3. State the objective and exclusions

Write one measurable objective sentence. A composition experiment may use at most two tightly coupled objective sentences.

The objective must identify:
- what should improve or be proven;
- for whom or for which system;
- under what relevant boundary;
- how success can be distinguished from failure.

List explicit out-of-scope items. Reject objectives that only say "explore", "improve", "validate", or "make better" without an observable result.

## 4. Define metrics

Define at least one **gate** and one **signal**.

A gate protects non-regression or a hard constraint. It is normally pass/fail or bounded by a threshold.

A signal measures progress toward the objective across comparable iterations. It needs a direction and a trend or target; a one-time percentage without a comparison rule is not enough.

For every metric record:
- name and type (`gate` or `signal`);
- exact measurement or formula;
- tool, command, query, or evidence source;
- unit;
- baseline value, or an explicit calibration step if no baseline exists yet;
- threshold, target, or expected trend;
- direction (`higher`, `lower`, `stable`, or `binary pass`);
- link to the objective;
- collection frequency;
- owner of collection.

Prefer direct outcome measures. If a proxy is unavoidable, state what failure of the proxy would look like.

Run or request the cheapest reliable baseline before freezing criteria. If measurement is not yet possible, mark the criteria `draft` and define the calibration step; do not invent a baseline.

## 5. Check coherence

Before discussing exits, audit the draft:
- every objective clause has at least one metric;
- every metric contributes to the objective or protects a named constraint;
- gate and signal do not reward contradictory behavior;
- the SUT, experimenter, iteration, and observation boundary are unambiguous;
- the baseline and comparison rule make iterations comparable;
- no metric can be trivially maximized while the real objective worsens.

For each warning, explain the consequence and resolve it with the user. Do not continue with a material unresolved contradiction.

## 6. Define exit conditions

Agree on all four exits:

1. **Reached**: a Boolean expression over green gates and signal targets.
2. **Stall**: a bounded number of experiment iterations without the required signal progress.
3. **Budget exhausted**: the time, iteration, cost, or resource budget is consumed.
4. **Falsified**: one specific observable event that makes the hypothesis false.

For falsification, write:
- one falsifying example;
- one similar but explicitly non-falsifying counterexample.

Estimate limits low first and explain the trade-off. The user owns the final budget and thresholds. Distinguish the experiment budget from runtime workflow bounds such as `loop_guard` and `timeout`; map them only when the experiment design genuinely requires that relationship.

## 7. Propose the criteria contract

Show the complete proposed `criteria.md` before writing it. It must contain:

- status: `draft` or `accepted`;
- SUT, experimenter, iteration, SUT goal, and observation boundary;
- scope and objective;
- out-of-scope items;
- gates table;
- signals table;
- baseline evidence or calibration plan;
- reached, stall, budget, and falsification exits;
- falsifying and non-falsifying examples;
- unresolved warnings;
- acceptance metadata once accepted.

Also propose a concise `criteria.dialog.md` containing only durable dialogue evidence:
- material consequences raised by the Coordinator;
- meaningful alternatives considered;
- off-grid questions that changed the contract;
- user calibrations and explicit acceptances;
- unresolved disagreements.

The dialogue trace is not a transcript and must not contain session history.

## Approval and write boundary

Keep the criteria `draft` until the user explicitly accepts every material choice. Ask for approval of the complete contract and target paths before writing.

After explicit acceptance:
1. write `criteria.md` with status `accepted` and acceptance metadata;
2. write `criteria.dialog.md` beside it or at the configured path;
3. do not modify accepted thresholds, exits, or objective retroactively;
4. route any later material change to a new round or an explicitly approved amendment that preserves the prior accepted contract.

## Verification

Before reporting completion, verify that:
- all required context fields exist;
- there is at least one measurable gate and one directional signal;
- every metric has a source, baseline or calibration, comparison rule, and objective link;
- all four exits exist;
- falsifying and non-falsifying examples are distinct;
- no material warning remains hidden;
- the files match the approved proposal and configured paths;
- no workflow YAML, runtime code, or evidence result was produced before criteria acceptance.

Final output:
- accepted objective and scope;
- criteria and dialogue paths;
- gate and signal summary;
- exit-condition summary;
- baseline commands or remaining calibration;
- next safe action: model the workflow from the accepted criteria.
```
