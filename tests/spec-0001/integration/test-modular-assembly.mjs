#!/usr/bin/env node

/**
 * SPEC-0001 Completion Verification Tests
 *
 * Scenario 1: minimal profile → ≤200 lines
 * Scenario 2: full profile → ≤320 lines
 * Scenario 3: full → refresh to minimal → section shrinks to ≤200 lines
 * Scenario 4: pom:update stops on local pom/ changes
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const POM_ROOT = process.cwd();
const START_MARKER = "<!-- POM:START -->";
const END_MARKER = "<!-- POM:END -->";

let passed = 0;
let failed = 0;

function createTempProject() {
  const dir = mkdtempSync(join(tmpdir(), "pom-test-"));
  // Symlink pom/ into the temp project
  execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function runInstaller(projectDir, profile) {
  execFileSync(
    "node",
    ["--experimental-strip-types", "pom/scripts/install-pom.ts", "--profile", profile],
    { cwd: projectDir, stdio: "pipe" }
  );
}

function extractPomSection(projectDir) {
  const agentsPath = join(projectDir, "AGENTS.md");
  if (!existsSync(agentsPath)) return null;
  const content = readFileSync(agentsPath, "utf8");
  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) return null;
  return content.slice(startIdx + START_MARKER.length, endIdx).trim();
}

function countLines(text) {
  if (!text) return 0;
  return text.split("\n").length;
}

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} — ${detail}`);
    failed++;
  }
}

function scenario1() {
  console.log("\nScenario 1: minimal profile → ≤200 lines");
  const dir = createTempProject();
  try {
    runInstaller(dir, "minimal");
    const section = extractPomSection(dir);
    const lines = countLines(section);
    console.log(`  Assembled lines: ${lines}`);
    assert("POM section exists", section !== null, "No POM section found in AGENTS.md");
    assert("Lines ≤200", lines <= 200, `Got ${lines} lines, expected ≤200`);
    assert("Contains core principle", section.includes("authoritative source") || section.includes("Operating Memory"), "Core section missing");
    assert("Does NOT contain wiki rules", !section.includes("## Persistent Wiki"), "Wiki section should not be included in minimal");
    assert("Does NOT contain ADR rules", !section.includes("## ADR And Specs"), "Decisions section should not be included in minimal");
    assert("Does NOT contain mockup rules", !section.includes("## Mockup"), "Mockups section should not be included in minimal");

    const packageJson = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert("package.json contains pom:update", packageJson.scripts["pom:update"] === "node pom-update.mjs", "pom:update script missing");
    assert("pom-update.mjs exists", existsSync(join(dir, "pom-update.mjs")), "pom-update.mjs not installed");
  } finally {
    cleanup(dir);
  }
}

function scenario2() {
  console.log("\nScenario 2: full profile → ≤320 lines");
  const dir = createTempProject();
  try {
    runInstaller(dir, "full");
    const section = extractPomSection(dir);
    const lines = countLines(section);
    console.log(`  Assembled lines: ${lines}`);
    assert("POM section exists", section !== null, "No POM section found in AGENTS.md");
    assert("Lines ≤320", lines <= 320, `Got ${lines} lines, expected ≤320`);
    assert("Contains wiki rules", section.includes("Persistent Wiki") || section.includes("persistent wiki"), "Wiki section missing in full profile");
    assert("Contains ADR rules", section.includes("ADR") && section.includes("Specs"), "Decisions section missing in full profile");
    assert("Contains planning rules", section.includes("Completion Verification") || section.includes("Planning"), "Planning section missing in full profile");
    assert("Contains handoff rules", section.includes("PROJECT_STATE") || section.includes("Handoff"), "Handoff section missing in full profile");
  } finally {
    cleanup(dir);
  }
}

function scenario3() {
  console.log("\nScenario 3: full → refresh to minimal → section shrinks");
  const dir = createTempProject();
  try {
    // Install with full
    runInstaller(dir, "full");
    const fullSection = extractPomSection(dir);
    const fullLines = countLines(fullSection);
    console.log(`  Full profile lines: ${fullLines}`);

    // Change config to minimal adoption
    const configPath = join(dir, "pom.config.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.adoption = {
      profile: "minimal",
      wiki: "disabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

    // Refresh
    runInstaller(dir, "refresh");
    const minimalSection = extractPomSection(dir);
    const minimalLines = countLines(minimalSection);
    console.log(`  After refresh to minimal: ${minimalLines} lines`);

    assert("Section shrank", minimalLines < fullLines, `Minimal (${minimalLines}) should be less than full (${fullLines})`);
    assert("Minimal ≤200 after refresh", minimalLines <= 200, `Got ${minimalLines} lines, expected ≤200`);
    assert("Wiki rules removed", !minimalSection.includes("## Persistent Wiki"), "Wiki section should be gone after refresh to minimal");
  } finally {
    cleanup(dir);
  }
}

function scenario4() {
  console.log("\nScenario 4: pom:update stops on local pom/ changes");
  const dir = mkdtempSync(join(tmpdir(), "pom-update-test-"));
  try {
    mkdirSync(join(dir, "pom"));
    execFileSync("git", ["init"], { cwd: join(dir, "pom"), stdio: "pipe" });
    writeFileSync(join(dir, "pom", "local-change.md"), "local change\n");
    writeFileSync(join(dir, "pom-update.mjs"), readFileSync(join(POM_ROOT, "templates", "POM_UPDATE_TEMPLATE.mjs"), "utf8"));

    let result;
    try {
      execFileSync("node", ["pom-update.mjs"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      result = { status: 0, stderr: "" };
    } catch (error) {
      result = {
        status: error.status ?? 1,
        stderr: error.stderr?.toString() ?? "",
      };
    }

    assert("pom:update exits non-zero", result.status !== 0, "Expected dirty pom/ to stop update");
    assert("pom:update suggests sync skill", result.stderr.includes("Read pom/skills/sync.md"), result.stderr);
  } finally {
    cleanup(dir);
  }
}

console.log("SPEC-0001 Completion Verification Tests");
console.log("========================================");

scenario1();
scenario2();
scenario3();
scenario4();

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
