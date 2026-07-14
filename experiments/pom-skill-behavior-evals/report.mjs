#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const RESULTS = ["pass", "fail", "skipped", "timed_out", "indeterminate"];

function parseArgs(argv) {
  const options = { input: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--input") {
      options.input = resolve(argv[index + 1] || "");
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.input) throw new Error("--input <run-directory> is required");
  if (!existsSync(options.input)) throw new Error(`Input directory not found: ${options.input}`);
  return options;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function scenarioMetadata() {
  const meta = new Map();
  for (const suite of ["core", "extended"]) {
    const path = join(ROOT, "scenarios", `${suite}.json`);
    if (!existsSync(path)) continue;
    for (const scenario of readJson(path)) {
      meta.set(scenario.id, { critical: scenario.critical, language: scenario.language, suite });
    }
  }
  return meta;
}

function collectOutcomes(inputDir) {
  const outcomes = [];
  const stack = [inputDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry === "outcome.json") outcomes.push(readJson(full));
    }
  }
  return outcomes;
}

function emptyCounts() {
  return RESULTS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function standardDeviation(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function failingCheckFrequency(outcomes) {
  const frequency = new Map();
  for (const outcome of outcomes) {
    for (const check of outcome.checks || []) {
      if (check.status !== "fail" && check.status !== "indeterminate") continue;
      frequency.set(check.id, (frequency.get(check.id) || 0) + 1);
    }
  }
  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id, count }));
}

function summarizeScenario(scenarioId, outcomes, meta) {
  const counts = emptyCounts();
  for (const outcome of outcomes) counts[outcome.result] += 1;
  const reps = outcomes.length;
  const passRate = reps > 0 ? counts.pass / reps : 0;
  const distinctResults = new Set(outcomes.map((outcome) => outcome.result));
  return {
    scenarioId,
    critical: meta.get(scenarioId)?.critical ?? null,
    language: meta.get(scenarioId)?.language ?? null,
    repetitions: reps,
    counts,
    passRate: Number(passRate.toFixed(3)),
    flaky: distinctResults.size > 1,
    failingChecks: failingCheckFrequency(outcomes),
  };
}

function buildReport(outcomes, meta) {
  const byScenario = new Map();
  for (const outcome of outcomes) {
    if (!byScenario.has(outcome.scenarioId)) byScenario.set(outcome.scenarioId, []);
    byScenario.get(outcome.scenarioId).push(outcome);
  }
  const scenarios = [...byScenario.keys()]
    .sort()
    .map((scenarioId) => summarizeScenario(scenarioId, byScenario.get(scenarioId), meta));

  const totals = emptyCounts();
  for (const outcome of outcomes) totals[outcome.result] += 1;

  const criticalScenarios = scenarios.filter((scenario) => scenario.critical === true);
  const criticalBelowFull = criticalScenarios.filter((scenario) => scenario.passRate < 1);
  const unresolved = scenarios.filter((scenario) => scenario.counts.indeterminate > 0 || scenario.counts.timed_out > 0);

  const environments = [
    ...new Set(
      outcomes.map((outcome) =>
        [outcome.environment?.backend, outcome.environment?.backendVersion, outcome.environment?.model, outcome.environment?.pomCommit]
          .filter(Boolean)
          .join(" | ")
      )
    ),
  ];

  return {
    schemaVersion: "0.1",
    generatedFrom: outcomes.length,
    scenarioCount: scenarios.length,
    environments,
    variant: [...new Set(outcomes.map((outcome) => outcome.variant))].sort(),
    totals,
    passRate: {
      overall: outcomes.length > 0 ? Number((totals.pass / outcomes.length).toFixed(3)) : 0,
      critical:
        criticalScenarios.length > 0
          ? Number(
              (
                criticalScenarios.reduce((sum, scenario) => sum + scenario.passRate, 0) / criticalScenarios.length
              ).toFixed(3)
            )
          : null,
      acrossScenarioStdDev: Number(standardDeviation(scenarios.map((scenario) => scenario.passRate)).toFixed(3)),
    },
    flakyScenarios: scenarios.filter((scenario) => scenario.flaky).map((scenario) => scenario.scenarioId),
    criticalBelowFull: criticalBelowFull.map((scenario) => scenario.scenarioId),
    unresolvedScenarios: unresolved.map((scenario) => scenario.scenarioId),
    scenarios,
  };
}

function printReport(report, inputDir) {
  console.log("POM skill behavior baseline report");
  console.log(`- input: ${inputDir}`);
  console.log(`- outcomes: ${report.generatedFrom} across ${report.scenarioCount} scenario(s)`);
  console.log(`- variant(s): ${report.variant.join(", ") || "none"}`);
  for (const environment of report.environments) console.log(`- environment: ${environment}`);
  console.log(`- totals: ${JSON.stringify(report.totals)}`);
  console.log(
    `- pass rate: overall ${report.passRate.overall}, critical ${report.passRate.critical}, cross-scenario stddev ${report.passRate.acrossScenarioStdDev}`
  );
  console.log(`- flaky scenarios: ${report.flakyScenarios.join(", ") || "none"}`);
  console.log(`- critical below 100%: ${report.criticalBelowFull.join(", ") || "none"}`);
  console.log(`- unresolved (indeterminate/timed_out): ${report.unresolvedScenarios.join(", ") || "none"}`);
  console.log("");
  console.log("Per scenario:");
  for (const scenario of report.scenarios) {
    const flag = scenario.critical ? "critical" : "non-critical";
    const distribution = RESULTS.filter((key) => scenario.counts[key] > 0)
      .map((key) => `${key}=${scenario.counts[key]}`)
      .join(" ");
    console.log(`- ${scenario.scenarioId} [${flag}, ${scenario.language}] pass ${scenario.passRate} (${distribution})${scenario.flaky ? " FLAKY" : ""}`);
    for (const check of scenario.failingChecks.slice(0, 6)) {
      console.log(`    x ${check.count}/${scenario.repetitions} ${check.id}`);
    }
  }
}

const options = parseArgs(process.argv.slice(2));
const outcomes = collectOutcomes(options.input);
if (outcomes.length === 0) throw new Error(`No outcome.json files found under ${options.input}`);
const report = buildReport(outcomes, scenarioMetadata());
const reportPath = join(options.input, "report.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report, options.input);
  console.log("");
  console.log(`- machine-readable report: ${reportPath}`);
}

if (report.criticalBelowFull.length > 0 || report.unresolvedScenarios.length > 0) process.exitCode = 1;
