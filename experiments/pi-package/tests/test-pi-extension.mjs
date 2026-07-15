#!/usr/bin/env node

// Deterministic wiring tests for the experiment-only POM Pi staging package (skill-only).
// These prove package structure and self-containment without a model or live Pi session.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const EXP_ROOT = resolve(ROOT, "..");
const REPO_ROOT = resolve(EXP_ROOT, "../..");
const BUILDER = join(EXP_ROOT, "scripts", "build-staging-package.mjs");

let passed = 0;
let failed = 0;
function assert(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function main() {
  const work = mkdtempSync(join(tmpdir(), "pom-pi-wiring-"));
  const out = join(work, "pom-pi");
  const canonicalPkgBefore = readFileSync(join(REPO_ROOT, "package.json"), "utf8");
  try {
    execFileSync("node", [BUILDER, "--out", out], { stdio: "pipe" });

    // 1. Package metadata.
    assert("package.json exists", existsSync(join(out, "package.json")));
    const manifest = JSON.parse(readFileSync(join(out, "package.json"), "utf8"));
    assert("keywords includes pi-package", Array.isArray(manifest.keywords) && manifest.keywords.includes("pi-package"));
    assert("pi.skills registers a skills path", Array.isArray(manifest.pi?.skills) && manifest.pi.skills.length > 0);
    assert("no pi.extensions (skill-only)", !manifest.pi?.extensions || manifest.pi.extensions.length === 0);
    assert(
      "pi core is a peerDependency with * range",
      manifest.peerDependencies?.["@earendil-works/pi-coding-agent"] === "*",
    );

    // 2. Registered skills and self-containment.
    assert("using-pom skill present", existsSync(join(out, "skills", "using-pom.md")));
    const skillFiles = readdirSync(join(out, "skills")).filter((f) => f.endsWith(".md"));
    assert("skills catalog README present", existsSync(join(out, "skills", "README.md")));
    const linked = new Set();
    for (const f of skillFiles) {
      for (const m of readFileSync(join(out, "skills", f), "utf8").matchAll(/`?(prompts\/[A-Za-z0-9._/-]+\.md)`?/g)) linked.add(m[1]);
    }
    const missingPrompts = [...linked].filter((p) => !existsSync(join(out, p)));
    assert("all skill-linked prompts are bundled", missingPrompts.length === 0, missingPrompts.join(", "));

    // 3. No runtime dependencies, no LLM client, no active-runtime code.
    assert("no runtime dependencies field", !manifest.dependencies || Object.keys(manifest.dependencies).length === 0);
    const files = walkFiles(out);
    const codeFiles = files.filter((f) => f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".mjs"));
    assert("skill-only package ships no extension code", codeFiles.length === 0, codeFiles.map((f) => f.replace(out, "")).join(", "));
    const blob = files
      .filter((f) => f.endsWith(".json"))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    assert("no LLM client dependency declared", !/@anthropic-ai|openai|@google\/generative-ai/.test(blob));

    // 4. Building writes only under the staging dir; the canonical package.json is untouched.
    assert("canonical package.json unchanged by build", readFileSync(join(REPO_ROOT, "package.json"), "utf8") === canonicalPkgBefore);
    assert("no project pom.config.json created in staging root parent", !existsSync(join(work, "pom.config.json")));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main();
