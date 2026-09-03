#!/usr/bin/env node
// Compares two runs of the behavioral evaluator - one with the always-loaded POM
// section in the prompt, one without - on what the research on context files
// actually measures: steps and tool calls, not only input tokens.
//
//   node compare.mjs --with <runDir> --without <runDir> [--json <path>]
//
// Each run directory is what run.mjs writes: <runDir>/<scenario>/rep-N/outcome.json.
// Runs produced before 2026-09-03 carry no `steps` field; their counts are
// recomputed from the sanitized event log next to the outcome, so evidence
// already on disk can be compared without spending a single token.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const METRICS = [
  ["toolCalls", "tool calls"],
  ["assistantTurns", "assistant turns"],
  ["fileReads", "file reads"],
  ["repeatedFileReads", "repeated reads"],
  ["inputTokens", "input tokens"],
  ["outputTokens", "output tokens"],
  ["cost", "cost"],
];

function parseArgs(argv) {
  const options = { with: null, without: null, json: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--with" || arg === "--without" || arg === "--json") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} needs a value`);
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  for (const key of ["with", "without"]) {
    if (!options[key]) throw new Error(`--${key} <runDir> is required`);
    if (!existsSync(options[key])) throw new Error(`--${key} directory not found: ${options[key]}`);
  }
  return options;
}

/** Counts the steps of a run produced before the runner recorded them. */
function stepsFromEvents(eventsPath) {
  if (!existsSync(eventsPath)) return null;
  const steps = { toolCalls: 0, assistantTurns: 0, fileReads: 0, distinctFilesRead: 0, repeatedFileReads: 0 };
  const reads = [];
  for (const line of readFileSync(eventsPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "tool_execution_start") {
      steps.toolCalls += 1;
      if (event.toolName === "read") reads.push(String(event.args?.path || event.args?.file || ""));
    }
    if (event.type === "turn_end" && event.message?.role === "assistant") steps.assistantTurns += 1;
  }
  steps.fileReads = reads.length;
  steps.distinctFilesRead = new Set(reads).size;
  steps.repeatedFileReads = reads.length - steps.distinctFilesRead;
  return steps;
}

function collectOutcomes(runDir) {
  const outcomes = [];
  for (const scenario of readdirSync(runDir).sort()) {
    const scenarioDir = join(runDir, scenario);
    if (!statSync(scenarioDir).isDirectory()) continue;
    for (const repetition of readdirSync(scenarioDir).sort()) {
      const outcomePath = join(scenarioDir, repetition, "outcome.json");
      if (!existsSync(outcomePath)) continue;
      const outcome = JSON.parse(readFileSync(outcomePath, "utf8"));
      const steps = outcome.steps || stepsFromEvents(join(scenarioDir, repetition, "events.sanitized.jsonl"));
      outcomes.push({ ...outcome, steps, stepsRecomputed: !outcome.steps && Boolean(steps) });
    }
  }
  return outcomes;
}

function metricValues(outcome) {
  return {
    toolCalls: outcome.steps?.toolCalls ?? null,
    assistantTurns: outcome.steps?.assistantTurns ?? null,
    fileReads: outcome.steps?.fileReads ?? null,
    repeatedFileReads: outcome.steps?.repeatedFileReads ?? null,
    inputTokens: outcome.usage?.inputTokens ?? null,
    outputTokens: outcome.usage?.outputTokens ?? null,
    cost: outcome.usage?.cost ?? null,
  };
}

function mean(values) {
  const numbers = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (numbers.length === 0) return null;
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

function summarize(outcomes) {
  const summary = { runs: outcomes.length, results: {}, metrics: {}, recomputed: 0 };
  for (const outcome of outcomes) {
    summary.results[outcome.result] = (summary.results[outcome.result] || 0) + 1;
    if (outcome.stepsRecomputed) summary.recomputed += 1;
  }
  const values = outcomes.map(metricValues);
  for (const [key] of METRICS) summary.metrics[key] = mean(values.map((entry) => entry[key]));
  return summary;
}

function byScenario(outcomes) {
  const grouped = new Map();
  for (const outcome of outcomes) {
    if (!grouped.has(outcome.scenarioId)) grouped.set(outcome.scenarioId, []);
    grouped.get(outcome.scenarioId).push(outcome);
  }
  return grouped;
}

function formatNumber(value) {
  if (value === null) return "n/a";
  if (Number.isInteger(value)) return String(value);
  return value < 1 ? value.toFixed(4) : value.toFixed(2);
}

function formatDelta(withValue, withoutValue) {
  if (withValue === null || withoutValue === null) return "n/a";
  const absolute = withValue - withoutValue;
  const sign = absolute > 0 ? "+" : "";
  if (withoutValue === 0) return `${sign}${formatNumber(absolute)}`;
  const percent = (absolute / withoutValue) * 100;
  return `${sign}${formatNumber(absolute)} (${sign}${percent.toFixed(1)}%)`;
}

function printTable(rows) {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => String(row[column]).length)));
  rows.forEach((row, index) => {
    console.log(row.map((cell, column) => String(cell).padEnd(widths[column])).join("  "));
    if (index === 0) console.log(widths.map((width) => "-".repeat(width)).join("  "));
  });
}

