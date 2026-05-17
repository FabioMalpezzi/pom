# Prompt - Zero Tech Debt

Use this prompt when a scoped change should be reshaped around the intended product and architecture end state before closure.

```text
Rework the current change from the intended end state, not from the historical path that produced the current patch.

Why this belongs in POM:
- it keeps code as the authoritative source for what the system actually does;
- it reduces false memory: wrappers, fallbacks, and historical modes can make future agents believe obsolete variants are still valid;
- it improves restart: a project with a clear final shape requires less explanation in wiki, project state, and decision records.

POM does not preserve accidental history inside the project shape. Fine-grained history lives in Git. If a patch left traces of the path taken to reach the solution, reshape the code so it looks like the intended choice had been clear from the start.

Scope:
- keep the refactor limited to the current change and the files needed to make that change coherent;
- do not use this prompt as permission to clean unrelated debt;
- respect POM file-size standards for hand-written source: aim under 800 lines and do not exceed 1000 lines;
- if the final shape changes a structural or architectural choice, evaluate whether a decision record is needed.

Steps:
1. State the intended end state in one or two sentences.
2. Search for real callers before preserving compatibility.
   If a mode, prop, wrapper, route alias, or fallback has no current caller and is not protected compatibility, delete it.
3. Check protected compatibility before deleting:
   - public APIs;
   - persisted routes or URLs;
   - saved state, storage keys, schemas, migrations, or serialized data;
   - config keys and environment variables;
   - plugin hooks, extension points, webhooks, and external integrations;
   - documented behavior that users or downstream systems may depend on.
   Delete or rename protected compatibility only with explicit approval, a verified migration, or a decision record.
4. Reshape around the final product surface.
   Prefer one clear component or flow over mode flags. Split only when it creates an obvious boundary such as state, layout, controls, or domain commands.
5. Apply code writing practices that make the final shape obvious:
   - follow the project's language, framework, lint, formatter, and type-checking conventions;
   - use names that describe product intent, domain behavior, and user-visible commands rather than implementation history;
   - keep functions, components, classes, modules, and tests focused on one clear responsibility;
   - make data boundaries explicit with types, schemas, validation, or parser helpers when the project has them;
   - keep side effects, I/O, routing, persistence, and external calls at clear boundaries instead of scattering them through view or domain logic;
   - handle errors where recovery or user feedback belongs; do not hide failures behind silent fallbacks;
   - remove dead code, obsolete comments, temporary TODOs, and debug helpers created by the old patch path;
   - add comments only for non-obvious decisions, constraints, or invariants that the code cannot express clearly.
6. Check source file size and split when needed.
   If the end-state shape leaves a hand-written source file above 800 lines, consider whether a natural product or architecture boundary should be extracted. If it exceeds 1000 lines, split it before closure unless the file is generated, a large fixture, or a data dump.
7. Move shared rules to one place.
   Feature flags, permissions, route gating, URL state, and command naming should not be duplicated across pages or hidden in view components.
8. Verify the intended flow.
   Test the new behavior and any deleted assumptions that affect navigation, permissions, persisted state, or external contracts.

Rules:
- optimize for the code that should exist, not the smallest diff from the old shape;
- delete dead compatibility paths instead of making them better;
- do not invent a generic framework for one feature;
- keep the refactor scoped to what makes the final shape coherent;
- keep source files readable and verifiable; do not hide a broad flow inside one oversized file;
- prefer boring, idiomatic code over cleverness; make the easy path clear to the next maintainer or agent;
- prefer names that describe product intent over implementation history;
- when in doubt, preserve the public contract and record the open decision instead of guessing.

Expected output:
- intended end state;
- compatibility paths deleted, with caller-search evidence;
- protected compatibility preserved or migrated;
- final code shape;
- code writing practices applied or intentionally left to existing project conventions;
- source files split or explicitly kept within POM file-size standards;
- tests, lint, or scenario checks run;
- remaining risks, open decisions, or memory updates needed.
```
