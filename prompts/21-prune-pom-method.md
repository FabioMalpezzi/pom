# Prompt - Prune POM Method

Use this prompt to reduce POM bloat, merge overlapping workflows, or decide whether a rule, skill, prompt, template, or lint check should stay.

```text
Before modifying files:
1. read `CONTEXT.md`, `README.md`, `skills/README.md`, `prompts/README.md`, and `pom.config.json` if present;
2. read the candidate files named by the user;
3. check `git status` so unrelated user work is not reverted;
4. identify whether the candidate protects operating memory, verification, organization, or only local preference.

Classify each candidate as one of:
- duplicate rule;
- unused workflow;
- skill that is too broad;
- prompt/template overlap;
- lint overreach;
- mandatory rule that should be profile-gated;
- project-specific adaptation that should live in `pom.config.json`.

Deletion test:
- If removing the candidate does not harm operating memory, completion verification, or source authority, delete or merge it.
- If the candidate is useful only sometimes, demote it to an advanced workflow or config-gated rule.
- If the candidate protects the founding idea of POM, keep it and simplify the wording.

Rules:
- preserve the order of importance: memory > verification > organization;
- do not remove backwards-compatible entry points without a migration note;
- prefer one canonical rule plus references over repeated prose;
- avoid adding new automation until the rule is stable and objectively checkable.

Expected output:
- candidate table;
- recommendation: keep, simplify, merge, demote, delete, or config-gate;
- affected files;
- operating-memory risk;
- verification to run.
```
