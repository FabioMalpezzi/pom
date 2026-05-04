---
name: wiki
description: Use this skill to build, query, maintain, or health-check the project wiki — including initial creation, stale page detection, wiki queries with optional archival, and link/orphan checks.
---

# Skill - wiki

## When To Use

- Initial wiki creation.
- Wiki maintenance after changes to code, mockups, specs, docs, or analysis.
- Identification of potentially stale wiki pages.
- Wiki query with possible archival of the answer.
- Lightweight wiki lint and health report.

## Modes

| Mode | Use | Prompt |
|---|---|---|
| `build` | build the initial wiki from existing sources | `prompts/10-build-wiki.md` |
| `stale` | find wiki pages that may be outdated after recent file changes — starts from `git status` | `prompts/11-review-stale-wiki.md` |
| `query` | answer from the wiki and propose archiving the answer | `prompts/13-query-wiki.md` |
| `lint` | check wiki structure: broken links, orphan pages, missing index entries, short pages — does not require recent changes | `prompts/14-lint-wiki.md` |

Use `stale` when files changed and you want to find which wiki pages cite them. Use `lint` for a periodic health check regardless of recent changes.

## Key Rules

- Do not automatically update the whole wiki.
- Work in small, approved batches.
- Use `wiki/index.md` as the map.
- Use `wiki/log.md` as the chronological register.
- If a source changes, first search for wiki pages that cite it.
- In `query` mode, do not modify the wiki without explicit approval.
- In `lint` mode, treat heuristic results as candidates, not certain errors.
- Propose changes before applying them when impact is ambiguous.
- Run lint after wiki updates.

## Output

- in `build` mode: wiki taxonomy, index/log, and first pages;
- in `stale` mode: stale candidates, update proposal, optional wiki/log update;
- in `query` mode: answer with wiki references and optional page proposal;
- in `lint` mode: wiki health report and proposed fixes.
