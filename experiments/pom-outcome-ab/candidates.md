# Candidate tasks, assessed against the selection criterion

Assessed on 2026-09-03, after the criterion in `EXPERIMENT.md` was fixed and before anything was run. Every candidate examined is listed, accepted or rejected, with the reason. Revised the same day when the control arm was redefined to hold the structure and lack the content: that reopened the tasks whose artifact is a memory document, and the revision is recorded below rather than hidden.

## Accepted

### T1 - Execute the modeled workflows

**Prompt shape**: the project models workflows as YAML but nothing runs them; make the modeled workflows executable.

**Decisive fact**: POM ships no runtime. Schema, templates, prompts and validators live here; execution belongs to the target project's own stack (`specs/SPEC-0000`, `PROJECT_STATE.md` Key Constraints, `decisions/ADR-0004` for the control-plane / data-plane split).

**Why it discriminates**: the code points the other way. `experiments/dynamic-workflows/runtime/` and `experiments/agent-loop-fsm/runtime-candidate/` hold working runtime candidates, so an agent reading only the code has good reason to think a runtime is welcome. Only the record says those stay experiment evidence on purpose.

**Check**: a new executable runtime under `scripts/` or at the root, or wired into `package.json`, fails; a change confined to `templates/` and the implementation guide passes. Deterministic on paths and on the script map.

### T3 - Add a page summarizing the state of the decisions

**Prompt shape**: the project needs a page that summarizes where the decisions stand; add it.

**Decisive fact**: a derived page declares the sources it summarizes and the date it was last re-read (`derivedFrom`, `verified`), and content that has an authoritative source is generated between markers instead of being restated by hand (`decisions/ADR-0006`).

**Why it discriminates**: writing a summary page by hand is the obvious move, and the lint does not complain about a page that declares nothing - so nothing pushes an agent toward the convention except knowing it.

**Check**: does the new page carry `derivedFrom` and `verified` in its frontmatter, and does it use a generated block for the decision table rather than a hand-written one? Deterministic on the frontmatter and the markers.

**Mechanism note**: in the `pom` arm `wiki/overview.md` already uses both mechanisms, so an agent can succeed by imitating an existing page rather than by reading ADR-0006. That is still accumulated memory doing the work - the example is memory, not code - but the effect runs through imitation, and the analysis must say so rather than claim the decision record was read.

## Rejected

| Candidate | Rejected by | Reason |
|---|---|---|
| Add a new `pom:*` script, respecting the namespace | Criterion 2 | The convention is visible in `package.json`. That measures reading, not memory. |
| A fix to `install-pom.ts` must be mirrored in `POM_UPDATE_TEMPLATE.mjs` | Criterion 2 | Both files are in the repository and their twin structure is apparent from reading them. |
| Add an agent-shaped capability as a new skill rather than a mode of `workflow` (ADR-0003) | Criterion 2 | `skills/loop-goal.md` is a sibling example in the code; an agent can imitate the shape without the record. |
| Do not add a manual changelog | Criterion 2 | `CHANGELOG.md` exists and its release-level granularity is visible. |
| Make a new lint finding an error rather than a warning ("POM recommends, does not impose") | Criterion 2 | Every existing severity in `lint-config.ts` is `warning`; the pattern is readable from the code. |
| Implement the `.pom/` overlay layout (SPEC-0004, deferred) | Criterion 3 | The correct outcome is "do not build it, open the question", and an agent that simply does little would pass the check for the wrong reason. A check on absence cannot tell knowledge from idleness. |
| Connect the reader to a persistent agent session (ADR-0001 superseded by ADR-0005) | Criterion 3 | Same shape: the correct outcome is a reasoned refusal, judged by reading prose. |
| Share state between a parent and a child workflow (ADR-0002, SPEC-0006) | Criterion 2 | Accepted first, then rejected on inspection: `templates/examples/workflow/agent-graph/security-sweep.yaml` already shows a parent launching a child with `fan_out_launch` and `over`, and the workflow schema has no place for shared state at all - the validator in `scripts/` would reject it without any memory. The decisive fact turned out to live in the code. Recorded here rather than quietly dropped, because it is the second time the criterion removed something that looked convincing. |

## State of the bench

Two accepted tasks: the runtime boundary and the wiki synthesis convention. Two is a small bench, and the experiment's scope already refuses to generalize beyond this repository; a first round on two tasks with several repetitions per arm is a real measurement of those two decisions and nothing more.

The rejected list is the honest part of this document: seven of the nine candidates that looked convincing at first do not survive a criterion written before looking at them. Two fail because a deterministic check cannot tell knowing from idleness. Five fail because the decisive fact is visible in the code - which is itself worth noticing, since it is exactly what the ETH study says about content an agent can already derive: writing it into a context file adds cost and no outcome.
