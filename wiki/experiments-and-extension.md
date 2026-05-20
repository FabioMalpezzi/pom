# Experiments And Extension

## Summary

POM changes should start at the smallest necessary level. Temporary experiments stay isolated until evaluated, then they are discarded, archived, or promoted into the stable method.

## Current State

The `spike` skill and temporary experiment prompt define how exploratory work stays separate from stable source and documentation. The `extend` skill defines how approved POM improvements choose the smallest fitting level: project config, template, prompt, skill, lint/script, or sync workflow.

The wiki reader followed that model: it started under `experiments/wiki-reader-view/`, then moved into stable `wiki/` and `scripts/render-wiki.mjs` after evaluation.

The POM Project Reader is still experimental. It is a local server for project navigation, `rg` search, in-file search, responsive document reading, optional `pom.config.json`-based classification, and file-based annotations. Its lightweight contract is that the UI writes annotation JSON files and a coding agent reads, claims, and resolves those files from the repository, rather than the UI opening a direct AI-agent session or editing source files in the browser.

## Details

Promotion paths should stay intentionally modest:

| Candidate Outcome | Meaning |
|---|---|
| Discard | Delete or abandon the experiment branch and keep only the lesson learned. |
| Archive synthesis | Write a concise analysis note if the idea is useful but not ready. |
| Promote wiki | Move selected pages into a stable root `wiki/` after approval. |
| Promote reader | Reimplement a small static renderer under stable `scripts/` after approval. |
| Promote Project Reader | Move the local server from experiment to stable tooling only if its file-based annotation workflow proves useful without expanding POM into a project-management app. |
| Create spec or ADR | Use if reader generation changes POM structure or source authority. |

The first evaluation should focus on consultation quality: whether the reader helps someone understand POM faster without creating a second source of truth. LLM-powered querying should remain a separate experiment because it introduces provider configuration, privacy considerations, and write-approval rules.

## Sources

| Source | Use |
|---|---|
| `skills/spike.md` | Experiment isolation and consolidation rules. |
| `prompts/09-run-temporary-experiment.md` | Full temporary experiment workflow. |
| `skills/extend.md` | Smallest-level extension rule. |
| `prompts/12-extend-pom.md` | Controlled POM extension workflow. |
| `skills/prune.md` | Route for reducing method bloat if the proposed feature adds too much process. |
| `README.md` | Extending POM and temporary experiment rules. |
| `experiments/wiki-agent-orchestration/mini-ui/README.md` | Local POM Project Reader launch, search, and annotation workflow. |
| `experiments/wiki-agent-orchestration/mini-ui/document-sources.mjs` | Project Reader document allowlist and optional POM config classification. |
| `experiments/wiki-agent-orchestration/wiki-tools.mjs` | File-based annotation CLI and `rg` search implementation. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0000 D2 | Extensions choose the smallest possible level. |
| SPEC-0000 R10 | Reader functionality must justify its cognitive and maintenance cost. |

## Open Questions

| Question | Status |
|---|---|
| Is static HTML generation enough to solve consultation pain? | Answered for now: yes, as an explicit script command. |
| Does a reader view belong in a wiki skill mode or optional tooling? | Open; current shape is optional tooling. |
| Should LLM query and page creation be a separate second spike? | Likely yes. |

## Related Links

- [[wiki-method]]
- [[templates-and-governance]]
- [[current-specs]]
