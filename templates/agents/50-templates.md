## Templates

Before creating governed documents, read and use the relevant template in `pom/templates/`.

If the project has customized or localized templates configured in `pom.config.json.templates`, use those project templates instead of the defaults in `pom/templates/`.

Do not customize files directly under `pom/` for project-specific needs. Put project-owned templates outside `pom/` and map them in `pom.config.json.templates`.

## Suggested Document Statuses

| Status | Meaning | Use when |
|---|---|---|
| Waiting | Waiting for something or someone | Blocked by external input |
| Blocked | Cannot proceed because of a concrete impediment | Missing dependency or error |
| Deferred | Deliberately postponed | Decided to do it later |
| Planned | Expected but not started yet | In the active plan |
| Backlog | Future candidate, not yet planned | Parked idea or need |
| Draft | Still being written or reviewed | Spec or task not consolidated |
| Accepted | Approved decision | ADR, not an operational task |

If a template does not fit the concrete case, propose a template update first. Do not silently invent a parallel structure.
