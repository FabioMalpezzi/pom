#!/usr/bin/env node

// Broken-fixture coverage for the base validator rules (E000-E017,
// W002-W004) and the context-injection rules (E050-E058).
//
// Every fixture under tests/workflow-validator/fixtures/core.* is the
// minimal model core.valid-minimal.yaml (or core.valid-invoke.yaml for the
// invoke-driven E055-E058 rules) with exactly one rule condition broken.
// A broken fixture may drag other codes along as a consequence; the test
// asserts only that the expected code is reported and that the CLI verdict
// (exit status) matches the rule severity.
//
// W001 is not covered here: it already has a committed fixture
// (runtime-loop-unreachable-stop-W001.yaml) exercised by
// test-verification-and-runtime-loop.mjs.

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

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
  assert(`${label} has no errors`, result.stdout.includes("| Errors | 0 |"), result.stdout);
  assert(`${label} has no warnings`, result.stdout.includes("| Warnings | 0 |"), result.stdout);
}

function assertFails(file, code) {
  const result = runLint(file);
  assert(`${file} fails`, result.status === 1, result.stdout + result.stderr);
  assert(`${file} reports ${code}`, result.stdout.includes(`**${code}**`), result.stdout);
}

function assertWarns(file, code) {
  const result = runLint(file);
  assert(`${file} still passes`, result.status === 0, result.stdout + result.stderr);
  assert(`${file} has no errors`, result.stdout.includes("| Errors | 0 |"), result.stdout);
  assert(`${file} reports ${code}`, result.stdout.includes(`**${code}**`), result.stdout);
  assert(
    `${file} verdict is PASS WITH WARNINGS`,
    result.stdout.includes("| Verdict | **PASS WITH WARNINGS** |"),
    result.stdout,
  );
}

// fixture -> expected code. The file name carries the code too, but the map
// is the contract: a fixture renamed by mistake still has to report its rule.
const BROKEN = new Map([
  ["core.broken-E000-not-mapping.yaml", "E000"],
  ["core.broken-E001-no-name.yaml", "E001"],
  ["core.broken-E002-no-initial-state.yaml", "E002"],
  ["core.broken-E003-initial-state-undeclared.yaml", "E003"],
  ["core.broken-E004-no-states.yaml", "E004"],
  ["core.broken-E005-state-no-name.yaml", "E005"],
  ["core.broken-E006-event-no-name.yaml", "E006"],
  ["core.broken-E007-guard-no-name.yaml", "E007"],
  ["core.broken-E008-duplicate-state.yaml", "E008"],
  ["core.broken-E009-duplicate-event.yaml", "E009"],
  ["core.broken-E010-duplicate-guard.yaml", "E010"],
  ["core.broken-E011-transition-no-from.yaml", "E011"],
  ["core.broken-E012-transition-no-to.yaml", "E012"],
  ["core.broken-E013-transition-no-event.yaml", "E013"],
  ["core.broken-E014-from-undeclared.yaml", "E014"],
  ["core.broken-E015-to-undeclared.yaml", "E015"],
  ["core.broken-E016-event-undeclared.yaml", "E016"],
  ["core.broken-E017-guard-undeclared.yaml", "E017"],
  ["core.broken-E050-input-no-name.yaml", "E050"],
  ["core.broken-E051-input-no-type.yaml", "E051"],
  ["core.broken-E052-terminal-not-final.yaml", "E052"],
  ["core.broken-E053-output-no-name.yaml", "E053"],
  ["core.broken-E054-output-no-type.yaml", "E054"],
  ["core.broken-E055-input-not-declared.yaml", "E055"],
  ["core.broken-E056-assign-not-declared.yaml", "E056"],
  ["core.broken-E057-input-not-string.yaml", "E057"],
  ["core.broken-E058-child-no-schema.yaml", "E058"],
]);

const WARN = new Map([
  ["core.warn-W002-dead-end.yaml", "W002"],
  ["core.warn-W003-final-with-outgoing.yaml", "W003"],
  ["core.warn-W004-ambiguous-transition.yaml", "W004"],
]);

function scenarioBaseModels() {
  console.log("\nScenario 1: the base models the broken fixtures derive from are clean");

  assertClean("core.valid-minimal.yaml", "core.valid-minimal.yaml");
  assertClean("core.valid-invoke.yaml", "core.valid-invoke.yaml");
  assertClean("core.child-with-schema.yaml", "core.child-with-schema.yaml");
  assertClean("core.child-without-schema.yaml", "core.child-without-schema.yaml");
}

function scenarioBrokenFixtures() {
  console.log("\nScenario 2: every base error rule has a fixture that trips it");

  for (const [fixture, code] of BROKEN) {
    assertFails(fixture, code);
  }
}

function scenarioWarningFixtures() {
  console.log("\nScenario 3: every base warning rule has a fixture that trips it without failing");

  for (const [fixture, code] of WARN) {
    assertWarns(fixture, code);
  }
}

function scenarioRuleCoverage() {
  console.log("\nScenario 4: the fixture set and the rule set stay in step");

  const expectedErrorCodes = [
    ...Array.from({ length: 18 }, (_, i) => `E${String(i).padStart(3, "0")}`),
    ...Array.from({ length: 9 }, (_, i) => `E${String(50 + i).padStart(3, "0")}`),
  ];
  const coveredErrorCodes = new Set(BROKEN.values());
  for (const code of expectedErrorCodes) {
    assert(`${code} has a broken fixture`, coveredErrorCodes.has(code));
  }

  const expectedWarningCodes = ["W002", "W003", "W004"];
  const coveredWarningCodes = new Set(WARN.values());
  for (const code of expectedWarningCodes) {
    assert(`${code} has a warning fixture`, coveredWarningCodes.has(code));
  }

  // Every core.broken-* / core.warn-* file on disk must be listed above, so a
  // fixture added without an assertion is caught.
  const onDisk = readdirSync(FIXTURES).filter((f) => /^core\.(broken|warn)-/.test(f));
  for (const file of onDisk) {
    assert(`${file} is asserted by this test`, BROKEN.has(file) || WARN.has(file));
  }
  for (const file of [...BROKEN.keys(), ...WARN.keys()]) {
    assert(`${file} exists on disk`, onDisk.includes(file));
  }
}

scenarioBaseModels();
scenarioBrokenFixtures();
scenarioWarningFixtures();
scenarioRuleCoverage();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
