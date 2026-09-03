#!/usr/bin/env node
// Regression tests for installer, bootstrap, and updater hardening:
//   1. pom:init rerun with the same mode leaves pom.config.json untouched;
//   2. the pre-commit hook restages tracked artifacts that pom:lint regenerated;
//   3. pom-update.mjs refuses to replace a vendored pom/ that Git ignores;
//   4. the installer accepts --no-pull on refresh.

import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { GIT_IDENTITY, createHarness, git, makeSandbox, removeSandbox, runCommand, runNode } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();
const INSTALLER = ["--experimental-strip-types", "pom/scripts/install-pom.ts"];
const { assert, section, summary } = createHarness();

function copyPomSource(target) {
  cpSync(POM_ROOT, join(target, "pom"), {
    recursive: true,
    filter: (source) => {
      const rel = source.slice(POM_ROOT.length + 1);
      if (!rel) return true;
      const head = rel.split(/[\\/]/)[0];
      return !["node_modules", ".git", "experiments", "wiki", "pom.config.json"].includes(head);
    },
  });
}

// Every installer/updater/bootstrap run speaks English so the assertions can
// match the messages regardless of the developer locale.
function node(dir, args) {
  const result = runNode(args, { cwd: dir, env: { POM_LANG: "en" } });
  return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

function makeTarget(prefix) {
  const { dir } = makeSandbox(prefix);
  git(dir, ["init", "-q"]);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "target", version: "0.0.1", private: true }, null, 2) + "\n");
  writeFileSync(join(dir, "README.md"), "# target\n");
  copyPomSource(dir);
  return dir;
}

function scenarioConfigRerun() {
  section("Scenario 1: rerunning pom:init with the same preset does not rewrite pom.config.json");
  const dir = makeTarget("pom-hardening-config-");
  try {
    const first = node(dir, [...INSTALLER, "--preset", "owned"]);
    assert("first install succeeds", first.status === 0, first.stderr);
    const configPath = join(dir, "pom.config.json");
    const before = readFileSync(configPath, "utf8");
    const mtimeBefore = statSync(configPath).mtimeMs;

    const second = node(dir, [...INSTALLER, "--preset", "owned"]);
    assert("second install succeeds", second.status === 0, second.stderr);
    assert("second install reports the config as already current", second.stdout.includes("already has the adopt adoption profile"), second.stdout);
    assert("second install does not claim an update", !second.stdout.includes("Updated pom.config.json"), second.stdout);
    assert("pom.config.json content is unchanged", readFileSync(configPath, "utf8") === before);
    assert("pom.config.json mtime is unchanged", statSync(configPath).mtimeMs === mtimeBefore);

    const changed = node(dir, [...INSTALLER, "--preset", "team"]);
    assert("changing the preset still rewrites the config", changed.status === 0 && changed.stdout.includes("Updated pom.config.json"), changed.stdout);
  } finally {
    removeSandbox(dir);
  }
}

function scenarioHookRestagesRegeneratedIndex() {
  section("Scenario 2: the pre-commit hook restages the ADR index that pom:lint regenerates");
  const dir = makeTarget("pom-hardening-hook-");
  try {
    const install = node(dir, [...INSTALLER, "--profile", "decisions", "--ownership", "owned"]);
    assert("install with decisions profile succeeds", install.status === 0, install.stderr);
    const hook = readFileSync(join(dir, ".git", "hooks", "pre-commit"), "utf8");
    assert("hook contains the restage block", hook.includes("git add --all --") && hook.includes("'decisions/DECISIONS_INDEX.md'"), hook);
    assert("hook lists the wiki reader output as generated", hook.includes("'wiki/_site'"), hook);

    const firstLint = node(dir, ["--experimental-strip-types", "pom/scripts/lint-doc-governance.ts"]);
    assert("first lint succeeds and creates the ADR index", firstLint.status === 0 && existsSync(join(dir, "decisions", "DECISIONS_INDEX.md")), firstLint.stdout + firstLint.stderr);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "adopt pom"]);

    const adr = [
      "# ADR-0001 - Keep the test fixture small",
      "",
      "| Field | Value |",
      "|---|---|",
      "| Date | 2026-09-02 |",
      "| Status | Proposed |",
      "| Category | tooling |",
      "| Area | tests |",
      "",
      ...["Context", "Decision", "Rationale", "Alternatives Considered", "Impacts", "Links", "Follow-up", "Completion Verification", "Evolution Rule"].flatMap((section) => [`## ${section}`, "", "Fixture text.", ""]),
    ].join("\n");
    writeFileSync(join(dir, "decisions", "ADR-0001-keep-the-test-fixture-small.md"), adr);
    git(dir, ["add", "decisions/ADR-0001-keep-the-test-fixture-small.md"]);

    // Git forwards hook output to stderr, so capture both streams.
    const commit = runCommand("git", [...GIT_IDENTITY, "commit", "-m", "add ADR-0001"], { cwd: dir });
    const commitStatus = commit.status ?? 1;
    const commitOutput = `${commit.stdout ?? ""}${commit.stderr ?? ""}`;
    assert("commit with the hook succeeds", commitStatus === 0, commitOutput);
    assert("hook reports the restaged index", commitOutput.includes("restaged regenerated POM artifacts") && commitOutput.includes("decisions/DECISIONS_INDEX.md"), commitOutput);

    const status = git(dir, ["status", "--porcelain"]);
    assert("working tree is clean after the commit", status.trim() === "", status);
    const committedIndex = git(dir, ["show", "HEAD:decisions/DECISIONS_INDEX.md"]);
    assert("committed index lists the new ADR", committedIndex.includes("ADR-0001"), committedIndex);
  } finally {
    removeSandbox(dir);
  }
}

