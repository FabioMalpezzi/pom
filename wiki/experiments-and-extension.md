# Experiments And Extension

## Summary

POM changes should start at the smallest necessary level. Temporary experiments stay isolated until evaluated, then they are discarded, archived, or promoted into the stable method.

## Current State

The `spike` skill and temporary experiment prompt define how exploratory work stays separate from stable source and documentation. The `method` skill (`skills/method.md`) governs changes to POM itself through three modes: `extend` chooses the smallest fitting level for an approved improvement (project config, template, prompt, skill, lint/script, or sync workflow), `improve` runs a bounded self-improvement loop, and `prune` removes method weight; when a change may add weight, the skill starts in `prune`.

The wiki reader followed that model: it started under `experiments/wiki-reader-view/`, then moved into stable `wiki/` and `scripts/render-wiki.mjs` after evaluation.

The POM Project Reader has been promoted from `experiments/wiki-agent-orchestration/mini-ui/` to stable tooling under `scripts/project-reader/`. It is a local server for project navigation, `rg` search, in-file search, responsive document reading, optional `pom.config.json`-based classification, and file-based annotations. Its lightweight contract is that the UI writes annotation JSON files and a coding agent reads, claims, and resolves those files from the repository, rather than the UI opening a direct AI-agent session or editing source files in the browser.

The self-improvement loop is promoted: it is the `improve` mode of `skills/method.md`, with `prompts/25-self-improvement-loop.md` as the canonical procedure for moving from observation to diagnosis, proposal, verification, and promotion or discard in any project that uses POM. POM Source is one application of that method: it uses POM to support and improve itself. The procedure must read local configuration and respect ownership mode, Source Authority, Artifact Policy, and existing conventions before proposing changes. The originating experiment, `experiments/self-improvement-loop/EXPERIMENT.md`, is closed and keeps the case log; the loop was proven on POM Source itself, and the skill-catalog consolidation folded the former `improve` alias into `method` so the loop does not overlap `extend` and `prune`.

The workflow modeling capability was developed in `experiments/workflow-modeling/` on branch `exp/workflow-modeling` and consolidated as POM v0.2.0 (SPEC-0006). The experiment is preserved at status `consolidated` and stays in repo as the historical record: scaffolding commit, three synchronous composition primitives (linear pipeline, state-invoke, event-invoke) with their fixtures, context injection design decision and implementation, the internal AI agent real-project validation (three-level invoke chain `operational → analyzer → clean-family-repair` plus the semantic-family pushed modeling), TypeScript and Python H4 evidences, suspend/restore evidences across processes, Mermaid generation integrated in the validator, XState mapping, and the final consolidation commit. The promotion path declared in SPEC-0006 was applied to move spec / ADR / skill / prompt / templates / scripts / docs to their canonical paths on `main` while the candidate folders remain untouched under `experiments/workflow-modeling/`.

The workflow modeling capability composes with `skills/spike.md`: a target project that wants to evaluate a candidate workflow before promoting it can keep the YAML under `experiments/<topic>/workflows-candidate/`, run the validator and the Mermaid generator on the candidate path, and promote the file to `workflows/<name>.yaml` only after the experiment closes. The two skills work together: `skills/spike.md` defines isolation discipline; `skills/workflow.md` defines modeling discipline within the experiment. The workflow-modeling experiment itself is the worked case study: a new POM capability moving from spike to method, with the candidate folders preserved as the historical record. See `templates/WORKFLOW_INTEGRATION_GUIDE.md` section "As a temporary experiment before promotion" for the detailed pattern.

## Details

Promotion paths should stay intentionally modest:

| Candidate Outcome | Meaning |
|---|---|
| Discard | Delete or abandon the experiment branch and keep only the lesson learned. |
| Archive synthesis | Write a concise analysis note if the idea is useful but not ready. |
| Promote wiki | Move selected pages into a stable root `wiki/` after approval. |
| Promote reader | Reimplement a small static renderer under stable `scripts/` after approval. |
| Promote Project Reader | Completed for the lightweight file-based reader: stable code now lives under `scripts/project-reader/`. |
| Promote workflow modeling | Completed as POM v0.2.0 (SPEC-0006): spec, ADR-0002, skill `workflow`, prompt 27, templates, scripts (`lint-workflows.mjs`, `mermaid.mjs`, `to-mermaid.mjs`, `to-xstate.mjs`), and the XState compatibility doc moved to canonical paths. Experiment folder preserved at status `consolidated`. |
| Promote self-improvement loop | Completed: the loop is the `improve` mode of `skills/method.md` with `prompts/25-self-improvement-loop.md` as canonical prompt. A cross-project case remains a useful follow-up but is no longer a gate. |
| Create spec or ADR | Use if reader generation changes POM structure or source authority. |

Further evaluation should focus on consultation quality: whether the reader helps someone understand POM faster without creating a second source of truth. LLM-powered querying remains a separate experiment because it introduces provider configuration, privacy considerations, and write-approval rules.

## Sources

| Source | Use |
|---|---|
| `skills/spike.md` | Experiment isolation and consolidation rules. |
| `prompts/09-run-temporary-experiment.md` | Full temporary experiment workflow. |
| `skills/method.md` | Smallest-level extension rule (`extend` mode), bounded improvement loop (`improve`), and method-weight reduction (`prune`). |
| `prompts/12-extend-pom.md` | Controlled POM extension workflow. |
| `README.md` | Extending POM and temporary experiment rules. |
| `scripts/project-reader/README.md` | Local POM Project Reader launch, search, and annotation workflow. |
| `scripts/project-reader/document-sources.mjs` | Project Reader document allowlist and optional POM config classification. |
| `scripts/project-reader/wiki-tools.mjs` | File-based annotation CLI and `rg` search implementation. |
| `prompts/25-self-improvement-loop.md` | Canonical procedure for the loop. |
| `experiments/self-improvement-loop/EXPERIMENT.md` | Evaluation evidence and case logs for the loop. |

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
| Should LLM query and page creation be a separate second spike? | Yes; it remains outside the promoted Project Reader. |
| Should the self-improvement loop remain a stable prompt and skill? | Answered: yes, as the `improve` mode of `method`; a case on another POM-managed project would strengthen the evidence but is not required. |

## Related Links

- [[wiki-method]]
- [[templates-and-governance]]
- [[current-specs]]
