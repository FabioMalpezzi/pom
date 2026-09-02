# ADR-0006 - Synthesis Pages Declare Their Sources And Generate Derived Content

| Field | Value |
|---|---|
| Date | 2026-09-02 |
| Status | Accepted |
| Category | governance |
| Area | wiki |
| Summary | Derived wiki memory is kept honest by two lint mechanisms: a page declares the sources it summarizes and the date it was last re-read, and content that has an authoritative source is generated between markers instead of restated by hand |
| Replaces | none |
| Replaced by | none |
| Driver | technical constraint |
| Scope | wiki / docs |

## Context

POM distinguishes source authority by domain and asks the wiki to hold the current synthesis, not the history. In practice two kinds of memory coexist in a target project. Appended memory, such as `wiki/log.md`, the decision records, and `PROJECT_STATE.md`, stays current on its own: every task writes its own entry as a side effect of doing the work. Derived memory, such as the project overview that summarizes decisions and state, has no task that owns it.

The gap became measurable on a target project on 2026-09-02. Its `wiki/overview.md` had last changed on 2026-08-10 and still stated "no code written yet" and "five ADRs". Since that date the repository had received 505 commits touching 674 files, nine further ADRs, and updates to the log, the index, the project state, the plan, and several thematic wiki pages. The overview passed every structural lint check. None of the existing mechanisms could catch it: the `stale` review mode starts from `git status` and text-searches the wiki for changed paths, but the overview cites prose claims, not paths, and the signal disappears once changes are committed; the lint checks links, titles, index coverage, log format, and page length, never freshness; the agent rules trigger on wiki changes, not on project changes; and the page itself carried no statement of when its claims were last verified.

## Decision

Two mechanisms are added to `pom:lint`, both opt-in per page and both warnings, never errors:

1. A wiki page may declare in its frontmatter the paths it summarizes (`derivedFrom`, a block list or a comma-separated scalar) and the date it was last re-read (`verified`, `YYYY-MM-DD`). For every declared path that changed after that date, in a later commit or in the working tree, the lint reports `wiki-stale-synthesis`. When `verified` is absent the page's last commit is the baseline; a page with unstaged edits counts as being re-read now. Missing paths and malformed dates are reported as `wiki-derived-source-missing` and `wiki-verified-format`. The ADR index that the lint itself writes never counts as a source change. Pages without `derivedFrom` are not checked.

