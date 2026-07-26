# Prompt - Workflow Modeling

Use this prompt as the canonical operational guide for the `workflow` skill (`skills/workflow.md`).

```text
I want to model, validate, visualize, derive scenarios for, or guide the implementation of a domain workflow declared as a YAML state model.

Before doing anything:
1. read `pom.config.json` and confirm that the workflows section is enabled (`workflows.enabled: true`). If missing or false, stop and route to `skills/config.md`.
2. if the request is part of a loop/goal experiment, also confirm `workflows.loopGoal.enabled: true`, read `skills/loop-goal.md`, and locate its accepted `criteria.md`. In `design` mode, stop if the criteria are missing, still draft, or not explicitly accepted; loop/goal modeling starts only after the criteria contract is frozen.
3. if the request involves Dynamic Workflow fields (`fan_out_launch`, `await`, `join`, `react`, handle lifecycle, cancellation, detachment, suspend/resume propagation, or compensation), also confirm `workflows.dynamic.enabled: true`. If missing or false, stop and route to `skills/config.md` instead of modeling those fields.
4. read this prompt and `skills/workflow.md`.
5. identify the requested mode: design | validate | diagram | scenarios | implement.
6. read the target workflow YAML if it already exists, the validation report if present, and the existing target code that implements the workflow if any.
7. for `implement`, also read `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` and identify the target language / framework / test runner from `pom.config.json`.

Then execute the requested mode.

## Mode: design

Goal: produce or revise a workflow YAML from an informal description without inventing business rules.

Steps:
1. ask the user for a short prose description of the workflow if not already provided;
2. establish the provenance of the description before drafting anything. Ask whether the process has been observed running — traces, logs, runs, an existing implementation, a manual procedure people already follow — or whether it is being designed from intention alone. Record the answer as `metadata.provenance: observed` or `metadata.provenance: speculative`. A speculative model is legitimate, but say so in the response and name the parts nobody has confirmed yet; an undeclared speculative model freezes assumptions that were never tested;
3. identify states, transitions, events, and guards from the description;
4. for every state, ask whether it is terminal (is_final) and whether it admits a documented exception out-transition (re_entry_allowed);
5. for every guard, capture a textual description; do not encode the predicate logic in the YAML;
6. for every guard that judges work produced by an agent or by a model, declare the evidence block described under "Verification evidence" below;
7. if the workflow is re-entered by a runtime instead of being driven start-to-finish by a caller, declare the `runtime_loop` block described under "Runtime loop" below;
8. surface ambiguities and unspecified rules as open points in the metadata.open_points list — do NOT invent business rules to fill gaps;
9. write or update the workflow YAML following the schema documented by `templates/WORKFLOW_TEMPLATE.yaml`; the template is a reference starting point, not a mandatory file to copy;
10. immediately run the validator on the produced file and include the verdict in the response;
11. report what was modeled, what was deferred to open points, the declared provenance, and what the validator said.

Do not invent business rules to fill gaps. If the user has not decided, the gap stays in open_points.

### Verification evidence

A guard decides whether work may move forward. When the work being judged was produced by an agent or by a model, declare on the guard where that decision actually comes from:

- `source: deterministic` — a test run, schema validation, query, diff, or build result decides. Prefer this whenever it is available.
- `source: model_judgment` — a model decides. Then also declare `independent_context`.
- `source: human` — a person decides.

For `model_judgment`, `independent_context: true` means the judging context is separate from the context that produced the work: a fresh session, a separate agent, or a call that receives the artifact and the acceptance rules but not the executor's conversation. A verifier handed the executor's own context is not verifying, it is agreeing with itself, and it will approve exactly the failures the executor could not see. The validator raises W005 when a guard declares `model_judgment` without declared independence.

Never declare `independent_context: true` to silence the warning. If the target project cannot yet run the judgement on a separate context, leave it absent and record the gap as an open point.

At a fan-in this matters most, because a guard leaving an `await` state decides what an entire parallel run produced. The validator raises W006 when such a guard declares no evidence at all.

### Runtime loop

The state graph says which transitions are legal. It does not say what starts another cycle, what evidence decides success, what a failed cycle hands to the next one, or who receives the run when the budget is gone. Without those, a re-entered workflow degrades into "keep trying", which is an unbounded cost with no owner.

Declare `runtime_loop` when a runtime re-enters this workflow — on a schedule, on an event, on failed evidence, or on a user request — rather than a caller driving it once from start to finish. The block is optional; a workflow executed once per request does not need it.

Once declared it is a contract and the validator enforces it:
- `trigger.kind` is one of `user_request`, `schedule`, `event`, `evidence_failure`, with a description of what actually starts a cycle (E101);
- `goal` names the observable state a cycle tries to reach. Reject "keep improving", "make it better", and any goal whose achievement cannot be observed (E102);
- `evidence` names the check that decides success — a test run, schema validation, query, diff, build result, or human review. "The agent says it is done" is not evidence (E103);
- `stop.on_success` and `stop.on_exhaustion` reference declared states (E104-E106). If a stop target is not reachable through transitions, W001 reports it and that is a real finding, not a false positive;
- missing `feedback` raises W007 and missing `stop.escalation` raises W008. Resolve both with the user rather than writing filler text to silence them.

Ask for the loop bound explicitly. `runtime_loop` says what happens when the budget is exhausted; it does not itself count anything. The counting belongs to `loop_guard` and `timeout` on the states that can repeat, and to the target project's runtime.

## Mode: validate

Goal: report the structural health of an existing workflow YAML.

Steps:
1. run `node scripts/lint-workflows.mjs <file> --out <report.md>`;
2. read the resulting report;
3. summarize the verdict (PASS / PASS WITH WARNINGS / FAIL) and the count of errors and warnings;
4. for each finding, restate the rule code, the location, and a one-sentence interpretation;
5. for W003 specifically, if the state legitimately admits a documented exception, propose adding `re_entry_allowed: true` to the state and explain why; do NOT modify the YAML in this mode;
6. for W005 and W006, never propose adding or flipping an evidence declaration to clear the warning. Report which verification the model leaves unproven, what an independent judgement would require in this target project, and let the user decide;
7. recommend the next action: fix errors, accept warnings as documented exceptions, or revise the model.

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
9. when the target data plane is unclear, write an open point naming the missing decision: worker mechanism, queue, scheduler, persistence, timeout emission, cancellation semantics, worker workspace isolation, conflict resolution between contradictory worker results, or compensation ownership;
10. before adding an ordering dependency, state whether it is required by consumed data, a shared mutable resource, external authority, or a capacity explicitly supplied by the task; if none applies, do not invent sequential work. Treat shared writes as a mutation dependency, not as permission to invent a lock, single-writer limit, or serialization policy;
11. one `fan_out_launch` creates one batch handle. Keep work-item identities and terminal statuses in the batch/result manifest; never model one workflow handle per item;
12. at every fan-in and hierarchical reduction, reconcile task-specific expected identities against all observed records, represented identities, terminal-status counts, duplicates, unknown identities, and unresolved identities. When raw outputs cannot safely fit one synthesis context, use bounded hierarchical groups instead of one reducer over all raw outputs; preserve that accounting at each group summary and reconcile the summary identities again at the final reducer. Unknown records remain visible for reconciliation but cannot satisfy a join for expected identities. Do not copy identity-source names from an unrelated example;
13. keep join readiness separate from report completeness. `all`, `quorum`, or `first` may wake the control plane but never by itself authorizes a `complete` label. Missing, duplicate, unknown, failed, cancelled, or timed-out accounting blocks `complete`; if refusal versus visibly incomplete output is undecided, keep that publication policy in open points;
14. declare capacity only when the task supplies a real bounded resource. POM may record control-plane input limits such as synthesis-context size; workers, API quotas, queues, scheduling, retries, persistence, rate limiting, and backpressure remain Target Project data-plane responsibilities;
15. before modeling any `fan_out_launch`, answer three questions with the user and record every undecided one as a named open point: where each worker does its work, how worker results are merged, and what happens when two workers produce contradictory results for the same identity. Parallel workers sharing one mutable workspace overwrite each other, and that failure is operational, not a modeling detail the data plane discovers later. POM does not choose the isolation mechanism and does not model workspaces; the decision must be visible in the model instead of implied;
16. in `scenarios` mode, cover full reconciliation plus missing, duplicate (including equal-count missing-plus-duplicate), failed, cancelled or timed-out, unknown-identity, partial-refused, and visibly-incomplete branches. Scenarios assert accounting and labels without choosing an unresolved publication policy.

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
- `runtime_loop` is the runtime contract of this workflow, not the contract of an experiment that measures it. Experiment budgets, gates, signals, and exits stay in the accepted criteria of `prompts/28-loop-goal-define-criteria.md`. Do not collapse the two, and do not copy a threshold from one into the other.
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
