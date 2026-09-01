#!/usr/bin/env node

// Targeted tests for scripts/lint-doc-governance.ts rules that had no
// coverage: config validation (lint-config.ts), decision records
// (lint-decisions.ts + completion-verification.ts), task plans
// (lint-tasks.ts) and handoff / Git workflow (lint-handoff.ts).
//
// Each scenario builds a throwaway target project under os.tmpdir() with
// pom/ symlinked to this POM source checkout, so template paths such as
// pom/templates/ADR_TEMPLATE.md resolve exactly as in a real installation.
// Index regeneration and wiki rendering are deliberately not asserted here.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const POM_ROOT = process.cwd();
const LINT_SCRIPT = join("pom", "scripts", "lint-doc-governance.ts");

let passed = 0;
let failed = 0;

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} - ${detail}`);
    failed++;
  }
}

function baseConfig(overrides = {}) {
  const config = JSON.parse(readFileSync(join(POM_ROOT, "templates", "POM_CONFIG_TEMPLATE.json"), "utf8"));
  config.ownership.mode = "owned";
  return deepMerge(config, overrides);
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function createProject(config, { git = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pom-lint-rules-test-"));
  execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
  if (git) execFileSync("git", ["init", "-q"], { cwd: dir });
  if (config !== undefined) {
    writeFileSync(join(dir, "pom.config.json"), typeof config === "string" ? config : JSON.stringify(config, null, 2));
  }
  return dir;
}

function writeProjectFile(dir, relativePath, content) {
  const target = join(dir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function gitCommitAll(dir, message) {
  const identity = ["-c", "user.name=POM Test", "-c", "user.email=pom-test@example.invalid", "-c", "commit.gpgsign=false"];
  execFileSync("git", [...identity, "add", "-A"], { cwd: dir });
  execFileSync("git", [...identity, "commit", "-q", "-m", message], { cwd: dir });
}

function runLint(dir) {
  return spawnSync(process.execPath, ["--experimental-strip-types", LINT_SCRIPT], {
    cwd: dir,
    encoding: "utf8",
  });
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function rulesIn(stdout) {
  return new Set([...stdout.matchAll(/^\[(?:ERROR|WARN)\] (\S+)/gm)].map((m) => m[1]));
}

function hasRule(stdout, rule, severity) {
  const label = severity === "error" ? "ERROR" : severity === "warning" ? "WARN" : "(?:ERROR|WARN)";
  return new RegExp(`^\\[${label}\\] ${rule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?: |$)`, "m").test(stdout);
}

// ─── Fixtures ─────────────────────────────────────────────────────────

const ADR_SECTIONS = [
  "## Context",
  "## Decision",
  "## Rationale",
  "## Alternatives Considered",
  "## Impacts",
  "## Links",
  "## Follow-up",
  "## Completion Verification",
  "## Evolution Rule",
];

function adrDocument({ fields, sections = ADR_SECTIONS, verification = true }) {
  const table = ["| Field | Value |", "|---|---|", ...Object.entries(fields).map(([k, v]) => `| ${k} | ${v} |`)].join("\n");
  const body = sections
    .map((section) => {
      if (section === "## Completion Verification") {
        if (!verification) return "";
        return `${section}\n\n### Thesis\n\n- Thesis 1: it works.\n\n### Antithesis\n\n| Antithesis | Confutation |\n|---|---|\n| none | n/a |\n\nException reason: _none_\n`;
      }
      return `${section}\n\nText.\n`;
    })
    .join("\n");
  return `# ADR-0001 - Test Decision\n\n${table}\n\n${body}`;
}

const TASK_SECTIONS = [
  "## Status",
  "## Origin",
  "## Objective",
  "## Assumptions And Success Criteria",
  "## Placement",
  "## Steps",
  "## Verification",
  "## Test Structure",
  "## User Use Cases",
  "## Risks And Privacy/Security",
  "## Outcome",
  "## Done Criteria",
];

function taskDocument({ status, sections = TASK_SECTIONS }) {
  const body = sections
    .map((section) => {
      if (section === "## Status") return status === undefined ? "" : `${section}\n\n${status}\n`;
      return `${section}\n\nText.\n`;
    })
    .join("\n");
  return `# TASK-0001 - Test Task\n\n${body}`;
}

// ─── Scenarios ────────────────────────────────────────────────────────