function scenarioUpdaterRefusesIgnoredVendoredPom() {
  section("Scenario 3: pom-update.mjs refuses to replace a vendored pom/ that Git ignores");
  const dir = makeSandbox("pom-hardening-ignored-").dir;
  try {
    git(dir, ["init", "-q"]);
    mkdirSync(join(dir, "pom"));
    writeFileSync(join(dir, "pom", "README.md"), "vendored POM with a local edit\n");
    writeFileSync(join(dir, ".gitignore"), "pom/\n");
    writeFileSync(join(dir, "pom-update.mjs"), readFileSync(join(POM_ROOT, "templates", "POM_UPDATE_TEMPLATE.mjs"), "utf8"));
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "baseline"]);

    const result = node(dir, ["pom-update.mjs"]);
    assert("updater exits non-zero", result.status !== 0, result.stdout);
    assert("updater explains that an ignored pom/ cannot be verified", result.stderr.includes("ignored by Git"), result.stderr);
    assert("local edit in pom/ survives", readFileSync(join(dir, "pom", "README.md"), "utf8").includes("local edit"));
  } finally {
    removeSandbox(dir);
  }
}

function scenarioNoPullFlag() {
  section("Scenario 4: refresh accepts --no-pull");
  const dir = makeTarget("pom-hardening-nopull-");
  try {
    const install = node(dir, [...INSTALLER, "--preset", "minimal"]);
    assert("install succeeds", install.status === 0, install.stderr);
    const refresh = node(dir, [...INSTALLER, "--profile", "refresh", "--no-pull"]);
    assert("refresh with --no-pull succeeds", refresh.status === 0, refresh.stderr);
    assert("refresh with --no-pull does not pull", !refresh.stdout.includes("Pulling latest POM changes"), refresh.stdout);
    const updater = readFileSync(join(dir, "pom-update.mjs"), "utf8");
    assert("installed updater passes --no-pull to the refresh", updater.includes('"--no-pull"'), "flag missing in pom-update.mjs");
  } finally {
    removeSandbox(dir);
  }
}

function scenarioBootstrapUnreachableSource() {
  section("Scenario 5: bootstrap fails cleanly when the POM source cannot be reached");
  const dir = makeSandbox("pom-hardening-bootstrap-").dir;
  try {
    git(dir, ["init", "-q"]);
    writeFileSync(join(dir, "package.json"), '{"name":"target","version":"0.0.1","private":true}\n');
    const result = node(dir, [join(POM_ROOT, "bootstrap-pom.mjs"), "--preset", "minimal", "--repo", join(dir, "does-not-exist.git")]);
    assert("bootstrap exits 1", result.status === 1, `status ${result.status}`);
    assert("bootstrap names the unreachable source", result.stderr.includes("Cannot reach the POM source repository"), result.stderr);
    assert("bootstrap prints no stack trace", !/\n\s+at /.test(result.stderr), result.stderr);
    assert("nothing was cloned", !existsSync(join(dir, "pom")));
  } finally {
    removeSandbox(dir);
  }
}

function scenarioBootstrapRerunOnVendoredCopy() {
  section("Scenario 6: bootstrap rerun on a vendored pom/ leaves the target repository alone");
  const dir = makeTarget("pom-hardening-vendored-rerun-");
  try {
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "baseline with vendored pom"]);
    git(dir, ["checkout", "-q", "-b", "feature"]);
    writeFileSync(join(dir, "feature.txt"), "work in progress\n");
    const result = node(dir, [join(POM_ROOT, "bootstrap-pom.mjs"), "--preset", "minimal"]);
    assert("bootstrap succeeds on a vendored copy", result.status === 0, result.stderr);
    assert("bootstrap reports the vendored copy", result.stdout.includes("vendored copy without Git metadata"), result.stdout);
    assert("target branch is unchanged", git(dir, ["branch", "--show-current"]).trim() === "feature", git(dir, ["branch", "--show-current"]));
    assert("uncommitted work is untouched", existsSync(join(dir, "feature.txt")));
  } finally {
    removeSandbox(dir);
  }
}

