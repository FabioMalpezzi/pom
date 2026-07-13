#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
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

function parseArgs(argv) {
  const options = { dryRun: false, suite: "core" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--suite") {
      options.suite = argv[index + 1] || "";
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!SUITES.has(options.suite)) throw new Error(`Unsupported suite: ${options.suite}`);
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

function runDryRun(suite) {
  assertSchemaDocuments();
  const scenarios = readJson(`scenarios/${suite}.json`);
  const issues = validateCollection(scenarios, suite);
  if (issues.length > 0) {
    console.error(`Scenario contract validation failed (${issues.length} issue(s)):`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }

  const broken = readJson("fixtures/broken/scenario-missing-route.json");
  const brokenIssues = validateScenario(broken, "known-bad");
  if (!brokenIssues.some((issue) => issue.includes("expect.route"))) {
    console.error("Known-bad control was not rejected for its missing route.");
    process.exitCode = 1;
    return;
  }

  const critical = scenarios.filter((scenario) => scenario.critical).length;
  console.log("POM skill behavior contract dry-run");
  console.log(`- suite: ${suite}`);
  console.log(`- scenarios: ${scenarios.length}`);
  console.log(`- critical: ${critical}`);
  console.log(`- languages: ${[...new Set(scenarios.map((scenario) => scenario.language))].sort().join(", ")}`);
  console.log(`- known-bad control: rejected (${brokenIssues[0]})`);
  console.log("- real-session execution: not implemented yet");
}

const options = parseArgs(process.argv.slice(2));
if (!options.dryRun) {
  console.error("Only --dry-run is implemented. Real-session execution remains a planned P1 step.");
  process.exit(2);
}
runDryRun(options.suite);
