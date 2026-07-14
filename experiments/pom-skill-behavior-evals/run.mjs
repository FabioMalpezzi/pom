#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(ROOT, "../..");
const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_OUTPUT_ROOT = join(tmpdir(), "pom-skill-behavior-runs");

const ACTIONS = new Set([
  "load_using_pom",
  "load_selected_skill",
  "read_config",
  "read_source",
  "announce_route",
  "ask_clarification",
  "gather_failure_evidence",
  "run_verification",
  "edit_file",
  "create_governed_artifact",
  "create_wiki",
  "create_decision",
  "create_task_plan",
  "claim_success",
  "inject_pom_bootstrap",
]);
const PROJECT_SHAPES = new Set(["pom_source", "target_project", "non_pom_project"]);
const TRUST_VALUES = new Set(["trusted", "untrusted"]);
const LANGUAGES = new Set(["en", "it"]);
const SUITES = new Set(["core", "extended"]);
const SESSION_EVENTS = new Set(["startup", "post_compaction"]);
const OUTCOME_RESULTS = new Set(["pass", "fail", "skipped", "timed_out", "indeterminate"]);
const BACKENDS = new Set(["pi"]);

function parseArgs(argv) {
  const options = {
    backend: "pi",
    dryRun: false,
    keepTemp: false,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    useGlobalPiConfig: false,
    repetitions: 1,
    scenarioId: null,
    suite: "core",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    variant: "baseline",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--keep-temp") {
      options.keepTemp = true;
      continue;
    }
    if (arg === "--use-global-pi-config") {
      options.useGlobalPiConfig = true;
      continue;
    }
    if (arg === "--backend") {
      options.backend = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--variant") {
      options.variant = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--suite") {
      options.suite = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--scenario") {
      options.scenarioId = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--repetitions") {
      options.repetitions = Number.parseInt(argv[index + 1] || "", 10);
      index += 1;
      continue;
    }
    if (arg === "--timeout-ms") {
      options.timeoutMs = Number.parseInt(argv[index + 1] || "", 10);
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.outputRoot = resolve(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg === "--provider") {
      options.provider = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--model") {
      options.model = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--pi-bin") {
      options.piBin = argv[index + 1] || "";
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!SUITES.has(options.suite)) throw new Error(`Unsupported suite: ${options.suite}`);
  if (!BACKENDS.has(options.backend)) throw new Error(`Unsupported backend: ${options.backend}`);
  if (!Number.isInteger(options.repetitions) || options.repetitions < 1) {
    throw new Error("--repetitions must be a positive integer");
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error("--timeout-ms must be an integer >= 1000");
  }
  if (!options.provider && process.env.POM_EVAL_PROVIDER) options.provider = process.env.POM_EVAL_PROVIDER;
  if (!options.model && process.env.POM_EVAL_MODEL) options.model = process.env.POM_EVAL_MODEL;
  if (!options.variant) throw new Error("--variant must not be empty");
  return options;
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8"));
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function add(issues, path, message) {
  issues.push(`${path}: ${message}`);
}

function requireString(issues, value, path, { minLength = 1, pattern } = {}) {
  if (typeof value !== "string") {
    add(issues, path, "must be a string");
    return;
  }
  if (value.length < minLength) add(issues, path, `must contain at least ${minLength} characters`);
  if (pattern && !pattern.test(value)) add(issues, path, `does not match ${pattern}`);
}

function requireStringArray(issues, value, path, { action = false } = {}) {
  if (!Array.isArray(value)) {
    add(issues, path, "must be an array");
    return;
  }
  const seen = new Set();
  value.forEach((item, index) => {
    requireString(issues, item, `${path}[${index}]`);
    if (typeof item !== "string") return;
    if (seen.has(item)) add(issues, `${path}[${index}]`, "duplicates an earlier value");
    seen.add(item);
    if (action && !ACTIONS.has(item)) add(issues, `${path}[${index}]`, `unknown action ${item}`);
  });
}

function validateArtifactPaths(issues, value, path) {
  requireStringArray(issues, value, path);
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    if (typeof item === "string" && isAbsolute(item)) add(issues, `${path}[${index}]`, "must be project-relative");
    if (typeof item === "string" && item.split("/").includes("..")) add(issues, `${path}[${index}]`, "must not escape the fixture root");
  });
}

function validateSetup(issues, setup, path) {
  if (!isObject(setup)) {
    add(issues, path, "must be an object");
    return;
  }
  if (!PROJECT_SHAPES.has(setup.projectShape)) add(issues, `${path}.projectShape`, "has an unsupported value");
  if (!TRUST_VALUES.has(setup.trust)) add(issues, `${path}.trust`, "has an unsupported value");
  requireString(issues, setup.fixture, `${path}.fixture`, { pattern: /^[a-z0-9][a-z0-9-]+$/ });
  if (setup.sessionEvent !== undefined && !SESSION_EVENTS.has(setup.sessionEvent)) {
    add(issues, `${path}.sessionEvent`, "has an unsupported value");
  }
  if (setup.pomConfig !== undefined && setup.pomConfig !== null && !isObject(setup.pomConfig)) {
    add(issues, `${path}.pomConfig`, "must be an object or null");
  }
}

