#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createHarness, makeSandbox, removeSandbox } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();

const { assert, section, banner, summary } = createHarness({ name: "Wiki Reader Nav Title Tests" });

function createTempProject() {
  const { dir } = makeSandbox("pom-wiki-reader-test-");
  execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
  mkdirSync(join(dir, "wiki"), { recursive: true });
  return dir;
}

const cleanup = removeSandbox;

function renderWiki(projectDir) {
  execFileSync("node", ["pom/scripts/render-wiki.mjs"], { cwd: projectDir, stdio: "pipe" });
}

function scenarioNavTitleFrontmatter() {
  section("Scenario 1: wiki reader uses navTitle for navigation only");
  const dir = createTempProject();

  try {
    writeFileSync(
      join(dir, "wiki", "index.md"),
      `---
navTitle: Short Index
---

# Long descriptive wiki title for archive clarity

## Summary

This page keeps a full title but uses a concise reader navigation label.

See [wiki page](capability-long.md), [wiki log](log.md), [analysis note](../analysis/source.md), and [root README](../README.md).

## Main Section

Top-level reader section.

### Child Section

Nested reader section.
`,
    );

    writeFileSync(
      join(dir, "wiki", "capability-long.md"),
      `---
navTitle: Architecture
---

# Capability - Very long operational architecture reference page

## Summary

Long page title, short navigation title.
`,
    );
    writeFileSync(join(dir, "wiki", "log.md"), "# Wiki Log\n");

    renderWiki(dir);

    const html = readFileSync(join(dir, "wiki", "_site", "index.html"), "utf8");
    const searchIndex = JSON.parse(readFileSync(join(dir, "wiki", "_site", "search-index.json"), "utf8"));
    const first = searchIndex.find((page) => page.output === "index.html");
    const second = searchIndex.find((page) => page.output === "capability-long.html");

    assert("full title remains the page H1", html.includes("<h1>Long descriptive wiki title for archive clarity</h1>"), html);
    assert("short title is used in the side navigation", html.includes(">Short Index</a>"), html);
    assert("full title remains available as navigation tooltip", html.includes('title="Long descriptive wiki title for archive clarity"'), html);
    assert("frontmatter is not rendered as page content", !html.includes("navTitle:"), html);
    assert("search index carries page navTitle", first?.navTitle === "Short Index", JSON.stringify(first));
    assert("search index carries capability navTitle", second?.navTitle === "Architecture", JSON.stringify(second));
    assert("same-directory wiki markdown links become reader html links", html.includes('href="capability-long.html"'), html);
    assert("parent-directory markdown links stay markdown links", html.includes('href="../../analysis/source.md"'), html);
    assert("root markdown links stay markdown links", html.includes('href="../../README.md"'), html);
    assert("non-html source links open in a new page", html.includes('href="../../analysis/source.md" target="_blank" rel="noopener noreferrer"'), html);
    assert("excluded wiki markdown links open source markdown", html.includes('href="../log.md" target="_blank" rel="noopener noreferrer"'), html);
    assert("markdown source link points to the source wiki file", html.includes('href="../index.md" target="_blank" rel="noopener noreferrer"'), html);
    assert("same-directory reader html links stay in the reader page", !html.includes('href="capability-long.html" target="_blank"'), html);
    assert("outline groups h3 headings under collapsible h2 sections", html.includes('<details class="outline-section" open>') && html.includes('href="#child-section"'), html);
  } finally {
    cleanup(dir);
  }
}

banner();

scenarioNavTitleFrontmatter();

summary();
