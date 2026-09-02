#!/usr/bin/env node

// Tests for scripts/lib/lint-wiki-freshness.ts and scripts/lib/wiki-generated-blocks.ts:
// the synthesis-freshness warnings and the generated blocks that
// scripts/lint-doc-governance.ts refreshes inside wiki pages.
//
// Each scenario builds a throwaway target project under os.tmpdir() with
// pom/ symlinked to this POM source checkout and a fresh `git init`, enables
// the wiki and the decisions root, and runs the lint on it.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { GIT_IDENTITY, createHarness, git, makeSandbox, removeSandbox, runNode } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();
const LINT_SCRIPT = join("pom", "scripts", "lint-doc-governance.ts");
const RENDER_SCRIPT = join("pom", "scripts", "render-wiki.mjs");

const { assert, section, banner, summary } = createHarness({ name: "Doc Governance Wiki Freshness Tests" });

// ─── Helpers ──────────────────────────────────────────────────────────

function baseConfig() {
  const config = JSON.parse(readFileSync(join(POM_ROOT, "templates", "POM_CONFIG_TEMPLATE.json"), "utf8"));
  config.ownership.mode = "owned";
  config.adoption.wiki = "enabled";
  config.adoption.decisions = "enabled";
  config.decisions.requireTemplateSections = false;
  return config;
}

function createProject() {
  const { dir } = makeSandbox("pom-lint-wiki-freshness-test-");
  execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
  git(dir, ["init", "-q"]);
  writeFileSync(join(dir, "pom.config.json"), JSON.stringify(baseConfig(), null, 2));
  write(dir, "wiki/index.md", "# Wiki\n\n## Overview\n\n- [[overview]]\n- [[foo]]\n");
  write(dir, "wiki/log.md", "# Wiki Log\n\n## [2026-01-01] init | wiki creation\n\n- Source: test.\n");
  write(
    dir,
    "wiki/foo.md",
    "# Foo Topic\n\n## Summary\n\nA regular page without any freshness declaration, long enough to pass the minimum page length check of the lint.\n",
  );
  write(
    dir,
    "decisions/ADR-0001-first-decision.md",
    "# ADR-0001 - First decision\n\n| Field | Value |\n|---|---|\n| Date | 2026-02-01 |\n| Status | Accepted |\n| Category | architecture |\n| Area | wiki |\n| Summary | Keep the wiki in Markdown. |\n\n## Decision\n\nKeep it.\n",
  );
  write(
    dir,
    "PROJECT_STATE.md",
    "# Project State\n\n## Last Updated\n\n2026-03-01\n\n## Dynamic Context\n\n### Current State\n\nThe project is in phase two.\nCode exists.\n\n### Current Objective\n\nShip.\n",
  );
  return dir;
}

