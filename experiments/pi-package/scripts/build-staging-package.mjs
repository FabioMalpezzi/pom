#!/usr/bin/env node

// Builds an experiment-only staging Pi package for POM. Skill-only by default: registers POM
// skills via the `pi.skills` manifest and mirrors the POM root layout so a skill card's linked
// `prompts/NN-*.md` / `templates/*` references resolve relative to the package root. No extension
// is included unless the skill-only acceptance run proves one is needed. Writes ONLY under the
// staging output directory; never touches the target project or canonical package paths.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const EXP_ROOT = resolve(ROOT, "..");
const REPO_ROOT = resolve(EXP_ROOT, "../..");

function parseArgs(argv) {
  const options = { out: join(EXP_ROOT, "staging", "pom-pi"), clean: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--out") options.out = resolve(argv[(i += 1)] || "");
    else if (a === "--no-clean") options.clean = false;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return options;
}

function copyDir(source, target) {
  cpSync(source, target, {
    recursive: true,
    filter: (src) => !src.includes(`${sep}.git${sep}`) && !src.includes(`${sep}node_modules${sep}`),
  });
}

// POM skill cards reference their canonical prompt via a `Canonical Prompt` line like
// `prompts/32-using-pom.md`; collect those to verify the staging package is self-contained.
function linkedPromptsOf(skillsDir) {
  const linked = new Set();
  for (const file of readdirSync(skillsDir)) {
    if (!file.endsWith(".md")) continue;
    const text = readFileSync(join(skillsDir, file), "utf8");
    for (const m of text.matchAll(/`?(prompts\/[A-Za-z0-9._/-]+\.md)`?/g)) linked.add(m[1]);
  }
  return [...linked];
}

function build(options) {
  if (options.clean && existsSync(options.out)) rmSync(options.out, { recursive: true, force: true });
  mkdirSync(options.out, { recursive: true });

  // Mirror the POM method layout so skill->prompt->template relative references resolve.
  // skills/ and prompts/ are copied whole (Markdown method files). templates/ is filtered to the
  // Markdown templates skills actually reference; the executable install/runtime templates
  // (POM_UPDATE_TEMPLATE.mjs, WORKFLOW_RUNTIME_TEMPLATE.ts/.py) are target-project install
  // artifacts, not needed for skill routing, and must not ship in a skill-only package.
  for (const dir of ["skills", "prompts"]) {
    copyDir(join(REPO_ROOT, dir), join(options.out, dir));
  }
  cpSync(join(REPO_ROOT, "templates"), join(options.out, "templates"), {
    recursive: true,
    filter: (src) => statSync(src).isDirectory() || src.endsWith(".md") || src.endsWith(".json"),
  });
  for (const file of ["README.md", "CONTEXT.md", "WIKI_METHOD.md"]) {
    if (existsSync(join(REPO_ROOT, file))) cpSync(join(REPO_ROOT, file), join(options.out, file));
  }

  const manifest = {
    name: "pom-pi",
    version: "0.0.0-experiment",
    description: "Experiment-only staging package: POM skills for Pi (skill-only).",
    keywords: ["pi-package"],
    pi: { skills: ["./skills"] },
    peerDependencies: { "@earendil-works/pi-coding-agent": "*" },
  };
  writeFileSync(join(options.out, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  // Self-containment check: every prompt a skill links must exist in the staging package.
  const linked = linkedPromptsOf(join(options.out, "skills"));
  const missing = linked.filter((p) => !existsSync(join(options.out, p)));
  const skillCount = readdirSync(join(options.out, "skills")).filter((f) => f.endsWith(".md")).length;

  console.log("POM Pi staging package built (skill-only)");
  console.log(`- out: ${options.out}`);
  console.log(`- skills: ${skillCount}`);
  console.log(`- linked prompts referenced: ${linked.length}`);
  console.log(`- missing linked prompts: ${missing.length}${missing.length ? " -> " + missing.join(", ") : ""}`);
  if (missing.length) {
    process.exitCode = 1;
    throw new Error(`Staging package is not self-contained: missing ${missing.join(", ")}`);
  }
  return { out: options.out, skillCount, linked, missing };
}

build(parseArgs(process.argv.slice(2)));
