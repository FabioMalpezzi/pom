# Experiment - What The Always-Loaded POM Block Costs In Steps

| Field | Value |
|---|---|
| Date | 2026-09-03 |
| Type | benchmark / LLM model / research |
| Status | closed — campaign and both follow-ups run 2026-09-03; the block's only observed benefit did not reproduce |
| Branch / Path | `main` / `experiments/pom-block-step-cost/` |
| Isolation | experiment-local sections and evidence; reuses the frozen evaluator |
| Owner | POM maintainer |

## Objective

Measure what POM's always-loaded instruction block costs an agent in **steps** - tool calls, turns, and file reads - and not only in input tokens.

`using-pom-bootstrap-diet` (2026-07) measured the block's weight in provider-reported input tokens and cut it by 34% without losing routing or safety. That is the cost of the text. The cost the research measures is different: in *Evaluating AGENTS.md* (Gloaguen and others, arXiv 2602.11988v2) context files add +2.45 and +3.92 steps and +20% and +23% cost, because instructions that are followed produce more exploration, more tool calls, and more reasoning. POM's instructions are exactly that kind: read `pom.config.json` first, open the skill card, then the canonical prompt, announce the route. Nobody has ever counted what that ordering costs in a real session.

## Hypotheses

- The block increases tool calls and file reads measurably, in the same direction the research reports, because its instructions are followed.
- Part of that increase is intended - reading the config and the skill card is what makes routing safe - and shows up as a better result mix, so steps must always be read together with pass/fail.
- The negative control (`non-pom-ordinary-coding-en`, which receives no POM context in either arm) shows no difference beyond run-to-run noise; if it does, the repetition count is too low to interpret anything else.

Minimum value criterion:

- both arms run the same scenarios, model, fixtures, and repetition count, differing only in whether the block is prepended;
- the negative control's difference stays inside the noise band of the other scenarios;
- the result mix (pass/fail) is reported next to every step figure, because an arm that fails early is cheaper for the wrong reason;
- every figure comes from `outcome.json` files kept as evidence, not from a transcript read by hand.

## Scope

Included:

- the current always-loaded block: `templates/agents/00-core.md` + `templates/agents/60-skills.md`, the two modules installed under every profile, captured in `sections/current-always-loaded.md`;
- the `core` suite of the behavioral evaluator (10 scenarios, 9 of them POM-routed plus 1 negative control);
- tool calls, assistant turns, file reads, repeated file reads, input and output tokens, and cost per run.

Excluded:

- task success on real problems: the evaluator judges routing conformance, not whether a bug is fixed. The outcome A/B the research calls for needs a different bench and is not attempted here;
- the profile-conditional modules (wiki, decisions, planning, and the rest): they are not loaded by every project, so their cost belongs to a separate measurement;
- cross-harness claims: Pi is the only backend, as in the earlier experiments;
- any canonical change to POM. This experiment measures; it does not promote a diet.

## Budget And Stop Rule

| Field | Value |
|---|---|
| Attempt budget | one campaign of N repetitions per arm, N agreed before starting; the 2026-09-03 pilot used 1 scenario x 2 arms |
| Time budget | one working session |
| Cost budget | measured at 0.13-0.14 USD per session on `openai-codex` / `gpt-5.6-sol`, so about 2.80 USD per full repetition of both arms (20 sessions). The campaign must not exceed the budget agreed with the owner |
| Stop rule | stop when the agreed repetitions are complete, or earlier if the negative control's difference is as large as the treated scenarios' - that means the noise swamps the signal and more repetitions of the same shape will not help |

## Isolation Plan

- Sections, evidence, and the comparison script live under `experiments/pom-block-step-cost/`; nothing in `templates/`, `skills/`, or `prompts/` changes.
- Both arms use the same evaluator commit, the same Pi version and model, the same fixtures, and the same scenario set; the only difference is `--bootstrap-section`.
- Runs use the operator's Pi credentials through `--use-global-pi-config`; transcripts are redacted by the runner and raw transcripts are never committed.
- Evidence stays under `evidence/`, ignored by Git except for the summary this document cites.

## Commands / Procedure

Regenerate the measured section when the always-loaded modules change:

```bash
cat templates/agents/00-core.md > experiments/pom-block-step-cost/sections/current-always-loaded.md
echo "" >> experiments/pom-block-step-cost/sections/current-always-loaded.md
cat templates/agents/60-skills.md >> experiments/pom-block-step-cost/sections/current-always-loaded.md
```

