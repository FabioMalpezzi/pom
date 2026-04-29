# Prompt - Build Wiki

Use this prompt to build or complete a project's initial wiki.

```text
I want to create or complete the initial project wiki.

Before modifying files:
1. read `PROJECT_STATE.md`, `README.md`, `AGENTS.md`/`AGENTS.MD` or equivalent, if present;
2. read `WIKI_METHOD.md` and `skills/wiki.md`, if present;
3. read `pom.config.json`, if present;
4. detect available sources without analyzing everything deeply:
   - code/source roots;
   - mockups;
   - docs/doc;
   - analysis;
   - decisions/ADR;
   - specs;
   - README and project notes;
5. propose an initial wiki taxonomy;
6. propose the first batch of pages to create;
7. wait for approval.

Recommended batch priority:
1. core entities and concepts;
2. screens, mockups, or main interfaces;
3. processes and user flows;
4. controls, rules, permissions, and states;
5. integrations, architecture, and deep dives;
6. gaps, open questions, and reconciliations.

Rules:
- do not try to cover everything in one pass;
- work in small, verifiable batches;
- use `pom/templates/WIKI_INDEX_TEMPLATE.md` for `wiki/index.md`;
- use `pom/templates/WIKI_LOG_TEMPLATE.md` for `wiki/log.md`;
- use `pom/templates/WIKI_PAGE_TEMPLATE.md` for new generic pages;
- adapt categories and paths to `pom.config.json`;
- if the project already has a wiki, do not replace it: propose integration or reconciliation;
- do not promote hypotheses as facts: mark open questions and sources.

For each batch:
1. create or update approved wiki pages;
2. update `wiki/index.md`;
3. update `wiki/log.md`;
4. run `npm run pom:lint`, if available;
5. state what remains outside the batch.

Final output:
- pages created/updated;
- sources used;
- gaps and open questions;
- recommended next batch.
```
