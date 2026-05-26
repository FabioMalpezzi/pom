#!/usr/bin/env node

/**
 * SPEC-0001 Completion Verification Tests
 *
 * Scenario 1: minimal profile → global core + skill router only, ≤140 lines
 * Scenario 2: full profile → active workflow modules, ≤260 lines
 * Scenario 3: refresh follows current config, then full → minimal shrinks to ≤140 lines
 * Scenario 4: pom:update stops on local pom/ changes
 * Scenario 5: pom:update supports clean vendored pom/ with unrelated parent changes
 * Scenario 6: docs lint skips specialized governance roots under docs/
 * Scenario 7: external overlay ownership applies conservative adoption defaults
 * Scenario 8: external overlay lint does not govern host project structure
 * Scenario 9: pom:update rejects adoption mode changes
 * Scenario 10: bootstrap without preset does not install implicitly
 * Scenario 11: non-interactive init without preset does not install implicitly
 * Scenario 12: installer leaves the POM source repo untouched when pom/ is a symlink
 * Scenario 13: pom-update leaves the POM source repo untouched when pom/ is a symlink
 * Scenario 14: bootstrap stops when run from the POM Source root
 * Scenario 15: installer initializes Git and installs the hook in a new target root
 * Scenario 16: installer does not create nested Git or parent hook from a subdirectory target
 * Scenario 17: installer respects configured ADR root instead of forcing decisions/
 * Scenario 18: refresh fails before writing agent files when pom.config.json is invalid
 * Scenario 19: refresh expands partial full adoption config from full defaults
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  console.log("\nScenario 1: minimal profile → global core + skill router only, ≤140 lines");
  const dir = createTempProject();
  try {
    runInstaller(dir, "minimal");
    const section = extractPomSection(dir);
    const lines = countLines(section);
    console.log(`  Assembled lines: ${lines}`);
    assert("POM section exists", section !== null, "No POM section found in AGENTS.md");
    assert("Lines ≤140", lines <= 140, `Got ${lines} lines, expected ≤140`);
    assert("Contains core principle", section.includes("authoritative source") || section.includes("Operating Memory"), "Core section missing");
    assert("Explains installed POM layout", section.includes("day-zero project") && section.includes("Git-managed install"), "Installed layout guidance missing");
    assert("Explains global rules vs skills", section.includes("Global Rules And Skills") && section.includes("If a rule applies only to one kind of work"), "Global/skills boundary missing");
    assert("Contains skill routing", section.includes("Common routing") && section.includes("Temporary experiment or spike"), "Skill router missing");
    assert("Does NOT contain wiki rules", !section.includes("## Persistent Wiki"), "Wiki section should not be included in minimal");
    assert("Does NOT contain ADR rules", !section.includes("## ADR And Specs"), "Decisions section should not be included in minimal");
    assert("Does NOT contain handoff workflow details", !section.includes("## Restart Context"), "Handoff workflow should not be included in minimal");
    assert("Does NOT contain template status table", !section.includes("## Suggested Document Statuses"), "Template/status workflow should not be included in minimal");
    assert("Does NOT contain experiment rules", !section.includes("## Temporary Experiments"), "Experiment workflow should not be included in minimal");
    assert("Does NOT contain docs/source workflow", !section.includes("## Docs And Source Conventions"), "Docs/source workflow should not be included in minimal");
    assert("Does NOT contain mockup rules", !section.includes("## Mockup"), "Mockups section should not be included in minimal");

    const packageJson = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert("package.json contains pom:update", packageJson.scripts["pom:update"] === "node pom-update.mjs", "pom:update script missing");
    assert("pom-update.mjs exists", existsSync(join(dir, "pom-update.mjs")), "pom-update.mjs not installed");
    assert("installer initializes Git", existsSync(join(dir, ".git")), ".git should be created for a new target project");
    assert("installer installs pre-commit hook", readFileSync(join(dir, ".git", "hooks", "pre-commit"), "utf8").includes("POM pre-commit"), "POM hook missing");
  } finally {
    cleanup(dir);
  }
}

function scenario2() {
  console.log("\nScenario 2: full profile → active workflow modules, ≤260 lines");
  const dir = createTempProject();
  try {
    runInstaller(dir, "full");
    const section = extractPomSection(dir);
    const lines = countLines(section);
    console.log(`  Assembled lines: ${lines}`);
    assert("POM section exists", section !== null, "No POM section found in AGENTS.md");
    assert("Lines ≤260", lines <= 260, `Got ${lines} lines, expected ≤260`);
    assert("Contains wiki rules", section.includes("Persistent Wiki") || section.includes("persistent wiki"), "Wiki section missing in full profile");
    assert("Contains ADR rules", section.includes("ADR") && section.includes("Specs"), "Decisions section missing in full profile");
    assert("Contains planning rules", section.includes("Completion Verification") || section.includes("Planning"), "Planning section missing in full profile");
    assert("Contains handoff rules", section.includes("PROJECT_STATE") || section.includes("Handoff"), "Handoff section missing in full profile");
  } finally {
    cleanup(dir);
  }
}

function scenario3() {
  console.log("\nScenario 3: refresh follows current config, then full → minimal shrinks");
  const dir = createTempProject();
  try {
    // Install with full
    runInstaller(dir, "full");
    const fullSection = extractPomSection(dir);
    const fullLines = countLines(fullSection);
    console.log(`  Full profile lines: ${fullLines}`);

    // Refresh should honor the current full config, not the refresh profile defaults.
    runInstaller(dir, "refresh");
    const refreshedFullSection = extractPomSection(dir);
    assert("Refresh preserves full config modules", refreshedFullSection.includes("## Persistent Wiki") && refreshedFullSection.includes("## Completion Verification Rules"), "Refresh should assemble from current pom.config.json");

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
    assert("Minimal ≤140 after refresh", minimalLines <= 140, `Got ${minimalLines} lines, expected ≤140`);
    assert("Wiki rules removed", !minimalSection.includes("## Persistent Wiki"), "Wiki section should be gone after refresh to minimal");
    assert("Handoff workflow removed", !minimalSection.includes("## Restart Context"), "Handoff workflow should be gone after refresh to minimal");
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
        env: { ...process.env, POM_LANG: "en" },
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

function scenario12() {
  console.log("\nScenario 12: installer leaves POM source untouched when pom/ is a symlink");
  // When pom/ in the target project is a symbolic link to the POM source
  // repository (typical of integration tests, and of developer setups where a
  // local POM clone is linked into a target), the installer must not run git
  // checkout or git pull on it: that would mutate the linked source repo.
  const dir = createTempProject();
  try {
    const branchBefore = execFileSync("git", ["-C", POM_ROOT, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const headBefore = execFileSync("git", ["-C", POM_ROOT, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    let result;
    try {
      const stdout = execFileSync(
        "node",
        ["--experimental-strip-types", "pom/scripts/install-pom.ts", "--profile", "refresh"],
        { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      result = { status: 0, stdout };
    } catch (error) {
      result = { status: error.status ?? 1, stdout: error.stdout?.toString() ?? "" };
    }

    const branchAfter = execFileSync("git", ["-C", POM_ROOT, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const headAfter = execFileSync("git", ["-C", POM_ROOT, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    assert("installer exits cleanly on refresh profile", result.status === 0, result.stdout);
    assert(
      "installer announces it is skipping the symlink",
      result.stdout.includes("symbolic link"),
      result.stdout,
    );
    assert(
      "POM source branch is unchanged after the installer ran",
      branchBefore === branchAfter,
      `branch before=${branchBefore} after=${branchAfter}`,
    );
    assert(
      "POM source HEAD commit is unchanged after the installer ran",
      headBefore === headAfter,
      `head before=${headBefore} after=${headAfter}`,
    );
  } finally {
    cleanup(dir);
  }
}

function scenario13() {
  console.log("\nScenario 13: pom-update leaves POM source untouched when pom/ is a symlink");
  // Symmetric to scenario 12 but for pom-update.mjs: when pom/ in a target
  // is a symlink to the POM source repo, running pom-update must not run
  // git checkout/pull or rm+copy on it, otherwise it would mutate the linked
  // source rather than update a target installation.
  const dir = createTempProject();
  try {
    writeFileSync(
      join(dir, "pom-update.mjs"),
      readFileSync(join(POM_ROOT, "templates", "POM_UPDATE_TEMPLATE.mjs"), "utf8"),
    );

    const branchBefore = execFileSync("git", ["-C", POM_ROOT, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const headBefore = execFileSync("git", ["-C", POM_ROOT, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    let result;
    try {
      const stdout = execFileSync("node", ["pom-update.mjs"], {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, POM_LANG: "en" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      result = { status: 0, stdout };
    } catch (error) {
      result = { status: error.status ?? 1, stdout: error.stdout?.toString() ?? "" };
    }

    const branchAfter = execFileSync("git", ["-C", POM_ROOT, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const headAfter = execFileSync("git", ["-C", POM_ROOT, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    assert("pom-update exits cleanly", result.status === 0, result.stdout);
    assert(
      "pom-update announces it is skipping the symlink",
      result.stdout.includes("symbolic link"),
      result.stdout,
    );
    assert(
      "POM source branch is unchanged after pom-update ran",
      branchBefore === branchAfter,
      `branch before=${branchBefore} after=${branchAfter}`,
    );
    assert(
      "POM source HEAD commit is unchanged after pom-update ran",
      headBefore === headAfter,
      `head before=${headBefore} after=${headAfter}`,
    );
  } finally {
    cleanup(dir);
  }
}

function scenario14() {
  console.log("\nScenario 14: bootstrap stops when run from the POM Source root");
  const parent = mkdtempSync(join(tmpdir(), "pom-bootstrap-source-root-test-"));
  const sourceDir = join(parent, "pom");
  try {
    mkdirSync(join(sourceDir, "templates"), { recursive: true });
    mkdirSync(join(sourceDir, "prompts"), { recursive: true });
    mkdirSync(join(sourceDir, "skills"), { recursive: true });
    mkdirSync(join(sourceDir, "scripts"), { recursive: true });
    writeFileSync(join(sourceDir, "WIKI_METHOD.md"), "# Wiki Method\n");
    writeFileSync(join(sourceDir, "README.md"), "# POM\n");
    writeFileSync(join(sourceDir, "AGENTS.MD"), "# POM Repository Instructions\n");
    writeFileSync(join(sourceDir, "templates", "AGENTS_POM_SECTION_TEMPLATE.md"), "# Project Operating Memory\n");
    writeFileSync(join(sourceDir, "scripts", "install-pom.ts"), "console.log('dummy installer should not run');\n");
    copyFileSync(join(POM_ROOT, "bootstrap-pom.mjs"), join(sourceDir, "bootstrap-pom.mjs"));

    let result;
    try {
      execFileSync("node", ["bootstrap-pom.mjs", "--preset", "minimal", "--lang", "en"], {
        cwd: sourceDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      result = { status: 0, stdout: "", stderr: "" };
    } catch (error) {
      result = {
        status: error.status ?? 1,
        stdout: error.stdout?.toString() ?? "",
        stderr: error.stderr?.toString() ?? "",
      };
    }

    assert("bootstrap exits non-zero", result.status !== 0, "Expected POM Source root to stop bootstrap");
    assert("bootstrap identifies POM Source root", result.stderr.includes("POM Source"), result.stderr);
    assert("bootstrap does not run installer", !result.stdout.includes("dummy installer"), result.stdout);
  } finally {
    cleanup(parent);
  }
}

function scenario15() {
  console.log("\nScenario 15: installer initializes Git and installs the hook in a new target root");
  const dir = createTempProject();
  try {
    const stdout = execFileSync(
      "node",
      ["--experimental-strip-types", "pom/scripts/install-pom.ts", "--preset", "owned"],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );

    const hookPath = join(dir, ".git", "hooks", "pre-commit");
    assert("installer reports Git initialization", stdout.includes("Initialized Git repository"), stdout);
    assert("installer marks Claude helper as optional", stdout.includes("Optional Claude Code agent files not installed"), stdout);
    assert("installer prints exact Claude helper command", stdout.includes("mkdir -p .claude") && stdout.includes("npm run pom:init -- --preset owned"), stdout);
    assert("target root has Git repository", existsSync(join(dir, ".git")), ".git missing");
    assert("target root has POM pre-commit hook", readFileSync(hookPath, "utf8").includes("POM pre-commit"), "POM hook missing");
  } finally {
    cleanup(dir);
  }
}

function scenario16() {
  console.log("\nScenario 16: installer does not create nested Git or parent hook from a subdirectory target");
  const parent = mkdtempSync(join(tmpdir(), "pom-nested-git-test-"));
  const appDir = join(parent, "app");
  try {
    execFileSync("git", ["init"], { cwd: parent, stdio: "pipe" });
    mkdirSync(appDir);
    execFileSync("ln", ["-s", POM_ROOT, join(appDir, "pom")]);

    const stdout = execFileSync(
      "node",
      ["--experimental-strip-types", "pom/scripts/install-pom.ts", "--profile", "minimal"],
      { cwd: appDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );

    assert("installer reports enclosing worktree", stdout.includes("inside an existing Git worktree"), stdout);
    assert("installer reports skipped hook", stdout.includes("Git hook not installed automatically"), stdout);
    assert("target subdirectory has no nested .git", !existsSync(join(appDir, ".git")), "nested .git should not be created");
    assert("parent hook was not installed from subdirectory", !existsSync(join(parent, ".git", "hooks", "pre-commit")), "parent hook should not be installed");
  } finally {
    cleanup(parent);
  }
}

function scenario17() {
  console.log("\nScenario 17: installer respects configured ADR root instead of forcing decisions/");
  const dir = createTempProject();
  try {
    writeFileSync(
      join(dir, "pom.config.json"),
      JSON.stringify(
        {
          decisions: {
            root: "adr",
            adrPathPattern: "^decisions/ADR-\\d{4}-.+\\.md$",
            indexPath: "decisions/DECISIONS_INDEX.md",
          },
        },
        null,
        2,
      ) + "\n",
    );

    runInstaller(dir, "decisions");
    execFileSync("node", ["--experimental-strip-types", "pom/scripts/lint-doc-governance.ts"], {
      cwd: dir,
      stdio: "pipe",
    });

    const config = JSON.parse(readFileSync(join(dir, "pom.config.json"), "utf8"));
    const hook = readFileSync(join(dir, ".git", "hooks", "pre-commit"), "utf8");
    assert("configured ADR root preserved", config.decisions?.root === "adr", JSON.stringify(config.decisions));
    assert("ADR pattern follows configured root", config.decisions?.adrPathPattern?.startsWith("^adr/"), JSON.stringify(config.decisions));
    assert("ADR index follows configured root", config.decisions?.indexPath === "adr/ADR_INDEX.md", JSON.stringify(config.decisions));
    assert("configured ADR root created", existsSync(join(dir, "adr")), "adr/ should be created");
    assert("default decisions root not forced", !existsSync(join(dir, "decisions")), "decisions/ should not be created");
    assert("configured ADR index generated", existsSync(join(dir, "adr", "ADR_INDEX.md")), "ADR index missing");
    assert("pre-commit watches configured ADR root", hook.includes("'adr'"), hook);
  } finally {
    cleanup(dir);
  }
}

function scenario18() {
  console.log("\nScenario 18: refresh fails before writing agent files when pom.config.json is invalid");
  const dir = createTempProject();
  try {
    writeFileSync(join(dir, "pom.config.json"), "{ invalid json\n");

    let result;
    try {
      runInstaller(dir, "refresh");
      result = { status: 0, stderr: "", stdout: "" };
    } catch (error) {
      result = {
        status: error.status ?? 1,
        stderr: error.stderr?.toString() ?? "",
        stdout: error.stdout?.toString() ?? "",
      };
    }

    const output = `${result.stdout}\n${result.stderr}`;
    assert("refresh exits non-zero", result.status !== 0, "Expected invalid config to stop refresh");
    assert("refresh reports pom.config.json", output.includes("pom.config.json"), output);
    assert("AGENTS.md not created", !existsSync(join(dir, "AGENTS.md")), "AGENTS.md should not be written after invalid config");
  } finally {
    cleanup(dir);
  }
}

function scenario19() {
  console.log("\nScenario 19: refresh expands partial full adoption config from full defaults");
  const dir = createTempProject();
  try {
    writeFileSync(
      join(dir, "pom.config.json"),
      JSON.stringify({ adoption: { profile: "full" } }, null, 2) + "\n",
    );

    runInstaller(dir, "refresh");
    const section = extractPomSection(dir);

    assert("POM section exists", section !== null, "No POM section found in AGENTS.md");
    assert("Partial full config includes wiki", section.includes("## Persistent Wiki"), "Wiki module missing");
    assert("Partial full config includes planning", section.includes("## Completion Verification Rules"), "Planning module missing");
    assert("Partial full config includes handoff", section.includes("## Restart Context"), "Handoff module missing");
  } finally {
    cleanup(dir);
  }
}

console.log("SPEC-0001 Completion Verification Tests");
console.log("========================================");

// Scenarios 12 and 13 must run first: they assert that neither the installer
// nor pom-update mutates the POM source repo when pom/ is a symlink. Scenarios
// that exercise `--profile refresh` or update flows (e.g. scenario3) would
// otherwise have moved the branch before they could observe the unmoved state.
scenario12();
scenario13();
scenario14();
scenario15();
scenario16();
scenario17();
scenario18();
scenario19();
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
