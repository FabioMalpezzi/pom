#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

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

function promptLinks(text) {
  return [...text.matchAll(/prompts\/[A-Za-z0-9._/-]+\.md/g)].map((match) => match[0]);
}

function contractPasses(text, contract) {
  return contract.required.every((clause) => text.includes(clause))
    && contract.forbidden.every((contradiction) => !text.includes(contradiction));
}

function assertContract(name, path, contract) {
  const text = read(path);
  assert(
    `${name} has a contradictory mutation for each required invariant`,
    contract.forbidden.length >= contract.required.length,
    `${contract.forbidden.length} contradictions for ${contract.required.length} required invariants`,
  );
  assert(`${name} contract passes`, contractPasses(text, contract));

  for (const clause of contract.required) {
    const withoutClause = text.split(clause).join("[REMOVED REQUIRED CLAUSE]");
    assert(`${name} rejects missing clause: ${clause}`, !contractPasses(withoutClause, contract));
  }

  for (const contradiction of contract.forbidden) {
    const contradictory = `${text}\n${contradiction}\n`;
    assert(`${name} rejects contradiction: ${contradiction}`, !contractPasses(contradictory, contract));
  }
}

console.log("Prompt Governance Tests");
console.log("=======================");

console.log("\nScenario 1: prompt catalogs and skill links are complete in both directions");
const canonical = readdirSync(join(ROOT, "prompts"))
  .filter((entry) => /^\d{2}-.*\.md$/.test(entry))
  .sort();
