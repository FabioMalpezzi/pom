# Prompt - Bootstrap New Project

Use this prompt to start a new project with **POM - Project Operating Memory**.

```text
I want to set up this repository with POM - Project Operating Memory.

Before modifying files:
1. analyze the current repository structure;
2. check whether the repository is under Git;
3. if it is not under Git, propose `git init` before applying POM structurally;
4. if POM is installed as `pom/`, prefer `npm run pom:init` to install/reconfigure POM and `npm run pom:update` to update an existing installation;
5. explain and propose an adoption profile before creating folders;
6. propose a minimal, non-invasive structure based on that profile;
7. wait for my approval.

Adoption profiles:
- minimal: agent instruction hook + package scripts + `pom.config.json`; no wiki, docs, analysis, mockups, or tests.
- wiki: minimal + `wiki/index.md` and `wiki/log.md` for persistent project knowledge.
- decisions: minimal + `decisions/` and ADR index generation from ADR metadata.
- full: wiki + decisions + `PROJECT_STATE.md` + current planning support for long-running projects.
- adopt: preserve an existing structure and map POM to it.
- refresh: update only the POM section in supported agent instruction targets, package scripts, updater script, hooks, and coding-agent files.
- custom: ask which POM modules to enable.

If using the CLI, explain that these profiles map to:

```bash
node --experimental-strip-types pom/scripts/install-pom.ts --profile minimal
node --experimental-strip-types pom/scripts/install-pom.ts --profile wiki
node --experimental-strip-types pom/scripts/install-pom.ts --profile decisions
node --experimental-strip-types pom/scripts/install-pom.ts --profile full
```

When creating `pom.config.json`, save the selected profile in `adoption`:

```json
"adoption": {
  "profile": "minimal|wiki|decisions|full|custom",
  "wiki": "enabled|disabled",
  "decisions": "enabled|disabled",
  "analysis": "enabled|optional|disabled",
  "docs": "enabled|optional|disabled",
  "mockups": "enabled|disabled",
  "planning": "light|structured",
  "tasks": "light|structured",
  "tests": "disabled|existing|pom"
}
```

Do not create folders for disabled modules. If a module is optional, create it only when the user asks for it or when immediate project work needs it.

Module semantics:
- `disabled`: POM must not create or require the module; if the folder already exists, lint may still check it to prevent silent decay.
- `optional`: ask before creating the module unless current work clearly needs it.
- `enabled`: the module is part of the active project method and must be maintained.

The method must distinguish:
- wiki: living, persistent, consolidated knowledge;
- wiki/index.md: content map;
- wiki/log.md: append-only chronological register;
- analysis: non-official bridge analysis;
- decisions: ADRs and decision history;
- docs: publishable official documentation, only when needed;
- src/source: project source code, only if the project has code;
- mockups: mockup packages with manifests, only if the project uses mockups;
- scripts: lint and automation;
- analysis: optional synthesis, organized by analysis/workstream namespace when enabled or needed;
- tests: optional operational verification, organized by analysis, workstream, or module if the project has code or tests;
- project state / roadmap / current plan: quick restart point.

The wiki must be treated as cumulative project memory, not as temporary information retrieval.

In README and agent instruction files, cite the conceptual origin of the wiki model:
- Andrej Karpathy's LLM Wiki pattern;
- URL: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f;
- if available, use `pom/WIKI_METHOD.md` as the method reference copy and do not duplicate the full text in project agent instruction files.

Use POM templates:
- pom/templates/AGENTS_POM_SECTION_TEMPLATE.md;
- pom/templates/POM_CONFIG_TEMPLATE.json;
- pom/templates/WIKI_INDEX_TEMPLATE.md;
- pom/templates/WIKI_LOG_TEMPLATE.md;
- pom/templates/WIKI_PAGE_TEMPLATE.md;
- other relevant templates when needed.

If documentation lint should be enabled:
- use `pom/prompts/08-create-pom-config.md` to create `pom.config.json`;
- collect the user's test-structure preferences before configuring the `tests` section of `pom.config.json`;
- if the user prefers a structure other than `tests/<analysis-or-workstream-or-module>/...`, configure lint accordingly;
- collect the user's preferences for `docs/doc` and source roots (`src`, `apps`, `packages`, `services`, etc.) before configuring `documentation` and `source`;
- if `npm run pom:lint` or `npm run pom:update` does not exist and POM is installed as `pom/`, run or propose `npm run pom:init`;
- if lint is installed, document the command in `package.json`, `README.md`, and project agent instruction files;
- propose a pre-commit hook only after lint passes at least once.

When I approve, create only the minimum necessary structure and document:
- operating rules in supported project agent instruction files;
- method README;
- pom.config.json copied from the POM template and adapted to the project, if lint is enabled;
- wiki/index.md and wiki/log.md, if the wiki is enabled;
- ADR template;
- mock manifest template, if mockups are needed;
- task plan template.

After creation:
- run `npm run pom:lint`, if available;
- if lint is not installed yet, clearly state that automatic checking is not active;
- if automated tests are needed, propose `tests/<analysis-or-workstream-or-module>/{e2e,integration,fixtures,evidence}` and `tests/cross-system/`, but adapt `pom.config.json` to user preferences;
- do not create empty test folders if they are not needed immediately;
- do not create `src/`, `docs/`, or `doc/` if they are not needed immediately or if the user prefers another structure;
- update `PROJECT_STATE.md`, if it was created or if the operating method changed.

Do not create deep folder structures before they are needed.
```
