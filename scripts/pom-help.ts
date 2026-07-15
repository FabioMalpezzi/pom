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
  console.log("Pi coding agent (skill package):");
  console.log("");
  console.log("POM is a skill-only Pi package: Pi registers its skills so a session can load using-pom and route POM work with no extension.");
  console.log("   pi -e git:github.com/FabioMalpezzi/pom        # try for one run, no settings write");
  console.log("   pi install git:github.com/FabioMalpezzi/pom   # persist (global); add -l for project settings");
  console.log("   pi install /absolute/path/to/pom             # install from a local clone");
  console.log("   pi list                                       # show registered packages/skills");
  console.log("   pi remove git:github.com/FabioMalpezzi/pom    # remove from settings");
  console.log("   Install writes Pi settings only, never your project files. In a non-POM repo the package stays inert.");
  console.log("   It does not replace installing POM in a project: skills read pom.config.json and the memory lives in the project.");
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
  console.log("   If wiki Markdown changed, regenerate the static wiki reader at the end.");
  console.log("");
  console.log("5. Render the wiki reader");
  console.log("   npm run pom:wiki:render");
  console.log("   Generate the static wiki reader under wiki/_site/ and print the index.html file link.");
  console.log("");
  console.log("6. Launch the local Project Reader server");
  console.log("   npm run pom:reader -- --port 4173");
  console.log("   Open http://127.0.0.1:4173 in the browser.");
  console.log("   This works from a target project where POM is installed under pom/.");
  console.log("   Direct command from the POM source repository itself:");
  console.log("   node scripts/project-reader/server.mjs --port 4173");
  console.log("   Add --root <project-root> and --annotations-dir <path> when the inspected project or annotation handoff folder must be explicit.");
  console.log("   If pom.config.json exists under the project root, the reader uses it to classify configured docs, decisions, tasks, analysis, source, and tests.");
  console.log("   Rendering rejects files above 1 MB and binary-looking files. The server is local-only on 127.0.0.1.");
  console.log("   If a sandbox reports EPERM/EACCES on listen, approve local-server startup or run the command in a normal terminal.");
  console.log("");
  console.log("7. Show POM skills index");
  console.log("   cat pom/skills/README.md");
  console.log("   List available POM skills and their canonical prompts.");
  console.log("");
  console.log("8. Show post-action validator skill");
  console.log("   cat pom/skills/validate.md");
  console.log("   Show the validation skill used after significant work, before handoff or commit.");
  console.log("");
  console.log("9. Lint workflow YAML models (opt-in, requires workflows.enabled in pom.config.json; Dynamic Workflow and loop/goal profiles also require workflows.dynamic.enabled or workflows.loopGoal.enabled)");
  console.log("   npm run pom:workflow:lint -- workflows/<name>.yaml [--mermaid-dir workflows/generated/]");
  console.log("   Validate the workflow against SPEC-0006 rules. When --mermaid-dir is passed, also writes <name>.mmd alongside.");
  console.log("   Optional starting points: pom/templates/WORKFLOW_TEMPLATE.yaml for YAML shape and pom/templates/WORKFLOW_RUNTIME_TEMPLATE.ts or .py for target-owned runtime seams.");
  console.log("");
  console.log("10. Render a workflow as a Mermaid stateDiagram-v2 (one-off)");
  console.log("    npm run pom:workflow:mermaid -- workflows/<name>.yaml --out workflows/generated/<name>.mmd");
  console.log("");
  console.log("11. Render a workflow as an XState v5 MachineConfig JSON (for stately.ai)");
  console.log("    npm run pom:workflow:xstate -- workflows/<name>.yaml --out workflows/generated/<name>.xstate.json");
  console.log("");
  console.log("Source-only commands (POM repository itself, not installed in target projects):");
  console.log("");
  console.log("- npm run pom:test");
  console.log("  Discover tests/<area>/integration/*.mjs and run them in sequence.");
  console.log("  Defined only in the POM source package.json. The installer does not propagate it to targets.");
  console.log("");
  console.log("Direct skill usage:");
  console.log("");
  console.log("  Ask the coding agent to use a POM skill, for example:");
  console.log("  - Use `pom/skills/using-pom.md` to start or route POM-aware work.");
  console.log("  - Use `pom/skills/wiki.md` to query or maintain the wiki.");
  console.log("  - Use `pom/skills/sync.md` when pom:update stops on local pom/ changes.");
  console.log("  - Use `pom/skills/defer.md` to park future work.");
  console.log("  - Use `pom/skills/zero-tech-debt.md` to reshape a patch around the intended final shape.");
  console.log("  - Use `pom/skills/challenge.md` to run adversarial thesis/antithesis review.");
  console.log("  - Use `pom/skills/root-cause.md` to debug Target Project bugs and failures before fixes.");
  console.log("  - Use `pom/skills/validate.md` to audit governance after significant work.");
  console.log("  - Use `pom/skills/reconcile.md` to resolve a divergence between a source and memory.");
  console.log("  - Use `pom/skills/finish-branch.md` to close branch, PR, merge, keep, discard, or cleanup decisions.");
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
  console.log("Agente Pi (pacchetto di skill):");
  console.log("");
  console.log("POM e un pacchetto Pi solo-skill: Pi registra le sue skill, cosi una sessione carica using-pom e instrada il lavoro POM senza estensione.");
  console.log("   pi -e git:github.com/FabioMalpezzi/pom        # prova per una sessione, non scrive settings");
  console.log("   pi install git:github.com/FabioMalpezzi/pom   # persistente (globale); aggiungi -l per i settings di progetto");
  console.log("   pi install /percorso/assoluto/a/pom          # install da clone locale");
  console.log("   pi list                                       # mostra pacchetti/skill registrati");
  console.log("   pi remove git:github.com/FabioMalpezzi/pom    # rimuovi dai settings");
  console.log("   L'install scrive solo i settings di Pi, mai i file del progetto. In un repo non-POM il pacchetto resta inerte.");
  console.log("   Non sostituisce l'install nel progetto: le skill leggono pom.config.json e la memoria vive nel progetto.");
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
  console.log("   Se cambia Markdown sotto wiki/, rigenera il reader statico alla fine.");
  console.log("");
  console.log("5. Generare il reader della wiki");
  console.log("   npm run pom:wiki:render");
  console.log("   Genera il sito statico sotto wiki/_site/ e stampa il link file:// di index.html.");
  console.log("");
  console.log("6. Avviare il Project Reader locale");
  console.log("   npm run pom:reader -- --port 4173");
  console.log("   Apri http://127.0.0.1:4173 nel browser.");
  console.log("   Funziona in un progetto target dove POM e installato sotto pom/.");
  console.log("   Comando diretto dal repository sorgente di POM:");
  console.log("   node scripts/project-reader/server.mjs --port 4173");
  console.log("   Aggiungi --root <project-root> e --annotations-dir <path> quando il progetto letto o la cartella di handoff annotazioni devono essere espliciti.");
  console.log("   Se pom.config.json esiste nella root del progetto, il reader lo usa per classificare docs, decisioni, task, analisi, sorgenti e test configurati.");
  console.log("   Il rendering rifiuta file oltre 1 MB e file che sembrano binari. Il server e locale su 127.0.0.1.");
  console.log("   Se una sandbox segnala EPERM/EACCES su listen, autorizza l'avvio del server locale o usa un terminale normale.");
  console.log("");
  console.log("7. Indice delle skill POM");
  console.log("   cat pom/skills/README.md");
  console.log("");
  console.log("8. Skill di validazione post-azione");
  console.log("   cat pom/skills/validate.md");
  console.log("");
  console.log("9. Lint dei modelli workflow YAML (opt-in, richiede workflows.enabled in pom.config.json; i profili Dynamic Workflow e loop/goal richiedono anche workflows.dynamic.enabled o workflows.loopGoal.enabled)");
  console.log("   npm run pom:workflow:lint -- workflows/<nome>.yaml [--mermaid-dir workflows/generated/]");
  console.log("   Valida il workflow rispetto alle regole SPEC-0006. Con --mermaid-dir scrive anche <nome>.mmd accanto agli altri output generati.");
  console.log("   Punti di partenza opzionali: pom/templates/WORKFLOW_TEMPLATE.yaml per la forma YAML e pom/templates/WORKFLOW_RUNTIME_TEMPLATE.ts o .py per i runtime seam posseduti dal target.");
  console.log("");
  console.log("10. Render di un workflow come Mermaid stateDiagram-v2 (una tantum)");
  console.log("    npm run pom:workflow:mermaid -- workflows/<nome>.yaml --out workflows/generated/<nome>.mmd");
  console.log("");
  console.log("11. Render di un workflow come XState v5 MachineConfig JSON (per stately.ai)");
  console.log("    npm run pom:workflow:xstate -- workflows/<nome>.yaml --out workflows/generated/<nome>.xstate.json");
  console.log("");
  console.log("Comandi solo nel repo POM sorgente (non installati nei progetti target):");
  console.log("");
  console.log("- npm run pom:test");
  console.log("  Scopre tests/<area>/integration/*.mjs e li esegue in sequenza.");
  console.log("  Definito solo nel package.json del repo POM. L'installer non lo propaga ai target.");
  console.log("");
  console.log("Uso diretto delle skill:");
  console.log("");
  console.log("  - Usa `pom/skills/using-pom.md` per iniziare o instradare lavoro POM-aware.");
  console.log("  - Usa `pom/skills/sync.md` quando pom:update si ferma su modifiche locali in pom/.");
  console.log("  - Usa `pom/skills/config.md` quando la modalita o la configurazione non sono chiare.");
  console.log("  - Usa `pom/skills/zero-tech-debt.md` per rimodellare una patch intorno alla forma finale prevista.");
  console.log("  - Usa `pom/skills/challenge.md` per una verifica avversaria di tesi e antitesi.");
  console.log("  - Usa `pom/skills/root-cause.md` per diagnosticare bug e failure del progetto prima dei fix.");
  console.log("  - Usa `pom/skills/validate.md` dopo lavoro significativo, prima di handoff o commit.");
  console.log("  - Usa `pom/skills/finish-branch.md` per chiudere decisioni di branch, PR, merge, keep, discard o cleanup.");
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
