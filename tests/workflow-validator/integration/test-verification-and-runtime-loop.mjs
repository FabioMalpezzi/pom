#!/usr/bin/env node

import { spawnSync } from "node:child_process";

let passed = 0;
let failed = 0;

const FIXTURES = "tests/workflow-validator/fixtures";

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

function runLint(file) {
  return spawnSync(process.execPath, ["scripts/lint-workflows.mjs", `${FIXTURES}/${file}`], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertClean(label, file) {
  const result = runLint(file);
  assert(`${label} passes`, result.status === 0, result.stdout + result.stderr);
  assert(`${label} has no warnings`, result.stdout.includes("| Warnings | 0 |"), result.stdout);
}

function assertWarns(label, file, codes) {
  const result = runLint(file);
  assert(`${label} still passes`, result.status === 0, result.stdout + result.stderr);
  for (const code of codes) {
    assert(`${label} reports ${code}`, result.stdout.includes(`**${code}**`), result.stdout);
  }
}

function assertFails(file, code) {
  const result = runLint(file);
  assert(`${file} fails`, result.status === 1, result.stdout + result.stderr);
  assert(`${file} reports ${code}`, result.stdout.includes(`**${code}**`), result.stdout);
}

function scenarioVerificationEvidence() {
  console.log("\nScenario 1: a guard declares where its pass/fail decision comes from");

  assertClean("model judgement on an independent context", "evidence-independent.yaml");
  assertWarns("model judgement without declared independence", "evidence-self-review-W005.yaml", ["W005"]);

  assertFails("evidence.broken-E090-source.yaml", "E090");
  assertFails("evidence.broken-E091-flag.yaml", "E091");

  const selfReview = runLint("evidence-self-review-W005.yaml");
  assert(
    "W005 names the guard it found",
    selfReview.stdout.includes("name=review_passed"),
    selfReview.stdout,
  );

  const badSource = runLint("evidence.broken-E090-source.yaml");
  assert(
    "a malformed evidence source does not also raise the self-review warning",
    !badSource.stdout.includes("**W005**"),
    badSource.stdout,
  );
}

function scenarioFanInVerification() {
  console.log("\nScenario 2: a fan-in guard without evidence is visible");

  assertWarns("fan-in guard with no evidence block", "fanin-no-evidence-W006.yaml", ["W006"]);
  assertClean("fan-in guard with a deterministic source", "fanin-with-evidence.yaml");

  const noEvidence = runLint("fanin-no-evidence-W006.yaml");
  assert(
    "W006 names the await state and the guard",
    noEvidence.stdout.includes("from=awaiting, guard=all_items_reconciled"),
    noEvidence.stdout,
  );
}

function scenarioRuntimeLoop() {
  console.log("\nScenario 3: a declared runtime loop is a complete contract");

  assertClean("complete runtime loop", "runtime-loop-complete.yaml");
  assertWarns(
    "runtime loop with no feedback and no escalation",
    "runtime-loop-no-feedback-W007-W008.yaml",
    ["W007", "W008"],
  );

  const expected = new Map([
    ["runtime-loop.broken-E100-not-mapping.yaml", "E100"],
    ["runtime-loop.broken-E101-trigger.yaml", "E101"],
    ["runtime-loop.broken-E102-goal.yaml", "E102"],
    ["runtime-loop.broken-E103-evidence.yaml", "E103"],
    ["runtime-loop.broken-E104-stop.yaml", "E104"],
    ["runtime-loop.broken-E105-on-success.yaml", "E105"],
    ["runtime-loop.broken-E106-on-exhaustion.yaml", "E106"],
  ]);
  for (const [fixture, code] of expected) {
    assertFails(fixture, code);
  }

  assertWarns(
    "a stop target no transition can reach is reported as unreachable",
    "runtime-loop-unreachable-stop-W001.yaml",
    ["W001"],
  );
}

function scenarioShippedExamples() {
  console.log("\nScenario 5: the shipped agent-graph examples stay clean");

  for (const example of ["security-sweep.yaml", "file-audit.yaml", "nightly-test-repair.yaml"]) {
    const result = runLint(`../../../templates/examples/workflow/agent-graph/${example}`);
    assert(
      `${example} validates with no errors and no warnings`,
      result.status === 0 && result.stdout.includes("| Warnings | 0 |"),
      result.stdout + result.stderr,
    );
  }

  const sweep = runLint("../../../templates/examples/workflow/agent-graph/security-sweep.yaml");
  assert(
    "the sweep example declares an independently judged fan-in guard",
    sweep.stdout.includes("| Verdict | **PASS** |"),
    sweep.stdout,
  );
}

function scenarioBackwardCompatibility() {
  console.log("\nScenario 4: models that declare neither block are unaffected");

  const noEvidenceNoLoop = runLint("../../../experiments/dynamic-workflows/workflows-candidate/14-handle-lifecycle.yaml");
  assert(
    "an existing dynamic workflow with no evidence and no runtime_loop still passes clean",
    noEvidenceNoLoop.status === 0 && noEvidenceNoLoop.stdout.includes("| Warnings | 0 |"),
    noEvidenceNoLoop.stdout + noEvidenceNoLoop.stderr,
  );
}

console.log("Workflow Verification Evidence and Runtime Loop Tests");
console.log("====================================================");

scenarioVerificationEvidence();
scenarioFanInVerification();
scenarioRuntimeLoop();
scenarioShippedExamples();
scenarioBackwardCompatibility();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
