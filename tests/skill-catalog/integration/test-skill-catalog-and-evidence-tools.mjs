#!/usr/bin/env node
// Guards the two source-only maintenance scripts:
//   - sync-skill-catalog.mjs keeps README.md generated from skills/README.md,
//     and every skill card is listed in the catalog, the README, the wiki
//     skill map, and both HTML guides;
//   - clean-experiment-evidence.mjs reports Git-ignored evidence without
//     deleting anything unless --delete is passed, and keeps --root inside
//     experiments/ unless --allow-any-root is passed.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createHarness, git, makeSandbox, removeSandbox, runNode } from "../../lib/harness.mjs";

const ROOT = process.cwd();
const { assert, section, summary } = createHarness();

function run(args, cwd = ROOT) {
  const result = runNode(args, { cwd });
  return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

section("Skill catalog");
const skills = readdirSync(join(ROOT, "skills"))
  .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
  .map((entry) => entry.replace(/\.md$/, ""));
assert("there are skill cards to check", skills.length > 0);

const check = run([join(ROOT, "scripts", "sync-skill-catalog.mjs"), "--check"]);
assert("README.md skill table matches skills/README.md", check.status === 0, check.stderr || check.stdout);

const surfaces = {
  "README.md": readFileSync(join(ROOT, "README.md"), "utf8"),
  "skills/README.md": readFileSync(join(ROOT, "skills", "README.md"), "utf8"),
  "wiki/skills-and-prompts.md": readFileSync(join(ROOT, "wiki", "skills-and-prompts.md"), "utf8"),
  "docs/POM_GUIDE.en.html": readFileSync(join(ROOT, "docs", "POM_GUIDE.en.html"), "utf8"),
  "docs/POM_GUIDE.it.html": readFileSync(join(ROOT, "docs", "POM_GUIDE.it.html"), "utf8"),
};
for (const [surface, text] of Object.entries(surfaces)) {
  const missing = skills.filter((skill) => !text.includes(`\`${skill}\``) && !text.includes(`<code>${skill}</code>`));
  assert(`${surface} lists every skill card`, missing.length === 0, `missing: ${missing.join(", ")}`);
}

section("Skill catalog drift detection");
{
  const dir = makeSandbox("pom-skill-catalog-").dir;
  try {
    mkdirSync(join(dir, "skills"));
    writeFileSync(join(dir, "skills", "alpha.md"), "---\nname: alpha\n---\n# alpha\n");
    writeFileSync(join(dir, "skills", "README.md"), "# Skills\n\n| Skill | Purpose | Prompt |\n|---|---|---|\n| `alpha` | do alpha | `prompts/01-alpha.md` |\n");
    writeFileSync(join(dir, "README.md"), "# Target\n\n<!-- POM:SKILL-CATALOG:START -->\nstale\n<!-- POM:SKILL-CATALOG:END -->\n");

    const stale = run([join(ROOT, "scripts", "sync-skill-catalog.mjs"), "--check"], dir);
    assert("--check exits 1 on a stale README table", stale.status === 1 && stale.stderr.includes("out of date"), stale.stdout + stale.stderr);

    const sync = run([join(ROOT, "scripts", "sync-skill-catalog.mjs")], dir);
    const readme = readFileSync(join(dir, "README.md"), "utf8");
    assert("sync regenerates the table", sync.status === 0 && readme.includes("| `alpha` | do alpha | `prompts/01-alpha.md` |"), readme);
    const clean = run([join(ROOT, "scripts", "sync-skill-catalog.mjs"), "--check"], dir);
    assert("--check passes after sync", clean.status === 0, clean.stderr);

    writeFileSync(join(dir, "skills", "beta.md"), "---\nname: beta\n---\n# beta\n");
    const uncatalogued = run([join(ROOT, "scripts", "sync-skill-catalog.mjs")], dir);
    assert("a skill card missing from the catalog is a hard error", uncatalogued.status === 1 && uncatalogued.stderr.includes("skills/beta.md is not listed"), uncatalogued.stderr);
  } finally {
    removeSandbox(dir);
  }
}

section("Experiment evidence cleanup");
{
  const dir = makeSandbox("pom-evidence-clean-").dir;
  try {
    git(dir, ["init", "-q"]);
    mkdirSync(join(dir, "experiments", "topic", "evidence", "run-1"), { recursive: true });
    writeFileSync(join(dir, "experiments", "topic", "EXPERIMENT.md"), "# Experiment\n");
    writeFileSync(join(dir, "experiments", "topic", "evidence", "run-1", "dump.json"), "x".repeat(2048));
    writeFileSync(join(dir, "experiments", "topic", "big-report.json"), "y".repeat(1024 * 1024 + 1));
    // Ignored files outside experiments/ that a careless --root must never reach.
    mkdirSync(join(dir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "pkg", "index.js"), "module.exports = 1;\n");
    writeFileSync(join(dir, ".env"), "SECRET=1\n");
    writeFileSync(join(dir, ".gitignore"), "experiments/topic/evidence/\nnode_modules/\n.env\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "baseline"]);
    const script = join(ROOT, "scripts", "clean-experiment-evidence.mjs");
    const noStackTrace = (result) => !/\n\s+at /.test(result.stderr);

    const report = run([script], dir);
    assert("report lists the ignored evidence directory", report.status === 0 && report.stdout.includes("experiments/topic/evidence"), report.stdout + report.stderr);
    assert("report flags the tracked file above 1 MB", report.stdout.includes("big-report.json"), report.stdout);
    assert("report mode deletes nothing", existsSync(join(dir, "experiments", "topic", "evidence", "run-1", "dump.json")));
    assert("default report stays inside experiments/", !report.stdout.includes(".env") && !report.stdout.includes("node_modules"), report.stdout);

    const topic = run([script, "--root", "experiments/topic"], dir);
    assert("--root accepts a topic inside experiments/", topic.status === 0 && topic.stdout.includes("experiments/topic/evidence"), topic.stdout + topic.stderr);

    const repoRoot = run([script, "--root", "."], dir);
    assert("--root . is rejected without --allow-any-root", repoRoot.status === 1 && repoRoot.stderr.includes("experiments/") && repoRoot.stderr.includes("--allow-any-root"), repoRoot.stdout + repoRoot.stderr);
    assert("the rejection is a message, not a stack trace", noStackTrace(repoRoot), repoRoot.stderr);
    assert("--root . deletes nothing", existsSync(join(dir, ".env")) && existsSync(join(dir, "node_modules", "pkg", "index.js")));

    const climbing = run([script, "--root", "experiments/../", "--delete"], dir);
    assert("--root that climbs out of experiments/ is rejected even with --delete", climbing.status === 1 && existsSync(join(dir, ".env")), climbing.stdout + climbing.stderr);

    const sibling = run([script, "--root", "../repo-sibling"], dir);
    assert("a sibling directory is rejected as outside the repository", sibling.status === 1 && sibling.stderr.includes("outside the repository") && noStackTrace(sibling), sibling.stdout + sibling.stderr);

    const missingValue = run([script, "--root"], dir);
    assert("--root without a value is rejected with usage", missingValue.status === 1 && missingValue.stderr.includes("Usage:") && noStackTrace(missingValue), missingValue.stdout + missingValue.stderr);

    const anyRoot = run([script, "--root", ".", "--allow-any-root"], dir);
    assert("--allow-any-root reports ignored paths across the repository", anyRoot.status === 0 && anyRoot.stdout.includes(".env") && anyRoot.stdout.includes("node_modules"), anyRoot.stdout + anyRoot.stderr);
    assert("--allow-any-root without --delete still deletes nothing", existsSync(join(dir, ".env")) && existsSync(join(dir, "node_modules", "pkg", "index.js")));

    const remove = run([script, "--delete"], dir);
    assert("--delete removes the ignored evidence", remove.status === 0 && !existsSync(join(dir, "experiments", "topic", "evidence")), remove.stdout + remove.stderr);
    assert("--delete keeps tracked files", existsSync(join(dir, "experiments", "topic", "big-report.json")));
    assert("--delete leaves ignored files outside experiments/ alone", existsSync(join(dir, ".env")) && existsSync(join(dir, "node_modules", "pkg", "index.js")));

    const outside = run([script, "--root", "../"], dir);
    assert("a root outside the repository is rejected", outside.status === 1 && noStackTrace(outside), outside.stdout + outside.stderr);
  } finally {
    removeSandbox(dir);
  }
}

summary();
