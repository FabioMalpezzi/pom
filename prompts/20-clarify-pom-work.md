# Prompt - Clarify POM Work

Use this prompt when a request is ambiguous, when the right POM artifact is unclear, or before changing POM memory or method.

```text
Before modifying files:
1. read `CONTEXT.md` when present;
2. read `README.md`, `AGENTS.MD`, `pom.config.json` if present, and `PROJECT_STATE.md` if present;
3. read the source artifact named by the user, if any;
4. restate the user's objective in one sentence;
5. classify the next route:
   - no persistent memory needed;
   - wiki memory;
   - decision record / ADR;
   - spec;
   - task plan;
   - temporary experiment;
   - project config;
   - prompt, skill, template, or lint extension;
6. ask only the unresolved questions that cannot be answered from the repository.

Rules:
- preserve POM's founding idea: create memory only when it changes the next safe step, reduces ambiguity, or prevents rediscovery;
- prefer the smallest artifact and lowest POM extension level;
- use terms from `CONTEXT.md` when available;
- if a term is ambiguous or repeated across documents, propose a glossary update instead of inventing a parallel vocabulary;
- do not implement until the route and open decisions are clear, unless the user explicitly says to proceed.

Expected output:
- clarified objective;
- chosen route and rationale;
- memory impact;
- unresolved questions, if any;
- next skill or prompt to use.
```
