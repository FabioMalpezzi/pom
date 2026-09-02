#!/usr/bin/env node

import { createHarness, runNode } from "../../lib/harness.mjs";

const { assert, section, banner, summary } = createHarness({ name: "Workflow Verification Evidence and Runtime Loop Tests" });

const FIXTURES = "tests/workflow-validator/fixtures";
// Relative to FIXTURES: the dynamic workflow candidates live in another area.
const CANDIDATES = "../../dynamic-workflows/fixtures/workflows-candidate";

function runLint(file) {
  return runNode(["scripts/lint-workflows.mjs", `${FIXTURES}/${file}`]);
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
  section("Scenario 1: a guard declares where its pass/fail decision comes from");

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
  section("Scenario 2: a fan-in guard without evidence is visible");

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
  section("Scenario 3: a declared runtime loop is a complete contract");

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
  section("Scenario 5: the shipped agent-graph examples stay clean");

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

function scenarioCanonicalTemplates() {
  section("Scenario 6: the canonical templates pass their own validator");

  // POM tells target projects that the model is the source of authority and
  // that the validator is the judge. A canonical template failing that
  // validator contradicts the method it teaches, so both templates and the
  // child workflows they reference must stay clean.
  const templates = [
    "../../../templates/WORKFLOW_TEMPLATE.yaml",
    "../../../templates/PIPELINE_TEMPLATE.yaml",
    "../../../templates/workflows/validation-flow.yaml",
    "../../../templates/workflows/child-workflow.yaml",
    "../../../templates/workflows/cart-flow.yaml",
    "../../../templates/workflows/checkout-flow.yaml",
    "../../../templates/workflows/payment-flow.yaml",
  ];
  for (const template of templates) {
    const result = runLint(template);
    const name = template.split("/").pop();
    assert(
      `${name} validates with no errors and no warnings`,
      result.status === 0 && result.stdout.includes("| Warnings | 0 |"),
      result.stdout + result.stderr,
    );
  }

  const pipeline = runLint("../../../templates/PIPELINE_TEMPLATE.yaml");
  assert(
    "every pipeline member handoff resolves inside the sequence",
    !pipeline.stdout.includes("**E026**"),
    pipeline.stdout,
  );
}

function scenarioBackwardCompatibility() {
  section("Scenario 4: models that declare neither block are unaffected");

  const noEvidenceNoLoop = runLint(`${CANDIDATES}/14-handle-lifecycle.yaml`);
  assert(
    "an existing dynamic workflow with no evidence and no runtime_loop still passes clean",
    noEvidenceNoLoop.status === 0 && noEvidenceNoLoop.stdout.includes("| Warnings | 0 |"),
    noEvidenceNoLoop.stdout + noEvidenceNoLoop.stderr,
  );
}

banner();

scenarioVerificationEvidence();
scenarioFanInVerification();
scenarioRuntimeLoop();
scenarioShippedExamples();
scenarioCanonicalTemplates();
scenarioBackwardCompatibility();

summary();
