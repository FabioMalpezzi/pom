#!/usr/bin/env node

/**
 * SPEC-0001 Completion Verification Tests
 *
 * Scenario 1: minimal profile → ≤200 lines
 * Scenario 2: full profile → ≤320 lines
 * Scenario 3: full → refresh to minimal → section shrinks to ≤200 lines
 * Scenario 4: pom:update stops on local pom/ changes
 * Scenario 5: pom:update supports clean vendored pom/ with unrelated parent changes
 * Scenario 6: docs lint skips specialized governance roots under docs/
 * Scenario 7: external overlay ownership applies conservative adoption defaults
 * Scenario 8: external overlay lint does not govern host project structure
 * Scenario 9: pom:update rejects adoption mode changes
 * Scenario 10: bootstrap without preset does not install implicitly
 * Scenario 11: non-interactive init without preset does not install implicitly
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

function runInstaller(projectDir, profile, extraArgs = []) {
  execFileSync(
    "node",
    ["--experimental-strip-types", "pom/scripts/install-pom.ts", "--profile", profile, ...extraArgs],
    { cwd: projectDir, stdio: "pipe" }
  );
}

function runInstallerArgs(projectDir, args) {
  execFileSync(
    "node",
    ["--experimental-strip-types", "pom/scripts/install-pom.ts", ...args],
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

function scenario5() {
  console.log("\nScenario 5: pom:update supports clean vendored pom/ with unrelated parent changes");
  const dir = mkdtempSync(join(tmpdir(), "pom-update-vendored-test-"));
  try {
    mkdirSync(join(dir, "pom"));
    writeFileSync(join(dir, "pom", "README.md"), "old vendored POM\n");
    execFileSync("git", ["init"], { cwd: dir, stdio: "pipe" });
    execFileSync("git", ["add", "pom"], { cwd: dir, stdio: "pipe" });
    execFileSync(
      "git",
      ["-c", "user.name=POM Test", "-c", "user.email=pom@example.test", "commit", "-m", "baseline"],
      { cwd: dir, stdio: "pipe" }
    );

    writeFileSync(join(dir, "notes.txt"), "unrelated local note\n");
    writeFileSync(join(dir, "pom-update.mjs"), readFileSync(join(POM_ROOT, "templates", "POM_UPDATE_TEMPLATE.mjs"), "utf8"));

    let result;
    try {
      execFileSync("node", ["pom-update.mjs"], {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, POM_REPO: POM_ROOT },
        stdio: ["ignore", "pipe", "pipe"],
      });
      result = { status: 0, stderr: "" };
    } catch (error) {
      result = {
        status: error.status ?? 1,
        stderr: error.stderr?.toString() ?? "",
      };
    }

    const packageJson = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert("pom:update exits zero", result.status === 0, result.stderr);
    assert("vendored pom/ refreshed", existsSync(join(dir, "pom", "templates", "POM_UPDATE_TEMPLATE.mjs")), "POM template missing after update");
    assert("package.json keeps pom:update", packageJson.scripts["pom:update"] === "node pom-update.mjs", "pom:update script missing");
    assert("unrelated parent change preserved", existsSync(join(dir, "notes.txt")), "Unrelated file was removed");
  } finally {
    cleanup(dir);
  }
}

function scenario6() {
  console.log("\nScenario 6: docs lint skips specialized governance roots under docs/");
  const dir = createTempProject();
  try {
    mkdirSync(join(dir, "docs", "adr"), { recursive: true });
    writeFileSync(
      join(dir, "pom.config.json"),
      JSON.stringify(
        {
          adoption: { decisions: "enabled", docs: "optional" },
          documentation: { officialRoot: "docs" },
          analysis: { root: "docs/specs", indexPath: "docs/specs/SPECS_INDEX.md" },
          decisions: { root: "docs/adr", indexPath: "docs/adr/ADR_INDEX.md", requireTemplateSections: false },
          taskPlans: { root: "docs/tasks", indexPath: "docs/tasks/TASKS_INDEX.md", requireTemplateSections: true },
        },
        null,
        2,
      ) + "\n",
    );
    execFileSync("git", ["init"], { cwd: dir, stdio: "pipe" });

    let result;
    try {
      const stdout = execFileSync("node", ["--experimental-strip-types", "pom/scripts/lint-doc-governance.ts"], {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      result = { status: 0, stdout, stderr: "" };
    } catch (error) {
      result = {
        status: error.status ?? 1,
        stdout: error.stdout?.toString() ?? "",
        stderr: error.stderr?.toString() ?? "",
      };
    }

    assert("lint exits zero", result.status === 0, result.stderr);
    assert("ADR index generated", existsSync(join(dir, "docs", "adr", "ADR_INDEX.md")), "ADR index missing");
    assert("generated ADR index does not require ADR", !result.stdout.includes("docs-without-adr"), result.stdout);
  } finally {
    cleanup(dir);
  }
}

function scenario7() {
  console.log("\nScenario 7: external overlay ownership applies conservative adoption defaults");
  const dir = createTempProject();
  try {
    runInstallerArgs(dir, ["--preset", "overlay"]);
    const config = JSON.parse(readFileSync(join(dir, "pom.config.json"), "utf8"));

    assert("ownership mode saved", config.ownership?.mode === "external_overlay", JSON.stringify(config.ownership));
    assert("ownership is local-only", config.ownership?.localOnly === true, JSON.stringify(config.ownership));
    assert("docs governance disabled", config.adoption?.docs === "disabled", JSON.stringify(config.adoption));
    assert("tests governance disabled", config.adoption?.tests === "disabled", JSON.stringify(config.adoption));
    assert("decisions governance disabled", config.adoption?.decisions === "disabled", JSON.stringify(config.adoption));
    assert("wiki not created by overlay default", !existsSync(join(dir, "wiki")), "wiki/ should not be created by default in current overlay mode");
  } finally {
    cleanup(dir);
  }
}

function scenario8() {
  console.log("\nScenario 8: external overlay lint does not govern host project structure");
  const dir = createTempProject();
  try {
    runInstaller(dir, "adopt", ["--ownership", "external_overlay"]);

    writeFileSync(join(dir, "CHANGELOG.md"), "# Host changelog\n");
    mkdirSync(join(dir, "docs", "en"), { recursive: true });
    writeFileSync(join(dir, "docs", "en", "_index.md"), "# Host docs index\n");
    mkdirSync(join(dir, "tests", "host"), { recursive: true });
    writeFileSync(join(dir, "tests", "host", "host_test.go"), "package host\n");
    execFileSync("git", ["init"], { cwd: dir, stdio: "pipe" });

    let result;
    try {
      const stdout = execFileSync("node", ["--experimental-strip-types", "pom/scripts/lint-doc-governance.ts"], {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      result = { status: 0, stdout, stderr: "" };
    } catch (error) {
      result = {
        status: error.status ?? 1,
        stdout: error.stdout?.toString() ?? "",
        stderr: error.stderr?.toString() ?? "",
      };
    }

    assert("lint exits zero", result.status === 0, result.stdout + result.stderr);
    assert("host root Markdown ignored", !result.stdout.includes("root-markdown"), result.stdout);
    assert("host docs ignored", !result.stdout.includes("docs-sources") && !result.stdout.includes("index-name"), result.stdout);
    assert("host tests ignored", !result.stdout.includes("tests-"), result.stdout);
  } finally {
    cleanup(dir);
  }
}

function scenario9() {
  console.log("\nScenario 9: pom:update rejects adoption mode changes");
  const dir = mkdtempSync(join(tmpdir(), "pom-update-mode-test-"));
  try {
    writeFileSync(join(dir, "pom-update.mjs"), readFileSync(join(POM_ROOT, "templates", "POM_UPDATE_TEMPLATE.mjs"), "utf8"));

    let result;
    try {
      execFileSync("node", ["pom-update.mjs", "--preset", "overlay"], {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      result = { status: 0, stderr: "" };
    } catch (error) {
      result = {
        status: error.status ?? 1,
        stderr: error.stderr?.toString() ?? "",
      };
    }

    assert("pom:update exits non-zero", result.status !== 0, "Expected mode-change args to be rejected");
    assert("pom:update explains boundary", result.stderr.includes("does not change adoption mode"), result.stderr);
  } finally {
    cleanup(dir);
  }
}

function scenario10() {
  console.log("\nScenario 10: bootstrap without preset does not install implicitly");
  const dir = mkdtempSync(join(tmpdir(), "pom-bootstrap-guide-test-"));
  try {
    let result;
    try {
      execFileSync("node", [join(POM_ROOT, "bootstrap-pom.mjs")], {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      result = { status: 0, stdout: "" };
    } catch (error) {
      result = {
        status: error.status ?? 1,
        stdout: error.stdout?.toString() ?? "",
      };
    }

    assert("bootstrap exits non-zero", result.status !== 0, "Expected missing preset to stop first install");
    assert("bootstrap prints preset guide", result.stdout.includes("--preset overlay"), result.stdout);
    assert("bootstrap did not create pom/", !existsSync(join(dir, "pom")), "pom/ should not be cloned without an explicit preset");
  } finally {
    cleanup(dir);
  }
}

function scenario11() {
  console.log("\nScenario 11: non-interactive init without preset does not install implicitly");
  const dir = createTempProject();
  try {
    let result;
    try {
      execFileSync("node", ["--experimental-strip-types", "pom/scripts/install-pom.ts"], {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      result = { status: 0, stdout: "" };
    } catch (error) {
      result = {
        status: error.status ?? 1,
        stdout: error.stdout?.toString() ?? "",
      };
    }

    assert("init exits non-zero", result.status !== 0, "Expected missing preset/profile to stop non-interactive init");
    assert("init prints preset guide", result.stdout.includes("--preset overlay"), result.stdout);
    assert("init did not create AGENTS.md", !existsSync(join(dir, "AGENTS.md")), "AGENTS.md should not be created without explicit mode");
    assert("init did not create pom.config.json", !existsSync(join(dir, "pom.config.json")), "pom.config.json should not be created without explicit mode");
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
scenario5();
scenario6();
scenario7();
scenario8();
scenario9();
scenario10();
scenario11();

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
