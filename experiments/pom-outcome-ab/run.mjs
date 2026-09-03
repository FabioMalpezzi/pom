#!/usr/bin/env node
// Outcome A/B: does memory accumulated in earlier sessions change what an agent
// produces? Three arms over the same fixture, identical prompts, deterministic
// checks on the artifact.
//
//   node run.mjs --arm empty|flat|pom --task <id> [--repetitions N] [--output DIR] [--dry-run]
//
// Outcomes are written in the same shape the behavioral evaluator uses, so
// experiments/pom-block-step-cost/compare.mjs reads them without changes.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { TASKS } from "./tasks.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(ROOT, "../..");
const ARMS = new Set(["empty", "flat", "pom"]);
const DEFAULT_TIMEOUT_MS = 420_000;

// Copied into every arm: the method, the code, the formats. Never the content.
const FIXTURE_DIRS = ["skills", "prompts", "templates", "scripts", "agents", "examples", "tests"];
const FIXTURE_FILES = ["package.json", "package-lock.json", "README.md", "WIKI_METHOD.md", "pom.config.json", "bootstrap-pom.mjs"];
// Accumulated content: present in `pom`, absent in `empty` and `flat`.
const MEMORY_DIRS = ["decisions", "wiki", "specs", "tasks", "docs"];
const MEMORY_FILES = ["PROJECT_STATE.md", "CURRENT_PLAN.md", "CONTEXT.md", "AGENTS.MD", "CHANGELOG.md"];

function parseArgs(argv) {
  const options = { arm: null, task: null, repetitions: 1, output: join(ROOT, "evidence"), dryRun: false, timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") { options.dryRun = true; continue; }
    const value = argv[index + 1];
    if (arg === "--arm") { options.arm = value; index += 1; continue; }
    if (arg === "--task") { options.task = value; index += 1; continue; }
    if (arg === "--repetitions") { options.repetitions = Number.parseInt(value, 10); index += 1; continue; }
    if (arg === "--output") { options.output = resolve(value); index += 1; continue; }
    if (arg === "--timeout-ms") { options.timeoutMs = Number.parseInt(value, 10); index += 1; continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!ARMS.has(options.arm)) throw new Error(`--arm must be one of ${[...ARMS].join(", ")}`);
  if (options.task && !TASKS.some((task) => task.id === options.task)) throw new Error(`Unknown task: ${options.task}`);
  if (!Number.isInteger(options.repetitions) || options.repetitions < 1) throw new Error("--repetitions must be a positive integer");
  return options;
}

/**
 * Builds one arm of the fixture. Structure is identical in all three; only the
 * accumulated content differs, which is what the experiment isolates.
 */
function buildArm(arm, tasks) {
  const dir = mkdtempSync(join(tmpdir(), `pom-outcome-${arm}-`));

  for (const name of FIXTURE_DIRS) {
    const source = join(REPO_ROOT, name);
    if (existsSync(source)) cpSync(source, join(dir, name), { recursive: true });
  }
  for (const name of FIXTURE_FILES) {
    const source = join(REPO_ROOT, name);
    if (existsSync(source)) cpSync(source, join(dir, name));
  }

  if (arm === "pom") {
    for (const name of MEMORY_DIRS) {
      const source = join(REPO_ROOT, name);
      if (existsSync(source)) cpSync(source, join(dir, name), { recursive: true, filter: (path) => !path.includes(`${sep}_site`) });
    }
    for (const name of MEMORY_FILES) {
      const source = join(REPO_ROOT, name);
      if (existsSync(source)) cpSync(source, join(dir, name));
    }
  } else {
    // Day zero: the folders and the index/log exist, and hold nothing.
    mkdirSync(join(dir, "decisions"), { recursive: true });
    mkdirSync(join(dir, "wiki"), { recursive: true });
    writeFileSync(join(dir, "decisions/DECISIONS_INDEX.md"), "# Decisions Index\n\n| ADR | Title | Status | Date |\n|---|---|---|---|\n");
    writeFileSync(join(dir, "wiki/index.md"), "# Wiki Index\n\n## Overview\n\nNo pages yet.\n");
    writeFileSync(join(dir, "wiki/log.md"), "# Wiki Log\n\nNo entries yet.\n");
    writeFileSync(join(dir, "PROJECT_STATE.md"), "# Project State\n\n## Last Updated\n\n2026-09-03\n\n---\n\n## Dynamic Context\n\n### Current State\n\nNo restart context recorded yet.\n");
    // The instruction file carries the generated block only: what an installer
    // writes on day zero, with none of this project's own accumulated rules.
    const block = ["00-core.md", "60-skills.md"]
      .map((file) => readFileSync(join(REPO_ROOT, "templates/agents", file), "utf8").trim())
      .join("\n\n");
    writeFileSync(join(dir, "AGENTS.md"), `# Agent Instructions\n\n<!-- POM:START -->\n${block}\n<!-- POM:END -->\n`);
  }

  if (arm === "flat") {
    const notes = [
      "# Notes",
      "",
      "Things about this project that are worth remembering.",
      "",
      ...tasks.map((task) => `- ${task.decisiveFact}`),
      "",
    ].join("\n");
    writeFileSync(join(dir, "NOTES.md"), notes);
  }

  return dir;
}

function snapshot(dir) {
  const files = {};
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.isFile()) continue;
      const rel = relative(dir, full).replaceAll(sep, "/");
      files[rel] = createHash("sha1").update(readFileSync(full)).digest("hex");
    }
  };
  walk(dir);
  return files;
}

