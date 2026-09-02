#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createHarness, makeSandbox, removeSandbox, runCommand } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();
const RENDER_TIMEOUT_MS = 60000;

const { assert, section, banner, summary } = createHarness({ name: "Wiki Reader Orphan Table Row Tests" });

function createTempProject() {
  const { dir } = makeSandbox("pom-wiki-orphan-table-test-");
  execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
  mkdirSync(join(dir, "wiki"), { recursive: true });
  return dir;
}

const cleanup = removeSandbox;

// A regression here means the renderer loops forever, so the timeout is part of
// the assertion, not just a safeguard.
function renderWiki(projectDir) {
  return runCommand("node", ["pom/scripts/render-wiki.mjs"], { cwd: projectDir, timeout: RENDER_TIMEOUT_MS });
}

function scenarioOrphanTableRow() {
  section("Scenario 1: a table row separated from its table does not hang the renderer");
  const dir = createTempProject();

  try {
    writeFileSync(
      join(dir, "wiki", "index.md"),
      `---
navTitle: Tables
---

# Table rendering

| Column | Value |
| --- | --- |
| a | 1 |

| b | 2 |

Text after the orphan row.
`,
    );

    const result = renderWiki(dir);
    const stderr = result.stderr || "";

    assert("renderer terminates instead of looping", result.status === 0 && !result.error, `status=${result.status} error=${result.error} stderr=${stderr}`);

    if (result.status !== 0) return;

    const html = readFileSync(join(dir, "wiki", "_site", "index.html"), "utf8");

    assert(
      "the real table is still rendered as a table",
      html.includes("<th>Column</th>") && html.includes('<td data-label="Column">a</td>'),
      html,
    );
    assert("the orphan row is rendered as text", html.includes("<p>| b | 2 |</p>"), html);
    assert("text after the orphan row still renders", html.includes("<p>Text after the orphan row.</p>"), html);
    assert(
      "the warning names the orphan row at its source line",
      stderr.includes("index.md:11") && stderr.includes("table row is not part of a table"),
      stderr,
    );
  } finally {
    cleanup(dir);
  }
}

function scenarioTableAfterParagraph() {
  section("Scenario 2: a table directly after a paragraph line is still a table");
  const dir = createTempProject();

  try {
    writeFileSync(
      join(dir, "wiki", "index.md"),
      `# Table rendering

Intro line with no blank line below
| Column | Value |
| --- | --- |
| a | 1 |
`,
    );

    const result = renderWiki(dir);
    assert("renderer terminates", result.status === 0 && !result.error, `status=${result.status} stderr=${result.stderr}`);

    if (result.status !== 0) return;

    const html = readFileSync(join(dir, "wiki", "_site", "index.html"), "utf8");
    assert("the paragraph stops at the table", html.includes("<p>Intro line with no blank line below</p>"), html);
    assert("the table is rendered as a table", html.includes("<th>Column</th>"), html);
    assert("no orphan-row warning is emitted", !(result.stderr || "").includes("table row is not part of a table"), result.stderr);
  } finally {
    cleanup(dir);
  }
}

banner();

scenarioOrphanTableRow();
scenarioTableAfterParagraph();

summary();
