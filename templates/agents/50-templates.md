## Templates

Before creating a governed document, route through the relevant skill and template. Use `pom/skills/status.md` when the document type or status is unclear.

Use `pom/templates/OPEN_DISCUSSION_TEMPLATE.md` for desiderata, unresolved alternatives, and questions that are not yet specs, ADRs, task plans, or wiki synthesis.

If `pom.config.json.templates` points to customized or localized templates, use those project templates instead of the defaults in `pom/templates/`.

Do not customize files directly under `pom/` for project-specific needs. Put project-owned templates outside `pom/` and map them in `pom.config.json.templates`.

## Suggested Document Statuses

| Status | Meaning | Use when |
|---|---|---|
| Waiting | Waiting for something or someone | Blocked by external input |
| Blocked | Cannot proceed because of a concrete impediment | Missing dependency or error |
| Deferred | Deliberately postponed | Decided to do it later |
| Accepted | Approved decision | ADR, not an operational task |

If a template does not fit the concrete case, propose a template update first. Do not silently invent a parallel structure.