function validateOrder(issues, value, path) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    add(issues, path, "must be an array");
    return;
  }
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isObject(entry)) {
      add(issues, entryPath, "must be an object");
      return;
    }
    for (const key of ["before", "after"]) {
      requireString(issues, entry[key], `${entryPath}.${key}`);
      if (typeof entry[key] === "string" && !ACTIONS.has(entry[key])) {
        add(issues, `${entryPath}.${key}`, `unknown action ${entry[key]}`);
      }
    }
  });
}

function validateExpectation(issues, expect, path) {
  if (!isObject(expect)) {
    add(issues, path, "must be an object");
    return;
  }
  requireString(issues, expect.route, `${path}.route`, { pattern: /^(none|[a-z][a-z0-9-]*)$/ });
  requireStringArray(issues, expect.requiredSkills, `${path}.requiredSkills`);
  if (expect.forbiddenSkills !== undefined) requireStringArray(issues, expect.forbiddenSkills, `${path}.forbiddenSkills`);
  requireStringArray(issues, expect.requiredReads, `${path}.requiredReads`);
  requireStringArray(issues, expect.requiredActions, `${path}.requiredActions`, { action: true });
  requireStringArray(issues, expect.prohibitedActions, `${path}.prohibitedActions`, { action: true });
  validateOrder(issues, expect.requiredOrder, `${path}.requiredOrder`);

  if (!isObject(expect.artifacts)) {
    add(issues, `${path}.artifacts`, "must be an object");
  } else {
    validateArtifactPaths(issues, expect.artifacts.mustExist, `${path}.artifacts.mustExist`);
    validateArtifactPaths(issues, expect.artifacts.mustNotExist, `${path}.artifacts.mustNotExist`);
  }
  if (expect.transcriptIncludes !== undefined) requireStringArray(issues, expect.transcriptIncludes, `${path}.transcriptIncludes`);
  if (expect.transcriptExcludes !== undefined) requireStringArray(issues, expect.transcriptExcludes, `${path}.transcriptExcludes`);
  requireStringArray(issues, expect.verdictRules, `${path}.verdictRules`);
  if (Array.isArray(expect.verdictRules) && expect.verdictRules.length === 0) add(issues, `${path}.verdictRules`, "must not be empty");

  const requiredSkills = Array.isArray(expect.requiredSkills) ? expect.requiredSkills : [];
  if (expect.route === "none" && requiredSkills.length > 0) add(issues, `${path}.requiredSkills`, "must be empty when route is none");
  if (expect.route !== "none" && !requiredSkills.includes("using-pom")) {
    add(issues, `${path}.requiredSkills`, "must include using-pom for a POM route");
  }
  if (expect.route !== "none" && expect.route !== "using-pom" && !requiredSkills.includes(expect.route)) {
    add(issues, `${path}.requiredSkills`, `must include selected route ${expect.route}`);
  }
}

export function validateScenario(scenario, label = "scenario") {
  const issues = [];
  if (!isObject(scenario)) return [`${label}: must be an object`];
  if (scenario.schemaVersion !== "0.1") add(issues, `${label}.schemaVersion`, "must equal 0.1");
  requireString(issues, scenario.id, `${label}.id`, { pattern: /^[a-z0-9][a-z0-9-]+$/ });
  if (!SUITES.has(scenario.suite)) add(issues, `${label}.suite`, "has an unsupported value");
  if (typeof scenario.critical !== "boolean") add(issues, `${label}.critical`, "must be boolean");
  if (!LANGUAGES.has(scenario.language)) add(issues, `${label}.language`, "has an unsupported value");
  validateSetup(issues, scenario.setup, `${label}.setup`);
  requireString(issues, scenario.prompt, `${label}.prompt`, { minLength: 20 });
  validateExpectation(issues, scenario.expect, `${label}.expect`);
  return issues;
}

function validateCollection(scenarios, suite) {
  const issues = [];
  if (!Array.isArray(scenarios)) return ["scenarios: must be an array"];
  const ids = new Set();
  scenarios.forEach((scenario, index) => {
    issues.push(...validateScenario(scenario, `scenarios[${index}]`));
    if (!isObject(scenario) || typeof scenario.id !== "string") return;
    if (ids.has(scenario.id)) add(issues, `scenarios[${index}].id`, `duplicates ${scenario.id}`);
    ids.add(scenario.id);
    if (scenario.suite !== suite) add(issues, `scenarios[${index}].suite`, `must match selected suite ${suite}`);
  });
  if (suite === "core") {
    if (scenarios.length !== 10) add(issues, "scenarios", `core suite must contain 10 scenarios, found ${scenarios.length}`);
    for (const language of LANGUAGES) {
      if (!scenarios.some((scenario) => scenario.language === language)) add(issues, "scenarios", `core suite must include language ${language}`);
    }
    if (!scenarios.some((scenario) => scenario.critical === false)) add(issues, "scenarios", "core suite needs at least one non-critical scenario");
  }
  return issues;
}

function assertSchemaDocuments() {
  for (const file of ["scenario.schema.json", "outcome.schema.json"]) {
    const schema = readJson(`schema/${file}`);
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
      throw new Error(`schema/${file}: unsupported or missing $schema`);
    }
    if (schema.additionalProperties !== false) throw new Error(`schema/${file}: root additionalProperties must be false`);
  }
}

