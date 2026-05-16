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

function readRawArg(name: string): string | undefined {
  const exactIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  if (exactIndex >= 0) {
    const value = process.argv[exactIndex + 1];
    return value && !value.startsWith("--") ? value : "";
  }
  const inlinePrefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(inlinePrefix));
  return inline ? inline.slice(inlinePrefix.length) : undefined;
}

function normalizeLanguage(value: string): "en" | "it" | undefined {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("en")) return "en";
  return undefined;
}

function detectLanguage(): "en" | "it" {
  const arg = readRawArg("lang");
  if (arg !== undefined) {
    const normalized = arg ? normalizeLanguage(arg) : undefined;
    if (!normalized) {
      console.error("Missing or unsupported --lang value. Use en or it.");
      process.exit(1);
    }
    return normalized;
  }

  const envLanguage = process.env.POM_LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  return normalizeLanguage(envLanguage) || "en";
}

function printHelp(): void {
  if (detectLanguage() === "it") {
    printHelpIt();
    return;
  }

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
  console.log("   npm run pom:init -- --preset owned");
  console.log("   npm run pom:init -- --preset team");
  console.log("   npm run pom:init -- --preset overlay");
  console.log("   npm run pom:init -- --preset minimal");
  console.log("   Use presets for normal setup. Use --profile and --ownership only for advanced explicit changes.");
  console.log("   Ownership: owned = you can govern the project; team = preserve shared conventions; external_overlay = local memory only.");
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

function printHelpIt(): void {
  console.log("");
  console.log("Aiuto POM");
  console.log("=========");
  console.log("");
  console.log("Project Operating Memory tiene allineati memoria, decisioni, task, documenti e stato di ripartenza.");
  console.log("");
  console.log("Comandi nel progetto target:");
  console.log("");
  console.log("1. Aggiornare POM installato");
  console.log("   npm run pom:update");
  console.log("   Aggiorna pom/, fa refresh delle sezioni generate e lancia il lint. Non cambia modalita.");
  console.log("");
  console.log("2. Refresh delle sezioni generate");
  console.log("   npm run pom:init -- --profile refresh");
  console.log("   Rigenera sezioni, script, hook e file agente senza cambiare pom.config.json.");
  console.log("");
  console.log("3. Installare o riconfigurare POM");
  console.log("   npm run pom:init -- --preset owned");
  console.log("   npm run pom:init -- --preset team");
  console.log("   npm run pom:init -- --preset overlay");
  console.log("   npm run pom:init -- --preset minimal");
  console.log("   Usa i preset per il setup normale. Usa --profile e --ownership solo per cambi espliciti avanzati.");
  console.log("   Ownership: owned = puoi governare il progetto; team = preserva le convenzioni condivise; external_overlay = solo memoria locale.");
  console.log("");
  console.log("4. Lint della governance POM");
  console.log("   npm run pom:lint");
  console.log("   Controlla governance documentale, root configurate, status, indici e promemoria di handoff.");
  console.log("");
  console.log("5. Indice delle skill POM");
  console.log("   cat pom/skills/README.md");
  console.log("");
  console.log("6. Skill di validazione post-azione");
  console.log("   cat pom/skills/validate.md");
  console.log("");
  console.log("Uso diretto delle skill:");
  console.log("");
  console.log("  - Usa `pom/skills/sync.md` quando pom:update si ferma su modifiche locali in pom/.");
  console.log("  - Usa `pom/skills/config.md` quando la modalita o la configurazione non sono chiare.");
  console.log("  - Usa `pom/skills/validate.md` dopo lavoro significativo, prima di handoff o commit.");
  console.log("");

  const skillsPath = pathExists("pom/skills/README.md") ? "pom/skills/README.md" : "skills/README.md";
  if (pathExists(skillsPath)) {
    console.log("Skill disponibili:");
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
