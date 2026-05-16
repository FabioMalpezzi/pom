#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function pathExists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

function readText(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function printHelp(): void {
  console.log("");
  console.log("POM Help");
  console.log("========");
  console.log("");
  console.log("Project Operating Memory keeps wiki, decisions, tasks, docs, and handoff state aligned.");
  console.log("");
  console.log("Target-project commands:");
  console.log("");
  console.log("When POM is installed in a target project, these commands are available from that project root:");
  console.log("");
  console.log("1. Update installed POM");
  console.log("   npm run pom:update");
  console.log("   Update pom/ first, stop if pom/ has local changes, refresh generated sections, and run lint.");
  console.log("");
  console.log("2. Refresh generated POM sections");
  console.log("   npm run pom:init -- --profile refresh");
  console.log("   Refresh instruction sections, scripts, hooks, and coding-agent files without changing project config.");
  console.log("");
  console.log("3. Install or reconfigure POM");
  console.log("   npm run pom:init");
  console.log("   Run the interactive installer/profile chooser for a target project.");
  console.log("   For deterministic agent use, pass explicit options:");
  console.log("   npm run pom:init -- --profile adopt --ownership owned");
  console.log("   npm run pom:init -- --profile adopt --ownership team");
  console.log("   npm run pom:init -- --profile adopt --ownership external_overlay");
  console.log("   Ownership modes: owned, team, external_overlay, unknown.");
  console.log("");
  console.log("4. Lint POM governance");
  console.log("   npm run pom:lint");
  console.log("   Check document governance, configured roots, statuses, indexes, and handoff reminders.");
  console.log("");
  console.log("5. Show POM skills index");
  console.log("   cat pom/skills/README.md");
  console.log("   List available POM skills and their canonical prompts.");
  console.log("");
  console.log("6. Show post-action validator skill");
  console.log("   cat pom/skills/validate.md");
  console.log("   Show the validation skill used after significant work, before handoff or commit.");
  console.log("");
  console.log("Direct skill usage:");
  console.log("");
  console.log("  Ask the coding agent to use a POM skill, for example:");
  console.log("  - Use `pom/skills/wiki.md` to query or maintain the wiki.");
  console.log("  - Use `pom/skills/sync.md` when pom:update stops on local pom/ changes.");
  console.log("  - Use `pom/skills/defer.md` to park future work.");
  console.log("  - Use `pom/skills/validate.md` to audit governance after significant work.");
  console.log("  - Use `pom/skills/reconcile.md` to resolve a divergence between a source and memory.");
  console.log("");

  const skillsPath = pathExists("pom/skills/README.md") ? "pom/skills/README.md" : "skills/README.md";
  if (pathExists(skillsPath)) {
    console.log("All available skills:");
    console.log("");
    const content = readText(skillsPath);
    const tableMatch = content.match(/\| Skill \|[\s\S]*?(?=\n## |\n---|\n$)/);
    if (tableMatch) {
      console.log(tableMatch[0].trim());
      console.log("");
    }
  }
}

function main(): void {
  printHelp();
}

main();
