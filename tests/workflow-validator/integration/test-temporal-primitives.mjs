#!/usr/bin/env node

import { createHarness, runNode } from "../../lib/harness.mjs";

const FIXTURES = "tests/workflow-validator/fixtures";

const { assert, section, banner, summary } = createHarness({ name: "Workflow Temporal Primitive Tests" });

function runLint(path) {
  return runNode(["scripts/lint-workflows.mjs", path]);
}

function scenarioTemporalPrimitives() {
  section("Scenario 1: loop_guard and timeout validate statically");

  const valid = runLint(`${FIXTURES}/loop-guard-timeout.yaml`);
  assert("combined H6/H7 example passes", valid.status === 0, valid.stdout + valid.stderr);
  assert("combined H6/H7 example has no warnings", valid.stdout.includes("| Warnings | 0 |"), valid.stdout);

  const warning = runLint(`${FIXTURES}/loop-guard-unused-override-warning.yaml`);
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
    const result = runLint(`${FIXTURES}/${fixture}`);
    assert(`${fixture} fails`, result.status === 1, result.stdout + result.stderr);
    assert(`${fixture} reports ${code}`, result.stdout.includes(`**${code}**`), result.stdout);
  }
}

banner();

scenarioTemporalPrimitives();

summary();
