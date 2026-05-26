# Templates And Governance

## Summary

Templates define the shape of governed documents, and lint turns stable rules into enforceable checks. POM keeps Operating Memory trustworthy without forcing every project into the same structure.

## Current State

The README states the rule: template equals rule, lint equals enforcement. The lint configuration can be copied into a target project as `pom.config.json` and adapted to local roots, templates, wiki categories, decisions, tests, and handoff behavior.

The current repository provides templates for Decision Records, Open Discussion, agent instruction sections, Current Plan, docs, experiments, mock manifests, Project State, reconciliation, specs, task plans, wiki index, wiki log, and wiki pages.

The target-project agent instruction template is intentionally compact. Its global block covers identity, language, Source Authority, Artifact Policy, Git posture, commands, adoption profile semantics, and skill routing. Task-specific procedures such as handoff, experiments, planning verification, docs/source layout, and status classification live in skills, prompts, templates, or profile modules instead of the always-on global section.

## Details

Completion verification is mandatory for closing specs, tasks, or decisions. It prevents a document from becoming a promise that the project did not actually keep:

1. Start with the goal-backward check.
2. For code, run scenario tests, including positive and misuse paths.
3. For non-code, provide a thesis and a confuted antithesis.
4. For significant memory-changing work, run the governance validator.

Documentation discipline keeps POM lean:

- update an existing document before creating a parallel one;
- do not put project logs inside docs;
- let Git carry fine-grained history;
- write the smallest useful note where the next reader or agent needs it.

The generated wiki reader must respect this discipline. Generated HTML is derived output: useful to read, safe to regenerate, and never a second governed source.

Artifact Policy adds the edit-permission layer that Source Authority does not answer. `pom.config.json` can mark paths as approval-required, generated, or historical. The portable defaults mark generated indexes and wiki reader output as generated; project-specific normative folders can be added by target projects without changing POM Source.

## Sources

| Source | Use |
|---|---|
| `README.md` | Template/lint model, completion verification, documentation discipline, and POM folders. |
| `templates/` | Current reusable document shapes. |
| `templates/agents/` | Profile modules for target-project agent instruction sections. |
| `templates/POM_CONFIG_TEMPLATE.json` | Portable lint and adoption configuration. |
| `scripts/lib/lint-config.ts` | Default lint configuration used when project config is missing. |
| `templates/OPEN_DISCUSSION_TEMPLATE.md` | Discussion template for non-authoritative desiderata and alternatives before promotion. |
| `prompts/18-post-action-validator.md` | Post-action governance audit procedure. |
| `specs/SPEC-0000-pom-founding-spec.md` | Requirements for verification, organization, and extensibility. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0000 D1 | Templates are normative document shapes and lint enforces stable rules. |
| SPEC-0000 R5 | Completion verification gate is mandatory before closure. |
| SPEC-0000 R10 | Cognitive cost must stay low. |
| SPEC-0001 | Agent instruction sections are assembled from a compact core, a skill router, and active profile modules. |

## Open Questions

| Question | Status |
|---|---|
| Should generated HTML be linted, ignored, or treated as disposable output? | Answered for now: generated output governed by Artifact Policy; Markdown remains authoritative. |
| Should a reader template live under `templates/` if promoted? | Answered for now: no; the reader is script output plus a script-owned CSS theme. |

## Related Links

- [[operating-memory]]
- [[skills-and-prompts]]
- [[experiments-and-extension]]
