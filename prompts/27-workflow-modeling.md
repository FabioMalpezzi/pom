# Prompt - Workflow Modeling

Use this prompt as the canonical operational guide for the `workflow` skill (`skills/workflow.md`).

```text
I want to model, validate, visualize, derive scenarios for, or guide the implementation of a domain workflow declared as a YAML state model.

Before doing anything:
1. read `pom.config.json` and confirm that the workflows section is enabled (`workflows.enabled: true`). If missing or false, stop and route to `skills/config.md`.
2. if the request involves Dynamic Workflow fields (`fan_out_launch`, `await`, `join`, `react`, handle lifecycle, cancellation, detachment, suspend/resume propagation, or compensation), also confirm `workflows.dynamic.enabled: true`. If missing or false, stop and route to `skills/config.md` instead of modeling those fields.
3. read this prompt and `skills/workflow.md`.
4. identify the requested mode: design | validate | diagram | scenarios | implement.
5. read the target workflow YAML if it already exists, the validation report if present, and the existing target code that implements the workflow if any.
6. for `implement`, also read `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` and identify the target language / framework / test runner from `pom.config.json`.

Then execute the requested mode.

## Mode: design

Goal: produce or revise a workflow YAML from an informal description without inventing business rules.

Steps:
1. ask the user for a short prose description of the workflow if not already provided;
2. identify states, transitions, events, and guards from the description;
3. for every state, ask whether it is terminal (is_final) and whether it admits a documented exception out-transition (re_entry_allowed);
4. for every guard, capture a textual description; do not encode the predicate logic in the YAML;
5. surface ambiguities and unspecified rules as open points in the metadata.open_points list — do NOT invent business rules to fill gaps;
6. write or update the workflow YAML following the schema documented by `templates/WORKFLOW_TEMPLATE.yaml`; the template is a reference starting point, not a mandatory file to copy;
7. immediately run the validator on the produced file and include the verdict in the response;
8. report what was modeled, what was deferred to open points, and what the validator said.

Do not invent business rules to fill gaps. If the user has not decided, the gap stays in open_points.

## Mode: validate

Goal: report the structural health of an existing workflow YAML.

Steps:
1. run `node scripts/lint-workflows.mjs <file> --out <report.md>`;
2. read the resulting report;
3. summarize the verdict (PASS / PASS WITH WARNINGS / FAIL) and the count of errors and warnings;
4. for each finding, restate the rule code, the location, and a one-sentence interpretation;
5. for W003 specifically, if the state legitimately admits a documented exception, propose adding `re_entry_allowed: true` to the state and explain why; do NOT modify the YAML in this mode;
6. recommend the next action: fix errors, accept warnings as documented exceptions, or revise the model.

This mode never modifies the YAML. It produces analysis only.

## Mode: diagram

Goal: regenerate the Mermaid stateDiagram-v2 from the YAML.

Steps:
1. parse the YAML;
2. emit a Mermaid `stateDiagram-v2` block listing states, the initial state, terminal states, and transitions labeled by event and guard;
3. write the result to `workflows/generated/<name>.mmd` with a header line declaring that the file is generated and must not be hand-edited.

This mode never modifies the YAML.

NOTE: the stable Mermaid tooling lives in `scripts/to-mermaid.mjs` and
`scripts/mermaid.mjs`; `pom:workflow:lint -- --mermaid-dir <dir>` can
also refresh diagrams while validating.

## Mode: scenarios

Goal: derive a language-agnostic list of verification scenarios from the YAML.

For each transition in the model, produce:
1. one positive scenario ("from <from> on <event> with <guard> true, expect transition to <to>");
2. for every guarded transition, one negative scenario ("from <from> on <event> with <guard> false, expect transition refused");
3. for every (from, event) pair that is not declared, one refusal scenario ("from <from> on <event>, expect transition refused");
4. for every final state without re_entry_allowed, one terminal-check scenario ("from <final state> on any event, expect no transition").

Write the result to `workflows/generated/<name>.scenarios.md`.

NOTE: POM does not ship a stable scenario generator script. Scenario
derivation is this prompt-driven mode: the coding agent reads the YAML,
derives the scenarios, writes the generated Markdown file, and reports
what coverage it produced.

## Dynamic Workflow profile

Use this profile inside the requested mode only when `workflows.dynamic.enabled: true` in `pom.config.json`.

Goal: model Dynamic Workflow orchestration as a deterministic control plane while leaving real concurrent execution to the target project's data plane.

Rules:
1. use `fan_out_launch` only to record a non-blocking launch boundary that returns a workflow-local handle; do not model workers, queues, process pools, or actual scheduling in POM YAML;
2. use `await` only to record where the control plane waits on named handles, with `join: all | quorum | first`, optional `k`, optional `timeout`, and optional `on_timeout` wake-up event;
3. use `cancel_handles` when the control plane requires active child work to be cancelled before proceeding;
4. use `detach_handles` only when the work intentionally continues outside this workflow and must not block terminal closure;
5. use `react` only to describe deterministic reactions to observed completions, early exits, or batch completion; if reaction ordering or race semantics matter and are not specified, stop and ask;
6. use `compensation` as an ordered undo saga for cancellation boundaries, not as generic error handling;
7. preserve the handle lifecycle invariant: every launched handle must be awaited, cancelled, or explicitly detached before any reachable final state;
8. never add native parallel regions, async transitions, or in-FSM fork/join semantics to bypass the control-plane/data-plane split;
9. when the target data plane is unclear, write an open point naming the missing decision: worker mechanism, queue, scheduler, persistence, timeout emission, cancellation semantics, or compensation ownership.

Validation note: POM Source currently validates the handle lifecycle subset most strongly. Treat the rest of the Dynamic Workflow fields as an accepted contract that may require project-specific review until validator coverage expands.

## Mode: implement

Goal: guide a coding agent to translate the YAML into target code, proposing patterns and selection criteria without imposing one.

Steps:
1. read the validator report; if it FAILS with errors, stop and request fixes before implementing;
2. read `WORKFLOW_IMPLEMENTATION_GUIDE.md` and pick a starting pattern based on the criteria:
   - small model, simple guards, no entry/exit hooks -> Pattern A (transition table);
   - small model with rules that read better as methods -> Pattern B (switch on state);
   - hierarchical, parallel, or library-already-in-use -> Pattern C (library-based);
3. when in doubt, default to Pattern A and propose Pattern B/C as alternatives;
4. for each guard in the YAML, generate the predicate function signature and a docstring that reproduces the textual description verbatim from the YAML;
5. for each transition, write code that matches the (from, event, guard) tuple and produces the target state;
6. derive test cases from the scenarios mode (or from the YAML directly if scenarios are not generated);
7. record in a short note next to the code: which pattern was chosen, why, and what the YAML did NOT guide (project-specific decisions like which storage layer holds the entity, where guards live in the architecture);
8. if adopting a library is required, write an ADR documenting the library choice — POM does not install libraries on its own.

Do NOT install dependencies in the target project as part of `implement` mode.

## Rules across all modes

- The YAML is the source of authority. Diagrams, validation reports, scenarios, and code are derived.
- Never invent business rules to fill gaps. Surface them as open points and stop.
- Never modify YAML in modes other than `design`.
- Never install libraries on behalf of the user.
- Never execute the workflow. POM does not provide a runtime engine and does not track live instances.
- For Dynamic Workflow, never implement target data-plane infrastructure unless the user separately asks for target code changes after the model is accepted.
- Always state which mode is in use at the start of the response.
- When the validator reports findings, restate them in the response — do not bury them in a file the user has to open separately.

## Output

The response must include:
- the mode used;
- the actions taken;
- the path of any file written or proposed;
- the validator verdict (when applicable);
- the open points that remain;
- a one-line recommended next action.
```