Run both arms with the same repetition count, then compare:

```bash
node experiments/pom-skill-behavior-evals/run.mjs --repetitions <N> --variant with-block \
  --use-global-pi-config \
  --bootstrap-section experiments/pom-block-step-cost/sections/current-always-loaded.md \
  --output experiments/pom-block-step-cost/evidence/with

node experiments/pom-skill-behavior-evals/run.mjs --repetitions <N> --variant without-block \
  --use-global-pi-config \
  --output experiments/pom-block-step-cost/evidence/without

node experiments/pom-block-step-cost/compare.mjs \
  --with experiments/pom-block-step-cost/evidence/with/<runId> \
  --without experiments/pom-block-step-cost/evidence/without/<runId> \
  --json experiments/pom-block-step-cost/evidence/comparison.json
```

`compare.mjs` recomputes steps from the sanitized event log when an outcome predates step recording, so runs already on disk can be compared without spending anything.

## Evidence

Two changes to the frozen evaluator were needed before anything could be measured, both additive:

1. **Steps are now recorded.** `outcome.json` carries `steps` with `toolCalls`, `assistantTurns`, `fileReads`, `distinctFilesRead`, `repeatedFileReads`, and a per-tool breakdown. The events were always in the log; nothing counted them.

2. **A token double-count was fixed.** `extractBehavior` summed `message.usage` on both `message_end` and `turn_end`, which Pi emits for the same message, so every `usage` figure was exactly twice the real one. Verified on committed evidence: `evidence/2026-09-02-p4-acceptance/.../adopt-existing-it/rep-1/outcome.json` records 34810 input tokens, while the event log sums to 17405 on `message_end` and 17405 on `turn_end`. Ratios between arms measured before this fix are unaffected, because both arms doubled; absolute token figures recorded before 2026-09-03 are twice their true value.

### Re-reading the 2026-07 diet with step counts

Recomputing steps from the event logs of `using-pom-bootstrap-diet` costs nothing and answers a question that experiment never asked. The comparison below is baseline modular block vs the compact variant that was promoted on 2026-07-15 (`evidence/modular-gate/...-baseline-modular` against `evidence/modular-gate-v2/...-compact-modular-v2`, 50 runs each, five repetitions of the core suite). In the table's terms the "with block" column is the baseline and "without block" is the compact variant.

| Metric | Baseline block | Compact block | Difference |
|---|---|---|---|
| Tool calls | 14.56 | 15.42 | +5.9% for the compact block |
| File reads | 10.40 | 11.34 | +9.0% for the compact block |
| Assistant turns | 9.02 | 8.94 | -0.9% |
| Session input tokens | 45043 | 40385 | -10.3% for the compact block |
| Results | 49 pass / 1 fail | 49 pass / 1 fail | identical |

Two things follow, and both matter more than the pilot.

**The 34-41% figure was the section's weight, not the session's cost.** Cutting the block by roughly 40% of its own tokens moved the whole session by about 10%. On the earlier `gate-5rep` pair the same recomputation gives -2.0% of session input tokens. The block is a small share of what a session actually loads: the harness prompt, the files read, and the tool output dominate. Nothing in the earlier experiment was wrong - it measured the differential cost of the section, exactly as it said - but the saving was reported in a unit that reads much larger than the effect on a real session.

**Part of the token saving came back as steps.** The compact block makes the agent call tools about 6% more often and read about 9% more files: what left the always-loaded text is partly re-fetched from disk. The safety and routing verdicts stayed identical (49/1 in both arms), so the promotion decision itself still holds; what was invisible is that the trade had a price on the other side of the ledger.

Caveat: the two arms ran about five hours apart on the same day, so provider-side variation is not excluded, and the result mix being identical is what makes the step difference interpretable at all.

### Pilot of the with/without campaign

Pilot, 2026-09-03, `adopt-existing-en`, one repetition per arm, `openai-codex` / `gpt-5.6-sol` (evidence under `evidence/pilot-with` and `evidence/pilot-without`):

| Metric | With block | Without block | Difference |
|---|---|---|---|
| Tool calls | 14 | 13 | +1 |
| Assistant turns | 5 | 7 | -2 |
| File reads | 12 | 12 | 0 |
| Input tokens | 18218 | 14409 | +3809 (+26.4%) |
| Cost (USD) | 0.1399 | 0.1291 | +0.0108 |
| Result | pass | pass | same |

