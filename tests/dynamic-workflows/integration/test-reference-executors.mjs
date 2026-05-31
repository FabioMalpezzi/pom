#!/usr/bin/env node

import { existsSync } from "node:fs";
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

function run(command, args) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function scenarioTypeScriptExecutor() {
  console.log("\nScenario 1: TypeScript executor propagates handle lifecycle signals");

  const baseArgs = ["--experimental-strip-types", "experiments/dynamic-workflows/runtime/dynamic-workflow.ts"];
  const detach = run(process.execPath, [
    ...baseArgs,
    "experiments/dynamic-workflows/workflows-candidate/14-handle-lifecycle.yaml",
    "--n",
    "2",
  ]);
  assert("TypeScript detach example exits zero", detach.status === 0, detach.stdout + detach.stderr);
  assert("TypeScript propagates detach to child handle", detach.stdout.includes("propago detach a 'audit_batch'"), detach.stdout);
  assert("TypeScript detach example reaches done", detach.stdout.includes("# terminal: done"), detach.stdout);

  const cancel = run(process.execPath, [
    ...baseArgs,
    "experiments/dynamic-workflows/workflows-candidate/15-handle-cancel-lifecycle.yaml",
    "--n",
    "2",
  ]);
  assert("TypeScript cancel example exits zero", cancel.status === 0, cancel.stdout + cancel.stderr);
  assert("TypeScript propagates cancel to child handle", cancel.stdout.includes("propago cancel a 'cancellable_batch'"), cancel.stdout);
  assert("TypeScript child compensation runs", cancel.stdout.includes("figlia compensa: annulla la transazione aperta"), cancel.stdout);
}

function pythonWithYaml() {
  const candidates = [
    process.env.POM_PYYAML_PYTHON,
    "/private/tmp/pom-pyyaml-venv/bin/python",
    "python3",
  ].filter(Boolean);

  for (const py of candidates) {
    if (py.includes("/") && !existsSync(py)) continue;
    const result = run(py, ["-c", "import yaml"]);
    if (result.status === 0) return py;
  }
  return null;
}

function scenarioPythonExecutor() {
  console.log("\nScenario 2: Python executor propagates handle lifecycle signals when PyYAML is available");

  const py = pythonWithYaml();
  if (!py) {
    assert("Python runtime check skipped because PyYAML is unavailable", true);
    return;
  }

  const detach = run(py, [
    "experiments/dynamic-workflows/runtime/dynamic_workflow.py",
    "experiments/dynamic-workflows/workflows-candidate/14-handle-lifecycle.yaml",
    "--n",
    "2",
  ]);
  assert("Python detach example exits zero", detach.status === 0, detach.stdout + detach.stderr);
  assert("Python propagates detach to child handle", detach.stdout.includes("propago detach a 'audit_batch'"), detach.stdout);
  assert("Python detach example reaches done", detach.stdout.includes("# terminal: done"), detach.stdout);

  const cancel = run(py, [
    "experiments/dynamic-workflows/runtime/dynamic_workflow.py",
    "experiments/dynamic-workflows/workflows-candidate/15-handle-cancel-lifecycle.yaml",
    "--n",
    "2",
  ]);
  assert("Python cancel example exits zero", cancel.status === 0, cancel.stdout + cancel.stderr);
  assert("Python propagates cancel to child handle", cancel.stdout.includes("propago cancel a 'cancellable_batch'"), cancel.stdout);
  assert("Python child compensation runs", cancel.stdout.includes("figlia compensa: annulla la transazione aperta"), cancel.stdout);
}

console.log("Dynamic Workflow Reference Executor Tests");
console.log("=========================================");

scenarioTypeScriptExecutor();
scenarioPythonExecutor();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
