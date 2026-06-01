#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";

const POM_ROOT = process.cwd();
const PAGE = "wiki/loop-goal-scope-examples.md";
const text = readFileSync(join(POM_ROOT, PAGE), "utf8");

let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

function markdownTableRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| "))
    .filter((line) => !line.includes("|---"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

function exampleRows(markdown) {
  return markdownTableRows(markdown).filter((cells) => {
    return cells.length === 9 && cells[0] !== "Example";
  });
}

function sectionText(markdown, heading) {
  const start = markdown.indexOf(heading);
  if (start === -1) return "";
  const rest = markdown.slice(start + heading.length);
  const next = rest.search(/\n## \d+\. |\n## Sources/);
  return next === -1 ? rest : rest.slice(0, next);
}

console.log("Loop/Goal Scope Examples Wiki Tests");
console.log("===================================");

const headers = markdownTableRows(text).filter((cells) => cells[0] === "Example");
const rows = exampleRows(text);
const trendPattern = /`[↑↓=]`,\s*(absolute|relative|statistical|percent)/;

assert("page has 10 example table headers", headers.length === 10, `found ${headers.length}`);
assert("page has 30 example rows", rows.length === 30, `found ${rows.length}`);

for (const [index, header] of headers.entries()) {
  assert(`scope ${index + 1} table includes Measure with`, header.includes("Measure with"), header.join(" | "));
  assert(`scope ${index + 1} table includes Does not falsify`, header.includes("Does not falsify"), header.join(" | "));
}

for (const row of rows) {
  const [
    example,
    objective,
    possibleGate,
    possibleSignal,
    measureWith,
    baseline,
    falsification,
    doesNotFalsify,
    stallExit,
  ] = row;

  assert(`${example}: objective present`, objective.length > 0);
  assert(`${example}: possible gate present`, possibleGate.length > 0);
  assert(`${example}: possible signal includes direction and trend shape`, trendPattern.test(possibleSignal), possibleSignal);
  assert(`${example}: concrete measurement present`, measureWith.length > 0);
  assert(`${example}: baseline present`, baseline.length > 0);
  assert(`${example}: falsification present`, falsification.length > 0);
  assert(`${example}: non-falsifying counterexample present`, doesNotFalsify.length > 0);
  assert(
    `${example}: falsification and non-falsification are distinct`,
    falsification.toLowerCase() !== doesNotFalsify.toLowerCase(),
  );
  assert(`${example}: stall exit present`, stallExit.length > 0);
}

const scope10 = sectionText(text, "## 10. Open-Ended Work");
assert(
  "scope 10 is marked as routing guidance",
  scope10.includes("mostly routing examples, not normal loop/goal"),
  "missing routing warning",
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
