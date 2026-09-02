## Persistent Wiki

The wiki is persistent and cumulative memory, not a temporary research output.

Rules:

- keep the wiki as the current synthesis of the project;
- keep decision rationale history in the configured decisions root (`decisions.root`, default `decisions/`);
- update `wiki/index.md` when wiki pages are added or changed;
- update `wiki/log.md` when the wiki changes materially;
- create new wiki pages when an answer, analysis, or synthesis becomes reusable knowledge;
- check missing links, contradictions, stale claims, and orphan pages;
- on a synthesis page (the overview above all), declare the sources it summarizes in frontmatter (`derivedFrom`) and the date you last re-read them (`verified`); when `pom:lint` reports `wiki-stale-synthesis`, re-read the changed source, update the page where the prose no longer holds, then set `verified` to today. Never bump the date without re-reading;
- do not restate by hand what has an authoritative source: use generated blocks (`<!-- pom:generated decisions -->`, `state`, `pages`) and let `pom:lint` fill them; never edit text between the markers.

For wiki creation or maintenance, use `pom/skills/wiki.md`:

- `build`: initial wiki creation;
- `stale`: changed file -> wiki pages that cite it -> stale candidates;
- `query`: answer from wiki pages and optionally archive useful answers;
- `lint`: lightweight wiki health report.
