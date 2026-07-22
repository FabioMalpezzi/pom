#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function parseFrontmatter(path) {
  const text = read(path);
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields = new Map();
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (field) fields.set(field[1], field[2]);
  }
  return fields;
}

function skillFiles() {
  return readdirSync(join(ROOT, "skills"))
    .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
    .sort()
    .map((entry) => `skills/${entry}`);
}

function testBootstrapArtifacts() {
  console.log("\nScenario 1: using-pom bootstrap artifacts are registered");

  assert("skills/using-pom.md exists", existsSync(join(ROOT, "skills/using-pom.md")));
  assert("prompts/32-using-pom.md exists", existsSync(join(ROOT, "prompts/32-using-pom.md")));
  assert("agent harness reference exists", existsSync(join(ROOT, "prompts/references/agent-harnesses.md")));
  assert("skills/finish-branch.md exists", existsSync(join(ROOT, "skills/finish-branch.md")));
  assert("prompts/33-finish-branch.md exists", existsSync(join(ROOT, "prompts/33-finish-branch.md")));
  assert("skills/root-cause.md exists", existsSync(join(ROOT, "skills/root-cause.md")));
  assert("prompts/34-root-cause-debugging.md exists", existsSync(join(ROOT, "prompts/34-root-cause-debugging.md")));

  const skillsReadme = read("skills/README.md");
  const promptsReadme = read("prompts/README.md");
  const agentRouter = read("templates/agents/60-skills.md");
  const monolithicAgentTemplate = read("templates/AGENTS_POM_SECTION_TEMPLATE.md");
  const harnessReference = read("prompts/references/agent-harnesses.md");

  assert("skills index lists using-pom", skillsReadme.includes("| `using-pom` |"));
  assert("skills index lists finish-branch", skillsReadme.includes("| `finish-branch` |"));
  assert("skills index lists root-cause", skillsReadme.includes("| `root-cause` |"));
  assert("prompts index lists prompt 32", promptsReadme.includes("`32-using-pom.md`"));
  assert("prompts index lists harness reference", promptsReadme.includes("`references/agent-harnesses.md`"));
  assert("prompts index lists prompt 33", promptsReadme.includes("`33-finish-branch.md`"));
  assert("prompts index lists prompt 34", promptsReadme.includes("`34-root-cause-debugging.md`"));
  assert("modular agent router references using-pom", agentRouter.includes("pom/skills/using-pom.md"));
  assert("modular agent router references harness mapping", agentRouter.includes("pom/prompts/references/agent-harnesses.md"));
  assert("modular agent router references finish-branch", agentRouter.includes("finish-branch"));
  assert("modular agent router references root-cause", agentRouter.includes("root-cause"));
  assert("fallback agent template references using-pom", monolithicAgentTemplate.includes("pom/skills/using-pom.md"));
  assert("fallback agent template references harness mapping", monolithicAgentTemplate.includes("pom/prompts/references/agent-harnesses.md"));
  // The compact fallback routes via the catalog and router rather than embedding a per-skill
  // routing table (SPEC-0001: keep global instructions to identity, posture, source authority,
  // and safety; workflow routing lives in skills and prompts).
  assert("fallback agent template routes via the skills catalog", monolithicAgentTemplate.includes("pom/skills/README.md"));
  assert(
    "fallback agent template keeps the disabled-module adoption guard",
    monolithicAgentTemplate.includes("pom.config.json") &&
      /disabled/.test(monolithicAgentTemplate) &&
      /must not create/.test(monolithicAgentTemplate),
  );
  assert("harness reference includes session-start smoke", harnessReference.includes("## Session-Start Smoke"));
  assert(
    "harness reference avoids unverified support claims",
    harnessReference.includes("live support") && harnessReference.includes("clean-session transcript"),
  );
}

function testBootstrapPromptCoverage() {
  console.log("\nScenario 2: using-pom prompt covers routing, harnesses, and disabled modules");

  const prompt = read("prompts/32-using-pom.md");
  for (const skill of ["adopt", "wiki", "pulse", "validate", "plan", "spike", "sync", "finish-branch", "root-cause"]) {
    assert(`routing table includes ${skill}`, prompt.includes(`| \`${skill}\``) || prompt.includes(`| ${skill} |`));
  }
  for (const harness of ["Codex", "Claude Code", "Gemini CLI", "Cursor", "OpenCode", "GitHub Copilot"]) {
    assert(`tool mapping includes ${harness}`, prompt.includes(harness));
  }
  for (const phrase of [
    "Session-start contract",
    "frontmatter descriptions as triggers only",
    "respect disabled adoption modules",
    "do not create `wiki/`",
    "do not create ADRs",
    "structured tasks are not enabled",
    "check `git status` before structural changes",
    "route temporary, risky, dependency-heavy",
    "use `finish-branch` for merge, PR, keep, discard, or cleanup decisions",
    "use `root-cause` for Target Project bugs",
    "do not promote files from `experiments/`",
    "prompts/references/agent-harnesses.md",
  ]) {
    assert(`prompt includes disabled/shortcut guard: ${phrase}`, prompt.includes(phrase));
  }
}

