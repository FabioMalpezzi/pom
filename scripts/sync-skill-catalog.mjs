#!/usr/bin/env node
// Keeps the skill catalog in README.md generated from skills/README.md.
//
// skills/README.md is the canonical catalog (skill, purpose, canonical
// prompt). README.md carries a copy for readers who start from the entry
// point; this script regenerates that copy between the POM:SKILL-CATALOG
// markers so the two never drift. `--check` reports drift without writing
// and exits 1, which is what the test suite runs.
//
// Source-only: this script is not installed in target projects.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CATALOG_PATH = "skills/README.md";
const README_PATH = "README.md";
const START_MARKER = "<!-- POM:SKILL-CATALOG:START -->";
const END_MARKER = "<!-- POM:SKILL-CATALOG:END -->";

export function parseCatalog(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\| `([^`]+)` \| (.+?) \| (.+) \|$/);
    if (match) rows.push({ skill: match[1], purpose: match[2].trim(), prompts: match[3].trim() });
  }
  return rows;
}

export function renderCatalogBlock(rows) {
  const lines = [
    START_MARKER,
    `Generated from \`${CATALOG_PATH}\` by \`npm run pom:skills:sync\`. Edit the catalog there, not this table.`,
    "",
    "| Skill | Purpose | Canonical prompt |",
    "|---|---|---|",
    ...rows.map((row) => `| \`${row.skill}\` | ${row.purpose} | ${row.prompts} |`),
    END_MARKER,
  ];
  return lines.join("\n");
}

export function catalogDrift(root = ROOT) {
  const catalogText = readFileSync(join(root, CATALOG_PATH), "utf8");
  const rows = parseCatalog(catalogText);
  const problems = [];

  const skillFiles = readdirSync(join(root, "skills"))
    .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
    .map((entry) => entry.replace(/\.md$/, ""));
  const catalogued = new Set(rows.map((row) => row.skill));
  for (const skill of skillFiles) {
    if (!catalogued.has(skill)) problems.push(`skills/${skill}.md is not listed in ${CATALOG_PATH}.`);
  }
  for (const row of rows) {
    if (!existsSync(join(root, "skills", `${row.skill}.md`))) problems.push(`${CATALOG_PATH} lists \`${row.skill}\` but skills/${row.skill}.md does not exist.`);
  }

  const readme = readFileSync(join(root, README_PATH), "utf8");
  const start = readme.indexOf(START_MARKER);
  const end = readme.indexOf(END_MARKER);
  if (start < 0 || end < 0 || end < start) {
    problems.push(`${README_PATH} has no ${START_MARKER} / ${END_MARKER} block.`);
    return { rows, problems, readme, start, end, block: renderCatalogBlock(rows) };
  }
  const current = readme.slice(start, end + END_MARKER.length);
  const block = renderCatalogBlock(rows);
  if (current !== block) problems.push(`${README_PATH} skill catalog is out of date with ${CATALOG_PATH}. Run npm run pom:skills:sync.`);
  return { rows, problems, readme, start, end, block };
}

function main() {
  const check = process.argv.includes("--check");
  const drift = catalogDrift();
  const fatal = drift.problems.filter((problem) => !problem.includes("out of date"));

  if (fatal.length > 0) {
    for (const problem of fatal) console.error(`skill catalog: ${problem}`);
    process.exit(1);
  }

  if (check) {
    if (drift.problems.length > 0) {
      for (const problem of drift.problems) console.error(`skill catalog: ${problem}`);
      process.exit(1);
    }
    console.log(`skill catalog: ${README_PATH} matches ${CATALOG_PATH} (${drift.rows.length} skills).`);
    return;
  }

  if (drift.problems.length === 0) {
    console.log(`skill catalog: ${README_PATH} already matches ${CATALOG_PATH} (${drift.rows.length} skills).`);
    return;
  }

  const next = `${drift.readme.slice(0, drift.start)}${drift.block}${drift.readme.slice(drift.end + END_MARKER.length)}`;
  writeFileSync(join(ROOT, README_PATH), next);
  console.log(`skill catalog: regenerated the ${README_PATH} table from ${CATALOG_PATH} (${drift.rows.length} skills).`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
