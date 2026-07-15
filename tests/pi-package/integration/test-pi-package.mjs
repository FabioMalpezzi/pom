#!/usr/bin/env node

// Validates that the POM Source repository is a well-formed skill-only Pi package:
// the root package.json declares the pi manifest and pi-package keyword, every skill-linked
// prompt resolves inside the repo, and no active extension / LLM client / runtime coupling ships.
// The behavioral acceptance (skill loading, routing, post-compaction, non-POM inertness) is proven
// by live Pi sessions in experiments/pi-package/, not here.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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

const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

assert("keywords includes pi-package", Array.isArray(manifest.keywords) && manifest.keywords.includes("pi-package"));
assert("pi.skills registers the skills directory", Array.isArray(manifest.pi?.skills) && manifest.pi.skills.includes("./skills"));
assert("skill-only: no pi.extensions registered", !manifest.pi?.extensions || manifest.pi.extensions.length === 0);

assert("skills/using-pom.md exists", existsSync(join(ROOT, "skills", "using-pom.md")));
assert("skills/README.md catalog exists", existsSync(join(ROOT, "skills", "README.md")));

const skillFiles = readdirSync(join(ROOT, "skills")).filter((f) => f.endsWith(".md"));
const linked = new Set();
for (const f of skillFiles) {
  for (const m of readFileSync(join(ROOT, "skills", f), "utf8").matchAll(/`?(prompts\/[A-Za-z0-9._/-]+\.md)`?/g)) linked.add(m[1]);
}
const missing = [...linked].filter((p) => !existsSync(join(ROOT, p)));
assert("every skill-linked prompt resolves in the repo", missing.length === 0, missing.join(", "));

assert(
  "no LLM client runtime dependency",
  !manifest.dependencies || !Object.keys(manifest.dependencies).some((d) => /@anthropic-ai|^openai$|@google\/generative-ai/.test(d)),
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
