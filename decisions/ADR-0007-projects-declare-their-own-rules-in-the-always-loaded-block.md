# ADR-0007 - Projects Declare Their Own Rules In The Always-Loaded Block

| Field | Value |
|---|---|
| Date | 2026-09-03 |
| Status | Accepted |
| Category | governance |
| Area | agent instructions |
| Summary | The generated POM section is generic in every repository; a target now declares its own conventions, non-functional requirements, and prohibitions in `PROJECT_RULES.md`, which the installer folds into that section on every install and update, and `pom:lint` reports while it stays undeclared |
| Replaces | none |
| Replaced by | none |
| Driver | external evidence |
| Scope | installer / lint / agent instructions |

## Context

Gloaguen, Mundler, Muller, Raychev and Vechev measured whether repository-level context files help coding agents (*Evaluating AGENTS.md*, arXiv 2602.11988v2, ETH Zurich and LogicStar), on SWE-bench and on CtxBench, a bench of 138 problems from 12 repositories that have a developer-written context file. Model-generated files do not improve task success (-0.5% and -2%, p = 0.87 and 0.37). Developer-written files give +2.4%, not significant on its own (p = 0.21), but they beat generated ones by a significant margin (p = 0.038). Every context file costs: +2.45 and +3.92 steps, +20% and +23% cost, p < 0.001%. Repository overviews specifically do not reduce the steps an agent needs to reach the right files, while instructions are followed - which is what makes them expensive. The authors close by recommending that a human-written file carry only the instructions an agent needs and cannot find in the README: local conventions and non-functional requirements.

POM already avoids the worst finding: the always-loaded block does not describe the code, it states source authority, evidence discipline, and routing, and it is assembled per adoption profile in `assembleAgentsTemplate`, so a minimal project loads two modules and a full project ten. What it did not have is anywhere for the content the research credits. The installed block is generic - the same text in every repository - and POM never asked a project for its own rules. Measured on a target project on 2026-09-03: 2007 words of generic POM block against 962 words of project rules the user had written by hand under the closing marker. That project has four instruction targets. Two of them, `AGENTS.md` and `CLAUDE.md`, carry the rules because `CLAUDE.md` is a symbolic link to `AGENTS.md` - the project had solved the problem for that pair by hand, outside POM. The other two, `.github/copilot-instructions.md` and `.github/instructions/pom.instructions.md`, had none of those rules. The general case was unsolved, and the part that was solved depended on a link a reader has to know about.

Everything between `<!-- POM:START -->` and `<!-- POM:END -->` is rewritten on every install and on every `pom:update`, including the `refresh` profile, so project rules cannot live inside the markers. Kept in a separate file that the block merely points at, they would cost the extra read the same research counts against context files.

## Decision

A target project declares its own rules in `PROJECT_RULES.md` at its root, seeded by the installer from `templates/PROJECT_RULES_TEMPLATE.md`, and the installer injects that file's content as the final `Project Rules` section of the block it writes into every agent instruction target.

- The template asks for three things - conventions that cannot be inferred from the code, non-functional requirements, and what must not happen without a decision - and says in its guidance not to write a repository overview or anything the README, the code, or the tests already state.
- Guidance lives in HTML comments, which the injection strips; the file's `#` title is dropped and its headings are demoted so they nest under the injected section. A file that still holds only the scaffold declares nothing and injects nothing.
- `pom:lint` reports, at the configurable `projectRules.severity`: `project-rules-missing`, `project-rules-undeclared` while the file is still the scaffold, `project-rules-not-injected` when the declared rules have not reached an instruction file that carries the POM markers, and `project-rules-too-long` above `projectRules.maxWords` (400 by default).
- An `external_overlay` installation seeds nothing and the lint stays silent, because POM must not add files to a repository it does not govern. The POM Source repository is skipped like the other source-only checks.
- The block itself gains a short `Project Rules Source` paragraph naming the file and stating that the markers are regenerated.

## Rationale

The injection is what makes the arrangement worth its lines. One editable file keeps a single source no matter how many instruction targets a project has, while the rules themselves sit inside the block the harness already loads, so they cost no extra read and cannot drift between `AGENTS.md`, `CLAUDE.md`, and the tool-specific rule files. That is precisely the duplication measured on the target project.

The change adds the one kind of content with a measured advantage without adding generic text: an undeclared file injects nothing, so a project that has no such rules pays nothing. It also gives the word budget a defensible purpose - the block is loaded every session, so a project that writes explanations there is told to move them into docs, the wiki, or a skill.

It stays inside POM's constraints. The checks are deterministic, need no model, run in the lint projects already have in their pre-commit hook, and are warnings by default: POM recommends and reports, the project decides.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Keep the rules in a separate file that the block only points at | The agent must then read a second file before acting, which is the step cost the same research attributes to context files. Injection puts the text where the harness already loads it. |
| Seed a marked region inside each instruction file and never rewrite it | With several instruction targets the project must keep N hand-written copies aligned. A symbolic link solves it for a pair of root files, as the measured target had done, and solves nothing for the files under `.github/`, which had none of the rules. |
| Let projects keep writing their rules outside the POM markers, as they can today | It works for one file, and for a second only if someone links it; it silently fails for the rest. Nothing prompts a project to declare the rules, and nothing reports that a target is missing them. That is the state this ADR changes. |
| Make the findings errors | POM recommends for the target and does not impose. A project with no rules of its own is a legitimate state; a warning names it without blocking the commit. |
| Ask for a full non-functional requirements document | *Agent READMEs* (arXiv 2511.12884, 2303 context files) shows security and performance are written in about 15% of files; a heavyweight artifact would be skipped. Three short headings in a file the installer already seeds is what fits the always-loaded block. |

