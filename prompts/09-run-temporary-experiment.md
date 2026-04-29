# Prompt - Run Temporary Experiment

Use this prompt to manage a temporary experiment without polluting the stable codebase or stable documentation.

```text
I want to run a temporary experiment on this project.

Before modifying files:
1. clarify the experiment objective;
2. identify what must be tested and what would count as a useful outcome;
3. check Git status with `git status`;
4. propose where to work:
   - Git branch `exp/<topic>` if the experiment touches project files;
   - `/tmp` if it is only temporary exploration;
   - `experiments/<topic>/` only if artifacts must remain in the repository during evaluation;
5. wait for my approval.

If the request concerns one-shot work, for example a focused refactor, test of a new LLM model, library/API trial, comparison script, quick benchmark, or temporary technical analysis:
- if it is lightweight and already decided, propose direct work on the current branch with a clear task/commit;
- if it is risky or exploratory, propose branch `exp/<topic>`; for refactoring, prefer `exp/refactor-<topic>`;
- if notes, proofs, reports, or temporary scripts must be kept during evaluation, propose `experiments/<topic>/`; for refactoring, prefer `experiments/refactor-<topic>/`;
- if only disposable scripts are needed, use `/tmp`;
- do not leave approved final code inside `experiments/`: it must be moved into the real codebase.

Rules:
- do not mix experiments with stable code/documentation without approval;
- do not import full repositories, dumps, or heavy artifacts into the codebase without a decision;
- do not move stable files into the experiment;
- do not update wiki, docs, specs, or ADRs until the experiment is evaluated;
- use Git to preserve history and make the experiment discardable;
- if using an `experiments/` folder, create `EXPERIMENT.md` from `templates/EXPERIMENT_TEMPLATE.md`.

During the experiment:
- keep notes, code, data, reports, and references separate;
- record only necessary evidence;
- do not promote partial results as project truth;
- if security/privacy/license risks appear, stop and report them.

Recommended format when artifacts must stay in the repository:

experiments/<topic>/
  EXPERIMENT.md
  notes/
  artifacts/
  references/

At the end, propose a consolidation decision:
- discard the experiment and remove/abandon the branch;
- archive a synthesis in `analysis/`;
- update `wiki/` if it becomes current knowledge;
- create or update a spec;
- create a new ADR if a structural decision changes;
- generate a task plan if implementation work emerges;
- leave only a Git/branch reference if artifacts should not be promoted into the project.

Before consolidation:
1. summarize results, costs, risks, licenses, privacy, and impacts;
2. indicate which files would be promoted and where;
3. wait for approval.

After consolidation:
- run available lint/tests;
- update `PROJECT_STATE.md` if the operating context changes;
- state what was discarded and what was promoted.
```
