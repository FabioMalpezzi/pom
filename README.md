# POM - Project Operating Memory

**POM** is a lightweight method for keeping a project's operating memory alive by connecting sources, code, mockups, wiki pages, decisions, verifiable tasks, roadmap context, and official documentation.

POM is designed to be reused on new or existing projects. It does not impose a single application structure and does not assume that every project has mockups, source code, tests, or official docs.

Version: `0.1.0`

## Credits

POM - Project Operating Memory is created and maintained by **Fabio Malpezzi**.

Website: <https://www.improveandmanage.com/>

Special thanks to **Andrej Karpathy** for the LLM Wiki pattern that inspired POM's persistent wiki approach.

## Quickstart

Use the smallest workflow that matches your situation:

| Situation | Start Here |
|---|---|
| New project | `skills/seed.md` |
| Existing project | `skills/adopt.md` |
| Resume after a pause | `skills/pulse.md` |
| Ask or maintain the wiki | `skills/wiki.md` |
| Extend POM | `skills/extend.md` |

### How to talk to the agent

Once POM is installed, tell the agent what you need. The agent reads the skill card, then the linked prompt, then the relevant templates.

```text
# Bootstrap a new project
Read pom/skills/seed.md and set up POM for this project.

# Build the wiki from existing sources
Read pom/skills/wiki.md in build mode and create the wiki.

# Resume after a pause
Read pom/skills/pulse.md and update PROJECT_STATE.md.

# Turn a spec into tasks
Read pom/skills/plan.md and create a task plan from specs/my-feature.md.

# End-of-session handoff
Read pom/skills/handoff.md and update the project state.
```

See `examples/agent-conversations.md` for more detailed interaction examples.

## Installation

**Requirements:** Node.js ≥22.6 (for TypeScript script execution via `--experimental-strip-types`). Git required.

### Quick install (recommended)

Download and run the bootstrap script from the target project root:

```bash
curl -fsSL https://raw.githubusercontent.com/FabioMalpezzi/pom/main/bootstrap-pom.mjs -o bootstrap-pom.mjs
node bootstrap-pom.mjs
```

The bootstrap script:

- clones POM into `pom/` (or pulls if it already exists);
- runs the interactive installer;
- lets you choose an adoption profile (minimal, wiki, decisions, full, adopt, refresh, custom);
- updates the POM section in every existing supported agent instruction file, or creates `AGENTS.md` if none exists;
- creates `package.json` scripts, `pom.config.json`, and governance folders based on the chosen profile.
- installs or updates `.git/hooks/pre-commit` with POM checks when the project is a Git repository.

You can also pass a profile directly:

```bash
node bootstrap-pom.mjs --profile full
```

To refresh an existing POM installation from the target project root:

```bash
curl -fsSL https://raw.githubusercontent.com/FabioMalpezzi/pom/main/bootstrap-pom.mjs -o bootstrap-pom.mjs
node bootstrap-pom.mjs --profile refresh
```

Refresh updates `pom/`, the POM section in every existing supported agent instruction file, package scripts, and the pre-commit hook. It does not change `pom.config.json`, project documents, wiki, decisions, or project-owned templates outside `pom/`.

Supported instruction targets are deliberately conservative:

- existing root files: `AGENTS.md`, `AGENTS.MD`, `agents.md`, `CLAUDE.md`, `GEMINI.md`, `CONVENTIONS.md`, `.cursorrules`, `.clinerules`, `.windsurfrules`;
- existing nested files: `.github/copilot-instructions.md`, `.junie/guidelines.md`, `.junie/instructions.md`, `.junie/AGENTS.md`;
- existing rule folders, where POM creates or updates a dedicated file: `.claude/rules/pom.md`, `.github/instructions/pom.instructions.md`, `.cursor/rules/pom.mdc`, `.windsurf/rules/pom.md`, `.kiro/steering/pom.md`, `.continue/rules/pom.md`, `.roo/rules/pom.md`, `.clinerules/pom.md`.

