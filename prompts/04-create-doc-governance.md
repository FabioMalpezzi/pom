# Prompt - Create Documentation Governance

Use this prompt to set documentation governance, lint, and decisions.

```text
Set or update project documentation governance.

Before modifying files:
1. read README.md, supported agent instruction files, and the folder structure;
2. identify whether wiki, docs, analysis, decisions, mockups, and scripts already exist;
3. propose what to add or change;
4. wait for approval.

The method must include:
- wiki as persistent memory and consolidated current state, using configured wiki paths when present;
- wiki/index.md and wiki/log.md, or the approved project equivalents if the project maps them explicitly;
- decisions as rationale history, mapped to `decisions/` or to the existing ADR root declared in `pom.config.json.decisions.root`;
- docs as official output, mapped through `documentation.officialRoot` and `documentation.existingRoots`;
- analysis as bridge documents, respecting configured analysis taxonomy;
- mockups as autonomous packages with MOCK_MANIFEST.md, if the project uses mockups;
- tests/source roots as project-owned structures, not folders imposed by POM;
- project state as quick restart point;
- POM templates as reusable document rules;
- `pom.config.json` as project-specific lint configuration;
- documentation lint if the project allows it.

If implementing lint:
- keep it lightweight;
- use errors only for objective rules;
- use warnings for debatable governance;
- create or update `pom.config.json` using `pom/prompts/08-create-pom-config.md`;
- start from the portable template `pom/templates/POM_CONFIG_TEMPLATE.json`;
- move project-specific rules into config, not into the script;
- add `npm run pom:lint` through `pom/scripts/install-pom.ts` when POM is installed as `pom/`, or manually only if the project uses `package.json` or the user approves that runtime;
- run lint at least once before proposing a pre-commit hook;
- document how to install any pre-commit hook.

Update supported agent instruction files with agent operating rules starting from `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md`.
```
