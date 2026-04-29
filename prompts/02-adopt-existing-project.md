# Prompt - Adopt Existing Project

Use this prompt to apply the method to an existing project.

```text
I want to apply POM - Project Operating Memory to this existing repository without breaking the current structure.

Before modifying files:
1. read the repository structure;
2. check Git status with `git status`;
3. if the repository is not under Git, propose `git init` before reorganizations or structural governance;
4. identify existing folders and their roles;
5. propose an adoption profile that fits the existing project;
6. propose a mapping to the method:
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
7. report conflicts or ambiguities;
8. wait for approval.

Adoption profiles:
- minimal: only the POM operating hook, package scripts, and `pom.config.json`.
- wiki: minimal + persistent project wiki.
- decisions: minimal + ADR governance and generated ADR index.
- full: wiki + decisions + handoff memory + current planning.
- adopt: preserve the existing project structure and map POM to what already exists.
- custom: ask which POM modules to enable.

For existing projects, prefer `adopt` or `custom` unless the user explicitly wants a stronger profile. Save the selected profile in `pom.config.json` under `adoption`. Do not create folders for disabled modules, and do not create optional folders unless they are immediately needed or approved.

The wiki, when present, must become the project's persistent and consolidated memory. It must not replace decisions, code, tests, or official documentation.

If introducing POM for the first time, cite the conceptual origin of the wiki model:
- Andrej Karpathy's LLM Wiki pattern;
- URL: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f;
- if available, use `pom/WIKI_METHOD.md` as the method reference copy and do not duplicate the full text in the project's `AGENTS.md`/`AGENTS.MD`.

Do not rename folders, move files, or impose a standard structure until I approve.

If you find an existing test structure different from `tests/<module-or-area>/...`, ask whether to adapt to the existing structure or introduce/adapt the POM proposal. Do not move tests without approval. The user's choice must guide the `tests` section of `pom.config.json`.

If you find documentation or source structures different from `docs/` and `src/`, ask whether to adapt to the existing structure or introduce/adapt the POM proposal. Do not move documents or source files without approval. The user's choice must guide the `documentation` and `source` sections of `pom.config.json`.

After approval:
- create only missing files/folders;
- add useful templates;
- update README/AGENTS using `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md`;
- if lint is enabled, use `pom/prompts/08-create-pom-config.md` to create or update `pom.config.json` from `pom/templates/POM_CONFIG_TEMPLATE.json`;
- configure `tests.root`, `tests.areas`, `tests.recommendedLayout`, and `tests.severity` according to the existing test structure or the user's approved preference;
- configure `documentation.officialRoot`, `documentation.existingRoots`, and `source.roots` according to the existing structure or the user's approved preference;
- create or update wiki index/log using the `WIKI_*` templates, if the wiki is enabled;
- if `npm run pom:lint` does not exist and POM is installed as `pom/`, run or propose `node --experimental-strip-types pom/scripts/install-pom.ts`;
- if lint is added, document command, config, and pre-commit hook only after a first successful run;
- run `npm run pom:lint`, if available;
- do not delete existing material.
```
