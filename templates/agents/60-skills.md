## POM Skills

If `pom/skills/` exists, use it as the operating index for POM workflows. Global instructions say who POM is and how to behave; skills say what POM can do and when to apply it.

Rules:

- read `pom/skills/using-pom.md` before the first POM-related action in a session, after compaction, or whenever the correct skill is unclear;
- for harness session-start behavior or tool mapping, read `pom/prompts/references/agent-harnesses.md`;
- read the skill card first when the request matches a skill, then read the linked canonical prompt;
- state which POM skill is being used and why;
- read `pom.config.json` before creating, moving, or judging governed artifacts;
- do not treat a skill as a replacement for prompts or templates;
- treat YAML frontmatter descriptions as triggers only; do not follow a description as the workflow;
- if no suitable skill exists, use POM prompts directly and propose a new skill only if the workflow becomes recurring.

Common routing:

| Situation | Skill |
|---|---|
| Start or route POM-aware work | `using-pom` |
| Ambiguous POM request or artifact | `clarify` |
| Wiki work | `wiki` |
| Project restart or handoff memory | `pulse` or `handoff` |
| Spec, task, or ADR verification | `check` |
| Target Project bug, test failure, build failure, or unexpected behavior | `root-cause` |
| Document type or status ambiguity | `status` |
| Park work without implementing | `defer` |
| Temporary experiment or spike | `spike` |
| Installed POM refresh or alignment | `sync` |
| Temporary experiment or risky Git worktree/branch choice | `spike` |
| Finish branch, PR, merge, keep, discard, or cleanup | `finish-branch` |
| Post-action governance audit | `validate` |
| Method bloat or overlapping rules | `prune` |
