#!/usr/bin/env node
// Regression tests for the project-owned rules file:
//   1. an install seeds PROJECT_RULES.md and injects nothing while it is empty;
//   2. declared rules are injected into every agent instruction target, with the
//      guidance comments dropped and the headings demoted;
//   3. pom:lint reports an undeclared file, and a declared file whose rules are
//      not in the generated block yet;
//   4. an overlay installation seeds nothing and stays silent.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createHarness, git, makeSandbox, removeSandbox, runNode } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();
const INSTALLER = ["--experimental-strip-types", "pom/scripts/install-pom.ts"];
const LINT = ["--experimental-strip-types", "pom/scripts/lint-doc-governance.ts"];
const { assert, section, summary } = createHarness();

const DECLARED_RULES = [
  "# Project Rules",
  "",
  "<!-- guidance that must never reach the generated block -->",
  "",
  "## Conventions",
  "",
  "- HTTP handlers return the shared Result type; never throw across the boundary.",
  "",
  "## Non-Functional Requirements",
  "",
  "- No user identifier may reach a log line.",
  "",
].join("\n");

function copyPomSource(target) {
  cpSync(POM_ROOT, join(target, "pom"), {
    recursive: true,
    filter: (source) => {
      const rel = source.slice(POM_ROOT.length + 1);
      if (!rel) return true;
      const head = rel.split(/[\\/]/)[0];
      return !["node_modules", ".git", "experiments", "wiki", "pom.config.json"].includes(head);
    },
  });
}

function node(dir, args) {
  const result = runNode(args, { cwd: dir, env: { POM_LANG: "en" } });
  return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

function makeTarget(prefix) {
  const { dir } = makeSandbox(prefix);
  git(dir, ["init", "-q"]);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "target", version: "0.0.1", private: true }, null, 2) + "\n");
  writeFileSync(join(dir, "README.md"), "# target\n");
  copyPomSource(dir);
  return dir;
}

function pomSection(text) {
  const start = text.indexOf("<!-- POM:START -->");
  const end = text.indexOf("<!-- POM:END -->", start);
  return start < 0 || end < 0 ? "" : text.slice(start, end);
}

function scenarioSeedAndInject() {
  section("Scenario 1: the rules file is seeded empty, then injected once it declares something");
  const dir = makeTarget("pom-project-rules-");
  try {
    // Two instruction targets prove the rules reach every file POM writes.
    // .claude/rules/ alone would suppress the AGENTS.md fallback.
    writeFileSync(join(dir, "AGENTS.md"), "# Agent instructions\n");
    mkdirSync(join(dir, ".claude", "rules"), { recursive: true });

    const install = node(dir, [...INSTALLER, "--preset", "owned"]);
    assert("install succeeds", install.status === 0, install.stderr);
    assert("install reports the seeded file", install.stdout.includes("Created PROJECT_RULES.md"), install.stdout);
    assert("the rules file exists", existsSync(join(dir, "PROJECT_RULES.md")));

    const seeded = pomSection(readFileSync(join(dir, "AGENTS.md"), "utf8"));
    assert("the block points at the rules file", seeded.includes("## Project Rules Source"), seeded);
    assert("an empty rules file injects no section", !/^## Project Rules\s*$/m.test(seeded), seeded);

    writeFileSync(join(dir, "PROJECT_RULES.md"), DECLARED_RULES);
    const refresh = node(dir, [...INSTALLER, "--profile", "refresh", "--no-pull"]);
    assert("refresh succeeds", refresh.status === 0, refresh.stderr);

    for (const file of ["AGENTS.md", ".claude/rules/pom.md"]) {
      const block = pomSection(readFileSync(join(dir, file), "utf8"));
      assert(`${file} carries the injected section`, /^## Project Rules\s*$/m.test(block), block);
      assert(`${file} carries the declared rule`, block.includes("shared Result type"), block);
      assert(`${file} drops the guidance comment`, !block.includes("guidance that must never reach"), block);
      assert(`${file} demotes the rule headings`, block.includes("### Conventions") && !/^## Conventions\s*$/m.test(block), block);
      assert(`${file} drops the rules file title`, !/^#\s+Project Rules\s*$/m.test(block), block);
    }
  } finally {
    removeSandbox(dir);
  }
}

function scenarioLintReports() {
  section("Scenario 2: pom:lint reports an undeclared file and a block that is out of date");
  const dir = makeTarget("pom-project-rules-lint-");
  try {
    const install = node(dir, [...INSTALLER, "--preset", "owned"]);
    assert("install succeeds", install.status === 0, install.stderr);

    const undeclared = node(dir, LINT);
    assert("an untouched template is reported as undeclared", undeclared.stdout.includes("project-rules-undeclared"), undeclared.stdout);

    writeFileSync(join(dir, "PROJECT_RULES.md"), DECLARED_RULES);
    const notInjected = node(dir, LINT);
    assert(
      "declared rules missing from the block are reported",
      notInjected.stdout.includes("project-rules-not-injected") && notInjected.stdout.includes("AGENTS.md"),
      notInjected.stdout,
    );

    const refresh = node(dir, [...INSTALLER, "--profile", "refresh", "--no-pull"]);
    assert("refresh succeeds", refresh.status === 0, refresh.stderr);
    const clean = node(dir, LINT);
    assert("no project-rules finding remains after the refresh", !clean.stdout.includes("project-rules"), clean.stdout);

    const long = ["# Project Rules", "", "## Conventions", "", `- ${"word ".repeat(500)}`, ""].join("\n");
    writeFileSync(join(dir, "PROJECT_RULES.md"), long);
    const overBudget = node(dir, LINT);
    assert("a file over the word budget is reported", overBudget.stdout.includes("project-rules-too-long"), overBudget.stdout);
  } finally {
    removeSandbox(dir);
  }
}

function scenarioOverlaySeedsNothing() {
  section("Scenario 3: an overlay installation neither seeds the file nor reports it");
  const dir = makeTarget("pom-project-rules-overlay-");
  try {
    const install = node(dir, [...INSTALLER, "--preset", "overlay"]);
    assert("overlay install succeeds", install.status === 0, install.stderr);
    assert("no rules file is created in a repository POM does not govern", !existsSync(join(dir, "PROJECT_RULES.md")));

    const lint = node(dir, LINT);
    assert("the lint stays silent on overlay", !lint.stdout.includes("project-rules"), lint.stdout);

    // A refresh carries no --ownership, so the skip has to come from the
    // installed config: this is the path every pom:update on an overlay takes.
    const refresh = node(dir, [...INSTALLER, "--profile", "refresh", "--no-pull"]);
    assert("overlay refresh succeeds", refresh.status === 0, refresh.stderr);
    assert("a refresh does not seed the file on an overlay either", !existsSync(join(dir, "PROJECT_RULES.md")));
  } finally {
    removeSandbox(dir);
  }
}

scenarioSeedAndInject();
scenarioLintReports();
scenarioOverlaySeedsNothing();

summary();