function runCommand(command, args, { cwd, timeoutMs }) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, PI_OFFLINE: process.env.PI_OFFLINE || "1", PI_TELEMETRY: "0" }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => { clearTimeout(timer); resolvePromise({ status, stdout, stderr, timedOut }); });
  });
}

function parseEvents(stdout) {
  const events = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* non-JSON output is ignored */ }
  }
  return events;
}

function behaviorFrom(events) {
  const steps = { toolCalls: 0, assistantTurns: 0, fileReads: 0, distinctFilesRead: 0, repeatedFileReads: 0, byTool: {} };
  const reads = [];
  const perMessage = { inputTokens: 0, outputTokens: 0, cost: 0, seen: false };
  const perTurn = { inputTokens: 0, outputTokens: 0, cost: 0, seen: false };
  const transcript = [];

  for (const event of events) {
    if (event.type === "tool_execution_start") {
      steps.toolCalls += 1;
      const tool = String(event.toolName || "unknown");
      steps.byTool[tool] = (steps.byTool[tool] || 0) + 1;
      if (tool === "read") reads.push(String(event.args?.path || event.args?.file || ""));
    }
    const message = event.message;
    if (message?.role !== "assistant") continue;
    if (event.type === "turn_end") steps.assistantTurns += 1;
    if (event.type === "message_end" || event.type === "turn_end") {
      const text = (message.content || []).filter((part) => part.type === "text").map((part) => part.text).join("\n");
      if (text) transcript.push(text);
      if (message.usage) {
        // message_end and turn_end carry the same usage; keep one, never both.
        const bucket = event.type === "message_end" ? perMessage : perTurn;
        bucket.seen = true;
        bucket.inputTokens += Number(message.usage.input || 0);
        bucket.outputTokens += Number(message.usage.output || 0);
        bucket.cost += Number(message.usage.cost?.total || 0);
      }
    }
  }

  steps.fileReads = reads.length;
  steps.distinctFilesRead = new Set(reads).size;
  steps.repeatedFileReads = reads.length - steps.distinctFilesRead;
  const selected = perMessage.seen ? perMessage : perTurn;
  const usage = selected.seen ? { inputTokens: selected.inputTokens, outputTokens: selected.outputTokens, cost: selected.cost, currency: null } : null;
  return { steps, usage, transcript: transcript.join("\n") };
}

