#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
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
  assert(
    "TypeScript launches detached batch before awaiting primary",
    detach.stdout.indexOf("data-plane launch 'audit_batch'") >= 0 &&
      detach.stdout.indexOf("data-plane launch 'audit_batch'") < detach.stdout.indexOf("ATTESA (join all)"),
    detach.stdout,
  );
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

  const suspend = run(process.execPath, [
    ...baseArgs,
    "experiments/dynamic-workflows/workflows-candidate/14-handle-lifecycle.yaml",
    "--n",
    "2",
    "--suspend-at",
    "wait_primary",
  ]);
  assert("TypeScript suspend example exits zero", suspend.status === 0, suspend.stdout + suspend.stderr);
  assert("TypeScript propagates suspend to active child handle", suspend.stdout.includes("propago suspend a 'audit_batch'"), suspend.stdout);
  assert("TypeScript child confirms suspended state", suspend.stdout.includes("figlia sospesa: audit_batch"), suspend.stdout);
  assert(
    "TypeScript saves parent snapshot after child suspend",
    suspend.stdout.indexOf("figlia sospesa: audit_batch") < suspend.stdout.indexOf("snapshot salvato dopo suspend figlie: dynamic_handle_lifecycle:wait_primary"),
    suspend.stdout,
  );
  assert("TypeScript propagates resume to active child handle", suspend.stdout.includes("propago resume a 'audit_batch'"), suspend.stdout);
  assert("TypeScript child confirms resumed state", suspend.stdout.includes("figlia ripresa: audit_batch"), suspend.stdout);
}

function scenarioTypeScriptCandidateSuite() {
  console.log("\nScenario 2: TypeScript executor runs every Dynamic Workflow candidate");

  const baseArgs = ["--experimental-strip-types", "experiments/dynamic-workflows/runtime/dynamic-workflow.ts"];
  const dir = "experiments/dynamic-workflows/workflows-candidate";
  const files = readdirSync(dir).filter((file) => file.endsWith(".yaml")).sort();

  for (const file of files) {
    const result = run(process.execPath, [...baseArgs, `${dir}/${file}`, "--n", "2"]);
    assert(`TypeScript candidate ${file} exits zero`, result.status === 0, result.stdout + result.stderr);
    assert(`TypeScript candidate ${file} reaches terminal`, result.stdout.includes("# terminal:"), result.stdout);
  }
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
  console.log("\nScenario 3: Python executor propagates handle lifecycle signals when PyYAML is available");
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
  assert(
    "Python launches detached batch before awaiting primary",
    detach.stdout.indexOf("data-plane launch 'audit_batch'") >= 0 &&
      detach.stdout.indexOf("data-plane launch 'audit_batch'") < detach.stdout.indexOf("ATTESA (join all)"),
    detach.stdout,
  );
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

  const suspend = run(py, [
    "experiments/dynamic-workflows/runtime/dynamic_workflow.py",
    "experiments/dynamic-workflows/workflows-candidate/14-handle-lifecycle.yaml",
    "--n",
    "2",
    "--suspend-at",
    "wait_primary",
  ]);
  assert("Python suspend example exits zero", suspend.status === 0, suspend.stdout + suspend.stderr);
  assert("Python propagates suspend to active child handle", suspend.stdout.includes("propago suspend a 'audit_batch'"), suspend.stdout);
  assert("Python child confirms suspended state", suspend.stdout.includes("figlia sospesa: audit_batch"), suspend.stdout);
  assert(
    "Python saves parent snapshot after child suspend",
    suspend.stdout.indexOf("figlia sospesa: audit_batch") < suspend.stdout.indexOf("snapshot salvato dopo suspend figlie: dynamic_handle_lifecycle:wait_primary"),
    suspend.stdout,
  );
  assert("Python propagates resume to active child handle", suspend.stdout.includes("propago resume a 'audit_batch'"), suspend.stdout);
  assert("Python child confirms resumed state", suspend.stdout.includes("figlia ripresa: audit_batch"), suspend.stdout);

  return py;
}

function scenarioPythonCandidateSuite(py) {
  console.log("\nScenario 4: Python executor runs every Dynamic Workflow candidate when PyYAML is available");
  if (!py) {
    assert("Python candidate suite skipped because PyYAML is unavailable", true);
    return;
  }

  const dir = "experiments/dynamic-workflows/workflows-candidate";
  const files = readdirSync(dir).filter((file) => file.endsWith(".yaml")).sort();

  for (const file of files) {
    const result = run(py, ["experiments/dynamic-workflows/runtime/dynamic_workflow.py", `${dir}/${file}`, "--n", "2"]);
    assert(`Python candidate ${file} exits zero`, result.status === 0, result.stdout + result.stderr);
    assert(`Python candidate ${file} reaches terminal`, result.stdout.includes("# terminal:"), result.stdout);
  }
}

console.log("Dynamic Workflow Reference Executor Tests");
console.log("=========================================");

scenarioTypeScriptExecutor();
scenarioTypeScriptCandidateSuite();
const py = scenarioPythonExecutor();
scenarioPythonCandidateSuite(py);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