function scenarioHuskyHooksPath() {
  section("Scenario 7: with husky's core.hooksPath the POM block goes to .husky/pre-commit");
  const dir = makeTarget("pom-hardening-husky-");
  try {
    mkdirSync(join(dir, ".husky", "_"), { recursive: true });
    writeFileSync(join(dir, ".husky", "_", "pre-commit"), "#!/usr/bin/env sh\n. \"$(dirname \"$0\")/h\"\n");
    git(dir, ["config", "core.hooksPath", ".husky/_"]);
    const install = node(dir, [...INSTALLER, "--preset", "minimal"]);
    assert("install succeeds with husky", install.status === 0, install.stderr);
    assert("installer reports the husky detection", install.stdout.includes("Detected husky"), install.stdout);
    const userHook = join(dir, ".husky", "pre-commit");
    assert("POM block lands in .husky/pre-commit", existsSync(userHook) && readFileSync(userHook, "utf8").includes("# POM:START pre-commit"), "user hook missing");
    assert("husky shim is left untouched", !readFileSync(join(dir, ".husky", "_", "pre-commit"), "utf8").includes("POM:START"));
  } finally {
    removeSandbox(dir);
  }
}

function scenarioConfiguredWikiRoot() {
  section("Scenario 8: profile files honor wiki.root and handoff paths from an existing config");
  const dir = makeTarget("pom-hardening-wikiroot-");
  try {
    const template = JSON.parse(readFileSync(join(POM_ROOT, "templates", "POM_CONFIG_TEMPLATE.json"), "utf8"));
    template.wiki.root = "doc/wiki";
    template.handoff = { ...(template.handoff ?? {}), projectStatePath: "STATE.md", currentPlanPath: "PLAN.md" };
    writeFileSync(join(dir, "pom.config.json"), JSON.stringify(template, null, 2) + "\n");
    const install = node(dir, [...INSTALLER, "--profile", "full", "--ownership", "owned"]);
    assert("install with full profile succeeds", install.status === 0, install.stderr);
    assert("wiki index is created under wiki.root", existsSync(join(dir, "doc", "wiki", "index.md")), "doc/wiki/index.md missing");
    assert("no default wiki/ folder is created", !existsSync(join(dir, "wiki")));
    assert("wiki.html shortcut points at the configured reader", readFileSync(join(dir, "wiki.html"), "utf8").includes("doc/wiki/_site/"));
    assert("project state uses handoff.projectStatePath", existsSync(join(dir, "STATE.md")) && !existsSync(join(dir, "PROJECT_STATE.md")));
    assert("current plan uses handoff.currentPlanPath", existsSync(join(dir, "PLAN.md")) && !existsSync(join(dir, "CURRENT_PLAN.md")));
    const hook = readFileSync(join(dir, ".git", "hooks", "pre-commit"), "utf8");
    assert("hook watches the configured wiki root", hook.includes("'doc/wiki'"), hook);
  } finally {
    removeSandbox(dir);
  }
}

