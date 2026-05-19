# Prompt - Challenge Thesis And Antithesis

Use this prompt to run a read-only adversarial review of an ADR, non-code spec, task plan, or normative document before accepting or completing it.

```text
Challenge this document before it is accepted or completed.

Before judging:
1. read `CONTEXT.md` when present;
2. read `pom.config.json` when present;
3. read the target document from disk;
4. read linked sources cited by the target document, including specs, ADRs, docs, wiki pages, analysis, task plans, code/tests when relevant, and Open Discussions when cited as input;
5. identify the document's thesis or claimed validity;
6. state whether this document is eligible for challenge:
   - eligible: ADR, non-code spec, non-code task plan, or normative document;
   - not eligible: Open Discussion, ordinary wiki synthesis, PROJECT_STATE.md, CURRENT_PLAN.md, or implementation code with executable tests.

Rules:
- do not validate from session memory;
- do not look for confirmations first;
- construct the strongest plausible antitheses, not token objections;
- each antithesis must be able to invalidate, narrow, or force revision of the thesis if not confuted;
- ground objections in source authority when possible;
- if sources disagree, classify it as a divergence and recommend `skills/reconcile.md`;
- do not edit files unless the user explicitly asks for a follow-up edit.

Antithesis checks:
- contradiction with source authority;
- missing requirement, constraint, stakeholder need, or use case;
- unsafe, insecure, non-compliant, or privacy-risky outcome;
- ambiguous language that allows an incorrect implementation;
- hidden dependency or operational assumption;
- mismatch between claimed scope and actual impact;
- premature decision based on Open Discussion, desiderata, or analysis that was not promoted.

Output:
- target document;
- sources reviewed;
- thesis being challenged;
- antitheses table:
  | Antithesis | Evidence | Impact | Confuted? |
- verdict:
  - Pass: antitheses are confuted by source-grounded evidence;
  - Pass with exceptions: remaining risk is explicit and acceptable;
  - Does not pass: at least one material antithesis remains unresolved;
- recommended next action:
  - accept/complete;
  - revise target document;
  - create or update ADR/spec/task;
  - reconcile divergence;
  - keep as Open Discussion.
```
