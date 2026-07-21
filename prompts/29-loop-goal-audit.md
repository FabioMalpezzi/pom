# Prompt - Audit a Loop/Goal Workflow

Use this prompt to audit the structural fit and criteria conformity of an agent-shaped loop/goal workflow. The auditor produces a derived `.fit.md` artifact and never modifies the workflow YAML.

```text
Audit the POM loop/goal workflow at <WORKFLOW_PATH>.

## Preconditions

1. Read `pom.config.json`.
2. In a Target Project, continue only when both `workflows.enabled: true` and `workflows.loopGoal.enabled: true`. Otherwise stop and route to `skills/config.md`.
3. Read `skills/loop-goal.md`, this prompt, and the workflow at `<WORKFLOW_PATH>`.
4. Run `node scripts/lint-workflows.mjs <WORKFLOW_PATH>` and record PASS/FAIL, errors, and warnings. If the root workflow fails validation, stop before classification, report the findings, and request correction; an invalid model cannot receive a fit verdict.
5. Follow every `state.invoke.workflow` and `transition.invoke.workflow` reference. Resolve each path relative to its caller, read the sub-workflow, and validate it too. If an invoked workflow fails validation, stop before classifying the composition and report the findings.
6. Locate the accepted `criteria.md` from `workflows.loopGoal.criteriaPath`, the project's declared convention, or the workflow's nearby design directory. Legacy numbered criteria files may be used only when no current `criteria.md` exists or the user explicitly identifies that round.
7. If several plausible criteria files exist, ask which one governs the workflow. If none exists, continue with structural fit only and state that criteria conformity is not executable.

## Structural model

Treat the workflow YAML as authoritative. Audit current supported contracts, including:
- states, events, transitions, guards, invariants, and `context_schema`;
- synchronous `state-invoke` and `event-invoke` composition;
- bounded loops through `loop_guard`;
- state residence bounds through `timeout`;
- Dynamic Workflow control-plane fields when enabled: launch, await/join, timeout reaction, cancellation, detachment, compensation, suspend, and resume.

POM models the deterministic control plane. Target code owns workers, scheduling, persistence, timers, cancellation mechanics, side effects, and runtime execution. Native parallel FSM states, implicit asynchronous transitions, or unmodeled fork/join semantics are not clean fits.

## Classification

Classify every state and every transition as exactly one of:

- **clean fit**: represented directly without semantic loss;
- **adapted fit**: representable with a documented convention, runtime responsibility, or minor translation;
- **forced lossy**: material semantics are absent, ambiguous, or distorted.

For each item record:
- YAML identifier;
- classification;
- domain-level reason;
- adaptation or loss;
- runtime responsibility, if any;
- related criterion, if any.

Do not classify from field shape alone. Ask whether the model preserves the behavior that matters to the domain and experiment.

Validator discipline:
- any validator error stops classification and produces a validation-failure report instead of a fit verdict;
- validator warnings require explicit treatment;
- an unreadable or invalid invoked workflow makes the composition incomplete;
- never repair YAML during the audit.

## Criteria conformity

When accepted criteria exist, evaluate structural fit and criteria conformity separately.

For every objective clause, gate, signal, and exit condition, record:
- the workflow element or external evidence that supports it;
- whether it is `satisfied`, `unsupported`, `contradicted`, or `not assessable`;
- the reason and source citation.

A clean structural model may still fail its criteria. A criteria-conforming intention may still be structurally lossy. If either dimension is unacceptable, mark the workflow non-promotable.

## Output

Propose the output path before writing. Prefer:
- configured `workflows.loopGoal.artifactsRoot` or project convention in a Target Project;
- the design directory associated with the experiment in POM Source.

Write `<name>.fit.md` with:

1. workflow and criteria paths;
2. validator results for the root and every invoked workflow;
3. declared special primitives;
4. state classification table;
5. transition classification table;
6. criteria conformity table;
7. counts and percentages for clean/adapted/forced classifications;
8. semantic losses and runtime-owned responsibilities;
9. promotion verdict: promotable / non-promotable / not assessable;
10. exact follow-up actions.

Ask for approval before writing if the output path is new, ambiguous, or covered by an approval-required artifact policy. Otherwise write only the derived audit file; do not modify YAML, criteria, decisions, or project state.

## Verification

Before finishing, verify that:
- the root workflow and every invoked workflow were read and validated;
- every state and transition appears exactly once in the classification;
- validator failures were not classified clean;
- every accepted criterion appears in the conformity table;
- structural fit and criteria conformity have separate verdicts;
- percentages agree with table counts;
- the output path follows configuration;
- no source workflow or accepted criteria were modified.

Final response: give the output path, clean-fit percentage, criteria-conformity verdict, validator verdict, and the most important loss or blocker in 2-4 lines.
```
