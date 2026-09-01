#!/usr/bin/env node
// Guards the two source-only maintenance scripts:
//   - sync-skill-catalog.mjs keeps README.md generated from skills/README.md,
//     and every skill card is listed in the catalog, the README, the wiki
//     skill map, and both HTML guides;
//   - clean-experiment-evidence.mjs reports Git-ignored evidence without
//     deleting anything unless --delete is passed.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? `\n    ${String(detail).trim().split("\n").join("\n    ")}` : ""}`);
  }
}

function run(args, cwd = ROOT) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

console.log("\nSkill catalog");
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

console.log("\nSkill catalog drift detection");
{
  const dir = mkdtempSync(join(tmpdir(), "pom-skill-catalog-"));
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
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log("\nExperiment evidence cleanup");
{
  const dir = mkdtempSync(join(tmpdir(), "pom-evidence-clean-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    mkdirSync(join(dir, "experiments", "topic", "evidence", "run-1"), { recursive: true });
    writeFileSync(join(dir, "experiments", "topic", "EXPERIMENT.md"), "# Experiment\n");
    writeFileSync(join(dir, "experiments", "topic", "evidence", "run-1", "dump.json"), "x".repeat(2048));
    writeFileSync(join(dir, "experiments", "topic", "big-report.json"), "y".repeat(1024 * 1024 + 1));
    writeFileSync(join(dir, ".gitignore"), "experiments/topic/evidence/\n");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["-c", "user.name=POM Test", "-c", "user.email=pom@example.test", "commit", "-q", "-m", "baseline"], { cwd: dir });

    const report = run([join(ROOT, "scripts", "clean-experiment-evidence.mjs")], dir);
    assert("report lists the ignored evidence directory", report.status === 0 && report.stdout.includes("experiments/topic/evidence"), report.stdout + report.stderr);
    assert("report flags the tracked file above 1 MB", report.stdout.includes("big-report.json"), report.stdout);
    assert("report mode deletes nothing", existsSync(join(dir, "experiments", "topic", "evidence", "run-1", "dump.json")));

    const remove = run([join(ROOT, "scripts", "clean-experiment-evidence.mjs"), "--delete"], dir);
    assert("--delete removes the ignored evidence", remove.status === 0 && !existsSync(join(dir, "experiments", "topic", "evidence")), remove.stdout + remove.stderr);
    assert("--delete keeps tracked files", existsSync(join(dir, "experiments", "topic", "big-report.json")));

    const outside = run([join(ROOT, "scripts", "clean-experiment-evidence.mjs"), "--root", "../"], dir);
    assert("a root outside the repository is rejected", outside.status === 1, outside.stdout + outside.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