function scenarioConfigInvalid() {
  console.log("\nScenario: config-invalid (lint-config.ts)");

  const cases = [
    { name: "pom.config.json that is not JSON", config: "{ not json", fragment: "is not valid JSON" },
    { name: "pom.config.json that is a JSON array", config: "[]", fragment: "must contain a JSON object" },
    { name: "wrong scalar type (handoff.maxLines as string)", config: baseConfig({ handoff: { maxLines: "many" } }), fragment: "handoff.maxLines must be a number" },
    { name: "wrong array type (root.allowedMarkdown as string)", config: baseConfig({ root: { allowedMarkdown: "README.md" } }), fragment: "root.allowedMarkdown must be an array of strings" },
    { name: "severity outside error|warning", config: baseConfig({ documentation: { severity: "fatal" } }), fragment: 'documentation.severity must be "error" or "warning"' },
    { name: "enum outside the allowed values (ownership.mode)", config: baseConfig({ ownership: { mode: "weird" } }), fragment: "ownership.mode must be one of" },
    { name: "enum outside the allowed values (adoption.tests)", config: baseConfig({ adoption: { tests: "maybe" } }), fragment: "adoption.tests must be one of" },
    { name: "invalid regex in decisions.adrPathPattern", config: baseConfig({ decisions: { adrPathPattern: "(" } }), fragment: "decisions.adrPathPattern contains an invalid regex" },
  ];

  for (const c of cases) {
    const dir = createProject(c.config);
    try {
      const result = runLint(dir);
      assert(`${c.name}: exits with 1`, result.status === 1, `status=${result.status} stdout=${result.stdout}`);
      assert(`${c.name}: reports config-invalid as ERROR on pom.config.json`, hasRule(result.stdout, "config-invalid pom.config.json", "error"), result.stdout);
      assert(`${c.name}: message says "${c.fragment}"`, result.stdout.includes(c.fragment), result.stdout);
      assert(`${c.name}: suggests the config skill`, result.stdout.includes("pom/skills/config.md"), result.stdout);
    } finally {
      cleanup(dir);
    }
  }

  const dir = createProject(baseConfig());
  try {
    const result = runLint(dir);
    assert("a valid template-derived config exits with 0", result.status === 0, `status=${result.status} stdout=${result.stdout}`);
    assert("a valid config produces no config-invalid finding", !hasRule(result.stdout, "config-invalid"), result.stdout);
  } finally {
    cleanup(dir);
  }
}