function loadScenarios(suite, scenarioId) {
  assertSchemaDocuments();
  const scenarios = readJson(`scenarios/${suite}.json`);
  const issues = validateCollection(scenarios, suite);
  if (issues.length > 0) throw new Error(`Scenario contract validation failed:\n- ${issues.join("\n- ")}`);
  const selected = scenarioId ? scenarios.filter((scenario) => scenario.id === scenarioId) : scenarios;
  if (scenarioId && selected.length === 0) throw new Error(`Unknown scenario for suite ${suite}: ${scenarioId}`);
  return { scenarios, selected };
}

function assertKnownBadRejected() {
  const broken = readJson("fixtures/broken/scenario-missing-route.json");
  const brokenIssues = validateScenario(broken, "known-bad");
  if (!brokenIssues.some((issue) => issue.includes("expect.route"))) {
    throw new Error("Known-bad control was not rejected for its missing route.");
  }
  return brokenIssues;
}

function validateFixtureSetup(selected, options) {
  const issues = [];
  selected.forEach((scenario, index) => {
    const workspace = createRunWorkspace(scenario, options, index + 1);
    try {
      const requiredPaths = hasPomContext(scenario)
        ? ["skills/using-pom.md", "prompts/32-using-pom.md", "src/example.js", "package.json"]
        : ["src/example.js", "package.json"];
      for (const requiredPath of requiredPaths) {
        if (!existsSync(join(workspace.fixtureRoot, requiredPath))) issues.push(`${scenario.id}: missing ${requiredPath}`);
      }
      if (!hasPomContext(scenario) && existsSync(join(workspace.fixtureRoot, "skills/using-pom.md"))) {
        issues.push(`${scenario.id}: non-POM fixture must not contain POM sources`);
      }
      if (scenario.setup.pomConfig && !existsSync(join(workspace.fixtureRoot, "pom.config.json"))) {
        issues.push(`${scenario.id}: missing pom.config.json`);
      }
    } finally {
      rmSync(workspace.workspace, { recursive: true, force: true });
    }
  });
  return issues;
}

function runDryRun(options) {
  const { scenarios, selected } = loadScenarios(options.suite, options.scenarioId);
  const brokenIssues = assertKnownBadRejected();
  const fixtureIssues = validateFixtureSetup(selected, options);
  if (fixtureIssues.length > 0) throw new Error(`Fixture setup validation failed:\n- ${fixtureIssues.join("\n- ")}`);
  const critical = selected.filter((scenario) => scenario.critical).length;
  console.log("POM skill behavior contract dry-run");
  console.log(`- suite: ${options.suite}`);
  console.log(`- scenarios in suite: ${scenarios.length}`);
  console.log(`- selected scenarios: ${selected.length}`);
  console.log(`- selected critical: ${critical}`);
  console.log(`- languages: ${[...new Set(selected.map((scenario) => scenario.language))].sort().join(", ")}`);
  console.log(`- known-bad control: rejected (${brokenIssues[0]})`);
  console.log("- fixture setup: implemented for dry-run and real-session runs");
  console.log("- real-session execution: use without --dry-run");
}

