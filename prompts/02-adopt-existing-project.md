# Prompt - Adopt Existing Project

Use this prompt to apply the method to an existing project.

```text
I want to apply POM - Project Operating Memory to this existing repository without breaking the current structure.

Before modifying files:
1. read the repository structure;
2. check Git status with `git status`;
3. if the repository is not under Git, propose `git init` before reorganizations or structural governance;
4. classify or ask the user's relationship to the repository: `owned`, `team`, or `external_overlay`;
5. identify existing folders and their roles;
6. propose an adoption profile that fits the existing project;
7. propose a mapping to the method:
   - wiki, if it exists or should be created;
   - wiki/index.md and wiki/log.md, if the wiki exists or is created;
   - analysis;
   - decisions;
   - docs;
   - doc or other existing documentation folders;
   - src/apps/packages/services/frontend/backend or other source folders;
   - mockups;
   - tests, if present;
   - temporary work;
   - project state / roadmap / current plan;
8. report conflicts or ambiguities;
9. wait for approval.

Ownership modes:
- `owned`: the user can govern structure and conventions.
- `team`: the user can modify the repository, but existing conventions must be preserved unless explicitly changed.
- `external_overlay`: the repository belongs to an external upstream; POM is local understanding memory only.

Adoption profiles:
- minimal: only the POM operating hook, package scripts, and `pom.config.json`.
- wiki: minimal + persistent project wiki.
- decisions: minimal + ADR governance and generated ADR index.
- full: wiki + decisions + handoff memory + current planning.
- adopt: preserve the existing project structure and map POM to what already exists.
- custom: ask which POM modules to enable.

For existing projects, prefer `adopt` or `custom` unless the user explicitly wants a stronger profile. Save the selected profile in `pom.config.json` under `adoption`. Do not create folders for disabled modules, and do not create optional folders unless they are immediately needed or approved.

If the relationship is `external_overlay`, do not configure POM as project governance. Read `pom/specs/SPEC-0004-external-project-overlay.md`. Preserve upstream `docs/`, `tests/`, ADRs, source layout, agent instruction files, release process, and PR contents. Use local memory only to understand the project and prepare safe work.

General mapping rule: map existing project structures first, then propose migrations separately only when the user asks for cleanup. This applies to decisions, docs, source, tests, wiki, analysis, mockups, planning, and handoff files. For new POM-owned analysis/task/test material, prefer a shared analysis/workstream namespace such as `analysis/governance-core/...`, `tasks/governance-core/P0/...`, and `tests/governance-core/...`.

The wiki, when present, must become the project's persistent and consolidated memory. It must not replace decisions, code, tests, or official documentation.

If introducing POM for the first time, cite the conceptual origin of the wiki model:
- Andrej Karpathy's LLM Wiki pattern;
- URL: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f;
- if available, use `pom/WIKI_METHOD.md` as the method reference copy and do not duplicate the full text in project agent instruction files.

Do not rename folders, move files, or impose a standard structure until I approve.

If you find an existing test structure different from `tests/<analysis-or-workstream-or-module>/...`, ask whether to adapt to the existing structure or introduce/adapt the POM proposal. Do not move tests without approval. The user's choice must guide the `tests` section of `pom.config.json`. When configuring new POM-owned analysis/task/test material, prefer `analysis/<analysis-or-workstream>/...`, `tasks/<analysis-or-workstream>/P<priority-or-phase>/...`, and reuse the same namespace for related tests/evidence where practical.

If you find existing ADRs or architecture decisions outside `decisions/`, prefer mapping `decisions.root`, `decisions.adrPathPattern`, and `decisions.indexPath` to the existing convention before proposing a migration. Do not move decision files without approval.

If you find documentation or source structures different from `docs/` and `src/`, ask whether to adapt to the existing structure or introduce/adapt the POM proposal. Do not move documents or source files without approval. The user's choice must guide the `documentation` and `source` sections of `pom.config.json`.

If you find existing test, wiki, analysis, mockup, planning, or handoff structures, map them in `pom.config.json` where supported and record unresolved conventions as open decisions. Do not normalize folders by default.

After approval:
- create only missing files/folders;
- add useful templates;
- update README and supported agent instruction files using `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md`;
- if lint is enabled, use `pom/prompts/08-create-pom-config.md` to create or update `pom.config.json` from `pom/templates/POM_CONFIG_TEMPLATE.json`;
- save the approved `ownership.mode` in `pom.config.json`;
- configure `tests.root`, `tests.areas`, `tests.recommendedLayout`, and `tests.severity` according to the existing test structure or the user's approved preference;
- configure `documentation.officialRoot`, `documentation.existingRoots`, and `source.roots` according to the existing structure or the user's approved preference;
- create or update wiki index/log using the `WIKI_*` templates, if the wiki is enabled;
- if `npm run pom:lint` or `npm run pom:update` does not exist and POM is installed as `pom/`, run or propose `npm run pom:init`;
- if lint is added, document command, config, and pre-commit hook only after a first successful run;
- run `npm run pom:lint`, if available;
- do not delete existing material.
```
