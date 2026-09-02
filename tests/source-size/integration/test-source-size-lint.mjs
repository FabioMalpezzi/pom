#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createHarness, makeSandbox, removeSandbox, runNode } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();
const { assert, section, banner, summary } = createHarness({ name: "Source Size Lint Tests" });

function runLint(projectDir, scriptPath) {
  return runNode(["--experimental-strip-types", scriptPath], { cwd: projectDir });
}

function writeHugeSource(path, lineCount) {
  writeFileSync(path, Array.from({ length: lineCount }, (_, index) => `const line${index} = ${index};`).join("\n") + "\n");
}

function scenarioPomSourceEnforcesHardCap() {
  section("Scenario 1: POM Source enforces source file hard cap");
  const { dir } = makeSandbox("pom-source-size-");

  try {
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "skills"), { recursive: true });
    writeFileSync(join(dir, "bootstrap-pom.mjs"), "\n");
    writeFileSync(join(dir, "scripts", "install-pom.ts"), "\n");
    writeFileSync(join(dir, "skills", "README.md"), "# Skills\n");
    writeFileSync(join(dir, "WIKI_METHOD.md"), "# Wiki Method\n");
    writeHugeSource(join(dir, "scripts", "oversized.mjs"), 1001);

    const result = runLint(dir, join(POM_ROOT, "scripts", "lint-doc-governance.ts"));
    assert("lint fails on POM Source hard cap", result.status === 1, result.stdout + result.stderr);
    assert("hard cap finding is emitted", result.stdout.includes("source-size-hard-cap"), result.stdout);
  } finally {
    removeSandbox(dir);
  }
}

function scenarioTargetProjectIsNotChecked() {
  section("Scenario 2: Target Project source files are not checked by POM Source limits");
  const { dir } = makeSandbox("pom-target-size-");

  try {
    execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
    mkdirSync(join(dir, "src"), { recursive: true });
    writeHugeSource(join(dir, "src", "application.mjs"), 1001);

    const result = runLint(dir, "pom/scripts/lint-doc-governance.ts");
    assert("target lint exits without source-size failure", result.status === 0, result.stdout + result.stderr);
    assert("target lint does not emit source-size finding", !result.stdout.includes("source-size-"), result.stdout);
  } finally {
    removeSandbox(dir);
  }
}

banner();

scenarioPomSourceEnforcesHardCap();
scenarioTargetProjectIsNotChecked();

summary();
