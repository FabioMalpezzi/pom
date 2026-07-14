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
- Differential provider input-token measurement still requires evaluator sessions and depends on the frozen behavior baseline in `experiments/pom-skill-behavior-evals/`.

Duplication diff (P2A.1, 2026-07-14) across the always-loaded AGENTS section, the router card, and the progressive prompt:

- Routing table lives in three places: the AGENTS section "Common routing" (19 rows, always loaded), `prompts/32-using-pom.md` "Routing signals" (22 rows, progressive), and `skills/README.md` (the catalog, progressive). The always-loaded 19-row table is the largest removable block; routing detail can load progressively via the router pointer + README.
- Skill-consultation rules are triplicated: AGENTS "POM Skills" (8 bullets, always loaded) ~= `using-pom.md` "Key Rules" (6 bullets) ~= prompt 32 "Before any POM action" (7 steps). The always-loaded 8 bullets can collapse to a 2-3 line pointer, with the detail kept in the router card and prompt.
- Adoption guard (critical safety) appears in AGENTS "Adoption Profile", `using-pom.md`, and prompt 32 step 6. Per the Global Constraint it must stay in one always-loaded canonical location; the AGENTS "Adoption Profile" block is that location and is retained verbatim.
- Tool/command mapping appears in AGENTS "POM Commands" plus a pointer, and again in prompt 32 "Harness tool mapping" and `prompts/references/agent-harnesses.md`. The always-loaded command detail can shrink to a `npm run pom:help` / harness-reference pointer.
- Removable-from-always-loaded (candidate): the 19-row routing table, the 8-bullet skill-consultation list, and most of the POM Commands prose. Retained-always-loaded (safety/identity/posture): project identity, Language Policy, Source Authority summary, Agent Work Principles, Evidence Discipline, Git rule, and the Adoption Profile guard.

Candidate variants authored for P2A (experiment-only, in `experiments/using-pom-bootstrap-diet/candidates/`, not installed): `agents-section-compact-router.md` — the always-loaded section trimmed to identity + posture + canonical adoption guard + a minimal router pointer, with routing detail deferred to the progressively-read `skills/README.md` and prompt.

Static reduction of the compact-router candidate (word count, supporting diagnostic only; the gate is measured input tokens): AGENTS section 1241 -> 709 words (-42.9%); always-loaded path (AGENTS + `using-pom.md` 230 words) 1471 -> 939 words (-36.2%), above the 30% target with margin. The candidate retains every safety guard exercised by the frozen behavioral suite: the verbatim Adoption Profile disabled-module guard, "read `using-pom.md` before the first POM action and after compaction", "read `pom.config.json` before governed artifacts", "route from `README.md`, not memory", and "descriptions are triggers only". Removed-from-always-loaded (now progressive): the 19-row routing table, the 8-bullet consultation list, and the POM Commands prose.

Token gate — provider-measured (P2A.3, 2026-07-14, Pi 0.80.6 default model, differential against an identical minimal prompt): control with no section = 2176 input tokens; baseline section = 5630 (section cost 3454 tokens); compact section = 4218 (section cost 2042 tokens). Measured bootstrap input-token reduction = (3454 - 2042) / 3454 = **40.9%**, above the 30% gate and higher than the word-count estimate because the removed routing/tool tables tokenize densely. The runner now supports `--bootstrap-section <path>` to prepend the always-loaded section for POM-context scenarios so both the token cost and the routing/safety effect are measured on real sessions.

Still open in P2A (require evaluator sessions): the behavioral comparison of baseline-section vs compact-router on the same model, scenarios, and repetitions (critical-safety must not regress; run under the negation-aware `transcriptExcludes`); and an optional compact-router-plus-generated-index variant.

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