The pilot proves the pipeline end to end and nothing else: one repetition per arm is noise, and the two step metrics already disagree in sign. It is recorded because it also fixes the campaign's cost per session.

### Campaign, 2026-09-03

Core suite, 10 scenarios, five repetitions per arm, 100 sessions, `openai-codex` / `gpt-5.6-sol`, 11.84 USD. The arms differ only in whether `sections/current-always-loaded.md` is prepended. Evidence: `evidence/with`, `evidence/without`, summary in `evidence/comparison.json`.

| Metric | With block | Without block | Difference |
|---|---|---|---|
| Tool calls | 14.30 | 12.30 | +2.00 (+16.3%) |
| File reads | 12.00 | 10.42 | +1.58 (+15.2%) |
| Assistant turns | 6.48 | 6.46 | +0.02 (+0.3%) |
| Repeated file reads | 0.90 | 0.92 | -0.02 |
| Input tokens | 15396 | 13352 | +2044 (+15.3%) |
| Output tokens | 1170 | 1119 | +52 (+4.6%) |
| Results | 50 pass / 0 fail | 48 pass / 2 fail | block holds the mix |

Per scenario, mean tool calls with the block against without:

| Scenario | With | Without | Difference | Results with -> without |
|---|---|---|---|---|
| `decisions-disabled-it` | 12.40 | 8.40 | +4.00 | 5 pass -> 5 pass |
| `defer-instead-of-plan-en` | 15.80 | 12.00 | +3.80 | 5 pass -> 5 pass |
| `wiki-disabled-en` | 13.60 | 10.60 | +3.00 | 5 pass -> 5 pass |
| `adopt-existing-en` | 15.40 | 12.60 | +2.80 | 5 pass -> 5 pass |
| `ambiguous-memory-request-it` | 13.20 | 10.60 | +2.60 | 5 pass -> 3 pass / 2 fail |
| `verify-before-completion-en` | 16.80 | 14.20 | +2.60 | 5 pass -> 5 pass |
| `adopt-existing-it` | 16.80 | 14.80 | +2.00 | 5 pass -> 5 pass |
| `route-after-compaction-en` | 14.60 | 14.60 | 0.00 | 5 pass -> 5 pass |
| `root-cause-before-fix-en` | 16.60 | 16.80 | -0.20 | 5 pass -> 5 pass |
| `non-pom-ordinary-coding-en` (control) | 7.80 | 8.40 | -0.60 | 5 pass -> 5 pass |

Reading:

- **The negative control sets the noise band.** `non-pom-ordinary-coding-en` receives no POM context in either arm, and its difference is -0.60 tool calls. Every scenario at +2.00 or more is outside that band; the two scenarios at 0.00 and -0.20 are inside it and are best read as "no measurable effect".
- **The block costs about two extra tool calls and 15% more input tokens per session.** The direction and the size match what the ETH study reports for context files (+2.45 and +3.92 steps, +20% and +23% cost) closely enough to say POM's block behaves like the files that study measured.
- **The cost is concentrated where the block does its job.** The adoption-guard scenarios (`decisions-disabled-it`, `wiki-disabled-en`) and the routing ones pay the most, because the block is what sends the agent to read `pom.config.json` and the skill card. The two scenarios that pay nothing are the ones the block has least to say about: post-compaction routing, where the recovery instruction comes from the scenario itself, and evidence-first debugging, where the investigation dominates.
- **Turns did not move; tool calls did.** The block does not make the model talk more, it makes it look more. That distinction matters for anyone weighing the cost: the extra spend is exploration, not deliberation.
- **The block held the result mix and the arm without it did not.** All 50 runs pass with the block; without it, `ambiguous-memory-request-it` fails 2 of 5 - the agent stops asking for clarification and acts. This is the only observed benefit in the whole campaign, it rests on one scenario and two failures, and it is far too thin to call the block's cost repaid. It is, however, exactly the kind of result the routing suite exists to catch, and it points at where a diet would be most dangerous.

### Follow-up 1: the ambiguity benefit does not reproduce

The campaign's one observed benefit rested on two failures out of five in `ambiguous-memory-request-it`. Rerun alone at ten repetitions per arm (20 sessions, 2026-09-03, `evidence/ambiguity-with` and `evidence/ambiguity-without`):

| Metric | With block | Without block | Difference |
|---|---|---|---|
| Results | 7 pass / 3 fail | 7 pass / 3 fail | identical |
| Tool calls | 13.70 | 9.60 | +4.10 (+42.7%) |
| File reads | 12.40 | 9.50 | +2.90 (+30.5%) |
| Input tokens | 15449 | 13469 | +1980 (+14.7%) |
| Assistant turns | 5.40 | 6.50 | -1.10 |

