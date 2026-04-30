# POM Prompts

Reusable prompts for applying **POM - Project Operating Memory** to new or existing projects.

These prompts are intentionally generic: they can be copied into other repositories and adapted to local context.

## Available Prompts

| Prompt | Use |
|---|---|
| `01-bootstrap-new-project.md` | start a new project with POM, persistent wiki, and minimal structure |
| `02-adopt-existing-project.md` | apply the method to an existing project without breaking current structure |
| `03-create-project-state.md` | create or update the project restart point |
| `04-create-doc-governance.md` | set documentation governance, wiki, lint, decision records, and mock manifests |
| `05-create-task-plan-from-spec.md` | turn a spec or ADR into Phase/Workstream/Task/Step/Verification |
| `06-review-task-phase.md` | verify a completed phase or workstream with tests and critical analysis |
| `07-update-project-after-work.md` | update project state, wiki, docs, decisions, and plan after a work session |
| `08-create-pom-config.md` | create or update `pom.config.json` from the portable template |
| `09-run-temporary-experiment.md` | manage temporary experiments and guide consolidation or discard |
| `10-build-wiki.md` | build the initial wiki in approved batches |
| `11-review-stale-wiki.md` | find and update potentially stale wiki pages |
| `12-extend-pom.md` | extend POM by choosing the smallest level among config, template, prompt, skill, and lint |
| `13-query-wiki.md` | query the wiki and propose archival of reusable answers |
| `14-lint-wiki.md` | check wiki health and produce a lightweight health report |
| `15-classify-document-status.md` | choose the right document type and status before writing |
| `16-defer-work.md` | preserve future work as Deferred without implementing it |
| `17-sync-pom-framework.md` | commit POM source changes and align a target project's `pom/` |

## Work Planning Hierarchy

The hierarchy is logical, not physical. Verification happens at every level.

```text
Roadmap
  -> Phase          (acceptance review)
    -> Workstream   (cross-functional E2E / user-flow tests)
      -> Task       (integration tests / single-feature E2E)
        -> Step     (atomic verification: unit test, lint, check)
```

## Rule

Before applying these prompts to an existing repository, read local project documentation and do not overwrite existing conventions without approval.

Use Git for fine-grained project history. For temporary experiments, use `09-run-temporary-experiment.md` and consolidate only after explicit evaluation.
