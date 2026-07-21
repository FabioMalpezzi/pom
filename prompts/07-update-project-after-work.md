# Prompt - Update Project After Work

Use this prompt at the end of a work session.

```text
Update the project state after the completed work.

First read `pom.config.json` when present, especially the adoption profile, artifact policy, configured roots, and `handoff` rules. Disabled modules are not closeout obligations and must not be created or enabled by this prompt.

Then summarize what changed.

Completion verification:
- before handoff, verify that any work marked Complete or Accepted during this session has passed the completion verification gate;
- goal-backward check: is the declared goal actually achieved?
- tech work: scenario tests (2 positive + 1 error/misuse) run and pass?
- non-tech work: thesis/antithesis validated, every antithesis confuted?
- if verification was not done, do it now before closing the session;
- when the environment supports it, use a separate agent or fresh context for verification.

Handoff rule:
- always update `PROJECT_STATE.md` if the project operating context changed;
- do not update it for tiny changes with no impact;
- if you do not update it, explain in the summary why it was not necessary.
- run `skills/validate.md` only when governed memory changed significantly or the user asks for a governance audit.

Then update, when present and relevant:
- PROJECT_STATE.md;
- docs/delivery/CURRENT_PLAN.md;
- docs/delivery/ROADMAP.md;
- docs/delivery/BACKLOG.md;
- docs/delivery/DEPENDENCIES.md;
- wiki/log.md;
- wiki/index.md;
- wiki pages impacted by new knowledge;
- ADRs in the configured decisions root;
- README and agent instruction files if the method changed.

Respect artifact policy: do not hand-edit generated files, do not rewrite historical records, and ask before changing approval-required paths.

Git:
- use Git for fine-grained change history;
- do not add manual changelogs to specs/ADRs/PROJECT_STATE unless explicitly requested;
- if structural changes were made, suggest or create a descriptive commit according to the project workflow.

Lint-driven closeout:
- run `npm run pom:lint` when available after governed document changes;
- if lint reports errors or warnings, fix them before declaring the work complete;
- if a warning is intentionally accepted, document the reason and next action;
- do not hide divergence between code, docs, tasks, ADRs, and project state.

Do not update everything automatically: update only what is actually impacted. Route each artifact to its authoritative memory element first: analysis belongs in `analysis/`, durable decisions belong in ADRs, and task execution belongs in task plans. The wiki may summarize and link to those sources after they exist, but it must not become the primary home for an analysis document, an ADR, or a task plan.

The final summary must include:
- files updated;
- tests/lint run;
- evidence used;
- tasks completed;
- tasks still open;
- open decisions;
- where to resume next session.
```