const options = parseArgs(process.argv.slice(2));
const withOutcomes = collectOutcomes(options.with);
const withoutOutcomes = collectOutcomes(options.without);

if (withOutcomes.length === 0 || withoutOutcomes.length === 0) {
  console.error("Both runs must contain at least one outcome.json.");
  process.exit(1);
}

const withSummary = summarize(withOutcomes);
const withoutSummary = summarize(withoutOutcomes);

console.log("POM always-loaded block: step cost A/B");
console.log("");
console.log(`with block:    ${options.with} (${withSummary.runs} runs, results ${JSON.stringify(withSummary.results)})`);
console.log(`without block: ${options.without} (${withoutSummary.runs} runs, results ${JSON.stringify(withoutSummary.results)})`);
if (withSummary.recomputed || withoutSummary.recomputed) {
  console.log(`steps recomputed from event logs for ${withSummary.recomputed + withoutSummary.recomputed} run(s) that predate step recording.`);
}
console.log("");

printTable([
  ["metric", "with block", "without block", "difference"],
  ...METRICS.map(([key, label]) => [
    label,
    formatNumber(withSummary.metrics[key]),
    formatNumber(withoutSummary.metrics[key]),
    formatDelta(withSummary.metrics[key], withoutSummary.metrics[key]),
  ]),
]);

console.log("");
console.log("Per scenario (mean tool calls / mean input tokens / results):");
console.log("");

const withByScenario = byScenario(withOutcomes);
const withoutByScenario = byScenario(withoutOutcomes);
const scenarios = [...new Set([...withByScenario.keys(), ...withoutByScenario.keys()])].sort();

printTable([
  ["scenario", "with", "without", "tool call diff", "with results", "without results"],
  ...scenarios.map((scenario) => {
    const a = summarize(withByScenario.get(scenario) || []);
    const b = summarize(withoutByScenario.get(scenario) || []);
    return [
      scenario,
      `${formatNumber(a.metrics.toolCalls)} / ${formatNumber(a.metrics.inputTokens)}`,
      `${formatNumber(b.metrics.toolCalls)} / ${formatNumber(b.metrics.inputTokens)}`,
      formatDelta(a.metrics.toolCalls, b.metrics.toolCalls),
      JSON.stringify(a.results),
      JSON.stringify(b.results),
    ];
  }),
]);

console.log("");
console.log("A difference in steps is only interpretable when both arms hold the same result mix:");
console.log("an arm that fails a scenario early is cheaper for the wrong reason.");

if (options.json) {
  const report = {
    generatedAt: new Date().toISOString(),
    with: { runDir: options.with, summary: withSummary },
    without: { runDir: options.without, summary: withoutSummary },
    scenarios: scenarios.map((scenario) => ({
      scenarioId: scenario,
      with: summarize(withByScenario.get(scenario) || []),
      without: summarize(withoutByScenario.get(scenario) || []),
    })),
  };
  writeFileSync(options.json, `${JSON.stringify(report, null, 2)}\n`);
  console.log("");
  console.log(`Wrote ${options.json}`);
}
