# Mini UI - POM Project Reader

Experimental local UI for project navigation, `rg` search, and file-based annotations.

Project-wide content search requires `rg` from ripgrep.

Run from the repository root you want to inspect. By default the server uses the current working directory as the project root and port `4173`.

```bash
node experiments/wiki-agent-orchestration/mini-ui/server.mjs --port 4173
```

If POM is installed in a target project under `pom/`, run the POM-hosted script from the target project root:

```bash
node pom/experiments/wiki-agent-orchestration/mini-ui/server.mjs --port 4173
```

Use explicit parameters when the launch directory, project root, port, or annotation handoff directory should differ:

```bash
node pom/experiments/wiki-agent-orchestration/mini-ui/server.mjs --port 4173 --root . --annotations-dir .pom-reader/annotations
```

Open:

```text
http://127.0.0.1:4173
```

The Project Reader starts from `wiki/index.md` when the project has a wiki. If no wiki index exists, it exposes a generated `POM Project Reader` entry document instead, then extends navigation to project documentation and source files through an explicit allowlist. It includes POM documents, `docs/`, examples, prompts, skills, templates, selected experiment files, scripts, tests, `bootstrap-pom.mjs`, and `package.json`. It excludes generated reader output and evidence folders such as `wiki/_site/` and `experiments/wiki-agent-orchestration/evidence/`.

When `pom.config.json` exists under the inspected project root, configured roots refine the document set and classification. The reader uses `root.allowedMarkdown`, `documentation.officialRoot`, `documentation.existingRoots`, `decisions.root`, `taskPlans.root`, `analysis.root`, `source.roots`, `tests.root`, `mockups.packagesDir`, and `artifactPolicy.generated`. If the config is missing, the built-in allowlist above is used. If the config exists but is invalid JSON, startup fails with an explicit error. The UI shows whether it is using the config or the built-in roots.

The active lightweight flow is:

- browse with thematic navigation or a repository tree;
- search project files through `rg`, with optional regex mode;
- search inside the open file, with previous/next navigation and optional regex mode;
- read Markdown tables, fixed-width text, syntax-highlighted code, and source line numbers in a responsive document surface;
- reject oversized document rendering above 1 MB and binary-looking files;
- collapse or pin the document navigation and annotation panels;
- save annotation files under `experiments/wiki-agent-orchestration/evidence/annotations/` by default, or under `--annotations-dir`;
- review open annotations in the "In progress" tab and processed annotations in the "Processed" tab;
- open an annotation detail, close it again, and jump to the target document when that document still exists;
- let a coding agent claim the next open annotation with:

```bash
node experiments/wiki-agent-orchestration/wiki-tools.mjs claim-next --by codex
```

When the script is being used from an installed `pom/` folder, prefix the command with `pom/`. If the server was launched with `--annotations-dir`, pass the same value to the CLI.

Treat annotation files as runtime evidence and keep them out of commits unless the project intentionally wants to archive one. If you use a custom annotation directory, add it to the target project's ignore rules.

Browser-based source editing is not part of the current UI. The current UI is for reading, search, and file-based agent handoff.

The server binds to `127.0.0.1` and sends a restrictive Content Security Policy, `nosniff`, frame-denial, same-origin resource policy, and no-referrer headers. It is still a local repository browser: do not expose it on a shared network without a separate threat model.

Other useful commands:

```bash
node experiments/wiki-agent-orchestration/wiki-tools.mjs search "Operating Memory"
node experiments/wiki-agent-orchestration/wiki-tools.mjs list
node experiments/wiki-agent-orchestration/wiki-tools.mjs take <annotation-id> --by codex
node experiments/wiki-agent-orchestration/wiki-tools.mjs history --path wiki/overview.md
```

The UI does not send requests directly to an AI agent. The annotation file is the handoff artifact: an agent reads it, claims it with the CLI, resolves it with the CLI, and applies durable document changes only through a separate reviewed promotion step.
