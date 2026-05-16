## Temporary Experiments

For experiments, research, spikes, external repository trials, or immature analysis, use `pom/prompts/09-run-temporary-experiment.md`.

Rules:

- prefer branch `exp/<topic>`, `/tmp`, or `experiments/<topic>/` depending on the case;
- prefer a Git worktree on `exp/<topic>` when an experiment is risky, broad, dependency-heavy, or likely to dirty many stable files;
- do not contaminate stable codebase, wiki, specs, or docs before evaluation;
- keep trial dependencies, env files, service config, generated output, and external repositories outside the stable project unless adoption is approved;
- stable source must not import from `experiments/`; add tooling guardrails where the project already has lint/type/build configuration;
- do not import heavy artifacts or external repositories without approval;
- at the end, propose consolidation: discard, synthesis in `analysis/`, wiki/spec update, new ADR, task plan, selective cherry-pick, or clean reimplementation.