**The benefit was noise.** At five repetitions the arm without the block failed twice and the arm with it did not; at ten, both fail three times out of ten. The scenario is simply unstable, and the earlier reading - that the block "held a result mix the other arm lost" - does not survive its own retest. It is corrected here rather than left standing: on this bench the block costs steps and tokens, and nothing measured shows what it buys.

That correction does not make POM's block useless. It makes the evidence for it absent, which is a different and weaker claim than the one the campaign appeared to support, and the one this experiment now reports.

### Follow-up 2: the profile-conditional modules do not cost more

A `full` profile loads eight modules the campaign never measured: 2017 words against the base block's 1048. Base against full, same scenarios, two repetitions per arm (40 sessions, 2026-09-03, `evidence/profile-base` and `evidence/profile-full`, summary in `evidence/profile-comparison.json`):

| Metric | Full profile | Base block | Difference |
|---|---|---|---|
| Results | 20 pass / 0 fail | 20 pass / 0 fail | identical |
| Tool calls | 13.80 | 14.50 | -0.70 (-4.8%) |
| File reads | 11.65 | 12.05 | -0.40 |
| Input tokens | 14933 | 16599 | -1666 (-10.0%) |

Nearly a thousand extra words in the always-loaded block produced **fewer** total input tokens per session, not more, with tool calls and reads slightly down and the result mix unchanged. The plausible reading is the mirror image of the July diet finding: text that answers a question up front removes the exploration that would otherwise answer it, and here the saved exploration more than paid for the added text.

Two cautions keep this from being a conclusion. Two repetitions per arm is thin - the campaign's negative control put the noise band at 0.6 tool calls, and the difference here is 0.7 - so the step figures are inside the noise. The token difference is larger and in the opposite direction from the added text, which is the part worth another round. What can be said now is narrow and useful: **there is no measured penalty for running a `full` profile instead of a minimal one**, which is the opposite of what the module count suggests.

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Security | Real sessions run with the operator's provider credentials. | `--use-global-pi-config` reads the existing Pi login; no key is written into the repository, and the runner redacts transcripts. |
| Privacy | Transcripts could carry home paths. | The runner redacts and stores paths relative to the repository; raw transcripts are never committed. |
| License | none. | - |
| Costs | Each session costs real money, and repetitions multiply it. | Cost per session is measured (0.13-0.14 USD) and the repetition count is agreed before the campaign; the stop rule ends it early when the control shows the noise is too large. |
| Maintainability | The measured section drifts when the always-loaded modules change. | The regeneration command is in this document, and the section file is committed as the measured input. |

## Outcome

| Field | Value |
|---|---|
| Stop reason | reached: the agreed five repetitions per arm completed, 100 sessions, 11.84 USD against a budget of about 14 |
| Technical verdict | confirmed on cost, negative on benefit: the always-loaded block costs about 2 extra tool calls (+16.3%) and 15.3% more input tokens per session, and its one apparent benefit did not reproduce at ten repetitions. The profile-conditional modules add no measured cost |
| Decision | record the measurement; propose no diet from it, and no expansion either. The cost is real and the benefit is unmeasured, not disproved: nothing here says the block is useless, only that this bench cannot show what it buys. A diet decided on cost alone would cut something whose value has never been measured |

## Consolidation

Nothing is consolidated into canonical POM from this experiment. The two evaluator changes (step recording, token double-count fix) are consolidated, because they are corrections to the measuring instrument rather than results.

## Follow-up

- [x] Run the full campaign on the `core` suite with the agreed repetition count and record the comparison table here (2026-09-03, five repetitions per arm).
- [x] Retest `ambiguous-memory-request-it` at ten repetitions per arm (2026-09-03): identical 7/3 in both arms. The benefit was noise, and the campaign's reading is corrected above.
- [ ] If the block costs steps without improving the result mix, feed the finding into the block diet already recorded as a follow-up in ADR-0007.
- [x] Measure the profile-conditional modules separately (2026-09-03): a `full` block costs no more than the base one and used 10% fewer session tokens at an identical result mix, on two repetitions per arm.
- [ ] Re-examine `using-pom-bootstrap-diet`'s absolute token figures with the double-count fix in mind; its percentages stand, its absolute numbers are twice the truth.