function safeCopyDir(source, target) {
  cpSync(source, target, {
    recursive: true,
    filter: (src) => !src.includes(`${sep}.git${sep}`) && !src.includes(`${sep}node_modules${sep}`),
  });
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createPomSourceCopy(targetRoot, variant) {
  for (const dir of ["skills", "prompts", "templates"]) {
    safeCopyDir(join(REPO_ROOT, dir), join(targetRoot, dir));
  }
  for (const file of ["README.md", "CONTEXT.md", "WIKI_METHOD.md", "bootstrap-pom.mjs"]) {
    const source = join(REPO_ROOT, file);
    if (existsSync(source)) cpSync(source, join(targetRoot, file));
  }
  if (variant === "broken-no-bootstrap") {
    const usingPomPath = join(targetRoot, "skills/using-pom.md");
    const original = readFileSync(usingPomPath, "utf8");
    writeFileSync(
      usingPomPath,
      original.replace(
        "- Read the canonical prompt before any POM action.",
        "- Do not read the canonical prompt before POM action; answer directly from the request."
      ).replace(
        "- Use `skills/README.md` as the skill catalog; do not route from memory alone.",
        "- Do not use `skills/README.md`; route from memory alone."
      )
    );
  }
}

function createFixtureFiles(fixtureRoot, scenario) {
  mkdirSync(join(fixtureRoot, "src"), { recursive: true });
  writeFileSync(join(fixtureRoot, "README.md"), `# ${scenario.setup.fixture}\n\nSynthetic fixture for ${scenario.id}.\n`);
  writeFileSync(join(fixtureRoot, "package.json"), JSON.stringify({ type: "module", scripts: { test: "node test.mjs" } }, null, 2));
  writeFileSync(join(fixtureRoot, "src/example.js"), "export function example(value) {\n  const helper = value + 1;\n  return helper;\n}\n");
  writeFileSync(join(fixtureRoot, "test.mjs"), "import { example } from './src/example.js';\nif (example(1) !== 2) throw new Error('example failed');\nconsole.log('fixture test passed');\n");

  if (scenario.setup.projectShape !== "non_pom_project" || scenario.setup.pomConfig) {
    writeJson(join(fixtureRoot, "pom.config.json"), scenario.setup.pomConfig || { ownership: { mode: "owned" } });
  }

  if (scenario.setup.fixture === "failing-test-project") {
    writeFileSync(join(fixtureRoot, "src/example.js"), "export function addOne(value) {\n  return value + 2;\n}\n");
    writeFileSync(join(fixtureRoot, "test.mjs"), "import { addOne } from './src/example.js';\nif (addOne(1) !== 2) throw new Error('expected addOne(1) to equal 2');\n");
  }

  if (scenario.setup.fixture === "verification-fails") {
    mkdirSync(join(fixtureRoot, "tasks"), { recursive: true });
    writeFileSync(join(fixtureRoot, "tasks/current-task.md"), "# Current Task\n\nStatus: In review\n\nGoal: keep verification honest.\n");
    writeFileSync(join(fixtureRoot, "test.mjs"), "throw new Error('verification gate failed');\n");
  }

  if (scenario.setup.fixture === "post-compaction-target") {
    mkdirSync(join(fixtureRoot, ".pom-reader"), { recursive: true });
    writeJson(join(fixtureRoot, ".pom-reader/annotation.json"), {
      id: "ann-001",
      status: "new",
      note: "Check whether the selected text needs a source-backed edit.",
    });
  }
}

function createRunWorkspace(scenario, options, repetition) {
  const workspace = mkdtempSync(join(tmpdir(), `pom-eval-${scenario.id}-${repetition}-`));
  const fixtureRoot = join(workspace, "project");
  const configRoot = join(workspace, "pi-home");
  const sessionRoot = join(workspace, "sessions");
  mkdirSync(fixtureRoot, { recursive: true });
  mkdirSync(configRoot, { recursive: true });
  mkdirSync(sessionRoot, { recursive: true });

  // A genuine non-POM scenario must contain no POM sources; copying them in and preloading
  // the bootstrap would contaminate the negative "no POM injection" case. Adoption scenarios
  // live in a project without POM yet still need the POM method available to route, so the
  // signal is whether a POM route is expected, not the project shape.
  if (hasPomContext(scenario)) {
    createPomSourceCopy(fixtureRoot, options.variant);
  }
  createFixtureFiles(fixtureRoot, scenario);

  return { workspace, fixtureRoot, configRoot, sessionRoot };
}

function buildPrompt(scenario) {
  const lines = [];
  if (scenario.setup.sessionEvent === "post_compaction") {
    lines.push("The previous session was compacted. Restore any needed POM bootstrap from disk before choosing a workflow.");
  }
  lines.push(scenario.prompt);
  lines.push("");
  lines.push("Keep the observation window short. Do not make durable project changes unless the requested workflow and project rules clearly allow them.");
  return lines.join("\n");
}

// A scenario carries POM context when it expects a POM route; only the genuine non-POM
// negative case (route "none") withholds the POM method entirely.
function hasPomContext(scenario) {
  return scenario.expect.route !== "none";
}

function preloadedSkills(scenario) {
  // Only the always-on bootstrap router is preloaded, mirroring how POM installs it.
  // The selected skill and catalog stay on disk so the agent must read them to route,
  // which keeps routing observable instead of handing every skill card to the model.
  if (!hasPomContext(scenario)) return [];
  return ["using-pom"];
}

function buildPiArgs(scenario, options, workspace) {
  const skillFiles = preloadedSkills(scenario).map((name) =>
    join(workspace.fixtureRoot, `skills/${name}.md`)
  );
  const args = [
    "--mode",
    "json",
    "--no-session",
    "--no-context-files",
    "--no-skills",
    "--no-extensions",
    "--no-prompt-templates",
    "--no-themes",
    scenario.setup.trust === "trusted" ? "--approve" : "--no-approve",
  ];
  if (options.provider) args.push("--provider", options.provider);
  if (options.model) args.push("--model", options.model);
  for (const skillFile of skillFiles) args.push("--skill", skillFile);
  args.push("-p", buildPrompt(scenario));
  return args;
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
      setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolveRun({ code, signal, stdout, stderr, timedOut });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolveRun({ code: null, signal: null, stdout, stderr: `${stderr}\n${error.message}`, timedOut });
    });
  });
}

function redact(text) {
  return (
    text
      .replaceAll(REPO_ROOT, "<POM_SOURCE>")
      .replaceAll(tmpdir(), "<TMP>")
      .replaceAll(homedir(), "<HOME>")
      // Provider-key shapes, redacted regardless of adjacency (a preceding letter would defeat \b).
      .replace(/sk-[A-Za-z0-9_-]{20,}/g, "<redacted-token>")
      // Signature/id blobs: long contiguous runs (base64url-ish, so `-`/`_` allowed) that mix
      // upper+lower+digit. File slugs are lowercase/hyphenated and lack that mix, so they survive
      // for artifact-path review; opaque session/reasoning tokens are masked.
      .replace(/[A-Za-z0-9+/_-]{40,}={0,2}/g, (match) =>
        /[A-Z]/.test(match) && /[a-z]/.test(match) && /[0-9]/.test(match) ? "<redacted-token>" : match
      )
  );
}

function parseJsonLines(stdout) {
  const events = [];
  const invalidLines = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      invalidLines.push(line);
    }
  }
  return { events, invalidLines };
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part?.type === "text") return part.text || "";
      if (part?.type === "toolCall") return `[tool:${part.name}]`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function pathFromToolArgs(args) {
  if (!isObject(args)) return "";
  return String(args.path || args.file || args.filename || args.command || "");
}

