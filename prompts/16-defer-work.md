# Prompt - Defer Work Without Implementing

Use this prompt when a topic is important enough to preserve, but implementation
must not continue now.

```text
Defer this work without implementing it.

Read:
- `pom.config.json`;
- the relevant ADR/spec/task/wiki/analysis sources;
- `PROJECT_STATE.md` when present;
- the relevant templates in `pom/templates/` or configured project templates.

Classify the artifact first:
- ADR if a decision is being made or changed;
- spec if intended behavior must be captured without implementation;
- task plan if there is verifiable future work;
- wiki if reusable knowledge must be summarized;
- PROJECT_STATE only if restart context changes.

When deferring:
- create or update the smallest document that preserves the work;
- set `Status: Deferred`;
- separate implemented baseline from future scope;
- list explicit non-goals while deferred;
- add reactivation criteria or verification to run when resumed;
- update the task/spec index if the project has one;
- update `PROJECT_STATE.md` only if the restart context changed;
- do not change application code;
- do not create an OpenSpec change unless explicitly requested.

If a partially implemented task exists:
- keep the completed slice documented;
- split the remaining product surface into a Deferred spec or task;
- avoid marking completed work as undone.

Closeout:
- run `npm run pom:lint` when available;
- fix warnings/errors instead of ignoring them;
- summarize files changed and what remains deferred.
```
