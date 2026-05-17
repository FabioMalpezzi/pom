# Skills And Prompts

## Summary

POM skills are short operational cards, while prompts are the canonical procedures behind them. Skills help the agent recognize the situation; prompts carry the full workflow.

## Current State

The skills index describes skill cards as recognizable aliases derived from prompts. Each skill file uses YAML frontmatter with `name` and `description` fields so agents that support skill discovery can invoke them automatically.

Prompts remain intentionally generic and reusable. They define what to read, what to propose, when to ask for approval, what to verify, and what output is expected.

## Details

Important skill families:

| Skill | Use |
|---|---|
| `wiki` | Build, query, check, or maintain the Persistent Wiki. |
| `extend` | Extend POM at the smallest fitting level. |
| `spike` | Run isolated temporary experiments. |
| `reconcile` | Classify and resolve a divergence between source and memory. |
| `validate` | Audit governance after significant POM actions. |
| `config` | Create or update project-specific POM configuration. |
| `sync` | Refresh an existing POM installation or align source and target POM. |

The prompt set covers bootstrap, adoption, state, governance, planning, review, handoff, config, experiments, wiki operations, extension, classification, deferral, sync, validation, reconciliation, clarification, pruning, and diagnosis. Together they make POM less dependent on an agent remembering the right procedure for each task.

Reader generation is currently a script command, not a separate skill. Use `npm run pom:wiki:render` to regenerate the static HTML view from the root wiki.

## Sources

| Source | Use |
|---|---|
| `skills/README.md` | Skill purpose, configuration rule, and skill index. |
| `prompts/README.md` | Prompt catalog and planning hierarchy. |
| `skills/spike.md` | Experiment isolation rules. |
| `prompts/09-run-temporary-experiment.md` | Full temporary experiment procedure. |
| `skills/extend.md` | Extension-level selection rules. |
| `prompts/12-extend-pom.md` | Controlled POM extension procedure. |
| `specs/SPEC-0002-skill-yaml-frontmatter.md` | YAML frontmatter requirements for skill discovery. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0002 | Skills have YAML frontmatter while keeping human-readable `When To Use` sections. |
| SPEC-0000 D2 | Extensions choose the smallest fitting level. |

## Open Questions

| Question | Status |
|---|---|
| Should reader generation be a new wiki mode, a separate skill, or only a script? | Answered for now: script command. |
| Should prompt usage tracking include reader commands if promoted? | Open. |

## Related Links

- [[wiki-method]]
- [[experiments-and-extension]]
- [[templates-and-governance]]
