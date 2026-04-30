# Prompt - Update Project After Work

Use this prompt at the end of a work session.

```text
Update the project state after the completed work.

First summarize what changed.

Handoff rule:
- always update `PROJECT_STATE.md` if the project operating context changed;
- do not update it for tiny changes with no impact;
- if you do not update it, explain in the summary why it was not necessary.

Then update, when present and relevant:
- PROJECT_STATE.md;
- docs/delivery/CURRENT_PLAN.md;
- docs/delivery/ROADMAP.md;
- docs/delivery/BACKLOG.md;
- docs/delivery/DEPENDENCIES.md;
- wiki/log.md;
- wiki/index.md;
- wiki pages impacted by new knowledge;
- ADRs in decisions/;
- README and agent instruction files if the method changed.

Git:
- use Git for fine-grained change history;
- do not add manual changelogs to specs/ADRs/PROJECT_STATE unless explicitly requested;
- if structural changes were made, suggest or create a descriptive commit according to the project workflow.

Do not update everything automatically: update only what is actually impacted. If an answer, analysis, or decision has reusable value, consider archiving it in the wiki instead of leaving it only in chat.

The final summary must include:
- files updated;
- tests/lint run;
- tasks completed;
- tasks still open;
- open decisions;
- where to resume next session.
```
