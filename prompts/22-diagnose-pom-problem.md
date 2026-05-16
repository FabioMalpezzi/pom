# Prompt - Diagnose POM Problem

Use this prompt when a POM workflow, lint check, installer, template, skill, prompt, or memory update behaves incorrectly.

```text
Before changing files:
1. read `CONTEXT.md`, `README.md`, `pom.config.json` if present, and the failing skill or prompt;
2. identify the shortest feedback loop:
   - `npm run pom:lint`;
   - a focused node test;
   - a temp-project installer run;
   - a fixture;
   - a CLI invocation;
   - `git status` plus file inspection;
3. reproduce the problem or state why it cannot be reproduced;
4. list 3 to 5 concrete hypotheses;
5. test the highest-signal hypothesis first.

Fix rules:
- do not hypothesize without a feedback loop unless no executable loop exists;
- instrument minimally and remove diagnostic noise before finishing;
- prefer a regression test when the issue has a stable seam;
- keep the fix at the smallest POM level that owns the defect;
- if the defect is caused by bloat or overlap, route through `prompts/21-prune-pom-method.md`.

Expected output:
- observed failure;
- feedback loop used;
- root cause or narrowed hypothesis;
- fix summary;
- regression or verification run;
- remaining risk.
```