POM does not create tool-specific folders just because the tool exists. It only writes into a tool-specific folder when that folder is already part of the project.

If you customized or translated templates, keep them outside `pom/` before refreshing, for example:

```text
project-templates/
  ADR_TEMPLATE.md
  WIKI_PAGE_TEMPLATE.md
  PROJECT_STATE_TEMPLATE.md
```

Then point `pom.config.json` to those project-owned templates:

```json
"templates": {
  "adr": "project-templates/ADR_TEMPLATE.md",
  "wikiPage": "project-templates/WIKI_PAGE_TEMPLATE.md",
  "projectState": "project-templates/PROJECT_STATE_TEMPLATE.md"
}
```

Template paths in `pom.config.json` are relative to the target project root, where `pom.config.json`, agent instruction files, `package.json`, and `pom/` live. For example, `project-templates/ADR_TEMPLATE.md` means `<project-root>/project-templates/ADR_TEMPLATE.md`, not `<project-root>/pom/project-templates/ADR_TEMPLATE.md`.

Do not customize files directly under `pom/`: updates may overwrite them or create Git conflicts.

The bootstrap itself requires only Node ≥20. The installer it launches requires Node ≥22.6.

### Manual install

**Important:** POM must live in a subfolder (typically `pom/`), not at the project root. Cloning POM directly into the root would overwrite the project's `README.md`, `AGENTS.MD`, and `package.json`, and break all internal path references.

```bash
# Option A: Git submodule (stays updatable)
git submodule add https://github.com/FabioMalpezzi/pom.git pom

# Option B: Simple copy
cp -r /path/to/pom ./pom
```

Then run the installer:

```bash
node --experimental-strip-types pom/scripts/install-pom.ts
```

### Project structure after installation

```text
my-project/
  pom/                  <- POM method (this repository)
    prompts/
    skills/
    templates/
    scripts/
  AGENTS.md             <- project agent instructions, when used (references pom/)
  CLAUDE.md             <- also updated when already present
  pom.config.json       <- project-specific config
  wiki/                 <- if wiki profile enabled
  decisions/            <- if decisions profile enabled
  ...
```

### Non-npm projects

If the project does not use npm, copy the POM section manually into every agent instruction file used by the project:

| Agent | Instructions file | What to do |
|---|---|---|
| OpenAI Codex | `AGENTS.md` | Copy `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md` into `AGENTS.md` |
| Claude Code | `CLAUDE.md` | Copy `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md` into `CLAUDE.md` |
| Gemini | `GEMINI.md` | Copy `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md` into `GEMINI.md` |
| GitHub Copilot | `.github/copilot-instructions.md` or `.github/instructions/pom.instructions.md` | Copy the template content into the project instructions |
| Cursor | `.cursor/rules/pom.mdc` or `.cursorrules` | Copy the template content into a project rule |
| Windsurf | `.windsurf/rules/pom.md`, `.windsurfrules`, or `AGENTS.md` | Copy the template content into a project rule |
| Kiro | `.kiro/steering/pom.md` | Copy the template content as a steering file |
| Junie | `.junie/AGENTS.md` or `.junie/guidelines.md` | Copy the template content into the project guidelines |
| Cline / Roo / Continue | tool-specific rules file or folder | Copy the template content into a POM-specific rule file |
| Other agents | Agent-specific config | Adapt the template to the agent's instructions format |

### Start working

Use the skill that matches your situation (see Quickstart table above). The agent will read the skill card, then the linked prompt, then the relevant templates.

### Pre-commit hook

When `.git/hooks/` exists, `pom:init` installs a managed POM block in `.git/hooks/pre-commit`.

The hook:

- runs `npm run pom:lint`;
- blocks the commit if lint fails;
- if `PROJECT_STATE.md` exists and governed project-memory files are staged, prints a non-blocking reminder to update it when the restart context changed.

The hook does not synthesize or rewrite `PROJECT_STATE.md`: that remains the agent's responsibility, because it requires project understanding.

Update `PROJECT_STATE.md` when the project restart context changes:

