# Prompt - Lint Wiki

Use this prompt for a lightweight wiki health check and health report without introducing heavy automation.

```text
I want to check wiki health.

Before modifying files:
1. read `wiki/index.md` and `wiki/log.md`, if present;
2. list Markdown pages in `wiki/`;
3. check textually:
   - broken local links;
   - pages missing from `wiki/index.md`;
   - orphan pages or pages with few links;
   - very short pages or pages without sources/references;
   - recurring open questions;
   - stale candidates from references to modified files, if `git status` shows changes;
4. produce a health report.

Rules:
- do not perform full semantic analysis unless requested;
- report issues as candidates, not certain errors, when the check is heuristic;
- do not add mandatory frontmatter;
- do not modify the wiki without approval;
- keep the report concise and actionable.

Minimum health report:
- total wiki page count;
- pages not indexed;
- broken local links;
- possible orphan pages;
- pages without sources or with weak sources;
- stale candidates;
- open questions;
- recommended next actions.

After approval:
1. fix only approved links, index/log entries, or pages;
2. update `wiki/log.md` if the wiki changes;
3. run `npm run pom:lint`, if available.

Output:
- health report;
- proposed fixes;
- any updates applied;
- follow-up.
```