function scenarioDecisions() {
  console.log("\nScenario: decision records (lint-decisions.ts)");
  const decisionsEnabled = { adoption: { decisions: "enabled" } };
  const noSections = { decisions: { requireTemplateSections: false } };

  let dir = createProject(baseConfig({ ...decisionsEnabled, ...noSections }));
  try {
    writeProjectFile(dir, "decisions/ADR-0001-bare.md", "# ADR-0001 - Bare\n\nNo metadata at all.\n\n## Context\n\nText.\n");
    const result = runLint(dir);
    const file = "decisions/ADR-0001-bare.md";
    assert("ADR without metadata: exits 0 (warnings only)", result.status === 0, `status=${result.status} stdout=${result.stdout}`);
    assert("ADR without date: adr-date warning", hasRule(result.stdout, `adr-date ${file}`, "warning"), result.stdout);
    assert("ADR without status: adr-status warning", hasRule(result.stdout, `adr-status ${file}`, "warning"), result.stdout);
    assert("ADR without category: adr-category warning", hasRule(result.stdout, `adr-category ${file}`, "warning"), result.stdout);
    assert("ADR without area: adr-area warning", hasRule(result.stdout, `adr-area ${file}`, "warning"), result.stdout);
    assert("ADR findings suggest the ADR template workflow", result.stdout.includes("pom/templates/ADR_TEMPLATE.md"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ ...decisionsEnabled, ...noSections }));
  try {
    writeProjectFile(
      dir,
      "decisions/ADR-0001-accepted-unverified.md",
      adrDocument({ fields: { Date: "2026-01-15", Status: "Accepted", Category: "governance", Area: "docs" }, verification: false }),
    );
    const result = runLint(dir);
    assert("Accepted ADR without Completion Verification: exits 0", result.status === 0, `status=${result.status} stdout=${result.stdout}`);
    assert(
      "Accepted ADR without Completion Verification: completion-verification-missing warning",
      hasRule(result.stdout, "completion-verification-missing decisions/ADR-0001-accepted-unverified.md", "warning"),
      result.stdout,
    );
    assert("the message names the ADR and the Accepted status", result.stdout.includes("ADR is marked Accepted but has no Completion Verification section"), result.stdout);
    assert("a fully classified ADR has no adr-date/status/category/area findings", !/adr-(date|status|category|area)/.test(result.stdout), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ ...decisionsEnabled, ...noSections }));
  try {
    writeProjectFile(
      dir,
      "decisions/ADR-0001-exception.md",
      adrDocument({ fields: { Date: "2026-01-15", Status: "Accepted with exceptions", Category: "governance", Area: "docs" }}).replace(
        "Exception reason: _none_",
        "Exception reason: evidence lives in an external system",
      ),
    );
    const result = runLint(dir);
    assert(
      "Accepted with exceptions + reason: completion-verification-exception warning",
      hasRule(result.stdout, "completion-verification-exception decisions/ADR-0001-exception.md", "warning"),
      result.stdout,
    );
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ ...decisionsEnabled, ...noSections }));
  try {
    writeProjectFile(
      dir,
      "decisions/ADR-0001-no-thesis.md",
      adrDocument({ fields: { Date: "2026-01-15", Status: "Accepted", Category: "governance", Area: "docs" } }).replace("### Thesis", "### Ideas").replace("### Antithesis", "### Doubts"),
    );
    const result = runLint(dir);
    assert(
      "Accepted ADR without Thesis/Antithesis: completion-verification-thesis warning",
      hasRule(result.stdout, "completion-verification-thesis decisions/ADR-0001-no-thesis.md", "warning"),
      result.stdout,
    );
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ ...decisionsEnabled, ...noSections }));
  try {
    writeProjectFile(dir, "decisions/ADR-0001-draft.md", adrDocument({ fields: { Date: "2026-01-15", Status: "Draft", Category: "governance", Area: "docs" } }));
    const result = runLint(dir);
    assert("Draft ADR: adr-provisional-status warning", hasRule(result.stdout, "adr-provisional-status decisions/ADR-0001-draft.md", "warning"), result.stdout);
    assert("Draft ADR is not checked for completion verification", !result.stdout.includes("completion-verification"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ ...decisionsEnabled, ...noSections }));
  try {
    writeProjectFile(dir, "decisions/ADR-0001-clean.md", adrDocument({ fields: { Date: "2026-01-15", Status: "Accepted", Category: "governance", Area: "docs" } }));
    const result = runLint(dir);
    assert("a complete Accepted ADR exits 0", result.status === 0, `status=${result.status} stdout=${result.stdout}`);
    assert("a complete Accepted ADR raises no adr-* or completion-verification-* finding", !/adr-|completion-verification/.test(result.stdout), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ ...decisionsEnabled, decisions: { requireTemplateSections: true } }));
  try {
    writeProjectFile(
      dir,
      "decisions/ADR-0001-missing-section.md",
      adrDocument({
        fields: { Date: "2026-01-15", Status: "Accepted", Category: "governance", Area: "docs" },
        sections: ADR_SECTIONS.filter((s) => s !== "## Decision"),
      }),
    );
    const result = runLint(dir);
    assert("requireTemplateSections + missing ## Decision: exits 1", result.status === 1, `status=${result.status} stdout=${result.stdout}`);
    assert("reports adr-required-section as ERROR", hasRule(result.stdout, "adr-required-section decisions/ADR-0001-missing-section.md", "error"), result.stdout);
    assert("names the missing section", result.stdout.includes("ADR is missing required section: ## Decision"), result.stdout);
    assert("does not report the sections that are present", !result.stdout.includes("missing required section: ## Context"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ adoption: { decisions: "disabled" }, ...noSections }));
  try {
    writeProjectFile(dir, "decisions/ADR-0001-bare.md", "# ADR-0001 - Bare\n\nNo metadata.\n");
    const result = runLint(dir);
    assert("decisions disabled: ADR rules are skipped", !/adr-/.test(result.stdout), result.stdout);
  } finally {
    cleanup(dir);
  }
}