const promptCatalog = new Set(
  [...read("prompts/README.md").matchAll(/`(\d{2}-[^`]+\.md)`/g)].map((match) => match[1]),
);
const skillFiles = readdirSync(join(ROOT, "skills")).filter((entry) => entry.endsWith(".md"));
const rawSkillLinks = skillFiles.flatMap((file) => promptLinks(read(`skills/${file}`)));
const skillLinks = new Set(rawSkillLinks.map((file) => basename(file)));

assert("there are exactly 35 canonical numbered prompts", canonical.length === 35, `${canonical.length} found`);
assert("every canonical prompt is catalogued", canonical.every((file) => promptCatalog.has(file)));
assert("the prompt catalog has no stale numbered entries", [...promptCatalog].every((file) => canonical.includes(file)));
assert("every canonical prompt is linked by a skill", canonical.every((file) => skillLinks.has(file)));
assert("every skill prompt link resolves", rawSkillLinks.every((file) => existsSync(join(ROOT, file))));

console.log("\nScenario 2: loop/goal prompts and skill are portable current procedures");
for (const number of [28, 29, 30, 31]) {
  const file = canonical.find((entry) => entry.startsWith(`${number}-`));
  const text = read(`prompts/${file}`);
  const historicalMarkers = ["Versione:", "Stato:", "Note di consolidazione", "promosso da", "sessione 2026-"];
  assert(`prompt ${number} uses an English title`, text.startsWith("# Prompt -"));
  assert(`prompt ${number} contains no embedded promotion/version notes`, historicalMarkers.every((marker) => !text.includes(marker)));
}
assert(
  "loop-goal skill contains no promotion/session history",
  !/promoted from|session 2026-|Status.*canonical/i.test(read("skills/loop-goal.md")),
);

console.log("\nScenario 3: copied canonical prompts retain their own config guards");
for (const file of [
  "07-update-project-after-work.md",
  "09-run-temporary-experiment.md",
  "15-classify-document-status.md",
  "18-post-action-validator.md",
]) {
  assert(`${file} reads pom.config.json`, /read `pom\.config\.json`/i.test(read(`prompts/${file}`)));
}
assert("status classification respects disabled modules", read("prompts/15-classify-document-status.md").includes("disabled adoption module"));
assert("validator marks disabled modules N/A", read("prompts/18-post-action-validator.md").includes("Mark a governed module N/A when it is disabled"));

console.log("\nScenario 4: reconciliation respects disabled decision governance");
for (const file of ["prompts/19-reconcile-memory.md", "skills/reconcile.md", "templates/RECONCILIATION_TEMPLATE.md"]) {
  const text = read(file);
  assert(`${file} gates ADR creation on adoption.decisions`, text.includes("adoption.decisions") && text.includes("disabled"));
}
assert("reconciliation does not impose ADRs unconditionally", !read("prompts/19-reconcile-memory.md").includes("contradictions require an ADR"));

console.log("\nScenario 5: static contract guards reject omissions and explicit contradictions");
assertContract("loop/goal model gate", "prompts/27-workflow-modeling.md", {
  required: ["workflows.enabled: true", "workflows.loopGoal.enabled: true", "accepted `criteria.md`", "criteria contract is frozen"],
  forbidden: ["Continue when workflows.enabled is false.", "Continue when workflows.loopGoal.enabled is false.", "Model the loop/goal workflow before criteria are accepted.", "Draft criteria are sufficient for loop/goal modeling."],
});
assertContract("criteria definition", "prompts/28-loop-goal-define-criteria.md", {
  required: ["reasoned dialogue", "System under test (SUT)", "Experiment iteration", "at least one **gate** and one **signal**", "baseline value", "**Reached**", "**Stall**", "**Budget exhausted**", "**Falsified**", "Do not treat silence as approval", "criteria.dialog.md"],
  forbidden: ["A reasoned dialogue is unnecessary.", "The system under test may remain undefined.", "The experiment iteration may remain undefined.", "Gate and signal metrics are optional.", "A baseline is optional when a signal looks plausible.", "A reached exit is optional.", "A stall exit is optional.", "A budget exit is optional.", "A falsification exit is optional.", "Treat silence as approval.", "The criteria dialogue trace may be omitted."],
});
assertContract("fit audit", "prompts/29-loop-goal-audit.md", {
  required: ["stop before classification", "never modifies the workflow YAML", "structural fit and criteria conformity separately", "every state and every transition"],
  forbidden: ["Continue fit classification after validator failure.", "Repair the workflow YAML during audit.", "Structural fit implies criteria conformity.", "Classify only selected states and transitions."],
});
assertContract("scenario generation", "prompts/30-loop-goal-scenarios.md", {
  required: ["principal happy path", "every failure-like terminal", "loop at least once, then succeed", "loop at least once, then fail", "exhaust `loop_guard`", "every final state", "observable falsification event", "error or misuse scenario", "Do not invent behavior"],
  forbidden: ["The principal happy path is optional.", "Failure terminals need no scenarios.", "Loop success coverage is optional.", "Loop failure coverage is optional.", "Loop bound exhaustion coverage is optional.", "Terminal coverage is optional.", "Falsification coverage is optional.", "An error or misuse scenario is optional.", "Invent missing events to complete scenario coverage."],
});
assertContract("independent conclusion", "prompts/31-loop-goal-conclude.md", {
  required: ["fresh session or separate agent", "Do not read `criteria.dialog.md`", "Missing evidence never counts as a pass", "advice is non-retroactive", "user, not the evaluator, retains the promotion decision"],
  forbidden: ["Reuse the criteria author's current session as the independent evaluator.", "Read criteria.dialog.md to infer favorable intent.", "Missing evidence counts as success.", "Future-round advice may change the current verdict.", "The evaluator decides Adopt, Refine, or Reject."],
});
assertContract("control-plane boundary", "skills/loop-goal.md", {
  required: ["deterministic control-plane method", "Target Project responsibilities", "user retains the Adopt/Refine/Reject promotion decision"],
  forbidden: ["POM executes workflow runtime instances.", "POM owns workers and scheduling.", "Native concurrent FSM regions are supported."],
});
assertContract("experiment consolidation", "prompts/09-run-temporary-experiment.md", {
  required: ["adoption.analysis", "adoption.wiki", "adoption.decisions", "adoption.tasks", "Never enable a disabled adoption module implicitly"],
  forbidden: ["Write analysis when adoption.analysis is disabled.", "Update the wiki when adoption.wiki is disabled.", "Create an ADR even when adoption.decisions is disabled.", "Create structured tasks when adoption.tasks is disabled.", "Enable disabled modules automatically during consolidation."],
});
assertContract("MCP interface ergonomics", "prompts/35-mcp-interface.md", {
  required: ["separate interface inventories", "SHOULD also return serialized JSON", "successful `structuredContent` MUST conform", "JSON-RPC protocol errors", "`isError: true`", "untrusted hints", "Ask for explicit approval before any public-contract change", "Goal-Backward Check", "at least two positive representative agent intents", "HTTP 401/403 transport authorization", "host-visible token usage", "Missing evidence never counts as verified"],
  forbidden: ["Use one generic inventory for tools, resources, and prompts.", "Never mirror structured content in TextContent.", "Output-schema conformance is optional.", "Return every failure as a JSON-RPC protocol error.", "Return every failure with isError true.", "Trust tool annotations as enforcement controls.", "Compatible public-contract changes need no approval.", "Skip the Goal-Backward Check.", "One positive representative agent intent is sufficient.", "Treat every authorization failure as a tool execution error.", "Serialized byte count proves token efficiency.", "Missing evidence counts as verified."],
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