- substantial ADR change;
- substantial spec change;
- roadmap, priority, dependency, or current-plan change;
- important task/phase closed;
- new relevant risk, blocker, or open decision;
- explicit end-of-session or end-of-day handoff request.

Do not update it for typo fixes, regenerated indexes, small link fixes, or changes that do not affect how the next session should restart.

## Origin And Attribution

POM's wiki model is inspired by Andrej Karpathy's **LLM Wiki** pattern, published in the `karpathy/llm-wiki.md` gist:

```text
https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
```

The local reference copy of the method is in `WIKI_METHOD.md`.

The gist describes a Markdown wiki maintained incrementally by an LLM, with raw sources, wiki pages, an operating schema, ingest/query/lint operations, an index, and a log.

## Language Policy

POM is documented in English for portability.

When applying POM to a project, the agent must use the project/user language for:

- conversation;
- generated documentation;
- wiki pages;
- ADRs;
- task plans;
- project state;
- reports.

If the project already has a dominant documentation language, follow it. If the user asks for a different language, follow the user. If sources are multilingual, preserve source titles and quoted terms, but write synthesis in the project/user language.

## Installation Model

This repository has its own `AGENTS.MD`. That file governs work on the POM repository itself. Do not copy it verbatim into target projects.

For a target project, use `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md` as the source for the project's agent instructions. The installer updates every existing supported agent instruction target so different coding agents see the same POM rules. If none exists, it creates `AGENTS.md`.

Supported installation styles:

- copy POM into the target project as a `pom/` folder;
- add POM as a Git submodule or subtree under `pom/`;
- keep POM as an external reference and copy only the needed templates/prompts.

`pom/templates/POM_CONFIG_TEMPLATE.json` assumes the common installation style where POM lives in the target project as `pom/`, so template paths point to `pom/templates/...`. If you install POM somewhere else, adapt those paths in the target project's `pom.config.json`.

## Principle

POM does not use one universal source of truth. It uses source authority by domain:

| Question | Authoritative Source |
|---|---|
| What does the system currently do? | code and tests, when present |
| What do we currently know about the project? | `wiki/` |
| Why did we decide this? | `decisions/` |
| What analysis supports or challenges a choice? | `analysis/` |
| What does the intended experience show? | `mockups/`, when present |
| What can be shared as official documentation? | `docs/`, when present |
| Where do I restart after a pause? | `PROJECT_STATE.md` or current plan |

When sources diverge, the divergence must not be hidden. It must be made visible, analyzed, and resolved with a decision when needed.

## Git And History

POM assumes Git as an operational prerequisite when the project must be governed over time.

Rules:

- Git keeps fine-grained history for specs, ADRs, wiki pages, and code;
- do not duplicate detailed history inside ADRs, specs, or `PROJECT_STATE.md`;
- check `git status` before major reorganizations;
- if the project is not under Git, propose `git init` before applying POM structurally;
- after structural changes, run available lint/tests and create a descriptive commit.

### Branching Policy

Specs, task plans, ADRs, wiki pages, and other documentation can be committed directly to the main branch. They are governed documents, not executable code, and do not risk breaking the build.

Create a feature branch (`feat/<topic>`) only when the first task plan step modifies executable code, configuration, prompts consumed at runtime, or test fixtures. The branch isolates changes that could break the build or alter runtime behavior.

| Artifact | Branch needed? |
|---|---|
| Spec, task plan, ADR, wiki page, analysis | No — commit on main |
| Source code, runtime config, prompts, test fixtures | Yes — feature branch |
| Experiment or spike | Yes — `exp/<topic>` or temporary branch |

## ADR And Spec Changes

Specs are living documents: edit them directly and let Git keep fine-grained history.

ADRs represent decisions. If a decision changes substantially, do not simply rewrite the previous ADR. Create a new ADR that supersedes or replaces it, or update the existing ADR only when the change is administrative.

Rules:

