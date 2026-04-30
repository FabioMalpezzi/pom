# Prompt - Create POM Config

Use this prompt to create or update `pom.config.json` in a project that uses POM.

```text
I want to create or update `pom.config.json` to configure POM documentation lint for this project.

Before modifying files:
1. read `pom/templates/POM_CONFIG_TEMPLATE.json`;
2. read `README.md` and supported agent instruction files, if present;
3. read the main folder structure without analyzing all content;
4. check whether `wiki/`, `analysis/`, `decisions/`, `docs/`, `doc/`, `mockups/`, `tests/`, `src/`, `apps/`, `packages/`, `services/`, `frontend/`, `backend/`, and `PROJECT_STATE.md` exist;
5. propose or preserve an `adoption` profile;
6. propose a `pom.config.json` configuration;
7. wait for my approval.

Rules:
- always start from `pom/templates/POM_CONFIG_TEMPLATE.json`;
- configure `adoption` first, because it tells the agent which POM modules are active;
- keep base POM rules generic;
- put only project-specific rules in `pom.config.json`;
- do not customize files directly under `pom/` for a target project;
- if the project needs localized or customized templates, place them outside `pom/`, for example in `project-templates/` or `templates/`, and point `templates.*` in `pom.config.json` to those files;
- do not copy categories from other projects;
- do not require folders or sections that the project does not use;
- if unsure, leave the rule empty or propose it as a warning, not a hard constraint;
- do not create `docs/`, `mockups/`, or other folders just to satisfy config;
- if `pom.config.json` already exists, preserve local choices and propose only motivated changes;
- if `tests/` exists, detect the real structure and ask whether to adapt lint to it or use/adapt the POM proposal;
- if `tests/` does not exist, ask whether the user prefers the POM proposal or a different structure;
- do not move tests without approval;
- if ADRs already exist outside `decisions/`, ask whether to enable `adoption.decisions` against the existing ADR root (for example `doc/architecture`) instead of migrating files immediately;
- if `doc/`, `docs/`, or other documentation folders exist, ask which one to map as official documentation and which ones to leave as legacy/existing;
- if `src/`, `apps/`, `packages/`, `services/`, `frontend/`, `backend/`, or other source folders exist, ask which to declare as source roots;
- if tests, wiki, analysis, mockups, planning, or handoff files already exist in non-POM locations, prefer mapping or documenting the existing convention before proposing moves;
- do not move documents, source files, tests, mockups, wiki, analysis, or planning files without approval.

Adoption values:
- `profile`: `minimal`, `wiki`, `decisions`, `full`, `adopt`, `refresh`, or `custom`;
- `wiki`: `enabled` or `disabled`;
- `decisions`: `enabled` or `disabled`;
- `analysis`: `enabled`, `optional`, or `disabled`;
- `docs`: `enabled`, `optional`, or `disabled`;
- `mockups`: `enabled` or `disabled`;
- `planning`: `light` or `structured`;
- `tasks`: `light` or `structured`;
- `tests`: `disabled`, `existing`, or `pom`.

Interpretation:
- `minimal`: install the POM operating hook and config only.
- `wiki`: enable persistent wiki memory.
- `decisions`: enable ADR governance and generated ADR index.
- `full`: enable wiki, decisions, handoff, and current planning.
- `adopt`: preserve existing structures and map POM to them.
- `refresh`: refresh installation hooks only.
- `custom`: use explicit user choices.

Module semantics:
- `disabled`: POM must not create or require the module; if the folder already exists, lint may still check it to prevent silent decay.
- `optional`: ask before creating the module unless current work clearly needs it.
- `enabled`: the module is part of the active project method and must be maintained.

The configuration should cover, when applicable:
- Markdown allowed in root;
- analysis taxonomy and whether analysis root files are allowed;
- POM template paths and any project-owned template overrides;
- wiki index/log expectations and project-specific wiki categories/sections;
- ADR root, patterns, index path, and whether existing ADRs must follow the POM ADR template exactly;
- task-plan root, task file pattern, index path, and whether task files must follow the POM task template exactly;
- mockup package root, manifest rules, and reconciliation document search;
- test preferences and structure: `tests.root`, `tests.areas`, `tests.recommendedLayout`, `tests.crossSystemDir`, `tests.severity`;
- documentation: `documentation.officialRoot`, `documentation.existingRoots`, `documentation.knownRootCandidates`, migration flags, and `documentation.severity`;
- source roots: `source.roots`, `source.knownRootCandidates`, migration flags, and `source.severity`;
- handoff path and trigger paths;
- minimum length threshold for wiki pages.

After approval:
1. create or update `pom.config.json`;
2. run `npm run pom:lint`, if available;
3. if lint fails because config is invalid, fix the config;
4. if lint fails because real documents do not conform, do not automatically fix documents without explaining the issue;
5. update `PROJECT_STATE.md` if the configuration changes the project operating method.

In the final summary, state:
- which rules are base POM rules;
- which rules are project-specific;
- how the `tests` section was configured and why;
- how `documentation` and `source` were configured and why;
- which checks are intentionally not configured;
- lint run and result.
```