function testFinishBranchCoverage() {
  console.log("\nScenario 3: finish-branch and spike cover Git isolation and cleanup safety");

  const finishPrompt = read("prompts/33-finish-branch.md");
  const spikeSkill = read("skills/spike.md");
  const spikePrompt = read("prompts/09-run-temporary-experiment.md");
  const experimentsAgent = read("templates/agents/70-experiments.md");

  for (const phrase of [
    "ownership.mode",
    "git status",
    "external_overlay",
    "skills/spike.md",
    "exact confirmation",
    "git worktree prune",
    "do not remove harness-owned worktrees",
  ]) {
    assert(`finish-branch prompt includes safety phrase: ${phrase}`, finishPrompt.includes(phrase));
  }

  for (const phrase of [
    "## Git Isolation",
    "git rev-parse --git-dir",
    "git rev-parse --show-superproject-working-tree",
    "harness-native worktree/workspace",
    "skills/finish-branch.md",
  ]) {
    assert(`spike covers Git isolation phrase: ${phrase}`, spikeSkill.includes(phrase) || spikePrompt.includes(phrase) || experimentsAgent.includes(phrase));
  }
}

function testRootCauseCoverage() {
  console.log("\nScenario 4: root-cause covers evidence-first debugging");

  const rootCauseSkill = read("skills/root-cause.md");
  const rootCausePrompt = read("prompts/34-root-cause-debugging.md");
  const checkSkill = read("skills/check.md");

  for (const phrase of [
    "No fix before root-cause investigation",
    "Reproduce or gather enough evidence",
    "one concrete hypothesis at a time",
    "Add a regression test",
    "If three fix attempts fail",
  ]) {
    assert(`root-cause skill includes rule: ${phrase}`, rootCauseSkill.includes(phrase));
  }

  for (const phrase of [
    "Target Project problem",
    "Before proposing a fix",
    "read `pom.config.json`",
    "identify Source Authority",
    "reproduce the failure",
    "Fix the source of the failure",
    "Memory impact",
  ]) {
    assert(`root-cause prompt includes workflow phrase: ${phrase}`, rootCausePrompt.includes(phrase));
  }

  assert("check routes target failures to root-cause", checkSkill.includes("skills/root-cause.md"));
  assert("check keeps POM mechanism failures on diagnose", checkSkill.includes("skills/diagnose.md"));
}

function testSkillDescriptions() {
  console.log("\nScenario 5: skill frontmatter descriptions stay discovery-oriented");

  for (const file of skillFiles()) {
    const frontmatter = parseFrontmatter(file);
    assert(`${file} has frontmatter`, Boolean(frontmatter));
    if (!frontmatter) continue;

    const name = frontmatter.get("name") || "";
    const description = frontmatter.get("description") || "";
    assert(`${file} has name`, Boolean(name));
    assert(`${file} has description`, Boolean(description));
    assert(`${file} description starts with Use when`, description.startsWith("Use when"), description);
    assert(`${file} description is concise`, description.length <= 260, `${description.length} chars`);
    assert(`${file} description avoids process shortcut wording`, !/Use this skill to|Run a controlled|including/.test(description), description);
  }
}

function testBilingualRoutingEvalFixtures() {
  console.log("\nScenario 6: routing eval fixtures cover English and Italian prompts");

  const fixtures = JSON.parse(read("tests/skill-bootstrap/fixtures/routing-smoke.json"));
  const skillNames = new Set(
    skillFiles()
      .map((file) => parseFrontmatter(file)?.get("name"))
      .filter(Boolean),
  );

  assert("fixtures are present", fixtures.length >= 10, `${fixtures.length} fixtures`);

  for (const expectedSkill of ["adopt", "wiki", "pulse", "validate", "plan", "spike", "sync", "finish-branch", "root-cause", "mcp-interface"]) {
    for (const language of ["en", "it"]) {
      const found = fixtures.some((fixture) => fixture.expectedSkill === expectedSkill && fixture.language === language);
      assert(`fixture exists for ${expectedSkill} ${language}`, found);
    }
  }

  for (const fixture of fixtures) {
    assert(`${fixture.id} expected skill exists`, skillNames.has(fixture.expectedSkill), fixture.expectedSkill);
    assert(`${fixture.id} prompt is non-empty`, fixture.prompt.length > 20);
  }

  const negativeFixtures = fixtures.filter((fixture) => fixture.negative);
  assert("negative fixtures exist", negativeFixtures.length >= 2, `${negativeFixtures.length} negative fixtures`);
  assert(
    "negative fixtures cover wiki disabled",
    negativeFixtures.some((fixture) => fixture.negative.disabledModule === "wiki"),
  );
  assert(
    "negative fixtures cover decisions disabled",
    negativeFixtures.some((fixture) => fixture.negative.disabledModule === "decisions"),
  );
  assert(
    "negative fixtures cover unsafe discard",
    negativeFixtures.some((fixture) => fixture.negative.disabledModule === "unsafe-discard"),
  );
}

testBootstrapArtifacts();
testBootstrapPromptCoverage();
testFinishBranchCoverage();
testRootCauseCoverage();
testSkillDescriptions();
testBilingualRoutingEvalFixtures();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