- minor spec/ADR change: edit directly + Git;
- substantial spec change: update the spec and evaluate tasks/review;
- changed decision: create a new or replacement ADR;
- do not maintain manual changelogs inside specs/ADRs unless explicitly requested;
- every ADR should expose `Category` and `Area` in the opening metadata table;
- lint generates an ADR index from those metadata fields as a search/navigation view, not as a second source of truth;
- do not introduce workflow states in ADRs: if a document is in `decisions/`, it is a valid decision; replacements are handled through `Replaces` and `Replaced by`.

## Temporary Experiments

Experiments must remain separate from the stable codebase until evaluated. Use branch `exp/<topic>`, `/tmp`, or `experiments/<topic>/` depending on the case. Consolidate only after evaluation.

See `prompts/09-run-temporary-experiment.md` for the full workflow.

## Persistent Wiki

POM treats the wiki as a persistent, cumulative artifact, not a temporary RAG index. The agent should not rediscover everything from scratch on every question: it should maintain structured, interlinked, current knowledge.

Rules:

- the wiki contains the current synthesis, not the full history of decisions;
- sources, code, mockups, and analysis feed the wiki;
- `decisions/` keeps decision rationale and decision history;
- `wiki/index.md` is the content map;
- `wiki/log.md` is the append-only chronological register;
- a useful answer or analysis can become a new wiki page;
- every relevant update should check contradictions, stale claims, missing links, and orphan pages.

## Operating Cycle

```text
Inputs / Code / Mockups / Analysis / Conversation
        -> Wiki
        -> Decisions
        -> Delivery Plan
        -> Docs
        -> Project State
```

## POM Minimal

Small projects can start with a minimal POM setup. Mockups, official docs, structured tests, and extended lint are not required at the beginning.

Recommended minimum:

```text
agent instruction file or rule
PROJECT_STATE.md
wiki/index.md
wiki/log.md
decisions/
optional pom.config.json
```

Rules:

- use `skills/seed.md` for a new project or `skills/adopt.md` for an existing project;
- create only the directories that are actually useful;
- use `PROJECT_STATE.md` as restart memory;
- use `wiki/` only when there is knowledge worth maintaining over time;
- use ADRs only for decisions that change direction or constrain the project;
- add lint, mockups, docs, tests, or an extended roadmap when the project grows.

## Work Planning Hierarchy

The hierarchy is logical, not physical. It organizes work, not folders. Verification happens at every level, not only at the bottom.

For small projects, use the short form:

```text
Task       (closes with integration tests / single-feature E2E)
  -> Step  (closes with atomic verification: unit test, lint, check)
```

For larger or multi-stream projects, use the full hierarchy:

```text
Roadmap
  -> Phase          (closes with acceptance review)
    -> Workstream   (closes with cross-functional E2E / user-flow tests)
      -> Task       (closes with integration tests / single-feature E2E)
        -> Step     (closes with atomic verification: unit test, lint, check)
```

Place E2E and user-flow tests at Task or Workstream level, not at Step level. Step-level verification covers atomic checks only.

Use `Roadmap` only when the project needs multi-phase direction or coordination across multiple streams. Do not force all levels into small work items.

## Test Convention

POM proposes an optional test structure: `tests/<module-or-area>/{e2e,integration,fixtures,evidence}` and `tests/cross-system/`. It must not be imposed if the project already has a different convention. If the agent finds an existing structure, it must ask before changing anything.

Lint reads the `tests` section of `pom.config.json`. See `prompts/05-create-task-plan-from-spec.md` and `prompts/06-review-task-phase.md` for test planning and verification rules.

## Docs And Source Conventions

POM proposes `docs/` for official documentation and `src/` as the minimal source root, but existing projects should keep their real structure unless the user approves a change. Do not move documents or source files without approval.

Lint reads the `documentation` and `source` sections of `pom.config.json`. See `prompts/08-create-pom-config.md` for configuration details.

## POM Folders