## Impacts

| Area | Impact |
|---|---|
| Wiki | `wiki/overview.md` re-verified against the changed README. |
| Docs | README section "Project Rules", the POM Minimal layout, the folder table, `docs/installation.md` (what the bootstrap does, agent instruction targets, structure after installation), `pom:help` in both languages. |
| Mockup | none. |
| Analysis | none. |
| Product | Every target gains `PROJECT_RULES.md` on its next `pom:update`, and one lint warning until it declares rules or the project sets `projectRules.severity`. Overlay installations are unaffected. |
| Technical | New `scripts/lib/project-rules.ts` (single definition of the file, the empty test, and the injected section) and `scripts/lib/lint-project-rules.ts`; `assembleAgentsTemplate` and the install flow in `scripts/install-pom.ts`; `projectRules` in `lint-config.ts` and the config template; `PROJECT_RULES.md` added to the allowed root Markdown; `templates/agents/00-core.md` and the monolithic fallback. |

## Links

- Wiki: `wiki/overview.md`
- Analysis: none (the source comparison lives in the Improve and Manage project, `analysis/contenuti/preparazione/project-operating-memory/pom-e-la-ricerca.md`)
- Mockup: none
- Docs: `README.md` (Project Rules), `docs/installation.md`, `skills/seed.md`, `skills/adopt.md`, `templates/PROJECT_RULES_TEMPLATE.md`
- Tests: `tests/installer/integration/test-project-rules.mjs`

## Follow-up

- [x] Implement the seeding, the injection, and the lint with integration tests.
- [ ] Declare `PROJECT_RULES.md` on the target projects that already run POM, starting from the rules they wrote by hand outside the markers.
- [x] Measure what the always-loaded block costs in steps, not only in tokens (done 2026-09-03, `experiments/pom-block-step-cost/`): +2.00 tool calls (+16.3%) and +15.3% input tokens per session over 100 real sessions, turns unchanged, against a control noise band of 0.6 tool calls. The block held the result mix the arm without it lost on the ambiguity scenario.
- [ ] Decide separately whether POM should attempt the outcome A/B the research calls for - identical tasks with and without POM, scored on success. The existing evaluator judges routing conformance, not task success, so this needs a new bench.

## Completion Verification

This ADR cannot be marked Accepted without passing semantic validation. Verification is mandatory and automatic.

### Step 0 — Goal-backward check (always first)

- [x] What must be TRUE for this decision to be valid?
  - An install seeds the file and injects nothing while it holds only the scaffold.
  - Declared rules reach every instruction target POM writes, with the guidance comments removed and the headings demoted.
  - The lint reports an undeclared file, a block that does not yet carry the declared rules, and a file over the word budget, and stays silent on an overlay installation and in the POM Source repository.
- [x] For each truth, does supporting evidence or reasoning EXIST? Yes: the 25 assertions of `tests/installer/integration/test-project-rules.mjs`, passing on 2026-09-03 inside a full suite of 2070 assertions with no failures, plus a manual end-to-end run in a sandbox target with two instruction files.

### Thesis (at least 1 required)

- Thesis 1: On the target project measured in Context, the 962 words of project rules reached two of the four instruction targets, and only because `CLAUDE.md` is a symbolic link to `AGENTS.md`; the two files under `.github/` had none of them. Moving those rules into `PROJECT_RULES.md` and running `npm run pom:update` puts them in all four generated blocks from one source, with no link to remember, and any later edit propagates on the next update. The lint names any target where that propagation has not happened. Verified on 2026-09-03: after the move, all four files carry the rules.

### Antithesis (at least 1 required — each must be confuted)

| Antithesis | Confutation |
|---|---|
| The research shows that context files do not improve task success and cost 20% more steps, so POM should shrink the block, not add a section to it. | The section is empty until a project declares something, so it adds nothing by default. What it adds when filled is the only content the same study credits with a measured advantage over generated files. Shrinking the generic part is a separate and still open piece of work, recorded as follow-up. |
| Injecting a project file into generated blocks means the same text is stored in several places, which is the duplication POM tells projects to avoid. | The duplication already existed and was manual; here it is generated from one source and rewritten on every install, like the ADR index and the wiki generated blocks. The rule POM states is not to restate by hand what has an authoritative source, and the authoritative source is now explicit. |
| A word budget on someone else's project rules is POM imposing style on a target. | It is a warning with a configurable threshold, and it defends a real constraint: the file is loaded in every session. A project that wants a longer file raises `projectRules.maxWords` in its own config. |
| The measured evidence comes from single-session benches on other agents, so it does not transfer to POM. | It does not transfer as a verdict on POM's benefit, which is continuity across sessions and is measured by none of these benches. It transfers as a constraint on content: whatever POM loads always should be the part that changes what the agent does. This ADR acts on that constraint only, and leaves the outcome question open as an explicit follow-up rather than claiming it is answered. |

### Exception

If semantic validation is not possible, document the reason here and mark as "Accepted with exceptions":

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this decision changes substantially, create a new ADR that supersedes or replaces it instead of retroactively rewriting the decision.
