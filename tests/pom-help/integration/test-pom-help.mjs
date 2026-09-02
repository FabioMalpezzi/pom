#!/usr/bin/env node

// Integration test for scripts/pom-help.ts: the bilingual command index.
// Runs the script from the POM source root, so the skills index is read from
// skills/README.md (in a target project it would be pom/skills/README.md).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createHarness, runNode } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();
const SCRIPT = join("scripts", "pom-help.ts");

// pom:help is the command under test; the help does not advertise itself.
const SELF_SCRIPT = "pom:help";

const { assert, section, banner, summary } = createHarness({ name: "POM Help Tests" });

function runHelp(args, env = {}) {
  return runNode(["--experimental-strip-types", SCRIPT, ...args], {
    cwd: POM_ROOT,
    env: { POM_LANG: "", LC_ALL: "", LC_MESSAGES: "", LANG: "", ...env },
  });
}

function pomScripts() {
  const pkg = JSON.parse(readFileSync(join(POM_ROOT, "package.json"), "utf8"));
  return Object.keys(pkg.scripts ?? {}).filter((name) => name.startsWith("pom:"));
}

function skillsFromReadme() {
  const text = readFileSync(join(POM_ROOT, "skills", "README.md"), "utf8");
  const table = text.match(/\| Skill \|[\s\S]*?(?=\n## |\n---|\n$)/)?.[0] ?? "";
  return [...table.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
}

function scenarioLanguage(lang, heading) {
  section(`Scenario: --lang ${lang}`);
  const result = runHelp(["--lang", lang]);
  assert("exit code is 0", result.status === 0, `status=${result.status} stderr=${result.stderr}`);
  assert("stdout is not empty", result.stdout.trim().length > 0, "empty stdout");
  assert("stderr is empty", result.stderr === "", result.stderr);
  assert(`prints the ${lang} heading "${heading}"`, result.stdout.includes(heading), result.stdout.slice(0, 200));

  const scripts = pomScripts().filter((name) => name !== SELF_SCRIPT);
  const notMentioned = scripts.filter((name) => !result.stdout.includes(name));
  assert(
    `mentions every pom:* script of package.json except ${SELF_SCRIPT} (${scripts.length} scripts)`,
    notMentioned.length === 0,
    `missing: ${notMentioned.join(", ")}`,
  );
  assert("also mentions the target-only pom:update command", result.stdout.includes("npm run pom:update"), result.stdout);

  const skills = skillsFromReadme();
  assert("skills/README.md exposes a non-empty skill table", skills.length > 0, "no skill rows parsed");
  const skillsMissing = skills.filter((name) => !result.stdout.includes(`\`${name}\``));
  assert(`prints every skill of skills/README.md in the skills index (${skills.length} skills)`, skillsMissing.length === 0, `missing: ${skillsMissing.join(", ")}`);
  assert("prints the skills table header", result.stdout.includes("| Skill | Use | Prompt |"), result.stdout);
  return result.stdout;
}

function scenarioLanguageSelection(enOutput, itOutput) {
  section("Scenario: language selection");
  assert("English and Italian outputs differ", enOutput !== itOutput, "identical outputs");

  const inline = runHelp(["--lang=it"]);
  assert("--lang=it inline form selects Italian", inline.status === 0 && inline.stdout === itOutput, `status=${inline.status}`);

  const upper = runHelp(["--lang", "IT"]);
  assert("--lang IT is case-insensitive", upper.status === 0 && upper.stdout === itOutput, `status=${upper.status}`);

  const envIt = runHelp([], { POM_LANG: "it_IT" });
  assert("POM_LANG=it_IT selects Italian without a flag", envIt.status === 0 && envIt.stdout === itOutput, `status=${envIt.status}`);

  const defaultLang = runHelp([]);
  assert("no flag and no locale falls back to English", defaultLang.status === 0 && defaultLang.stdout === enOutput, `status=${defaultLang.status}`);

  const unsupported = runHelp(["--lang", "xx"]);
  assert("unsupported --lang exits with 1", unsupported.status === 1, `status=${unsupported.status}`);
  assert("unsupported --lang explains the accepted values", unsupported.stderr.includes("Use en or it"), unsupported.stderr);

  const missingValue = runHelp(["--lang"]);
  assert("--lang without a value exits with 1", missingValue.status === 1, `status=${missingValue.status}`);
}

banner();

const en = scenarioLanguage("en", "POM Help");
const it = scenarioLanguage("it", "Aiuto POM");
scenarioLanguageSelection(en, it);

summary();
