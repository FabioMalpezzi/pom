#!/usr/bin/env node

// Validates that the POM Source repository is a well-formed skill-only Pi package:
// the root package.json declares the pi manifest and pi-package keyword, every skill-linked
// prompt resolves inside the repo, and no active extension / LLM client / runtime coupling ships.
// The behavioral acceptance (skill loading, routing, post-compaction, non-POM inertness) is proven
// by live Pi sessions in experiments/pi-package/, not here.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

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
const skillMetadata = new Map();
const invalidSkillMetadata = [];
const linked = new Set();
for (const f of skillFiles) {
  const content = readFileSync(join(ROOT, "skills", f), "utf8");
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  try {
    if (!frontmatter) throw new Error("frontmatter is required");
    const metadata = yaml.load(frontmatter[1]);
    if (!metadata?.name) throw new Error("name is required");
    if (!metadata?.description) throw new Error("description is required");
    skillMetadata.set(f, metadata);
  } catch (error) {
    invalidSkillMetadata.push(`${f}: ${error instanceof Error ? error.message : String(error)}`);
  }
  for (const m of content.matchAll(/`?(prompts\/[A-Za-z0-9._/-]+\.md)`?/g)) linked.add(m[1]);
}
assert("every exported skill document has valid metadata", invalidSkillMetadata.length === 0, invalidSkillMetadata.join(", "));
assert("skills/README.md stays out of model invocation", skillMetadata.get("README.md")?.["disable-model-invocation"] === true);
assert("POM improve uses a collision-safe Pi skill name", skillMetadata.get("improve.md")?.name === "pom-improve");
const names = [...skillMetadata.values()].map((metadata) => metadata.name);
assert("exported Pi skill names are unique", new Set(names).size === names.length);

const missing = [...linked].filter((p) => !existsSync(join(ROOT, p)));
assert("every skill-linked prompt resolves in the repo", missing.length === 0, missing.join(", "));

assert(
  "no LLM client runtime dependency",
  !manifest.dependencies || !Object.keys(manifest.dependencies).some((d) => /@anthropic-ai|^openai$|@google\/generative-ai/.test(d)),
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
