#!/usr/bin/env node

/**
 * POM test runner.
 *
 * Discovers integration test files under tests/<area>/integration/*.mjs,
 * runs them one by one, and aggregates pass/fail counts from their final
 * "Results: X passed, Y failed" line. Exits non-zero when any file exits
 * non-zero or reports failed assertions.
 *
 * Zero dependencies: uses only Node standard library, consistent with the
 * rest of POM.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TESTS_ROOT = join(ROOT, "tests");

function discoverTestFiles() {
  if (!existsSync(TESTS_ROOT)) return [];
  const files = [];
  for (const area of readdirSync(TESTS_ROOT).sort()) {
    const areaDir = join(TESTS_ROOT, area);
    if (!statSync(areaDir).isDirectory()) continue;

    const integrationDir = join(areaDir, "integration");
    if (!existsSync(integrationDir) || !statSync(integrationDir).isDirectory()) continue;

    for (const entry of readdirSync(integrationDir).sort()) {
      if (entry.endsWith(".mjs")) {
        files.push(join("tests", area, "integration", entry));
      }
    }
  }
  return files;
}

function parseResults(stdout) {
  const match = stdout.match(/Results:\s+(\d+)\s+passed,\s+(\d+)\s+failed/);
  if (!match) return { passed: 0, failed: 0, parsed: false };
  return { passed: Number(match[1]), failed: Number(match[2]), parsed: true };
}

function runTestFile(file) {
  const start = Date.now();
  const result = spawnSync(process.execPath, [file], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const status = result.status ?? 1;
  const counts = parseResults(stdout);

  process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  return { file, status, elapsedSec, ...counts };
}

const files = discoverTestFiles();

if (files.length === 0) {
  console.log("POM tests: no integration test files found under tests/<area>/integration/*.mjs");
  process.exit(0);
}

console.log(`POM tests: discovered ${files.length} integration file${files.length === 1 ? "" : "s"}`);
console.log("");

const results = [];
for (const file of files) {
  console.log(`==> ${file}`);
  results.push(runTestFile(file));
  console.log("");
}

let totalPassed = 0;
let totalFailed = 0;
let anyExitFailure = false;

for (const r of results) {
  totalPassed += r.passed;
  totalFailed += r.failed;
  if (r.status !== 0) anyExitFailure = true;
}

console.log("------------------------------------------------------------");
console.log("POM tests summary:");
for (const r of results) {
  const label = r.status === 0 ? "OK  " : "FAIL";
  const counts = r.parsed ? `${r.passed} passed, ${r.failed} failed` : "no Results line parsed";
  console.log(`  [${label}] ${r.file}  (${counts}, ${r.elapsedSec}s)`);
}
console.log(`Aggregate: ${totalPassed} passed, ${totalFailed} failed across ${results.length} file(s)`);

if (anyExitFailure || totalFailed > 0) {
  process.exit(1);
}