function write(dir, relativePath, content) {
  const target = join(dir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function read(dir, relativePath) {
  return readFileSync(join(dir, relativePath), "utf8");
}

/** Commit everything with a fixed author/committer date so ordering is deterministic. */
function commitAll(dir, message, isoDate) {
  execFileSync("git", [...GIT_IDENTITY, "add", "-A"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", [...GIT_IDENTITY, "commit", "-q", "-m", message], {
    cwd: dir,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate },
  });
}

function runLint(dir) {
  return runNode(["--experimental-strip-types", LINT_SCRIPT], { cwd: dir });
}

function hasRule(stdout, rule) {
  return new RegExp(`^\\[WARN\\] ${rule}(?: |$)`, "m").test(stdout);
}

function today() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const LONG_BODY =
  "\n## Summary\n\nA synthesis page that summarizes decisions and the project state, long enough to pass the minimum page length check.\n";

function overviewWith(frontmatter) {
  return `---\n${frontmatter}\n---\n\n# Overview\n${LONG_BODY}`;
}

// ─── Freshness: verified date versus source changes ───────────────────

section("Freshness: a verified date older than the sources flags the page");
{
  const dir = createProject();
  write(dir, "wiki/overview.md", overviewWith("derivedFrom:\n  - decisions/\n  - PROJECT_STATE.md\nverified: 2020-01-01"));
  commitAll(dir, "initial", "2026-05-01T10:00:00");
  const result = runLint(dir);
  assert("wiki-stale-synthesis is reported", hasRule(result.stdout, "wiki-stale-synthesis"), result.stdout);
  assert(
    "the finding names decisions/ and PROJECT_STATE.md",
    /derives from decisions\b/.test(result.stdout) && /derives from PROJECT_STATE\.md/.test(result.stdout),
    result.stdout,
  );
  assert("the finding names the verified date", result.stdout.includes("(2020-01-01)"), result.stdout);
  assert("a specific suggested workflow is printed", result.stdout.includes("Stale synthesis findings"), result.stdout);
  removeSandbox(dir);
}

section("Freshness: a verified date of today covers every earlier change");
{
  const dir = createProject();
  write(dir, "wiki/overview.md", overviewWith(`derivedFrom: decisions/, PROJECT_STATE.md\nverified: ${today()}`));
  commitAll(dir, "initial", "2026-05-01T10:00:00");
  const result = runLint(dir);
  assert("no wiki-stale-synthesis with an up-to-date verified date", !hasRule(result.stdout, "wiki-stale-synthesis"), result.stdout);
  assert("inline comma-separated derivedFrom is accepted (no missing-source finding)", !hasRule(result.stdout, "wiki-derived-source-missing"), result.stdout);
  removeSandbox(dir);
}

section("Freshness: without verified, the page's last commit is the baseline");
{
  const dir = createProject();
  write(dir, "wiki/overview.md", overviewWith("derivedFrom:\n  - decisions/\n  - PROJECT_STATE.md"));
  commitAll(dir, "initial", "2026-05-01T10:00:00");
  let result = runLint(dir);
  assert("sources committed together with the page are not stale", !hasRule(result.stdout, "wiki-stale-synthesis"), result.stdout);

  write(dir, "decisions/ADR-0002-second-decision.md", "# ADR-0002 - Second decision\n\n| Field | Value |\n|---|---|\n| Date | 2026-06-01 |\n| Status | Accepted |\n\n## Decision\n\nDo it.\n");
  result = runLint(dir);
  assert("an uncommitted new ADR makes the page stale", hasRule(result.stdout, "wiki-stale-synthesis"), result.stdout);
  assert("the finding says the source changed in the working tree", result.stdout.includes("changed in the working tree"), result.stdout);

  commitAll(dir, "second decision", "2026-06-01T10:00:00");
  result = runLint(dir);
  assert("a later commit on the source keeps the page stale", hasRule(result.stdout, "wiki-stale-synthesis"), result.stdout);
  assert("the finding names the source commit date", result.stdout.includes("changed on 2026-06-01"), result.stdout);
  assert("only decisions/ is reported, PROJECT_STATE.md did not change", !/derives from PROJECT_STATE\.md/.test(result.stdout), result.stdout);

  write(dir, "wiki/overview.md", overviewWith("derivedFrom:\n  - decisions/\n  - PROJECT_STATE.md") + "\nUpdated after ADR-0002.\n");
  result = runLint(dir);
  assert("editing the page in the working tree clears the finding", !hasRule(result.stdout, "wiki-stale-synthesis"), result.stdout);
  removeSandbox(dir);
}

section("Freshness: malformed declarations are reported, undeclared pages are ignored");
{
  const dir = createProject();
  write(dir, "wiki/overview.md", overviewWith("derivedFrom:\n  - decisions/\n  - does/not/exist.md\nverified: yesterday"));
  commitAll(dir, "initial", "2026-05-01T10:00:00");
  let result = runLint(dir);
  assert("wiki-verified-format for a non-date verified value", hasRule(result.stdout, "wiki-verified-format"), result.stdout);

  write(dir, "wiki/overview.md", overviewWith("derivedFrom:\n  - decisions/\n  - does/not/exist.md\nverified: 2020-01-01"));
  result = runLint(dir);
  assert("wiki-derived-source-missing for a path that does not exist", hasRule(result.stdout, "wiki-derived-source-missing"), result.stdout);
  assert("the existing source is still checked", /derives from decisions\b/.test(result.stdout), result.stdout);
  assert("foo.md without derivedFrom produces no freshness finding", !/wiki-stale-synthesis wiki\/foo\.md/.test(result.stdout), result.stdout);
  removeSandbox(dir);
}

// ─── Generated blocks ─────────────────────────────────────────────────

const BLOCKS_PAGE = `---
navTitle: Overview
---

# Overview

## Summary

Hand-written summary that must survive every refresh of the generated blocks below.

## Current State

<!-- pom:generated state -->
<!-- /pom:generated -->

## Decisions

<!-- pom:generated decisions -->
stale content to be replaced
<!-- /pom:generated -->

## Pages

<!-- pom:generated pages -->
<!-- /pom:generated -->

Trailing hand-written paragraph.
`;

section("Generated blocks: lint fills decisions, state, and pages between the markers");
{
  const dir = createProject();
  write(dir, "wiki/overview.md", BLOCKS_PAGE);
  commitAll(dir, "initial", "2026-05-01T10:00:00");
  const result = runLint(dir);
  const page = read(dir, "wiki/overview.md");

  assert("lint reports the refreshed page", result.stdout.includes("refreshed generated block(s) in wiki/overview.md"), result.stdout);
  assert("decisions block lists ADR-0001 with a relative link", page.includes("[ADR-0001 - First decision](../decisions/ADR-0001-first-decision.md)"), page);
  assert("decisions block carries status, date, and summary", page.includes("| Accepted | 2026-02-01 | Keep the wiki in Markdown. |"), page);
  assert("stale placeholder content was replaced", !page.includes("stale content to be replaced"), page);
  assert("state block points to PROJECT_STATE.md with its last change date", page.includes("_From [PROJECT_STATE.md](../PROJECT_STATE.md), last changed 2026-05-01._"), page);
  assert("state block quotes the Current State section only", page.includes("The project is in phase two.\nCode exists.") && !page.includes("Ship."), page);
  assert("pages block lists the other page with its title", page.includes("- [[foo]]: Foo Topic"), page);
  assert("pages block skips index, log, and the page itself", !page.includes("[[index]]") && !page.includes("[[log]]") && !page.includes("[[overview]]"), page);
  assert("hand-written text outside the markers is untouched", page.includes("Hand-written summary that must survive") && page.includes("Trailing hand-written paragraph."), page);
  assert("no broken-link errors from the generated content", !/wiki-broken-(md-link|wikilink)/.test(result.stdout), result.stdout);

  const second = runLint(dir);
  assert("a second run is idempotent (nothing refreshed)", !second.stdout.includes("refreshed generated block(s)"), second.stdout);
  assert("a second run leaves the file byte-identical", read(dir, "wiki/overview.md") === page);

  const render = runNode([RENDER_SCRIPT], { cwd: dir });
  const html = existsSync(join(dir, "wiki/_site/overview.html")) ? read(dir, "wiki/_site/overview.html") : "";
  assert("render-wiki succeeds on the page", render.status === 0, render.stderr);
  assert("markers do not surface as text in the reader", html.length > 0 && !html.includes("pom:generated"), html.slice(0, 400));
  removeSandbox(dir);
}

section("Generated blocks: state honours section and source options, missing pieces are explained");
{
  const dir = createProject();
  write(dir, "STATO.md", "# Stato\n\n### Stato attuale\n\nSiamo alla fase tre.\n\n### Prossime azioni\n\n- una\n");
  write(
    dir,
    "wiki/overview.md",
    `# Overview\n${LONG_BODY}\n<!-- pom:generated state source="STATO.md" section="### Stato attuale" -->\n<!-- /pom:generated -->\n\n<!-- pom:generated state source="MISSING.md" -->\n<!-- /pom:generated -->\n\n<!-- pom:generated state section="### Nowhere" -->\n<!-- /pom:generated -->\n`,
  );
  commitAll(dir, "initial", "2026-05-01T10:00:00");
  runLint(dir);
  const page = read(dir, "wiki/overview.md");
  assert("custom source and section are used", page.includes("Siamo alla fase tre.") && !page.includes("- una"), page);
  assert("a missing source file is explained inline", page.includes("_State file not found: `MISSING.md`._"), page);
  assert("a missing section is explained inline", page.includes("_Section `### Nowhere` not found in `PROJECT_STATE.md`._"), page);
  removeSandbox(dir);
}

section("Generated blocks: malformed markers are reported and left alone");
{
  const dir = createProject();
  write(
    dir,
    "wiki/overview.md",
    `# Overview\n${LONG_BODY}\n<!-- pom:generated mystery -->\nkeep me\n<!-- /pom:generated -->\n\n<!-- pom:generated decisions -->\nnever closed\n`,
  );
  commitAll(dir, "initial", "2026-05-01T10:00:00");
  const result = runLint(dir);
  const page = read(dir, "wiki/overview.md");
  assert("unknown kind is reported", hasRule(result.stdout, "wiki-generated-block-unknown"), result.stdout);
  assert("unclosed block is reported", hasRule(result.stdout, "wiki-generated-block-unclosed"), result.stdout);
  assert("neither block was rewritten", page.includes("keep me") && page.includes("never closed") && !page.includes("ADR-0001"), page);
  removeSandbox(dir);
}

section("Generated blocks: decisions without a decisions root");
{
  const dir = createProject();
  execFileSync("rm", ["-r", join(dir, "decisions")]);
  write(dir, "wiki/overview.md", `# Overview\n${LONG_BODY}\n<!-- pom:generated decisions -->\n<!-- /pom:generated -->\n`);
  commitAll(dir, "initial", "2026-05-01T10:00:00");
  runLint(dir);
  assert("the block explains the missing root", read(dir, "wiki/overview.md").includes("_No decisions root found at `decisions/`._"));
  removeSandbox(dir);
}

banner();
summary();
