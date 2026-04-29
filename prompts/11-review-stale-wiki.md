# Prompt - Review Stale Wiki

Use this prompt to identify potentially stale wiki pages after changes to sources, code, mockups, specs, docs, or analysis.

```text
I want to check whether the wiki became stale after recent changes.

Before modifying files:
1. read `git status`;
2. identify modified, added, removed, or renamed files;
3. for each changed file, search references in `wiki/` using text search;
4. produce a stale-candidates list:
   - changed file;
   - wiki pages that cite it;
   - reason for possible impact;
   - review priority;
5. wait for approval before modifying the wiki.

Rules:
- do not run broad semantic detection unless needed;
- start from explicit references: path, filename, screen, ADR, spec, entity, process;
- read only candidate pages and necessary sources;
- if there are no explicit references, state "no direct candidate";
- if you suspect indirect impacts, report them as hypotheses, not as errors;
- do not automatically update non-candidate pages.

After approval:
1. update only impacted wiki pages;
2. update `wiki/index.md` if pages or descriptions change;
3. update `wiki/log.md`;
4. create an ADR or reconciliation only if a structural decision or contradiction emerges;
5. run `npm run pom:lint`, if available.

Final output:
- stale candidates found;
- pages updated;
- pages not updated and why;
- lint/tests run;
- open follow-up.
```
