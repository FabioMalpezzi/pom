# Mini UI - Web Wiki Agent Extension

Experimental local UI for the POM web wiki agent-extension idea.

Run from the repository root:

```bash
node experiments/wiki-agent-orchestration/mini-ui/server.mjs --port 4173
```

Open:

```text
http://127.0.0.1:4173
```

This UI reads real repository Markdown from reader-visible `wiki/` pages, `specs/`, `tasks/`, selected root POM documents, and this experiment folder. It excludes `wiki/log.md`, which is a source-side change register rather than a wiki page for navigation. It can save wiki events under `experiments/wiki-agent-orchestration/evidence/ui-events/`.

It does not invoke an agent and does not edit durable POM documents. Use the active Codex session to process saved events during this experiment.
