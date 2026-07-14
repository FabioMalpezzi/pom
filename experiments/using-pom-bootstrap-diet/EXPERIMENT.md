# Experiment - Measured `using-pom` Bootstrap Reduction

| Field | Value |
|---|---|
| Date | 2026-07-13 |
| Type | benchmark / LLM model / research |
| Status | under evaluation |
| Branch / Path | `exp/pom-skill-evolution` / `experiments/using-pom-bootstrap-diet/` |
| Isolation | branch + experiment-only bootstrap variants |
| Owner | POM maintainer |

## Objective

Find whether POM can reduce the context cost of `using-pom` while preserving routing, Source Authority, adoption-profile guards, experiment discipline, and post-compaction recovery. No canonical bootstrap file changes until the real behavioral baseline is frozen.

## Hypotheses

- Moving generic harness mappings and detailed routing explanations out of the always-loaded path can reduce provider-reported input tokens by at least 30%.
- A compact router plus progressive disclosure can match baseline performance on every critical safety scenario.
- A generated trigger index may improve discovery, but must be rejected if generation drift or extra context outweighs its benefit.

Minimum value criterion:

- at least two candidate shapes are compared against the current baseline under identical Pi/model/scenario conditions;
- critical safety pass rate remains 100%;
- accepted candidate reduces differential input tokens by at least 30%;
- every behavior difference is manually classified.

## Scope

Included:

- `skills/using-pom.md`;
- `prompts/32-using-pom.md`;
- installed POM instruction sections and harness reference only as they affect the loading path;
- baseline, compact-router, and compact-router-with-index variants;
- words/characters as diagnostics and provider usage as the decision metric.

Excluded:

- shortening unrelated POM skills;
- changing adoption semantics;
- replacing canonical prompts with frontmatter summaries;
- claiming cross-harness savings from Pi-only measurements;
- canonical edits before approval.

## Isolation Plan

- Branch or worktree: `exp/pom-skill-evolution` in the current checkout.
- Temporary path: variant packages and session fixtures generated into temporary directories.
- Dependency isolation: consume the behavioral evaluator; add no root runtime dependency.
- Environment/config isolation: same Pi version, model, fixture, temperature/defaults, and repetition count for every arm.
- Service/data isolation: synthetic fixtures only.
- Import/build guardrail: stable skills and prompts never import or reference experiment variants.

## Commands / Procedure

Planned procedure:

```bash
node experiments/using-pom-bootstrap-diet/measure-static.mjs
node experiments/pom-skill-behavior-evals/run.mjs --backend pi --variant baseline --suite core --repetitions 5
node experiments/pom-skill-behavior-evals/run.mjs --backend pi --variant compact-router --suite core --repetitions 5
node experiments/pom-skill-behavior-evals/run.mjs --backend pi --variant compact-router-index --suite core --repetitions 5
```

1. map always-loaded and progressively loaded bootstrap content;
2. record current static size and differential provider input usage;
3. identify duplicated content and critical tested clauses;
4. author candidates only under this experiment;
5. run the same behavioral matrix for every arm;
6. challenge the winning thesis before asking for promotion.

## Evidence

Baseline before candidate authoring:

- `skills/using-pom.md`: 230 words measured on 2026-07-13;
- `prompts/32-using-pom.md`: 982 words measured on 2026-07-13;
- `prompts/references/agent-harnesses.md`: 684 words measured on 2026-07-13;
- installed instruction templates repeat part of the routing contract;
- actual differential provider usage remains to be measured by the behavioral evaluator.

Static loading-path inventory (P2A.1, measured 2026-07-14):

- Always-loaded section injected into the target `AGENTS.md`: `templates/AGENTS_POM_SECTION_TEMPLATE.md` = 1241 words / 8002 chars, with headings Language Policy, Global Rules And Skills, Installed Layout, Source Authority, Agent Work Principles, Evidence Discipline, Git And History, POM Commands, Adoption Profile, POM Skills.
- Always-loaded skill card (when the harness preloads the router): `skills/using-pom.md` = 230 words / 1462 chars.
- Progressive, read only after routing: `prompts/32-using-pom.md` (982 words), `skills/README.md` (881 words / 6879 chars, the catalog), and the selected skill card.
- Always-loaded total ≈ 1471 words; the ≥30% reduction gate applies to this always-loaded path, not the progressively read prompts.
- Candidate duplication targets (routing/adoption-guard/tool-mapping content repeated between the AGENTS section, `using-pom.md`, and `prompts/32-using-pom.md`) remain to be diffed line by line before authoring variants.
- Differential provider input-token measurement still requires evaluator sessions and depends on the frozen behavior baseline in `experiments/pom-skill-behavior-evals/`.

Planned evidence:

- static component inventory;
- per-run usage summaries;
- pass/fail matrix by scenario and repetition;
- manual classification of all differences;
- thesis/antithesis conclusion.

## Falsification And Promotion Gate

Reject a candidate if:

- any critical adoption or action-ordering scenario fails;
- the candidate adds more than one non-critical failure across the complete core matrix compared with baseline;
- measured input-token reduction is below 30%;
- savings depend on omitting information that later has to be reloaded more expensively;
- generated discovery data can become stale without a deterministic check.

Promotion requires a frozen baseline, five repetitions per critical scenario, 100% critical safety, measured reduction, independent review, and explicit user approval.

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Security | Shortening removes a guard against unsafe writes | Critical misuse scenarios must pass 100% |
| Privacy | Usage evidence contains full prompts | Commit aggregate metrics and sanitized excerpts only |
| License | Candidate copies Superpowers wording | Re-derive POM wording from POM domain requirements |
| Costs | Three full arms are expensive | Dry-run and known-bad validation first; freeze suite before runs |
| Maintainability | Generated index introduces another source of truth | Generate from frontmatter and reject without drift tests |
| Validity | Token attribution is inaccurate | Differential sessions identical except bootstrap variant |

## Outcome

Decision: pending; candidate authoring is blocked until the behavioral evaluator baseline is frozen.

Promotion path:

- clean reimplementation in canonical skill, prompt, templates, and references;
- update structural tests and behavior scenarios together;
- no direct move of experiment files into stable source.

## Consolidation

| Artifact | Destination | Action |
|---|---|---|
| Winning router wording | `skills/using-pom.md`, `prompts/32-using-pom.md` | clean reimplementation after approval |
| Stable size/structure checks | `tests/skill-bootstrap/` | selective promotion |
| Behavioral regression scenarios | accepted eval location | selective promotion |

## Follow-up

- [ ] Wait for the P1 behavioral baseline.
- [ ] Build the static loading-path inventory.
- [ ] Author two experiment-only candidates.
- [ ] Run comparative behavior and usage measurements.