| Folder | Contents |
|---|---|
| `WIKI_METHOD.md` | cited reference copy of the original LLM Wiki method |
| `prompts/` | reusable prompts for applying the method |
| `skills/` | short skill cards derived from the main POM prompts |
| `templates/` | reusable templates for project state, tasks, specs, ADRs, wiki, docs, experiments, and reconciliation |
| `scripts/` | installer and documentation lint |
| `examples/` | concrete examples of filled POM documents (ADR, PROJECT_STATE, wiki page) |

## POM Skills

POM skills are short operational aliases for the main prompts. They do not replace prompts: they help the agent choose the correct workflow.

| Skill | Prompt |
|---|---|
| `help` | skill selection and explanation |
| `seed` | bootstrap a new project |
| `adopt` | adopt POM in an existing project |
| `pulse` | project state |
| `guard` | governance and lint |
| `plan` | task plan |
| `check` | review/verification |
| `handoff` | session closeout |
| `config` | lint configuration |
| `spike` | temporary experiments |
| `wiki` | build, query, lightweight lint, and stale wiki maintenance |
| `extend` | controlled POM extension |

### Skill Usage Tracking

When the agent reads a skill card, it updates `pom.config.json` under `skillUsage` with a counter and timestamp. This provides lightweight observability on which skills are actually used and how often.

```json
{
  "skillUsage": {
    "wiki": { "count": 3, "lastUsed": "2026-05-01T18:30:00Z" },
    "plan": { "count": 1, "lastUsed": "2026-05-01T14:00:00Z" }
  }
}
```

The schema is extensible: additional fields can be added without breaking existing entries.

The same tracking applies to canonical prompts (`pom/prompts/*.md`) under `promptUsage`. This lets you see both which skills are invoked (entry points) and which prompts are actually executed (procedures).

## Extending POM

Use `skills/extend.md` when POM needs to be extended.

POM is extended by levels. First choose the smallest necessary level, avoiding turning a local adaptation into a general rule.

| Need | Where To Change |
|---|---|
| Adapt POM to a specific project | `pom.config.json` |
| Change governed document shape | `templates/` |
| Change an agent operating procedure | `prompts/` |
| Make a recurring workflow easy to invoke | `skills/` |
| Automate or enforce a rule | `scripts/lint-doc-governance.ts` or equivalent script |

Rules:

- modify `pom.config.json` for project-specific folders, categories, severities, tests, wiki, docs, source, or mockups;
- modify a template when the expected structure of ADRs, specs, task plans, wiki pages, docs, or manifests changes;
- add or modify a prompt when the way the agent works changes;
- add a skill only when the workflow becomes recurring and deserves a short alias;
- update lint when a rule should be verified without rereading the whole project;
- update `PROJECT_STATE.md` when the extension changes the operating method or restart context;
- after every extension, run `npm run pom:lint` when available.

## Lint Configuration

Documentation lint is optional and project-specific. POM provides conventions and a config template, but this repository does not require every target project to install a lint runtime.

The portable lint configuration lives in:

```text
pom/templates/POM_CONFIG_TEMPLATE.json
```

Each project can copy it to the repository root as:

```text
pom.config.json
```

Rules:

- the POM template must remain generic and portable;
- `pom.config.json` contains project-specific rules;
- `pom/templates/POM_CONFIG_TEMPLATE.json` assumes POM is installed in the target project as `pom/`;
- if POM is installed in a different path, adapt template paths before running lint;
- do not customize files directly under `pom/` for a target project, because POM updates may overwrite them or create Git conflicts;
- if a project needs localized or customized templates, place them outside `pom/`, for example in `project-templates/` or `templates/`, and point `pom.config.json.templates` to those files;
- lint should use conservative defaults when the config is missing;
- if the config exists but is invalid, lint should produce clear `config-invalid` errors;
- project-specific categories must live in config, not be hardcoded in the script.

Example project-specific template override:

```json
"templates": {
  "adr": "project-templates/ADR_TEMPLATE.md",
  "wikiPage": "project-templates/WIKI_PAGE_TEMPLATE.md",
  "projectState": "project-templates/PROJECT_STATE_TEMPLATE.md"
}
```

With this model, `pom/` remains updatable while the project's real templates stay stable and owned by the project.

