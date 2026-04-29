# Prompt - Query Wiki

Use this prompt when the user asks a question against the wiki or wants to turn a useful answer into persistent knowledge.

```text
I want to query the project wiki.

Before answering:
1. read `wiki/index.md`, if present;
2. identify relevant wiki pages;
3. read only the necessary pages and cited sources when needed;
4. distinguish facts present in the wiki, inferences, and open questions.

Rules:
- do not rediscover everything from scratch if the wiki already contains the synthesis;
- cite the wiki pages used in the answer;
- if the wiki is insufficient, report missing sources instead of inventing;
- if contradictions emerge, report them as reconciliation candidates;
- do not modify the wiki without approval.

If the answer has reusable value:
1. propose whether to archive it as a new wiki page or update an existing page;
2. indicate title, path, sources, and linked pages;
3. wait for approval;
4. after approval, update the page, `wiki/index.md`, and `wiki/log.md`;
5. run `npm run pom:lint`, if available.

Output:
- answer with wiki references;
- limits or open questions;
- optional wiki archival proposal.
```
