#!/usr/bin/env node

/**
 * Regression test for the configurable wiki root (`wiki.root`).
 *
 * Scenario: a project keeps its wiki nested under the official documentation
 * root (e.g. doc/tech/wiki). Before `wiki.root` existed, the docs-source lint
 * treated every wiki page as an official document and flooded errors, while
 * the wiki lint (hardcoded to `wiki/`) did not govern the nested wiki at all.
 *
 * This test verifies that, with `wiki.root` set:
 *  1. wiki pages nested under the docs root are NOT flagged as official docs;
 *  2. wiki governance follows the configured root (a broken wikilink there is
 *     reported);
 *  3. genuine official documents under the docs root are still governed.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const POM_ROOT = process.cwd();
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${message}`);
  }
}

const WIKI_ROOT = "doc/tech/wiki";

function createProject({ brokenLink = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pom-wiki-root-test-"));
  execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }, null, 2) + "\n");

  writeFileSync(
    join(dir, "pom.config.json"),
    JSON.stringify(
      {
        adoption: {
          profile: "full",
          wiki: "enabled",
          decisions: "disabled",
          analysis: "optional",
          docs: "enabled",
          mockups: "disabled",
          planning: "light",
          tasks: "light",
          tests: "disabled",
        },
        documentation: {
          officialRoot: "doc/tech",
          existingRoots: ["doc"],
          knownRootCandidates: ["docs", "doc"],
          preferExistingStructure: true,
          requireApprovalBeforeMigratingDocs: true,
          severity: "warning",
        },
        wiki: { root: WIKI_ROOT },
      },
      null,
      2,
    ) + "\n",
  );

  // A genuine official document under the docs root, with all required sections.
  mkdirSync(join(dir, "doc/tech"), { recursive: true });
  writeFileSync(
    join(dir, "doc/tech/roadmap.md"),
    [
      "# Roadmap",
      "",
      "## Purpose",
      "Describe direction.",
      "",
      "## Audience",
      "Internal / technical.",
      "",
      "## Content",
      "The official content goes here.",
      "",
      "## Gaps And Open Decisions",
      "- None.",
      "",
      "## Sources And Decisions",
      "- ADR: none",
      "",
    ].join("\n"),
  );

  // The wiki, nested under the official docs root.
  mkdirSync(join(dir, WIKI_ROOT), { recursive: true });
  writeFileSync(
    join(dir, WIKI_ROOT, "index.md"),
    [
      "# Project Wiki - Index",
      "",
      "## Overview",
      "",
      "| Page | Summary |",
      "|---|---|",
      "| [[overview]] | Project overview. |",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(dir, WIKI_ROOT, "log.md"),
    ["# Wiki Log", "", "## [2026-06-24] init | wiki creation", "", "- Source: test.", ""].join("\n"),
  );
  const link = brokenLink ? "[[does-not-exist]]" : "[[overview]]";
  writeFileSync(
    join(dir, WIKI_ROOT, "overview.md"),
    [
      "# Overview",
      "",
      "This is a sufficiently long wiki page describing the project so that it",
      "passes the minimum length governance check applied to wiki pages, and it",
      `links to another page: ${link}.`,
      "",
    ].join("\n"),
  );

  return dir;
}

function runLint(dir) {
  const result = spawnSync("node", ["--experimental-strip-types", "pom/scripts/lint-doc-governance.ts"], {
    cwd: dir,
    encoding: "utf8",
  });
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

// Scenario 1: nested wiki must not be linted as official docs; lint is clean.
{
  const dir = createProject();
  try {
    const out = runLint(dir);
    assert(
      !/Official document is missing required section/.test(
        out.split("\n").filter((line) => line.includes(WIKI_ROOT)).join("\n"),
      ),
      "wiki pages nested under the docs root are not treated as official documents",
    );
    assert(
      /Doc governance lint: (OK|0 errors)/.test(out),
      "lint reports no errors when the wiki is nested under the docs root",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Scenario 2: wiki governance follows the configured root (broken link caught).
{
  const dir = createProject({ brokenLink: true });
  try {
    const out = runLint(dir);
    assert(
      /wiki-broken-wikilink/.test(out) && out.includes(`${WIKI_ROOT}/overview.md`),
      "wiki governance applies at the configured root (broken wikilink reported)",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
