#!/usr/bin/env node

import { spawnSync } from "node:child_process";

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

function runLint(path) {
  return spawnSync(process.execPath, ["scripts/lint-workflows.mjs", path], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function scenarioDynamicHandleLifecycle() {
  console.log("\nScenario 1: Dynamic Workflow handles have explicit lifecycle");

  const valid = runLint("experiments/dynamic-workflows/workflows-candidate/14-handle-lifecycle.yaml");
  assert("selective await plus explicit detach passes", valid.status === 0, valid.stdout + valid.stderr);
  assert("valid handle lifecycle has no warnings", valid.stdout.includes("| Warnings | 0 |"), valid.stdout);

  const cancelValid = runLint("experiments/dynamic-workflows/workflows-candidate/15-handle-cancel-lifecycle.yaml");
  assert("explicit cancel handle lifecycle passes", cancelValid.status === 0, cancelValid.stdout + cancelValid.stderr);
  assert("cancel handle lifecycle has no warnings", cancelValid.stdout.includes("| Warnings | 0 |"), cancelValid.stdout);

  const expected = new Map([
    ["handle.broken-E082-name.yaml", "E082"],
    ["handle.broken-E083-duplicate.yaml", "E083"],
    ["handle.broken-E085-empty-await.yaml", "E085"],
    ["handle.broken-E086-unknown-await.yaml", "E086"],
    ["handle.broken-E089-terminal-active.yaml", "E089"],
  ]);

  for (const [fixture, code] of expected) {
    const result = runLint(`experiments/dynamic-workflows/broken-fixtures/${fixture}`);
    assert(`${fixture} fails`, result.status === 1, result.stdout + result.stderr);
    assert(`${fixture} reports ${code}`, result.stdout.includes(`**${code}**`), result.stdout);
  }
}

console.log("Workflow Dynamic Handle Tests");
console.log("=============================");

scenarioDynamicHandleLifecycle();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
