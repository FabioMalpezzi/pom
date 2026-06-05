#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const POM_ROOT = process.cwd();
let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

function runLint(projectDir, scriptPath) {
  return spawnSync(process.execPath, ["--experimental-strip-types", scriptPath], {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function writeHugeSource(path, lineCount) {
  writeFileSync(path, Array.from({ length: lineCount }, (_, index) => `const line${index} = ${index};`).join("\n") + "\n");
}

function scenarioPomSourceEnforcesHardCap() {
  console.log("\nScenario 1: POM Source enforces source file hard cap");
  const dir = mkdtempSync(join(tmpdir(), "pom-source-size-"));

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
    rmSync(dir, { recursive: true, force: true });
  }
}

function scenarioTargetProjectIsNotChecked() {
  console.log("\nScenario 2: Target Project source files are not checked by POM Source limits");
  const dir = mkdtempSync(join(tmpdir(), "pom-target-size-"));

  try {
    execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
    mkdirSync(join(dir, "src"), { recursive: true });
    writeHugeSource(join(dir, "src", "application.mjs"), 1001);

    const result = runLint(dir, "pom/scripts/lint-doc-governance.ts");
    assert("target lint exits without source-size failure", result.status === 0, result.stdout + result.stderr);
    assert("target lint does not emit source-size finding", !result.stdout.includes("source-size-"), result.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log("Source Size Lint Tests");
console.log("======================");

scenarioPomSourceEnforcesHardCap();
scenarioTargetProjectIsNotChecked();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
