#!/usr/bin/env node

// Tests for templates/POM_UPDATE_TEMPLATE.mjs, installed in target projects
// as pom-update.mjs (npm run pom:update). Only the offline guard rails are
// covered: mode-change arguments, a Git-managed pom/ with local changes, and
// a missing pom/. The vendored-copy update path (network clone) is out of
// scope here.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { createHarness, git, makeSandbox, removeSandbox, runNode } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();
const TEMPLATE = join(POM_ROOT, "templates", "POM_UPDATE_TEMPLATE.mjs");
const EXCLUDED_TOP_LEVEL = new Set(["node_modules", ".git", "experiments"]);

const { assert, section, banner, summary } = createHarness({ name: "POM Update Template Tests" });

function createTarget({ withPom = true } = {}) {
  const { dir } = makeSandbox("pom-update-template-test-");
  git(dir, ["init", "-q"]);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "target", private: true, type: "module", scripts: { "pom:update": "node pom-update.mjs" } }, null, 2));
  cpSync(TEMPLATE, join(dir, "pom-update.mjs"));
  if (withPom) {
    cpSync(POM_ROOT, join(dir, "pom"), {
      recursive: true,
      filter: (source) => {
        const rel = relative(POM_ROOT, source);
        if (!rel) return true;
        return !EXCLUDED_TOP_LEVEL.has(rel.split(/[\\/]/)[0]);
      },
    });
  }
  return dir;
}

function makePomGitManaged(dir) {
  const pomDir = join(dir, "pom");
  git(pomDir, ["init", "-q"]);
  git(pomDir, ["add", "-A"]);
  git(pomDir, ["commit", "-q", "-m", "installed"]);
}

function runUpdate(dir, args, env = {}) {
  return runNode(["pom-update.mjs", ...args], {
    cwd: dir,
    timeout: 60000,
    env: { POM_LANG: "", LC_ALL: "", LC_MESSAGES: "", LANG: "", ...env },
  });
}

const cleanup = removeSandbox;

function scenarioModeChangeArgs() {
  section("Scenario 1: mode-change arguments stop the update and point to pom:init");
  const dir = createTarget();
  try {
    assert("the copied pom/ excludes node_modules, .git and experiments", ["node_modules", ".git", "experiments"].every((name) => !existsSync(join(dir, "pom", name))), "excluded entry was copied");
    assert("the copied pom/ carries the installer and skills", existsSync(join(dir, "pom", "scripts", "install-pom.ts")) && existsSync(join(dir, "pom", "skills", "sync.md")), "pom/ is incomplete");
    makePomGitManaged(dir);
    const before = git(join(dir, "pom"), ["rev-parse", "HEAD"]).trim();

    const cases = [
      { args: ["--preset", "owned"], label: "--preset owned", flag: "--preset" },
      { args: ["--profile", "refresh"], label: "--profile refresh", flag: "--profile" },
      { args: ["--ownership=team"], label: "--ownership=team (inline form)", flag: "--ownership" },
    ];
    for (const c of cases) {
      const result = runUpdate(dir, c.args);
      assert(`${c.label}: exits non-zero`, result.status !== 0, `status=${result.status} stdout=${result.stdout}`);
      assert(`${c.label}: explains that pom:update does not change adoption mode`, result.stderr.includes("pom:update does not change adoption mode") && result.stderr.includes(c.flag), result.stderr);
      assert(`${c.label}: redirects to pom:init with the presets`, result.stderr.includes("npm run pom:init -- --preset owned") && result.stderr.includes("--preset minimal"), result.stderr);
      assert(`${c.label}: points to the config skill for unclear cases`, result.stderr.includes("pom/skills/config.md"), result.stderr);
      assert(`${c.label}: does not start the update`, !result.stdout.includes("Updating"), result.stdout);
    }

    const italian = runUpdate(dir, ["--preset", "owned", "--lang", "it"]);
    assert("--lang it: exits non-zero", italian.status !== 0, `status=${italian.status}`);
    assert("--lang it: prints the Italian explanation", italian.stderr.includes("pom:update non cambia la modalita di adozione") && italian.stderr.includes("npm run pom:init -- --preset owned"), italian.stderr);

    const envItalian = runUpdate(dir, ["--preset", "owned"], { POM_LANG: "it" });
    assert("POM_LANG=it selects the Italian explanation", envItalian.stderr.includes("pom:update non cambia la modalita di adozione"), envItalian.stderr);

    const combined = runUpdate(dir, ["--preset", "owned", "--ownership", "team"]);
    assert("several mode flags are all listed", combined.stderr.includes("--preset, --ownership"), combined.stderr);

    const after = git(join(dir, "pom"), ["rev-parse", "HEAD"]).trim();
    const status = git(join(dir, "pom"), ["status", "--porcelain"]);
    assert("pom/ is left untouched by rejected runs", before === after && status.trim() === "", `before=${before} after=${after} status=${status}`);
  } finally {
    cleanup(dir);
  }
}

function scenarioDirtyGitPom() {
  section("Scenario 2: Git-managed pom/ with local changes stops and suggests the sync skill");
  const dir = createTarget();
  try {
    makePomGitManaged(dir);
    const readme = join(dir, "pom", "README.md");
    const original = readFileSync(readme, "utf8");
    writeFileSync(readme, `${original}\nLocal edit.\n`);
    mkdirSync(join(dir, "pom", "local-notes"), { recursive: true });
    writeFileSync(join(dir, "pom", "local-notes", "todo.md"), "local file\n");

    const result = runUpdate(dir, []);
    assert("exits non-zero", result.status !== 0, `status=${result.status} stdout=${result.stdout}`);
    assert("reports that pom/ has local changes", result.stderr.includes("POM update stopped: pom/ has local changes."), result.stderr);
    assert("suggests pom/skills/sync.md to the agent", result.stderr.includes("Read pom/skills/sync.md"), result.stderr);
    assert("shows the Git status of pom/", result.stderr.includes(" M README.md") && result.stderr.includes("?? local-notes/"), result.stderr);
    assert("points to the Git inspection commands for a Git-managed pom/", result.stderr.includes("git -C pom status --short --branch") && result.stderr.includes("git -C pom diff"), result.stderr);
    assert("tells how to rerun after resolving", result.stderr.includes("npm run pom:update"), result.stderr);
    assert("does not attempt the update", !result.stdout.includes("Updating Git-managed pom/"), result.stdout);
    assert("local changes are preserved", readFileSync(readme, "utf8").endsWith("Local edit.\n") && existsSync(join(dir, "pom", "local-notes", "todo.md")), "local edit lost");
  } finally {
    cleanup(dir);
  }
}

function scenarioMissingPom() {
  section("Scenario 3: missing pom/ stops with a clear message");
  const dir = createTarget({ withPom: false });
  try {
    const result = runUpdate(dir, []);
    assert("exits non-zero", result.status !== 0, `status=${result.status} stdout=${result.stdout}`);
    assert("reports that pom/ does not exist", result.stderr.includes("POM update stopped: pom/ does not exist."), result.stderr);
    assert("suggests pom/skills/sync.md", result.stderr.includes("pom/skills/sync.md"), result.stderr);
    assert("does not create pom/", !existsSync(join(dir, "pom")), "pom/ was created");
    assert("does not run the refresh step", !result.stdout.includes("install-pom.ts"), result.stdout);
  } finally {
    cleanup(dir);
  }
}

banner();

scenarioModeChangeArgs();
scenarioDirtyGitPom();
scenarioMissingPom();

summary();