function scenarioHookStagesNewGeneratedFiles() {
  section("Scenario 9: the hook stages new files under a tracked generated path and reports untracked ones");
  const dir = makeTarget("pom-hardening-hook-new-");
  try {
    const install = node(dir, [...INSTALLER, "--profile", "wiki", "--ownership", "owned"]);
    assert("install with wiki profile succeeds", install.status === 0, install.stderr);
    // Lint regenerates the reader when Git reports changed wiki Markdown; stage the new files first.
    git(dir, ["add", "-A"]);
    const lint = node(dir, ["--experimental-strip-types", "pom/scripts/lint-doc-governance.ts"]);
    assert("first lint renders wiki/_site", lint.status === 0 && existsSync(join(dir, "wiki", "_site", "index.html")), lint.stdout + lint.stderr);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "adopt pom with wiki"]);

    writeFileSync(join(dir, "wiki", "alpha.md"), "# Alpha\n\n## Summary\n\nAlpha is a new page created to exercise the reader regeneration path during a commit. It has enough text to satisfy the minimum page length that the wiki lint enforces on every page.\n");
    const log = readFileSync(join(dir, "wiki", "log.md"), "utf8");
    writeFileSync(join(dir, "wiki", "log.md"), `${log}\n## [2026-09-02] add | alpha page\n\nAdded alpha.\n`);
    const index = readFileSync(join(dir, "wiki", "index.md"), "utf8");
    writeFileSync(join(dir, "wiki", "index.md"), `${index}\n- [Alpha](./alpha.md)\n`);
    git(dir, ["add", "wiki/alpha.md", "wiki/log.md", "wiki/index.md"]);
    const commit = runCommand("git", [...GIT_IDENTITY, "commit", "-m", "add alpha"], { cwd: dir });
    const output = `${commit.stdout ?? ""}${commit.stderr ?? ""}`;
    assert("commit with a new wiki page succeeds", commit.status === 0, output);
    assert("new reader page is part of the commit", git(dir, ["show", "--name-only", "--format=", "HEAD"]).includes("wiki/_site/alpha.html"), output);
    // The placeholder overview carries a generated `pages` block: the new page
    // changes it, and the hook restages the page because it was clean before.
    assert("hook reports the overview whose generated block it restaged", output.includes("restaged wiki pages whose generated blocks") && output.includes("wiki/overview.md"), output);
    assert("overview with the refreshed pages block is part of the commit", git(dir, ["show", "--name-only", "--format=", "HEAD"]).includes("wiki/overview.md"), output);
    assert("committed overview lists the new page in its generated block", git(dir, ["show", "HEAD:wiki/overview.md"]).includes("- [[alpha]]: Alpha"), git(dir, ["show", "HEAD:wiki/overview.md"]));
    assert("working tree is clean after the commit", git(dir, ["status", "--porcelain"]).trim() === "", git(dir, ["status", "--porcelain"]));
  } finally {
    removeSandbox(dir);
  }

  const dir2 = makeTarget("pom-hardening-hook-untracked-");
  try {
    const install = node(dir2, [...INSTALLER, "--profile", "decisions", "--ownership", "owned"]);
    assert("install with decisions profile succeeds", install.status === 0, install.stderr);
    git(dir2, ["add", "README.md", "package.json", "AGENTS.md", "pom.config.json", "pom-update.mjs", "pom"]);
    const commit = runCommand("git", [...GIT_IDENTITY, "commit", "-m", "adopt without the index"], { cwd: dir2 });
    const output = `${commit.stdout ?? ""}${commit.stderr ?? ""}`;
    assert("commit succeeds while the index is untracked", commit.status === 0, output);
    assert("hook reports the untracked generated index", output.includes("does not track yet") && output.includes("decisions/DECISIONS_INDEX.md"), output);
    const committed = git(dir2, ["show", "--name-only", "--format=", "HEAD"]).split("\n");
    assert("untracked index was not added to the commit", !committed.includes("decisions/DECISIONS_INDEX.md"), committed.join("\n"));
  } finally {
    removeSandbox(dir2);
  }
}

function scenarioPomVersionAlignedOnRefresh() {
  section("Scenario 10: a refresh aligns pomVersion in an existing config");
  const dir = makeTarget("pom-hardening-version-");
  try {
    const install = node(dir, [...INSTALLER, "--preset", "owned"]);
    assert("install succeeds", install.status === 0, install.stderr);

    const configPath = join(dir, "pom.config.json");
    const template = JSON.parse(readFileSync(join(dir, "pom/templates/POM_CONFIG_TEMPLATE.json"), "utf8"));
    const current = template.pomVersion;

    // A project adopted long ago still declares the version it started with.
    const stale = JSON.parse(readFileSync(configPath, "utf8"));
    stale.pomVersion = "0.2.0";
    const staleAdoption = JSON.stringify(stale.adoption);
    writeFileSync(configPath, `${JSON.stringify(stale, null, 2)}\n`);

    const refresh = node(dir, [...INSTALLER, "--profile", "refresh", "--no-pull"]);
    assert("refresh succeeds", refresh.status === 0, refresh.stderr);
    assert("refresh reports the version alignment", refresh.stdout.includes("pomVersion 0.2.0 ->"), refresh.stdout);

    const aligned = JSON.parse(readFileSync(configPath, "utf8"));
    assert("pomVersion now matches the installed POM", aligned.pomVersion === current, `${aligned.pomVersion} !== ${current}`);
    assert("the adoption profile is untouched by the alignment", JSON.stringify(aligned.adoption) === staleAdoption);

    const again = node(dir, [...INSTALLER, "--profile", "refresh", "--no-pull"]);
    assert("a second refresh reports no version change", !again.stdout.includes("pomVersion"), again.stdout);
  } finally {
    removeSandbox(dir);
  }
}

scenarioConfigRerun();
scenarioHookRestagesRegeneratedIndex();
scenarioUpdaterRefusesIgnoredVendoredPom();
scenarioNoPullFlag();
scenarioBootstrapUnreachableSource();
scenarioBootstrapRerunOnVendoredCopy();
scenarioHuskyHooksPath();
scenarioConfiguredWikiRoot();
scenarioHookStagesNewGeneratedFiles();
scenarioPomVersionAlignedOnRefresh();

summary();
