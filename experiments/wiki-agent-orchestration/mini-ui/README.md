# Mini UI - POM Project Reader

Experimental local UI for project navigation, `rg` search, and file-based annotations.

Run from the repository root:

```bash
node experiments/wiki-agent-orchestration/mini-ui/server.mjs --port 4173
```

Open:

```text
http://127.0.0.1:4173
```

The Project Reader starts from `wiki/index.md` when the project has a wiki. If no wiki index exists, it exposes a generated `POM Project Reader` entry document instead, then extends navigation to project documentation and source files through an explicit allowlist. It includes POM documents, `docs/`, examples, prompts, skills, templates, selected experiment files, scripts, tests, `bootstrap-pom.mjs`, and `package.json`. It excludes generated reader output and evidence folders such as `wiki/_site/` and `experiments/wiki-agent-orchestration/evidence/`.

The active lightweight flow is:

- search project files through `rg`, with optional regex mode;
- save annotation files under `experiments/wiki-agent-orchestration/evidence/annotations/`;
- review open annotations in the "In elaborazione" tab and processed annotations in the "Elaborate" tab;
- let a coding agent claim the next open annotation with:

```bash
node experiments/wiki-agent-orchestration/wiki-tools.mjs claim-next --by codex
```

Other useful commands:

```bash
node experiments/wiki-agent-orchestration/wiki-tools.mjs search "Operating Memory"
node experiments/wiki-agent-orchestration/wiki-tools.mjs list
node experiments/wiki-agent-orchestration/wiki-tools.mjs take <annotation-id> --by codex
node experiments/wiki-agent-orchestration/wiki-tools.mjs history --path wiki/overview.md
```

The UI does not send requests directly to an AI agent. The annotation file is the handoff artifact: an agent reads it, claims it with the CLI, resolves it with the CLI, and applies durable document changes only through a separate reviewed promotion step.