function scenarioTaskPlans() {
  console.log("\nScenario: task plans (lint-tasks.ts)");
  const light = { adoption: { tasks: "structured" }, taskPlans: { requireTemplateSections: false } };

  let dir = createProject(baseConfig(light));
  try {
    writeProjectFile(dir, "tasks/feature/P1/no-status.md", taskDocument({ status: undefined }));
    const result = runLint(dir);
    assert("task without Status: exits 0", result.status === 0, `status=${result.status} stdout=${result.stdout}`);
    assert("task without Status: task-status warning", hasRule(result.stdout, "task-status tasks/feature/P1/no-status.md", "warning"), result.stdout);
    assert("the message explains what is missing", result.stdout.includes("Task plan is missing a Status section or metadata field"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig(light));
  try {
    writeProjectFile(dir, "tasks/feature/P1/placeholder-status.md", taskDocument({ status: "TBD" }));
    const result = runLint(dir);
    assert("placeholder status (TBD): task-status warning", hasRule(result.stdout, "task-status tasks/feature/P1/placeholder-status.md", "warning"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig(light));
  try {
    writeProjectFile(dir, "tasks/feature/P1/complete.md", taskDocument({ status: "Complete", sections: TASK_SECTIONS.filter((s) => s !== "## Verification") }));
    const result = runLint(dir);
    assert(
      "Complete task without Verification: completion-verification-missing warning",
      hasRule(result.stdout, "completion-verification-missing tasks/feature/P1/complete.md", "warning"),
      result.stdout,
    );
    assert("the message names the Document and the Complete status", result.stdout.includes("Document is marked Complete but has no Completion Verification section"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig(light));
  try {
    writeProjectFile(dir, "tasks/feature/P1/planned.md", taskDocument({ status: "Planned" }));
    const result = runLint(dir);
    assert("Planned task with a Status section: no task-* finding", !/task-/.test(result.stdout), result.stdout);
    assert("Planned task is not checked for completion verification", !result.stdout.includes("completion-verification"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ adoption: { tasks: "structured" }, taskPlans: { requireTemplateSections: true } }));
  try {
    writeProjectFile(
      dir,
      "tasks/feature/P1/missing-sections.md",
      taskDocument({ status: "Planned", sections: TASK_SECTIONS.filter((s) => s !== "## Steps" && s !== "## Done Criteria") }),
    );
    const result = runLint(dir);
    const file = "tasks/feature/P1/missing-sections.md";
    assert("requireTemplateSections + missing sections: exits 1", result.status === 1, `status=${result.status} stdout=${result.stdout}`);
    assert("reports task-required-section as ERROR", hasRule(result.stdout, `task-required-section ${file}`, "error"), result.stdout);
    assert("names ## Steps as missing", result.stdout.includes("Task plan is missing required section: ## Steps"), result.stdout);
    assert("names ## Done Criteria as missing", result.stdout.includes("Task plan is missing required section: ## Done Criteria"), result.stdout);
    assert("does not report ## Objective which is present", !result.stdout.includes("missing required section: ## Objective"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ adoption: { tasks: "structured" }, taskPlans: { requireTemplateSections: true } }));
  try {
    writeProjectFile(dir, "tasks/feature/P1/full.md", taskDocument({ status: "Planned" }));
    const result = runLint(dir);
    assert("a task with every template section exits 0", result.status === 0, `status=${result.status} stdout=${result.stdout}`);
    assert("a task with every template section has no task-* finding", !/task-/.test(result.stdout), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ ownership: { mode: "external_overlay" }, adoption: { tasks: "light" }, taskPlans: { requireTemplateSections: true } }));
  try {
    writeProjectFile(dir, "tasks/feature/P1/no-status.md", taskDocument({ status: undefined, sections: ["## Objective"] }));
    const result = runLint(dir);
    assert("external_overlay with light tasks: task governance is skipped", !/task-/.test(result.stdout), result.stdout);
  } finally {
    cleanup(dir);
  }
}

function scenarioHandoff() {
  console.log("\nScenario: handoff and Git workflow (lint-handoff.ts)");
  const handoffConfig = { handoff: { triggerPaths: ["src/"], maxLines: 5 } };

  // src/ is tracked from the baseline so `git status --porcelain` lists the
  // new file itself (an untracked directory would be reported as `src/`).
  let dir = createProject(baseConfig(handoffConfig));
  try {
    writeProjectFile(dir, "PROJECT_STATE.md", "# Project State\n\nCurrent step: none.\n");
    writeProjectFile(dir, "src/index.ts", "export {};\n");
    gitCommitAll(dir, "baseline");
    writeProjectFile(dir, "src/app.ts", "export const x = 1;\n");
    const result = runLint(dir);
    assert("operational change without PROJECT_STATE.md update: exits 0", result.status === 0, `status=${result.status} stdout=${result.stdout}`);
    assert("reports project-state-handoff as WARN on PROJECT_STATE.md", hasRule(result.stdout, "project-state-handoff PROJECT_STATE.md", "warning"), result.stdout);
    assert("the message names the triggering path", result.stdout.includes("Operational changes detected (src/app.ts)"), result.stdout);
    assert("handoff findings suggest the PROJECT_STATE template", result.stdout.includes("pom/templates/PROJECT_STATE_TEMPLATE.md"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ handoff: { triggerPaths: ["src/"], maxLines: 5, severity: "error" } }));
  try {
    writeProjectFile(dir, "PROJECT_STATE.md", "# Project State\n\nCurrent step: none.\n");
    gitCommitAll(dir, "baseline");
    writeProjectFile(dir, "src/app.ts", "export const x = 1;\n");
    const result = runLint(dir);
    assert("handoff.severity=error turns project-state-handoff into an ERROR", hasRule(result.stdout, "project-state-handoff PROJECT_STATE.md", "error"), result.stdout);
    assert("and the lint exits 1", result.status === 1, `status=${result.status}`);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig(handoffConfig));
  try {
    writeProjectFile(dir, "PROJECT_STATE.md", "# Project State\n\nCurrent step: none.\n");
    gitCommitAll(dir, "baseline");
    writeProjectFile(dir, "src/app.ts", "export const x = 1;\n");
    writeProjectFile(dir, "PROJECT_STATE.md", "# Project State\n\nCurrent step: src/app.ts added.\n");
    const result = runLint(dir);
    assert("operational change with PROJECT_STATE.md also changed: no project-state-handoff", !hasRule(result.stdout, "project-state-handoff"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig(handoffConfig));
  try {
    writeProjectFile(dir, "PROJECT_STATE.md", "# Project State\n\nCurrent step: none.\n");
    gitCommitAll(dir, "baseline");
    writeProjectFile(dir, "notes/scratch.md", "not a trigger path\n");
    const result = runLint(dir);
    assert("change outside triggerPaths: no project-state-handoff", !hasRule(result.stdout, "project-state-handoff"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig(handoffConfig));
  try {
    writeProjectFile(dir, "PROJECT_STATE.md", "# Project State\n\n## Log\n\n- one\n- two\n- three\n- four\n- five\n");
    const result = runLint(dir);
    assert("PROJECT_STATE.md over handoff.maxLines: project-state-too-long warning", hasRule(result.stdout, "project-state-too-long PROJECT_STATE.md", "warning"), result.stdout);
    assert("the message quotes the configured limit", result.stdout.includes("under 5 lines"), result.stdout);
    assert("PROJECT_STATE.md with ## Log: project-state-log-heading warning", hasRule(result.stdout, "project-state-log-heading PROJECT_STATE.md", "warning"), result.stdout);
    assert("the message quotes the forbidden heading", result.stdout.includes("(## Log)"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ handoff: { forbiddenHeadings: ["## Diario"] } }));
  try {
    writeProjectFile(dir, "PROJECT_STATE.md", "# Project State\n\n## Log\n\nfine here\n\n## Diario\n\nnot fine\n");
    const result = runLint(dir);
    assert("forbiddenHeadings is configurable: ## Diario is reported", result.stdout.includes("(## Diario)"), result.stdout);
    assert("forbiddenHeadings is configurable: the default ## Log is no longer reported", !result.stdout.includes("(## Log)"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig(), { git: false });
  try {
    const result = runLint(dir);
    assert("outside a Git worktree: git-status warning instead of a crash", hasRule(result.stdout, "git-status", "warning"), result.stdout);
    assert("and the lint still exits 0", result.status === 0, `status=${result.status}`);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ adoption: { docs: "enabled", decisions: "enabled" } }));
  try {
    writeProjectFile(dir, "docs/guide.md", "# Guide\n");
    gitCommitAll(dir, "baseline");
    writeProjectFile(dir, "docs/guide.md", "# Guide\n\nChanged without an ADR.\n");
    const result = runLint(dir);
    assert("docs changed without an ADR change: docs-without-adr warning", hasRule(result.stdout, "docs-without-adr", "warning"), result.stdout);
  } finally {
    cleanup(dir);
  }

  dir = createProject(baseConfig({ adoption: { docs: "enabled", decisions: "enabled" } }));
  try {
    writeProjectFile(dir, "docs/guide.md", "# Guide\n");
    writeProjectFile(dir, "decisions/ADR-0000-placeholder.md", adrDocument({ fields: { Date: "2026-01-01", Status: "Accepted", Category: "governance", Area: "docs" } }));
    gitCommitAll(dir, "baseline");
    writeProjectFile(dir, "docs/guide.md", "# Guide\n\nChanged together with an ADR.\n");
    writeProjectFile(dir, "decisions/ADR-0001-guide.md", adrDocument({ fields: { Date: "2026-01-15", Status: "Accepted", Category: "governance", Area: "docs" } }));
    const result = runLint(dir);
    assert("docs changed together with a new ADR: no docs-without-adr", !hasRule(result.stdout, "docs-without-adr"), result.stdout);
  } finally {
    cleanup(dir);
  }
}

console.log("Doc Governance Lint Rules Tests");
console.log("===============================");

scenarioConfigInvalid();
scenarioDecisions();
scenarioTaskPlans();
scenarioHandoff();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
