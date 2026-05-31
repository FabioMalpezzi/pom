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

function scenarioTemporalPrimitives() {
  console.log("\nScenario 1: loop_guard and timeout validate statically");

  const valid = runLint("experiments/schema-loop-guard-timeout/examples/loop-guard-timeout.yaml");
  assert("combined H6/H7 example passes", valid.status === 0, valid.stdout + valid.stderr);
  assert("combined H6/H7 example has no warnings", valid.stdout.includes("| Warnings | 0 |"), valid.stdout);

  const warning = runLint("experiments/schema-loop-guard-timeout/examples/loop-guard-unused-override-warning.yaml");
  assert("unused cause-specific override example passes", warning.status === 0, warning.stdout + warning.stderr);
  assert("unused cause-specific override reports W060", warning.stdout.includes("**W060**"), warning.stdout);

  const expected = new Map([
    ["duration.broken-E063-ambiguous-m.yaml", "E063"],
    ["loop-guard.broken-E061-empty.yaml", "E061"],
    ["loop-guard.broken-E062-max-visits.yaml", "E062"],
    ["loop-guard.broken-E064-missing-target.yaml", "E064"],
    ["loop-guard.broken-E065-cause-target.yaml", "E065"],
    ["state.broken-E073-loop-guard-timeout.yaml", "E073"],
    ["timeout.broken-E071-duration.yaml", "E071"],
    ["timeout.broken-E072-target.yaml", "E072"],
  ]);

  for (const [fixture, code] of expected) {
    const result = runLint(`experiments/schema-loop-guard-timeout/broken-fixtures/${fixture}`);
    assert(`${fixture} fails`, result.status === 1, result.stdout + result.stderr);
    assert(`${fixture} reports ${code}`, result.stdout.includes(`**${code}**`), result.stdout);
  }
}

console.log("Workflow Temporal Primitive Tests");
console.log("=================================");

scenarioTemporalPrimitives();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