function redact(text) {
  return text.replaceAll(process.env.HOME || "~", "~").replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-REDACTED");
}

async function runOne(task, options, repetition) {
  const startedAt = new Date().toISOString();
  const dir = buildArm(options.arm, TASKS);
  const before = snapshot(dir);

  const args = [
    "--mode", "json", "--no-session", "--no-context-files", "--no-skills",
    "--no-extensions", "--no-prompt-templates", "--no-themes", "--approve",
    "-p", task.prompt,
  ];
  const result = await runCommand("pi", args, { cwd: dir, timeoutMs: options.timeoutMs });
  const after = snapshot(dir);
  const behavior = behaviorFrom(parseEvents(result.stdout));

  let verdict;
  try {
    verdict = task.check({ root: dir, before, after });
  } catch (error) {
    verdict = { pass: false, reason: `check threw: ${error instanceof Error ? error.message : String(error)}` };
  }

  const runDir = join(options.output, options.arm, task.id, `rep-${repetition}`);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "transcript.sanitized.txt"), `${redact(behavior.transcript || result.stderr || "")}\n`);
  writeFileSync(join(runDir, "changed-files.json"), `${JSON.stringify({ added: Object.keys(after).filter((f) => !(f in before)), modified: Object.keys(after).filter((f) => f in before && before[f] !== after[f]) }, null, 2)}\n`);

  const outcome = {
    schemaVersion: "0.1",
    runId: options.runId,
    scenarioId: task.id,
    variant: options.arm,
    repetition,
    environment: { backend: "pi", backendVersion: options.piVersion, model: "provider default", pomCommit: options.pomCommit },
    startedAt,
    finishedAt: new Date().toISOString(),
    result: result.timedOut ? "timed_out" : verdict.pass ? "pass" : "fail",
    checks: [{ id: "artifact", kind: "deterministic", status: verdict.pass ? "pass" : "fail", summary: verdict.reason }],
    usage: behavior.usage,
    steps: behavior.steps,
    evidence: { summaryPath: relative(REPO_ROOT, join(runDir, "outcome.json")).replaceAll(sep, "/"), transcriptPath: relative(REPO_ROOT, join(runDir, "transcript.sanitized.txt")).replaceAll(sep, "/"), rawTranscriptCommitted: false, sanitized: true },
    reason: verdict.reason,
  };
  writeFileSync(join(runDir, "outcome.json"), `${JSON.stringify(outcome, null, 2)}\n`);
  rmSync(dir, { recursive: true, force: true });
  return outcome;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const selected = options.task ? TASKS.filter((task) => task.id === options.task) : TASKS;

  if (options.dryRun) {
    const dir = buildArm(options.arm, TASKS);
    const files = snapshot(dir);
    const memory = Object.keys(files).filter((file) => MEMORY_DIRS.some((d) => file.startsWith(`${d}/`)) || MEMORY_FILES.includes(file));
    console.log(`arm ${options.arm}: ${Object.keys(files).length} files, ${memory.length} of them accumulated memory`);
    console.log(`notes present: ${existsSync(join(dir, "NOTES.md"))}`);
    console.log(`tasks: ${selected.map((task) => task.id).join(", ")}`);
    rmSync(dir, { recursive: true, force: true });
    return;
  }

  const pi = await runCommand("pi", ["--version"], { cwd: REPO_ROOT, timeoutMs: 20_000 });
  const commit = await runCommand("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, timeoutMs: 20_000 });
  options.piVersion = pi.stdout.trim() || "unknown";
  options.pomCommit = commit.stdout.trim() || "unknown";
  options.runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${options.arm}`;

  for (const task of selected) {
    for (let repetition = 1; repetition <= options.repetitions; repetition += 1) {
      console.log(`Running ${task.id} rep ${repetition}/${options.repetitions} (${options.arm})`);
      const outcome = await runOne(task, options, repetition);
      console.log(`- ${outcome.result}: ${outcome.reason}`);
    }
  }
}

await main();
