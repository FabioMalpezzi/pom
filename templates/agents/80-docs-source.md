## Docs And Source Conventions

POM proposes `docs/` for official documentation and `src/` as the minimal source root for new projects, but it must not impose them on existing projects.

If the project already uses `doc/`, `docs/`, `apps/`, `packages/`, `services/`, `frontend/`, `backend/`, or other structures, ask whether to adapt to the existing structure or introduce/adapt the POM proposal. Do not move documents or source files without approval.

For existing projects, this mapping principle applies beyond docs and source: ADRs/decisions, task plans, tests, wiki, analysis, mockups, planning files, and handoff files should be mapped in `pom.config.json` or documented as approved local conventions before any migration is proposed.