2. A wiki page may reserve regions between `<!-- pom:generated <kind> -->` and `<!-- /pom:generated -->` that the lint rewrites on every run: `decisions` (every ADR in the configured decisions root with status, date, summary, and a relative link), `state` (one section of `PROJECT_STATE.md`, by default `### Current State`, with the file's last change date; `source` and `section` are options), and `pages` (the other wiki pages with their titles). Text outside the markers is never touched; markers quoted in code are ignored; malformed markers are reported and left alone. The pre-commit hook restages a tracked page that was clean before the lint and changed only by a refresh, and leaves a page with prior unstaged edits to its author.

The rule of conduct that goes with the first mechanism is written in the skill, the agent section, and the prompts: a `verified` date is moved to today only after re-reading every source the finding named. The installer's overview placeholder declares its sources and uses generated blocks for the parts the chosen profile creates.

## Rationale

The two mechanisms address the two halves of the failure. Declared sources turn "this page is a synthesis" from an implicit fact into a checkable one, so a change in the sources produces a finding whether or not the prose cites a path and whether or not the change is still uncommitted. Generated blocks remove from hand-written prose the parts that were most out of date and least worth writing by hand, applying the rule already in `skills/wiki.md` that the wiki summarizes and links instead of duplicating.

Both stay within POM's constraints. They are deterministic, need no model, and run inside the lint that projects already execute in the pre-commit hook. They recommend rather than impose: a project declares sources only on the pages where a synthesis exists, the findings are warnings, and a page that never opts in behaves exactly as before. The lint also never decides whether the prose is still true; it reports that nobody re-read the source since it moved, and leaves the judgment to the agent or the person.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Add procedural ownership only: rules telling the agent to re-read the overview when creating an ADR or updating the project state | Kept as guidance, but insufficient alone: it relies on the discipline that had just failed, and nothing would make the omission visible afterwards. |
| Compare source and page timestamps on every wiki page without a declaration, using the paths the page links to | Links are not the same as sources: the overview cited almost no paths, and thematic pages link to many things they do not summarize. The check would be noisy where it is not needed and silent where it is. |
| Regenerate the whole overview from the other memory files | A synthesis is written judgment, not a projection of other files; generating all of it would either flatten it into an index or require a model in the lint, which POM excludes. |
| Generate the derived content into the reader only, leaving the Markdown untouched | Agents read the Markdown, not the reader; the canonical memory would still be stale. |
| A separate `pom:wiki:refresh` script for the generated blocks | Adds a command to install, document, and remember for a step the lint already performs, following the precedent of the ADR index regeneration. |

## Impacts

| Area | Impact |
|---|---|
| Wiki | `wiki/overview.md` in POM Source declares `README.md`, `CONTEXT.md`, `specs/SPEC-0000-pom-founding-spec.md`, and `WIKI_METHOD.md` as sources and generates its page map; target projects opt in page by page. |
| Docs | README section "Synthesis Pages Stay Honest", the pre-commit hook paragraph in `docs/installation.md`, and a section in both HTML guides describe the mechanisms. |
| Mockup | none. |
| Analysis | none. |
| Product | The installer's overview placeholder changes shape; existing overviews are untouched until a project adds the declaration or the markers. |
| Technical | New lint modules `scripts/lib/lint-wiki-freshness.ts` and `scripts/lib/wiki-generated-blocks.ts`; frontmatter parsing and `git log` helpers in `scripts/lib/lint-helpers.ts`; the reader skips single-line HTML comments; the pre-commit hook gains the wiki restage step. |

## Links

- Wiki: `wiki/overview.md`, `wiki/wiki-method.md`
- Analysis: none
- Mockup: none
- Docs: `README.md` (Synthesis Pages Stay Honest), `docs/installation.md` (Pre-commit Hook), `skills/wiki.md`, `prompts/11-review-stale-wiki.md`, `prompts/14-lint-wiki.md`, `templates/agents/10-wiki.md`, `templates/WIKI_PAGE_TEMPLATE.md`
- Tests: `tests/doc-governance/integration/test-lint-wiki-freshness.mjs`, `tests/installer/integration/test-installer-hardening.mjs` (scenario 9)

## Follow-up

- [x] Implement both mechanisms with integration tests.
- [x] Apply them to POM Source's own overview.
- [x] Apply them to the target project that exposed the gap and re-verify its overview against the nine ADRs and the current state (done 2026-09-02: the overview now declares `doc/adr/`, `PROJECT_STATE.md`, and `CURRENT_PLAN.md`, generates its state, decisions, and page blocks, and its prose was rewritten against ADR-0006 to ADR-0016).
- [ ] After a few weeks of use, review whether `wiki-stale-synthesis` fires too often on pages that derive from fast-moving roots such as the whole decisions folder, and decide whether a per-source grace period is needed.

## Completion Verification

This ADR cannot be marked Accepted without passing semantic validation. Verification is mandatory and automatic.

### Step 0 — Goal-backward check (always first)

- [x] What must be TRUE for this decision to be valid?
  - A page with `derivedFrom` and an old `verified` date is reported when a declared source changed later, both from a later commit and from the working tree; a page without the declaration is never reported.
  - The three block kinds are filled from the decisions root, the project state, and the wiki itself; a second lint run changes nothing; text outside the markers is byte-identical after a refresh.
  - The reader hides the markers and the pre-commit hook commits a refreshed page that was clean before the lint.
- [x] For each truth, does supporting evidence or reasoning EXIST? Yes: the 38 assertions of `test-lint-wiki-freshness.mjs` and the extended scenario 9 of `test-installer-hardening.mjs`, all passing on 2026-09-02, plus the refreshed `pages` block in `wiki/overview.md` of POM Source.

### Thesis (at least 1 required)

- Thesis 1: On the target project that exposed the gap, adding `derivedFrom: doc/adr/, PROJECT_STATE.md` and `verified: 2026-08-10` to `wiki/overview.md` makes the next `pom:lint` report two `wiki-stale-synthesis` findings naming the decisions root and the project state with their last change dates; replacing the hand-written decisions table with a `decisions` block lists all sixteen ADRs, and the "current state" prose is replaced by the `state` block quoting the section the project already keeps current. The page can no longer claim "five ADRs" or "no code written" without someone having chosen to keep that prose after re-reading.

### Antithesis (at least 1 required — each must be confuted)

| Antithesis | Confutation |
|---|---|
| A `verified` date is just another field to forget: pages will keep an old date forever and the warning becomes noise that everyone ignores. | The warning is the point: an old date with moved sources is exactly the state that was invisible before. The rule of conduct forbids bumping the date without re-reading, and the finding is per source with its change date, so it is actionable rather than generic. Whether it becomes noise on fast-moving roots is an explicit follow-up, not an assumption. |
| Generated blocks put machine-written text inside pages that the method treats as authored knowledge, blurring who is responsible for what. | The markers make the boundary explicit and the lint never writes outside them. Every block reproduces content whose authority already lies elsewhere (ADR metadata, a project state section, the page list); the page keeps only what a person or agent actually synthesized. |
| The lint modifying wiki pages during a pre-commit hook will commit content the author did not review. | Only a page that was clean before the lint is restaged, so the commit gains nothing but the refreshed block; a page with prior unstaged edits is left alone, and the hook prints what it restaged. The same rule already governs the ADR index and the reader output. |

### Exception

If semantic validation is not possible, document the reason here and mark as "Accepted with exceptions":

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this decision changes substantially, create a new ADR that supersedes or replaces it instead of retroactively rewriting the decision.
