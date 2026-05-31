# Skills And Prompts

## Summary

POM skills are short operational cards, while prompts are the canonical procedures behind them. Skills help the agent recognize the situation; prompts carry the full workflow.

## Current State

The skills index describes skill cards as recognizable aliases derived from prompts. Each skill file uses YAML frontmatter with `name` and `description` fields so agents that support skill discovery can invoke them automatically.

Prompts remain intentionally generic and reusable. They define what to read, what to propose, when to ask for approval, what to verify, and what output is expected.

Agent instruction files should stay global: identity, communication posture, source authority, safety, and always-on operating rules. Workflow-specific rules belong in skills and their canonical prompts. If a rule applies only to wiki work, handoff, experiments, template creation, status classification, planning, or verification, the agent should route to the matching skill instead of carrying the full procedure in the global instruction block.

## Details

Important skill families:

| Skill | Use |
|---|---|
| `wiki` | Build, query, check, or maintain the Persistent Wiki. |
| `reader-notes` | Process human Project Reader notes through source-backed edits, outcome recording, and verification. |
| `extend` | Extend POM at the smallest fitting level. |
| `spike` | Run isolated temporary experiments. |
| `reconcile` | Classify and resolve a divergence between source and memory. |
| `validate` | Audit governance after significant POM actions. |
| `challenge` | Run adversarial thesis/antithesis review before accepting or completing non-code work. |
| `config` | Create or update project-specific POM configuration. |
| `sync` | Refresh an existing POM installation or align source and target POM. |
| `workflow` | Design, validate, diagram, derive scenarios for, and guide the implementation of a domain workflow declared as a YAML state model. Opt-in per target via `workflows.enabled` in `pom.config.json`; relies on `scripts/lint-workflows.mjs` for validation and Mermaid generation, and on `scripts/to-xstate.mjs` for stately.ai visualization. |
| `loop-goal` | Model, audit, derive scenarios for, and conclude agent-shaped loop/goal workflows. The wiki tutorial `[[loop-goal-workflow-tutorial]]` explains how to choose between the verified examples and broader loop/goal dimensions. |

The prompt set covers bootstrap, adoption, state, governance, planning, review, handoff, Project Reader note processing, config, experiments, wiki operations, extension, classification, deferral, sync, validation, reconciliation, clarification, pruning, diagnosis, and adversarial challenge. Together they make POM less dependent on an agent remembering the right procedure for each task.

The installed agent section now keeps the minimal profile to global posture plus a skill router. Profile modules add active workflow entry points, while detailed procedures stay in skills and prompts.

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
| `skills/reader-notes.md` | Skill card for processing human Project Reader notes. |
| `prompts/26-process-reader-notes.md` | Canonical procedure for claiming, evaluating, applying, recording, and verifying Project Reader notes. |
| `skills/challenge.md` | Skill card for adversarial thesis/antithesis review. |
| `prompts/24-challenge-antithesis.md` | Read-only challenge procedure that looks for material antitheses before acceptance or completion. |
| `specs/SPEC-0002-skill-yaml-frontmatter.md` | YAML frontmatter requirements for skill discovery. |
| `specs/SPEC-0001-modular-agents-template.md` | Global-vs-skill boundary and profile-aware agent instruction assembly. |
| `skills/workflow.md` | Workflow modeling skill card (5 modes: design / validate / diagram / scenarios / implement). |
| `prompts/27-workflow-modeling.md` | Canonical prompt behind the workflow skill. |
| `specs/SPEC-0006-workflow-modeling.md` | Workflow modeling specification and validator rule set. |
| `decisions/ADR-0002-workflow-context-injection.md` | Closed decision behind workflow composition data-exchange model. |
| `templates/WORKFLOW_TEMPLATE.yaml`, `templates/PIPELINE_TEMPLATE.yaml`, `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`, `templates/WORKFLOW_INTEGRATION_GUIDE.md` | Workflow-skill templates and adoption/extension manuals. |
| `docs/workflow-xstate-compatibility.md` | XState v5 compatibility and the stately.ai visualization workflow. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0002 | Skills have YAML frontmatter while keeping human-readable `When To Use` sections. |
| SPEC-0000 D2 | Extensions choose the smallest fitting level. |
| SPEC-0001 | Agent instructions stay small by keeping workflow-specific rules in skills or active profile modules. |

## Open Questions

| Question | Status |
|---|---|
| Should reader generation be a new wiki mode, a separate skill, or only a script? | Answered for now: script command. |
| Should prompt usage tracking include reader commands if promoted? | Open. |
| Should `challenge` become part of every non-code completion gate or remain invoked for material risk? | Open; current rule keeps it targeted to avoid noise. |

## Related Links

- [[wiki-method]]
- [[experiments-and-extension]]
- [[templates-and-governance]]
- [[loop-goal-workflow-tutorial]]