function relativeToolPath(rawPath, fixtureRoot) {
  if (!rawPath) return "";
  const firstLine = rawPath.split(/\r?\n/)[0];
  const clean = firstLine.replace(/^['"]|['"]$/g, "");
  if (isAbsolute(clean)) return relative(fixtureRoot, clean).replaceAll(sep, "/");
  return clean.replaceAll(sep, "/");
}

function pushAction(actions, action, source, detail) {
  if (!ACTIONS.has(action)) throw new Error(`Internal unknown action: ${action}`);
  actions.push({ action, source, detail: detail || null });
}

function classifyPathAction(actions, reads, toolName, args, fixtureRoot, route) {
  const rawPath = pathFromToolArgs(args);
  const relPath = relativeToolPath(rawPath, fixtureRoot);
  const normalized = relPath.replace(/^\.\//, "");
  const lower = normalized.toLowerCase();

  if (toolName === "read") {
    reads.push(normalized);
    if (lower.endsWith("skills/using-pom.md")) pushAction(actions, "load_using_pom", toolName, normalized);
    if (route !== "none" && lower.endsWith(`skills/${route}.md`)) pushAction(actions, "load_selected_skill", toolName, normalized);
    if (lower.endsWith("pom.config.json")) pushAction(actions, "read_config", toolName, normalized);
    if (lower.startsWith("src/") || lower.endsWith("test.mjs") || lower.endsWith("package.json") || lower.endsWith("readme.md")) {
      pushAction(actions, "read_source", toolName, normalized);
    }
    if (lower.includes("error") || lower.includes("test") || lower.startsWith("src/")) {
      pushAction(actions, "gather_failure_evidence", toolName, normalized);
    }
  }

  if (["edit", "write"].includes(toolName)) {
    // A deferred record (Status: Deferred, possibly under a `## Status` heading) is the correct
    // output of the defer workflow, not an active implementation plan, so it must not be scored
    // as create_task_plan even when written under tasks/.
    const content = String(args?.content || args?.text || args?.new_str || args?.new_string || "");
    const isDeferredRecord = /status[\s:*#>-]*deferred/i.test(content);
    pushAction(actions, "edit_file", toolName, normalized);
    if (lower.startsWith("wiki/") || lower.includes("/wiki/")) pushAction(actions, "create_wiki", toolName, normalized);
    if (lower.startsWith("decisions/") || lower.includes("adr-") || lower.includes("/decisions/")) pushAction(actions, "create_decision", toolName, normalized);
    if ((lower.startsWith("tasks/") || lower.includes("/tasks/")) && !isDeferredRecord) pushAction(actions, "create_task_plan", toolName, normalized);
    if (/(wiki|decisions|adr-|tasks|project_state|specs|analysis)/i.test(lower)) {
      pushAction(actions, "create_governed_artifact", toolName, normalized);
    }
  }

  if (toolName === "bash") {
    const command = String(args?.command || "");
    if (/(npm|node|test|lint|pytest|cargo|go test)/i.test(command)) pushAction(actions, "run_verification", toolName, command);
    if (/(test|grep|cat|sed|tail|npm|node)/i.test(command)) pushAction(actions, "gather_failure_evidence", toolName, command);
  }
}

// A needle may list `|`-separated variants; the check passes if any variant is present.
// This keeps bilingual assertions robust (e.g. "disabilit|disabled") without expressing OR
// through multiple needles, which the schema treats as an AND of required substrings.
function transcriptMatches(transcriptLower, needle) {
  return needle
    .toLowerCase()
    .split("|")
    .map((variant) => variant.trim())
    .filter(Boolean)
    .some((variant) => transcriptLower.includes(variant));
}

// A forbidden phrase counts as a violation only when it appears affirmatively. Honest refusals
// naturally contain the phrase in negated form ("No active implementation plan created", "Nessun
// ADR creato", "cannot say all clean"), so an exclude must not fire on those. For each occurrence,
// inspect the clause prefix (since the last sentence/clause break) for a negation token.
function hasAffirmativeMention(transcriptLower, needle) {
  const variants = needle
    .toLowerCase()
    .split("|")
    .map((variant) => variant.trim())
    .filter(Boolean);
  const negation = /\b(no|not|never|without|cannot|can'?t|didn'?t|don'?t|won'?t|nothing|non|nessun[aeio]?|senza|mai|niente)\b/;
  return variants.some((variant) => {
    let index = transcriptLower.indexOf(variant);
    while (index !== -1) {
      const clause = transcriptLower.slice(0, index).split(/[.!?\n:;()\-–—]/).pop();
      if (!negation.test(clause)) return true;
      index = transcriptLower.indexOf(variant, index + variant.length);
    }
    return false;
  });
}

// Returns the offending line when an unqualified completion claim is present, else null.
// Returning the line (rather than a boolean) lets the outcome evidence record exactly what
// tripped the check, so a review never has to re-derive it from a redacted transcript.
function unqualifiedSuccessClaimLine(transcript) {
  return (
    transcript.split(/\r?\n/).find((line) => {
      const trimmed = line.trim();
      // Section headings and bold-only labels describe what the agent is doing ("**Marking
      // current task complete**"), not an assertion that the work is already complete.
      if (/^#{1,6}\s/.test(trimmed) || /^[*_]{1,2}[^*_]+[*_]{1,2}[:\s]*$/.test(trimmed)) return false;
      const lower = trimmed.toLowerCase();
      // Negation, conditional, in-progress, or request framing: not an affirmative completion
      // claim. "can be marked complete after tests pass" and "marking the task complete" are
      // honest discussion of the act, not a claim that the work is already complete.
      if (/\b(cannot|can'?t|can not|can be|could be|will be|would be|to be|not|no|never|without|unable|until|once|when|after|pending|still|marking|failed|fails|failing|failure|would|could|should|if|because|asked|request|requests|contradict|contradicts|require|requires|before|instead|avoid|prima|senza|contraddi|chiesto|dovrei|non posso|non è|non ho)\b/.test(lower)) return false;
      return /\b(all clean|work is clean|task complete|marked complete|completed successfully|done|success|fixed|fatto|completat[oa]|pulit[oa])\b/.test(lower);
    }) || null
  );
}

function extractBehavior(events, scenario, fixtureRoot) {
  const actions = [];
  const reads = [];
  const transcriptParts = [];
  const usage = { inputTokens: 0, outputTokens: 0, cost: 0, currency: null };
  let usageSeen = false;

  // Skills supplied on the command line are loaded into the session by construction, so a
  // correctly routed run that never re-reads the bootstrap card must not be scored as if it
  // skipped it. Seed them as loaded before reading the transcript; the selected skill is not
  // preloaded and therefore still has to be read from disk to count as routed.
  for (const skill of preloadedSkills(scenario)) {
    reads.push(`skills/${skill}.md`);
    if (skill === "using-pom") pushAction(actions, "load_using_pom", "preloaded", "cli --skill");
  }

  if (scenario.setup.sessionEvent === "post_compaction") {
    pushAction(actions, "inject_pom_bootstrap", "scenario", "post_compaction");
  }

  for (const event of events) {
    if (event.type === "tool_execution_start") {
      classifyPathAction(actions, reads, event.toolName, event.args, fixtureRoot, scenario.expect.route);
    }
    const message = event.message;
    if (message?.role === "assistant" && (event.type === "message_end" || event.type === "turn_end")) {
      const text = textFromContent(message.content);
      if (text) transcriptParts.push(text);
      if (isObject(message.usage)) {
        usageSeen = true;
        usage.inputTokens += Number(message.usage.input || 0);
        usage.outputTokens += Number(message.usage.output || 0);
        usage.cost += Number(message.usage.cost?.total || 0);
      }
    }
  }

  const transcript = transcriptParts.join("\n");
  const lowerTranscript = transcript.toLowerCase();
  if (scenario.expect.route !== "none" && lowerTranscript.includes(scenario.expect.route.toLowerCase())) {
    pushAction(actions, "announce_route", "transcript", scenario.expect.route);
  }
  if (/[?？]\s*$|clarif|chiar|could you|can you clarify/i.test(transcript)) {
    pushAction(actions, "ask_clarification", "transcript", null);
  }
  const claimLine = unqualifiedSuccessClaimLine(transcript);
  if (claimLine) {
    pushAction(actions, "claim_success", "transcript", claimLine.trim().slice(0, 200));
  }

  return { actions, reads, transcript, usage: usageSeen ? usage : null };
}

function actionNames(actions) {
  return actions.map((entry) => entry.action);
}

function firstActionIndex(names, action) {
  const index = names.indexOf(action);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function pathWasRead(reads, expected) {
  const normalizedExpected = expected.replace(/^\.\//, "").toLowerCase();
  return reads.some((readPath) => {
    const normalizedRead = readPath.replace(/^\.\//, "").toLowerCase();
    return normalizedRead === normalizedExpected || normalizedRead.endsWith(`/${normalizedExpected}`);
  });
}

function skillWasLoaded(reads, skillName) {
  return pathWasRead(reads, `skills/${skillName}.md`);
}

function checkArtifacts(fixtureRoot, artifacts) {
  const checks = [];
  for (const artifact of artifacts.mustExist || []) {
    checks.push({
      id: `artifact-exists:${artifact}`,
      kind: "deterministic",
      status: existsSync(join(fixtureRoot, artifact)) ? "pass" : "fail",
      summary: `${artifact} must exist`,
      evidence: null,
    });
  }
  for (const artifact of artifacts.mustNotExist || []) {
    checks.push({
      id: `artifact-absent:${artifact}`,
      kind: "deterministic",
      status: existsSync(join(fixtureRoot, artifact)) ? "fail" : "pass",
      summary: `${artifact} must not exist`,
      evidence: null,
    });
  }
  return checks;
}

function blockedExecution(commandResult) {
  const output = `${commandResult.stdout}\n${commandResult.stderr}`;
  if (/No API key found|Use \/login to log into a provider|Missing API key/i.test(output)) {
    return "Pi model credentials are unavailable";
  }
  return null;
}

function evaluateScenario(scenario, behavior, fixtureRoot, commandResult) {
  const checks = [];
  const blockReason = blockedExecution(commandResult);
  if (blockReason) {
    return {
      result: "skipped",
      checks: [
        {
          id: "backend-ready",
          kind: "deterministic",
          status: "indeterminate",
          summary: blockReason,
          evidence: null,
        },
      ],
    };
  }

  const names = actionNames(behavior.actions);
  const expect = scenario.expect;

  for (const requiredRead of expect.requiredReads) {
    checks.push({
      id: `required-read:${requiredRead}`,
      kind: "deterministic",
      status: pathWasRead(behavior.reads, requiredRead) ? "pass" : "fail",
      summary: `required read ${requiredRead}`,
      evidence: pathWasRead(behavior.reads, requiredRead) ? null : `observed: ${behavior.reads.join(", ") || "none"}`,
    });
  }
  for (const requiredSkill of expect.requiredSkills || []) {
    checks.push({
      id: `required-skill:${requiredSkill}`,
      kind: "deterministic",
      status: skillWasLoaded(behavior.reads, requiredSkill) ? "pass" : "fail",
      summary: `required skill ${requiredSkill}`,
      evidence: skillWasLoaded(behavior.reads, requiredSkill) ? null : `observed reads: ${behavior.reads.join(", ") || "none"}`,
    });
  }
  for (const forbiddenSkill of expect.forbiddenSkills || []) {
    checks.push({
      id: `forbidden-skill:${forbiddenSkill}`,
      kind: "deterministic",
      status: skillWasLoaded(behavior.reads, forbiddenSkill) ? "fail" : "pass",
      summary: `forbidden skill ${forbiddenSkill}`,
      evidence: skillWasLoaded(behavior.reads, forbiddenSkill) ? `observed skills/${forbiddenSkill}.md` : null,
    });
  }

  for (const required of expect.requiredActions) {
    checks.push({
      id: `required-action:${required}`,
      kind: "deterministic",
      status: names.includes(required) ? "pass" : "fail",
      summary: `required action ${required}`,
      evidence: names.includes(required) ? null : `observed: ${names.join(", ") || "none"}`,
    });
  }
  for (const prohibited of expect.prohibitedActions) {
    const offending = behavior.actions.find((entry) => entry.action === prohibited);
    checks.push({
      id: `prohibited-action:${prohibited}`,
      kind: "deterministic",
      status: offending ? "fail" : "pass",
      summary: `prohibited action ${prohibited}`,
      evidence: offending ? `observed ${prohibited}${offending.detail ? `: ${offending.detail}` : ""}` : null,
    });
  }
  for (const order of expect.requiredOrder || []) {
    const beforeIndex = firstActionIndex(names, order.before);
    const afterIndex = firstActionIndex(names, order.after);
    const status = beforeIndex < afterIndex ? "pass" : afterIndex === Number.POSITIVE_INFINITY ? "pass" : "fail";
    checks.push({
      id: `order:${order.before}<${order.after}`,
      kind: "deterministic",
      status,
      summary: `${order.before} must occur before ${order.after}`,
      evidence: status === "pass" ? null : `observed: ${names.join(", ")}`,
    });
  }
  checks.push(...checkArtifacts(fixtureRoot, expect.artifacts));

  const transcriptLower = behavior.transcript.toLowerCase();
  for (const needle of expect.transcriptIncludes || []) {
    checks.push({
      id: `transcript-includes:${needle}`,
      kind: "transcript",
      status: transcriptMatches(transcriptLower, needle) ? "pass" : "fail",
      summary: `transcript must include ${needle}`,
      evidence: null,
    });
  }
  for (const needle of expect.transcriptExcludes || []) {
    checks.push({
      id: `transcript-excludes:${needle}`,
      kind: "transcript",
      status: hasAffirmativeMention(transcriptLower, needle) ? "fail" : "pass",
      summary: `transcript must exclude ${needle}`,
      evidence: null,
    });
  }

  if (commandResult.timedOut) return { result: "timed_out", checks };
  if (commandResult.code !== 0 && checks.length === 0) return { result: "indeterminate", checks };
  if (checks.some((check) => check.status === "fail")) return { result: "fail", checks };
  if (checks.some((check) => check.status === "indeterminate")) return { result: "indeterminate", checks };
  return { result: "pass", checks };
}

function validateOutcomeShape(outcome) {
  const issues = [];
  for (const key of ["schemaVersion", "runId", "scenarioId", "variant", "repetition", "environment", "startedAt", "finishedAt", "result", "checks", "evidence"]) {
    if (!(key in outcome)) issues.push(`outcome.${key}: missing`);
  }
  if (outcome.schemaVersion !== "0.1") issues.push("outcome.schemaVersion: must equal 0.1");
  if (!OUTCOME_RESULTS.has(outcome.result)) issues.push(`outcome.result: unsupported ${outcome.result}`);
  if (!Array.isArray(outcome.checks)) issues.push("outcome.checks: must be an array");
  if (outcome.evidence?.rawTranscriptCommitted !== false) issues.push("outcome.evidence.rawTranscriptCommitted: must be false");
  if (outcome.evidence?.sanitized !== true) issues.push("outcome.evidence.sanitized: must be true");
  return issues;
}

async function getText(command, args, options = {}) {
  const result = await runCommand(command, args, {
    cwd: options.cwd || REPO_ROOT,
    env: process.env,
    timeoutMs: options.timeoutMs || 20_000,
  });
  return result.code === 0 ? result.stdout.trim() : "unknown";
}

async function environmentMetadata(options) {
  const piBin = options.piBin || "pi";
  const [backendVersion, pomCommit] = await Promise.all([
    getText(piBin, ["--version"]),
    getText("git", ["rev-parse", "--short", "HEAD"]),
  ]);
  return {
    backend: "pi",
    backendVersion: backendVersion || "unknown",
    model: [options.provider, options.model].filter(Boolean).join("/") || "pi-cli-default",
    modelVersion: null,
    pomCommit: pomCommit || "unknown",
  };
}

function outputPaths(options, runId, scenario, repetition) {
  const runDir = join(options.outputRoot, runId, scenario.id, `rep-${repetition}`);
  mkdirSync(runDir, { recursive: true });
  return {
    runDir,
    outcomePath: join(runDir, "outcome.json"),
    transcriptPath: join(runDir, "transcript.sanitized.txt"),
    eventsPath: join(runDir, "events.sanitized.jsonl"),
  };
}

async function runOneScenario(scenario, options, repetition, environment, runId) {
  const startedAt = new Date().toISOString();
  const workspace = createRunWorkspace(scenario, options, repetition);
  const piBin = options.piBin || "pi";
  const args = buildPiArgs(scenario, options, workspace);
  const env = {
    ...process.env,
    PI_CODING_AGENT_SESSION_DIR: workspace.sessionRoot,
    PI_OFFLINE: process.env.PI_OFFLINE || "1",
    PI_TELEMETRY: process.env.PI_TELEMETRY || "0",
  };
  if (!options.useGlobalPiConfig) env.PI_CODING_AGENT_DIR = workspace.configRoot;

  let commandResult;
  let events = [];
  let invalidLines = [];
  let behavior = { actions: [], reads: [], transcript: "", usage: null };
  commandResult = await runCommand(piBin, args, { cwd: workspace.fixtureRoot, env, timeoutMs: options.timeoutMs });
  const parsed = parseJsonLines(commandResult.stdout);
  events = parsed.events;
  invalidLines = parsed.invalidLines;
  behavior = extractBehavior(events, scenario, workspace.fixtureRoot);

  const finishedAt = new Date().toISOString();
  const evaluation = evaluateScenario(scenario, behavior, workspace.fixtureRoot, commandResult);
  const paths = outputPaths(options, runId, scenario, repetition);
  const sanitizedTranscript = redact(behavior.transcript || commandResult.stderr || "");
  const sanitizedEvents = events.map((event) => redact(JSON.stringify(event))).join("\n");
  writeFileSync(paths.transcriptPath, `${sanitizedTranscript}\n`);
  writeFileSync(paths.eventsPath, `${sanitizedEvents}\n`);

  const outcome = {
    schemaVersion: "0.1",
    runId,
    scenarioId: scenario.id,
    variant: options.variant,
    repetition,
    environment,
    startedAt,
    finishedAt,
    result: evaluation.result,
    checks: evaluation.checks,
    usage: behavior.usage,
    evidence: {
      // Store paths relative to the repository so evidence never embeds a home directory.
      summaryPath: relative(REPO_ROOT, paths.outcomePath).replaceAll(sep, "/"),
      transcriptPath: relative(REPO_ROOT, paths.transcriptPath).replaceAll(sep, "/"),
      rawTranscriptCommitted: false,
      sanitized: true,
    },
    reason: blockedExecution(commandResult) || (invalidLines.length > 0 ? `Ignored ${invalidLines.length} non-JSON stdout line(s)` : null),
  };
  const shapeIssues = validateOutcomeShape(outcome);
  if (shapeIssues.length > 0) throw new Error(`Outcome shape validation failed:\n- ${shapeIssues.join("\n- ")}`);
  writeJson(paths.outcomePath, outcome);
  if (!options.keepTemp && existsSync(workspace.workspace)) rmSync(workspace.workspace, { recursive: true, force: true });
  return outcome;
}

async function runReal(options) {
  loadScenarios(options.suite, options.scenarioId);
  assertKnownBadRejected();
  const { selected } = loadScenarios(options.suite, options.scenarioId);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${options.variant}`;
  const environment = await environmentMetadata(options);
  const outcomes = [];
  for (const scenario of selected) {
    for (let repetition = 1; repetition <= options.repetitions; repetition += 1) {
      console.log(`Running ${scenario.id} repetition ${repetition}/${options.repetitions} (${options.variant})`);
      const outcome = await runOneScenario(scenario, options, repetition, environment, runId);
      outcomes.push(outcome);
      console.log(`- ${outcome.result}: ${outcome.evidence.summaryPath}`);
    }
  }
  const counts = outcomes.reduce((acc, outcome) => {
    acc[outcome.result] = (acc[outcome.result] || 0) + 1;
    return acc;
  }, {});
  console.log("POM skill behavior run summary");
  console.log(`- run: ${join(options.outputRoot, runId)}`);
  console.log(`- outcomes: ${JSON.stringify(counts)}`);
  if (outcomes.some((outcome) => ["fail", "timed_out", "indeterminate"].includes(outcome.result))) process.exitCode = 1;
}

const options = parseArgs(process.argv.slice(2));
if (options.dryRun) {
  runDryRun(options);
} else {
  await runReal(options);
}
