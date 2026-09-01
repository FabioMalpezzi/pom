#!/usr/bin/env node
// Regression tests for installer and updater hardening:
//   1. pom:init rerun with the same mode leaves pom.config.json untouched;
//   2. the pre-commit hook restages tracked artifacts that pom:lint regenerated;
//   3. pom-update.mjs refuses to replace a vendored pom/ that Git ignores;
//   4. the installer accepts --no-pull on refresh.

import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const POM_ROOT = process.cwd();
const INSTALLER = ["--experimental-strip-types", "pom/scripts/install-pom.ts"];
let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? `\n    ${String(detail).trim().split("\n").join("\n    ")}` : ""}`);
  }
}

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

function git(dir, args) {
  return execFileSync("git", ["-c", "user.name=POM Test", "-c", "user.email=pom@example.test", ...args], {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function node(dir, args) {
  const result = spawnSync(process.execPath, args, { cwd: dir, encoding: "utf8", env: { ...process.env, POM_LANG: "en" } });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function makeTarget(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  git(dir, ["init", "-q"]);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "target", version: "0.0.1", private: true }, null, 2) + "\n");
  writeFileSync(join(dir, "README.md"), "# target\n");
  copyPomSource(dir);
  return dir;
}

function scenarioConfigRerun() {
  console.log("\nScenario 1: rerunning pom:init with the same preset does not rewrite pom.config.json");
  const dir = makeTarget("pom-hardening-config-");
  try {
    const first = node(dir, [...INSTALLER, "--preset", "owned"]);
    assert("first install succeeds", first.status === 0, first.stderr);
    const configPath = join(dir, "pom.config.json");
    const before = readFileSync(configPath, "utf8");
    const mtimeBefore = statSync(configPath).mtimeMs;

    const second = node(dir, [...INSTALLER, "--preset", "owned"]);
    assert("second install succeeds", second.status === 0, second.stderr);
    assert("second install reports the config as already current", second.stdout.includes("already has the adopt adoption profile"), second.stdout);
    assert("second install does not claim an update", !second.stdout.includes("Updated pom.config.json"), second.stdout);
    assert("pom.config.json content is unchanged", readFileSync(configPath, "utf8") === before);
    assert("pom.config.json mtime is unchanged", statSync(configPath).mtimeMs === mtimeBefore);

    const changed = node(dir, [...INSTALLER, "--preset", "team"]);
    assert("changing the preset still rewrites the config", changed.status === 0 && changed.stdout.includes("Updated pom.config.json"), changed.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function scenarioHookRestagesRegeneratedIndex() {
  console.log("\nScenario 2: the pre-commit hook restages the ADR index that pom:lint regenerates");
  const dir = makeTarget("pom-hardening-hook-");
  try {
    const install = node(dir, [...INSTALLER, "--profile", "decisions", "--ownership", "owned"]);
    assert("install with decisions profile succeeds", install.status === 0, install.stderr);
    const hook = readFileSync(join(dir, ".git", "hooks", "pre-commit"), "utf8");
    assert("hook contains the restage block", hook.includes("git add --update --") && hook.includes("'decisions/DECISIONS_INDEX.md'"), hook);
    assert("hook lists the wiki reader output as generated", hook.includes("'wiki/_site'"), hook);

    const firstLint = node(dir, ["--experimental-strip-types", "pom/scripts/lint-doc-governance.ts"]);
    assert("first lint succeeds and creates the ADR index", firstLint.status === 0 && existsSync(join(dir, "decisions", "DECISIONS_INDEX.md")), firstLint.stdout + firstLint.stderr);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "adopt pom"]);

    const adr = [
      "# ADR-0001 - Keep the test fixture small",
      "",
      "| Field | Value |",
      "|---|---|",
      "| Date | 2026-09-02 |",
      "| Status | Proposed |",
      "| Category | tooling |",
      "| Area | tests |",
      "",
      ...["Context", "Decision", "Rationale", "Alternatives Considered", "Impacts", "Links", "Follow-up", "Completion Verification", "Evolution Rule"].flatMap((section) => [`## ${section}`, "", "Fixture text.", ""]),
    ].join("\n");
    writeFileSync(join(dir, "decisions", "ADR-0001-keep-the-test-fixture-small.md"), adr);
    git(dir, ["add", "decisions/ADR-0001-keep-the-test-fixture-small.md"]);

    // Git forwards hook output to stderr, so capture both streams.
    const commit = spawnSync("git", ["-c", "user.name=POM Test", "-c", "user.email=pom@example.test", "commit", "-m", "add ADR-0001"], {
      cwd: dir,
      encoding: "utf8",
    });
    const commitStatus = commit.status ?? 1;
    const commitOutput = `${commit.stdout ?? ""}${commit.stderr ?? ""}`;
    assert("commit with the hook succeeds", commitStatus === 0, commitOutput);
    assert("hook reports the restaged index", commitOutput.includes("restaged regenerated POM artifacts") && commitOutput.includes("decisions/DECISIONS_INDEX.md"), commitOutput);

    const status = git(dir, ["status", "--porcelain"]);
    assert("working tree is clean after the commit", status.trim() === "", status);
    const committedIndex = git(dir, ["show", "HEAD:decisions/DECISIONS_INDEX.md"]);
    assert("committed index lists the new ADR", committedIndex.includes("ADR-0001"), committedIndex);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function scenarioUpdaterRefusesIgnoredVendoredPom() {
  console.log("\nScenario 3: pom-update.mjs refuses to replace a vendored pom/ that Git ignores");
  const dir = mkdtempSync(join(tmpdir(), "pom-hardening-ignored-"));
  try {
    git(dir, ["init", "-q"]);
    mkdirSync(join(dir, "pom"));
    writeFileSync(join(dir, "pom", "README.md"), "vendored POM with a local edit\n");
    writeFileSync(join(dir, ".gitignore"), "pom/\n");
    writeFileSync(join(dir, "pom-update.mjs"), readFileSync(join(POM_ROOT, "templates", "POM_UPDATE_TEMPLATE.mjs"), "utf8"));
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "baseline"]);

    const result = node(dir, ["pom-update.mjs"]);
    assert("updater exits non-zero", result.status !== 0, result.stdout);
    assert("updater explains that an ignored pom/ cannot be verified", result.stderr.includes("ignored by Git"), result.stderr);
    assert("local edit in pom/ survives", readFileSync(join(dir, "pom", "README.md"), "utf8").includes("local edit"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function scenarioNoPullFlag() {
  console.log("\nScenario 4: refresh accepts --no-pull");
  const dir = makeTarget("pom-hardening-nopull-");
  try {
    const install = node(dir, [...INSTALLER, "--preset", "minimal"]);
    assert("install succeeds", install.status === 0, install.stderr);
    const refresh = node(dir, [...INSTALLER, "--profile", "refresh", "--no-pull"]);
    assert("refresh with --no-pull succeeds", refresh.status === 0, refresh.stderr);
    assert("refresh with --no-pull does not pull", !refresh.stdout.includes("Pulling latest POM changes"), refresh.stdout);
    const updater = readFileSync(join(dir, "pom-update.mjs"), "utf8");
    assert("installed updater passes --no-pull to the refresh", updater.includes('"--no-pull"'), "flag missing in pom-update.mjs");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

scenarioConfigRerun();
scenarioHookRestagesRegeneratedIndex();
scenarioUpdaterRefusesIgnoredVendoredPom();
scenarioNoPullFlag();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
