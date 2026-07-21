# Prompt - Generate Loop/Goal Workflow Scenarios

Use this prompt to derive path-based test scenarios from an agent-shaped loop/goal workflow. The scenarios are derived artifacts for a Target Project's test implementation; they do not replace executable tests.

```text
Generate test scenarios for the POM loop/goal workflow at <WORKFLOW_PATH>.

## Preconditions

1. Read `pom.config.json`.
2. In a Target Project, continue only when both `workflows.enabled: true` and `workflows.loopGoal.enabled: true`. Otherwise stop and route to `skills/config.md`.
3. Read `skills/loop-goal.md`, this prompt, and the workflow at `<WORKFLOW_PATH>`.
4. Run `node scripts/lint-workflows.mjs <WORKFLOW_PATH>`. If validation fails, report the errors and do not present the scenario set as complete.
5. Follow every `state.invoke.workflow` and `transition.invoke.workflow` reference. Resolve each path relative to its caller, read the sub-workflow, and validate it.
6. Locate the accepted `criteria.md` from `workflows.loopGoal.criteriaPath`, the project's convention, or the nearby design directory. Use a legacy numbered criteria file only when no current contract exists or the user explicitly identifies that round.
7. If criteria are missing, continue with workflow-path coverage and mark criteria-exit coverage not assessable.

## Scenario contract

Each scenario must contain:
- a unique descriptive name;
- purpose and related criterion or invariant;
- initial workflow state;
- plausible initial context using only fields declared in `context_schema`;
- preconditions and fixtures;
- an ordered table of current state, external event, guard outcome, transition, side effect, and context change;
- expected terminal or intentional loop re-entry;
- final context assertions;
- expected runtime-owned effects;
- whether it is positive, failure, misuse, loop, timeout, or edge coverage.

Use only declared states, events, transitions, guards, context fields, invoked workflows, and control-plane fields. Do not invent behavior to make a path convenient. If required behavior is missing, report a modeling gap.

## Required coverage

Prefer meaningful path coverage over combinatorial exhaustion. Generate, in order:

1. the principal happy path;
2. at least one path to every failure-like terminal;
3. for each material loop:
   - loop at least once, then succeed;
   - loop at least once, then fail;
   - exhaust `loop_guard` or the declared equivalent bound;
4. every declared edge case or invariant not already covered;
5. every final state at least once;
6. every invoked sub-workflow terminal that changes the caller's behavior;
7. timeout and recovery paths when `timeout` exists;
8. Dynamic Workflow lifecycle paths when enabled, including relevant join, timeout reaction, cancel/detach, compensation, suspend, and resume outcomes;
9. one error or misuse scenario for an invalid event, failed guard, malformed context, or prohibited operation that the contract says must be rejected.

For accepted criteria, cover:
- reached exit;
- stall exit;
- budget exit when representable by the workflow or its declared runtime boundary;
- the observable falsification event;
- each gate and signal whose evidence can be exercised by a scenario.

Do not force experiment-level budget or evidence collection into the YAML when it is correctly owned outside the workflow. Mark that coverage as external and name the expected test or evidence source.

## Composition

For invoked workflows, produce end-to-end caller paths rather than isolated fragments only. Show:
- the caller transition into invocation;
- sub-workflow events and terminal;
- `on_completion` or equivalent mapping back to the caller;
- propagated context and failure behavior.

If a referenced workflow cannot be read or validated, mark all dependent paths incomplete.

## Output

Propose the output path before writing. Prefer `workflows.loopGoal.artifactsRoot` or the project's configured derived-artifact convention; in POM Source use the experiment's design directory.

Write `<name>.scenarios.md` with:

1. source workflow, invoked workflows, and criteria paths;
2. validator summary;
3. coverage matrix for states, transitions, terminals, loops, special primitives, and criteria exits;
4. numbered scenarios using the scenario contract above;
5. modeling gaps and externally owned verification;
6. uncovered paths with reasons.

Ask for approval before writing if the path is new, ambiguous, or approval-required. Write only the scenario artifact; do not modify YAML, criteria, runtime code, or tests.

## Verification

Before finishing, verify that:
- every scenario uses only declared workflow elements;
- every final state and failure terminal is covered;
- material loops include success, failure, and bound exhaustion;
- invoked workflows are traversed end to end;
- every applicable accepted criterion exit is covered or explicitly external;
- at least one error or misuse scenario exists;
- the matrix agrees with the scenarios;
- validator failures and uncovered paths are visible;
- no source workflow or accepted criteria were modified.

Final response: give the output path, scenario count, terminal coverage, criteria-exit coverage, and any incomplete path in 2-4 lines.
```
