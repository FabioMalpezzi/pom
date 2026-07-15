#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(ROOT, "../..");
const DEFAULT_TIMEOUT_MS = 240_000;
const VARIANTS = new Set(["baseline", "candidate"]);

function parseArgs(argv) {
  const options = {
    variant: "baseline",
    fixture: "all",
    repetitions: 1,
    output: join(tmpdir(), "pom-task-plan-runs"),
    useGlobalPiConfig: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    dryRun: false,
    provider: process.env.POM_EVAL_PROVIDER || "",
    model: process.env.POM_EVAL_MODEL || "",
    piBin: "pi",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[(i += 1)] || "";
    if (a === "--variant") options.variant = next();
    else if (a === "--fixture") options.fixture = next();
    else if (a === "--repetitions") options.repetitions = Number.parseInt(next(), 10);
    else if (a === "--output") options.output = resolve(next());
    else if (a === "--timeout-ms") options.timeoutMs = Number.parseInt(next(), 10);
    else if (a === "--provider") options.provider = next();
    else if (a === "--model") options.model = next();
    else if (a === "--pi-bin") options.piBin = next();
    else if (a === "--use-global-pi-config") options.useGlobalPiConfig = true;
    else if (a === "--dry-run") options.dryRun = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!VARIANTS.has(options.variant)) throw new Error(`Unsupported variant: ${options.variant}`);
  if (!Number.isInteger(options.repetitions) || options.repetitions < 1) throw new Error("--repetitions must be >= 1");
  return options;
}

function read(path) {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

function listFixtures(fixture) {
  const dir = join(ROOT, "fixtures");
  const all = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")).sort();
  if (fixture === "all") return all;
  if (!all.includes(fixture)) throw new Error(`Unknown fixture: ${fixture}. Available: ${all.join(", ")}`);
  return [fixture];
}

function specOf(fixtureId) {
  const text = readFileSync(join(ROOT, "fixtures", `${fixtureId}.md`), "utf8");
  const start = text.indexOf("## Source spec");
  const end = text.indexOf("## Expected manifest");
  if (start === -1 || end === -1) throw new Error(`Fixture ${fixtureId} missing Source spec / Expected manifest sections`);
  return text.slice(text.indexOf("\n", start) + 1, end).trim();
}

function buildPrompt(fixtureId, variant) {
  const spec = specOf(fixtureId);
  const guidance = read("prompts/05-create-task-plan-from-spec.md");
  const template = read("templates/TASK_PLAN_TEMPLATE.md");
  const parts = [
    "Create a POM Task Plan for the specification below. Follow the POM planning guidance and template. Output ONLY the completed Task Plan in Markdown — no preamble, no commentary.",
    "",
    "=== SPECIFICATION ===",
    spec,
    "",
    "=== POM PLANNING GUIDANCE (prompts/05-create-task-plan-from-spec.md) ===",
    guidance,
    "",
    "=== TASK PLAN TEMPLATE (templates/TASK_PLAN_TEMPLATE.md) ===",
    template,
  ];
  if (variant === "candidate") {
    parts.push("", "=== ADDITIONAL OUTPUT CONTRACT (apply on top of the template) ===", readFileSync(join(ROOT, "candidate-contract.md"), "utf8"));
  }
  return parts.join("\n");
}

function redact(text) {
  return text
    .replaceAll(REPO_ROOT, "<POM_SOURCE>")
    .replaceAll(homedir(), "<HOME>")
    .replaceAll(tmpdir(), "<TMP>")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "<redacted-token>")
    .replace(/[A-Za-z0-9+/_-]{40,}={0,2}/g, (m) => (/[A-Z]/.test(m) && /[a-z]/.test(m) && /[0-9]/.test(m) ? "<redacted-token>" : m));
}

function runCommand(command, args, { cwd, env, timeoutMs }) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000).unref();
    }, timeoutMs);
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveRun({ code, stdout, stderr, timedOut });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolveRun({ code: null, stdout, stderr: `${stderr}\n${e.message}`, timedOut });
    });
  });
}

function planFromEvents(stdout) {
  const parts = [];
  let usage = null;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    const m = e.message;
    if (m?.role === "assistant" && e.type === "message_end") {
      const content = m.content;
      const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((p) => (p?.type === "text" ? p.text || "" : "")).join("") : "";
      if (text) parts.push(text);
      if (m.usage) usage = { inputTokens: Number(m.usage.input || 0), outputTokens: Number(m.usage.output || 0) };
    }
  }
  return { plan: parts.join("\n").trim(), usage };
}

async function generateOne(fixtureId, options, repetition, runId) {
  const workspace = mkdtempSync(join(tmpdir(), `pom-plan-${fixtureId}-${repetition}-`));
  const configRoot = join(workspace, "pi-home");
  const sessionRoot = join(workspace, "sessions");
  mkdirSync(configRoot, { recursive: true });
  mkdirSync(sessionRoot, { recursive: true });
  const prompt = buildPrompt(fixtureId, options.variant);
  const args = ["--mode", "json", "--no-session", "--no-context-files", "--no-skills", "--no-extensions", "--no-prompt-templates", "--no-themes", "--approve"];
  if (options.provider) args.push("--provider", options.provider);
  if (options.model) args.push("--model", options.model);
  args.push("-p", prompt);
  const env = { ...process.env, PI_CODING_AGENT_SESSION_DIR: sessionRoot, PI_TELEMETRY: process.env.PI_TELEMETRY || "0" };
  if (!options.useGlobalPiConfig) env.PI_CODING_AGENT_DIR = configRoot;

  const result = await runCommand(options.piBin, args, { cwd: workspace, env, timeoutMs: options.timeoutMs });
  const { plan, usage } = planFromEvents(result.stdout);
  const outDir = join(options.output, runId, fixtureId, options.variant, `rep-${repetition}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "plan.md"), `${redact(plan || result.stderr || "")}\n`);
  writeFileSync(
    join(outDir, "meta.json"),
    `${JSON.stringify({ fixture: fixtureId, variant: options.variant, repetition, runId, usage, timedOut: result.timedOut, exitCode: result.code, empty: !plan }, null, 2)}\n`,
  );
  rmSync(workspace, { recursive: true, force: true });
  return { fixtureId, repetition, empty: !plan, timedOut: result.timedOut, outDir };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixtures = listFixtures(options.fixture);
  if (options.dryRun) {
    console.log("Task plan generation dry-run");
    console.log(`- variant: ${options.variant}`);
    console.log(`- fixtures: ${fixtures.join(", ")}`);
    for (const f of fixtures) {
      const p = buildPrompt(f, options.variant);
      console.log(`- ${f}: prompt ${p.length} chars, spec ${specOf(f).length} chars`);
    }
    return;
  }
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${options.variant}`;
  const results = [];
  for (const f of fixtures) {
    for (let r = 1; r <= options.repetitions; r += 1) {
      console.log(`Generating ${f} rep ${r}/${options.repetitions} (${options.variant})`);
      const res = await generateOne(f, options, r, runId);
      console.log(`- ${res.empty ? "EMPTY" : "ok"}${res.timedOut ? " (timed out)" : ""}: ${res.outDir}`);
      results.push(res);
    }
  }
  console.log(`Run: ${join(options.output, runId)}`);
  if (results.some((r) => r.empty || r.timedOut)) process.exitCode = 1;
}

await main();