### Adoption Profile

`pom.config.json` may include an `adoption` section. It tells the agent which POM modules are active for the project.

Allowed values:

| Key | Values |
|---|---|
| `profile` | `minimal`, `wiki`, `decisions`, `full`, `adopt`, `refresh`, `custom` |
| `wiki` | `enabled`, `disabled` |
| `decisions` | `enabled`, `disabled` |
| `analysis` | `enabled`, `optional`, `disabled` |
| `docs` | `enabled`, `optional`, `disabled` |
| `mockups` | `enabled`, `disabled` |
| `planning` | `light`, `structured` |
| `tasks` | `light`, `structured` |
| `tests` | `disabled`, `existing`, `pom` |

Profile meanings:

- `minimal`: POM operating hook, scripts, and config only;
- `wiki`: minimal + persistent wiki memory;
- `decisions`: minimal + ADR governance and generated ADR index;
- `full`: wiki + decisions + handoff memory + current planning;
- `adopt`: preserve existing structures and map POM to them;
- `refresh`: refresh installation hooks only;
- `custom`: explicit user choices.

The adoption profile is guidance for the agent and lint configuration. It must not force creation of folders that the project does not need.

Semantics:

- `disabled` means POM must not create or require that module;
- if a disabled module's folder already exists, lint may still check it to prevent silent decay;
- `optional` means ask before creating the module unless the current work clearly needs it;
- `enabled` means the module is part of the active project method and should be maintained.

POM lint may also generate derived artifacts when the rule is explicit and the generated file is not an autonomous source. Example: `decisions/ADR_INDEX.md` is generated from ADRs and is only used for navigation/search. Generated files must declare that they should not be edited manually.

If generators increase or become expensive, split them into dedicated commands later. In version `0.1.0`, the supported commands are `pom:init` and `pom:lint`.

## Porting Lint To Another Project

1. Install POM as `pom/` or copy the lint script;
2. copy `pom/templates/POM_CONFIG_TEMPLATE.json` to the project root as `pom.config.json`;
3. adapt `pom.config.json` to the real project structure;
4. run `node --experimental-strip-types pom/scripts/install-pom.ts` or add `npm run pom:lint` manually;
5. run lint and fix real errors, leaving warnings as progressive adoption guidance;
6. install a pre-commit hook only when the project is stable enough.

Rule: lint must remain a low-cost governance support, not a barrier to POM adoption.

## Templates And Lint

In POM, templates are the normative source for document shape.

```text
templates/
        -> lint
        -> real documents
```

When a template changes, lint should adapt by reading the required sections from the template. This avoids duplicating rules in both templates and hardcoded script logic.

Rule:

```text
template = rule
lint = enforcement
```

Canonical templates:

| Template | Use |
|---|---|
| `ADR_TEMPLATE.md` | decision record |
| `AGENTS_POM_SECTION_TEMPLATE.md` | POM section for agent instruction files |
| `CURRENT_PLAN_TEMPLATE.md` | short roadmap and current activities |
| `POM_CONFIG_TEMPLATE.json` | portable documentation lint config |
| `EXPERIMENT_TEMPLATE.md` | versioned experiment or one-shot work |
| `MOCK_MANIFEST_TEMPLATE.md` | mockup package manifest |
| `PROJECT_STATE_TEMPLATE.md` | project restart point |
| `TASK_PLAN_TEMPLATE.md` | verifiable task plan |
| `SPEC_TEMPLATE.md` | specifications |
| `DOC_TEMPLATE.md` | official documentation |
| `RECONCILIATION_TEMPLATE.md` | reconciliation between sources |
| `WIKI_INDEX_TEMPLATE.md` | wiki index |
| `WIKI_LOG_TEMPLATE.md` | chronological wiki log |
| `WIKI_PAGE_TEMPLATE.md` | generic wiki page |

## Agent Usage

Before creating a governed document, the agent must read and use the relevant template from `pom/templates/`. If a template does not fit the case, propose a template change before creating documents with a parallel structure. See the templates table above for the mapping.
