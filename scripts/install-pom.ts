#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const ROOT = process.cwd();
const START_MARKER = "<!-- POM:START -->";
const END_MARKER = "<!-- POM:END -->";
const HOOK_START_MARKER = "# POM:START pre-commit";
const HOOK_END_MARKER = "# POM:END pre-commit";
const TODAY = new Date().toISOString().slice(0, 10);
const FALLBACK_AGENT_INSTRUCTION_FILE = "AGENTS.md";

const EXISTING_AGENT_INSTRUCTION_FILES = [
  "AGENTS.md",
  "AGENTS.MD",
  "agents.md",
  "CLAUDE.md",
  "GEMINI.md",
  "CONVENTIONS.md",
  ".cursorrules",
  ".clinerules",
  ".windsurfrules",
  ".github/copilot-instructions.md",
  ".junie/guidelines.md",
  ".junie/instructions.md",
  ".junie/AGENTS.md",
];

const DIRECTORY_AGENT_INSTRUCTION_TARGETS = [
  {
    directory: ".claude/rules",
    file: ".claude/rules/pom.md",
    header: "",
  },
  {
    directory: ".github/instructions",
    file: ".github/instructions/pom.instructions.md",
    header: "---\napplyTo: \"**\"\n---\n\n",
  },
  {
    directory: ".cursor/rules",
    file: ".cursor/rules/pom.mdc",
    header: "---\ndescription: Project Operating Memory rules\nalwaysApply: true\n---\n\n",
  },
  {
    directory: ".windsurf/rules",
    file: ".windsurf/rules/pom.md",
    header: "",
  },
  {
    directory: ".kiro/steering",
    file: ".kiro/steering/pom.md",
    header: "",
  },
  {
    directory: ".continue/rules",
    file: ".continue/rules/pom.md",
    header: "",
  },
  {
    directory: ".roo/rules",
    file: ".roo/rules/pom.md",
    header: "",
  },
  {
    directory: ".clinerules",
    file: ".clinerules/pom.md",
    header: "",
  },
];

const CLAUDE_AGENT_TEMPLATES = [
  {
    source: "agents/claude/pom-post-action-validator.md",
    target: ".claude/agents/pom-post-action-validator.md",
  },
];

type ProfileName = "minimal" | "wiki" | "decisions" | "full" | "adopt" | "refresh" | "custom";

type AdoptionConfig = {
  profile: ProfileName;
  wiki: "enabled" | "disabled";
  decisions: "enabled" | "disabled";
  analysis: "enabled" | "optional" | "disabled";
  docs: "enabled" | "optional" | "disabled";
  mockups: "enabled" | "disabled";
  planning: "light" | "structured";
  tasks: "light" | "structured";
  tests: "disabled" | "existing" | "pom";
};

type PackageJson = {
  scripts?: Record<string, string>;
  [key: string]: unknown;
};

const profiles: Record<ProfileName, { label: string; description: string; adoption: AdoptionConfig }> = {
  minimal: {
    label: "Minimal",
    description: "Installs only agent instruction file sections, package scripts, and pom.config.json. No wiki, docs, analysis, mockups, or tests.",
    adoption: {
      profile: "minimal",
      wiki: "disabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
  wiki: {
    label: "Wiki",
    description: "Minimal + persistent wiki memory. Creates wiki/index.md and wiki/log.md.",
    adoption: {
      profile: "wiki",
      wiki: "enabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
  decisions: {
    label: "Decisions",
    description: "Minimal + ADR governance. Enables decisions/ and generated decisions/ADR_INDEX.md.",
    adoption: {
      profile: "decisions",
      wiki: "disabled",
      decisions: "enabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
  full: {
    label: "Full",
    description: "Wiki + decisions + PROJECT_STATE.md + CURRENT_PLAN.md. Use for long-running projects.",
    adoption: {
      profile: "full",
      wiki: "enabled",
      decisions: "enabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "structured",
      tasks: "structured",
      tests: "existing",
    },
  },
  adopt: {
    label: "Adopt Existing Project",
    description: "Preserves existing structure and maps POM to it. Does not impose folders.",
    adoption: {
      profile: "adopt",
      wiki: "disabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "existing",
    },
  },
  refresh: {
    label: "Refresh Existing POM",
    description: "Updates only agent instruction file sections and package scripts. Does not change pom.config.json or create governance folders.",
    adoption: {
      profile: "refresh",
      wiki: "disabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
  custom: {
    label: "Custom",
    description: "Starts from Minimal and asks which POM modules to enable.",
    adoption: {
      profile: "custom",
      wiki: "disabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
};

function pathExists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

function pathIsDirectory(path: string): boolean {
  return pathExists(path) && statSync(join(ROOT, path)).isDirectory();
}

function rootHasExactEntry(name: string): boolean {
  return readdirSync(ROOT).includes(name);
}

function readText(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function writeText(path: string, content: string): void {
  writeFileSync(join(ROOT, path), content);
}

function ensureDir(path: string): void {
  mkdirSync(join(ROOT, path), { recursive: true });
}

function copyTemplateIfMissing(templatePath: string, targetPath: string): void {
  if (pathExists(targetPath)) {
    console.log(`${targetPath} already exists, skipped.`);
    return;
  }
  const text = readText(templatePath).replaceAll("YYYY-MM-DD", TODAY);
  mkdirSync(dirname(join(ROOT, targetPath)), { recursive: true });
  writeText(targetPath, text);
  console.log(`Created ${targetPath}.`);
}

function resolveTemplate(path: string): string {
  const candidates = [`pom/templates/${path}`, `templates/${path}`];
  for (const candidate of candidates) {
    if (pathExists(candidate)) return candidate;
  }
  throw new Error(`Cannot find template ${path}. Run this command from the project root.`);
}

function resolvePomSectionTemplate(): string {
  return resolveTemplate("AGENTS_POM_SECTION_TEMPLATE.md");
}

function resolveLintScript(): string {
  if (pathExists("pom/scripts/lint-doc-governance.ts")) return "pom/scripts/lint-doc-governance.ts";
  if (pathExists("scripts/lint-doc-governance.ts")) return "scripts/lint-doc-governance.ts";
  return "pom/scripts/lint-doc-governance.ts";
}

function resolveHelpScript(): string {
  if (pathExists("pom/scripts/pom-help.ts")) return "pom/scripts/pom-help.ts";
  if (pathExists("scripts/pom-help.ts")) return "scripts/pom-help.ts";
  return "pom/scripts/pom-help.ts";
}

function resolvePomAsset(path: string): string | undefined {
  const candidates = [`pom/${path}`, path];
  return candidates.find((candidate) => pathExists(candidate));
}

type AgentInstructionTarget = {
  path: string;
  header: string;
};

function discoverAgentInstructionTargets(): AgentInstructionTarget[] {
  const existingFiles = EXISTING_AGENT_INSTRUCTION_FILES.filter((file) => {
    if (file.includes("/")) return pathExists(file) && !pathIsDirectory(file);
    return rootHasExactEntry(file) && !pathIsDirectory(file);
  }).map((file) => ({ path: file, header: "" }));

  const directoryFiles = DIRECTORY_AGENT_INSTRUCTION_TARGETS.filter((target) => pathIsDirectory(target.directory)).map((target) => ({
    path: target.file,
    header: target.header,
  }));

  const unique = new Map<string, AgentInstructionTarget>();
  for (const target of [...existingFiles, ...directoryFiles]) unique.set(target.path, target);

  if (unique.size === 0) {
    unique.set(FALLBACK_AGENT_INSTRUCTION_FILE, { path: FALLBACK_AGENT_INSTRUCTION_FILE, header: "" });
  }

  return [...unique.values()];
}

function upsertAgentInstructionSections(): void {
  const templatePath = resolvePomSectionTemplate();
  const section = `${START_MARKER}\n${readText(templatePath).trim()}\n${END_MARKER}`;
  const markerRegex = new RegExp(`${escapeRegex(START_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}`);
  const instructionTargets = discoverAgentInstructionTargets();

  for (const target of instructionTargets) {
    const current = pathExists(target.path) ? readText(target.path) : target.header;
    const next = markerRegex.test(current)
      ? current.replace(markerRegex, section)
      : `${current.trimEnd()}\n\n${section}\n`;

    if (next !== current) {
      mkdirSync(dirname(join(ROOT, target.path)), { recursive: true });
      writeText(target.path, next);
      console.log(`Updated ${target.path} with the POM section.`);
    } else {
      console.log(`${target.path} already contains the current POM section.`);
    }
  }
}

function installCodingAgentFiles(): void {
  installClaudeAgentFiles();
}

function installClaudeAgentFiles(): void {
  const shouldInstall = pathIsDirectory(".claude") || pathIsDirectory(".claude/agents");
  if (!shouldInstall) {
    console.log("Claude agent files not installed: .claude/ not found.");
    return;
  }

  ensureDir(".claude/agents");

  for (const agent of CLAUDE_AGENT_TEMPLATES) {
    const source = resolvePomAsset(agent.source);
    if (!source) {
      console.log(`Claude agent template missing: ${agent.source}. Skipped.`);
      continue;
    }

    const current = pathExists(agent.target) ? readText(agent.target) : "";
    const next = readText(source);

    if (current === next) {
      console.log(`${agent.target} already contains the current ${basename(agent.target)}.`);
      continue;
    }

    copyFileSync(join(ROOT, source), join(ROOT, agent.target));
    console.log(`Installed or updated ${agent.target}.`);
  }
}

function upsertPackageScripts(): void {
  const packagePath = "package.json";
  if (!pathExists(packagePath)) {
    const lintScript = resolveLintScript();
    const helpScript = resolveHelpScript();
    const content: PackageJson = {
      private: true,
      type: "module",
      scripts: {
        "pom:init": "node --experimental-strip-types pom/scripts/install-pom.ts",
        "pom:help": `node --experimental-strip-types ${helpScript}`,
        "pom:lint": `node --experimental-strip-types ${lintScript}`,
      },
    };
    writeText(packagePath, `${JSON.stringify(content, null, 2)}\n`);
    console.log("Created package.json with pom:init and pom:lint scripts.");
    return;
  }

  let parsed: PackageJson;
  try {
    parsed = JSON.parse(readText(packagePath)) as PackageJson;
  } catch (error) {
    throw new Error(`package.json is not valid JSON: ${String(error)}`);
  }

  const scripts = { ...(parsed.scripts ?? {}) };
  const lintScript = resolveLintScript();
  const helpScript = resolveHelpScript();
  const initCommand = pathExists("pom/scripts/install-pom.ts")
    ? "node --experimental-strip-types pom/scripts/install-pom.ts"
    : "node --experimental-strip-types scripts/install-pom.ts";

  let changed = false;
  if (!scripts["pom:init"]) {
    scripts["pom:init"] = initCommand;
    changed = true;
  }
  if (!scripts["pom:help"]) {
    scripts["pom:help"] = `node --experimental-strip-types ${helpScript}`;
    changed = true;
  }
  if (!scripts["pom:lint"]) {
    scripts["pom:lint"] = `node --experimental-strip-types ${lintScript}`;
    changed = true;
  }

  if (!changed) {
    console.log("package.json already contains pom:init, pom:help, and pom:lint.");
    return;
  }

  parsed.scripts = scripts;
  writeText(packagePath, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log("Updated package.json with pom:init, pom:help, and pom:lint scripts.");
}

function installPreCommitHook(): void {
  if (!pathExists(".git/hooks")) {
    console.log("Git hooks not installed: .git/hooks not found. Run git init first if you want the POM pre-commit hook.");
    return;
  }

  const hookPath = ".git/hooks/pre-commit";
  const current = pathExists(hookPath) ? readText(hookPath) : "#!/bin/sh\n";
  const hookBlock = `${HOOK_START_MARKER}
echo "POM pre-commit: running npm run pom:lint"
npm run pom:lint
pom_lint_status=$?
if [ "$pom_lint_status" -ne 0 ]; then
  echo "POM pre-commit: pom:lint failed. Fix findings and rerun npm run pom:lint."
  exit "$pom_lint_status"
fi

if [ -f "PROJECT_STATE.md" ]; then
  pom_changed="$(git diff --cached --name-only -- wiki decisions docs analysis mockups pom.config.json CURRENT_PLAN.md specs 2>/dev/null)"
  pom_state_changed="$(git diff --cached --name-only -- PROJECT_STATE.md 2>/dev/null)"
  if [ -n "$pom_changed" ] && [ -z "$pom_state_changed" ]; then
    echo "POM pre-commit reminder: governed project-memory files are staged, but PROJECT_STATE.md is not staged."
    echo "Update PROJECT_STATE.md only if restart context changed: substantial ADR/spec change, roadmap/current-plan change, closed important task, new risk/blocker/open decision, or explicit end-of-session handoff request."
  fi
fi
${HOOK_END_MARKER}`;

  const markerRegex = new RegExp(`${escapeRegex(HOOK_START_MARKER)}[\\s\\S]*?${escapeRegex(HOOK_END_MARKER)}`);
  const next = markerRegex.test(current)
    ? current.replace(markerRegex, hookBlock)
    : `${current.trimEnd()}\n\n${hookBlock}\n`;

  if (next !== current) {
    writeText(hookPath, next);
    chmodSync(join(ROOT, hookPath), 0o755);
    console.log("Installed or updated .git/hooks/pre-commit with POM checks.");
  } else {
    chmodSync(join(ROOT, hookPath), 0o755);
    console.log(".git/hooks/pre-commit already contains the current POM block.");
  }
}

function createOrUpdateConfig(adoption: AdoptionConfig): void {
  const configPath = "pom.config.json";
  if (!pathExists(configPath)) {
    const template = JSON.parse(readText(resolveTemplate("POM_CONFIG_TEMPLATE.json"))) as Record<string, unknown>;
    template.adoption = adoption;
    writeText(configPath, `${JSON.stringify(template, null, 2)}\n`);
    console.log(`Created ${configPath} with ${adoption.profile} adoption profile.`);
    return;
  }

  const config = JSON.parse(readText(configPath)) as Record<string, unknown>;
  config.adoption = adoption;
  writeText(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Updated ${configPath} adoption profile to ${adoption.profile}.`);
}

function createProfileFiles(adoption: AdoptionConfig): void {
  if (adoption.wiki === "enabled") {
    ensureDir("wiki");
    console.log("Ensured wiki/ exists.");
    copyTemplateIfMissing(resolveTemplate("WIKI_INDEX_TEMPLATE.md"), "wiki/index.md");
    copyTemplateIfMissing(resolveTemplate("WIKI_LOG_TEMPLATE.md"), "wiki/log.md");
    createWikiOverviewIfMissing();
  }

  if (adoption.decisions === "enabled") {
    ensureDir("decisions");
    console.log("Ensured decisions/ exists.");
  }

  if (adoption.mockups === "enabled") {
    ensureDir("mockups/packages");
    console.log("Ensured mockups/packages/ exists.");
  }

  if (adoption.profile === "full" || (adoption.profile === "custom" && adoption.planning === "structured")) {
    copyTemplateIfMissing(resolveTemplate("PROJECT_STATE_TEMPLATE.md"), "PROJECT_STATE.md");
    copyTemplateIfMissing(resolveTemplate("CURRENT_PLAN_TEMPLATE.md"), "CURRENT_PLAN.md");
  }
}

function createWikiOverviewIfMissing(): void {
  if (pathExists("wiki/overview.md")) return;

  const content = `# Overview

## Summary

Initial project overview page created by POM. Replace this placeholder with the current consolidated project knowledge when the wiki is first built.

## Current State

The project wiki has been initialized, but the project overview still needs to be compiled from actual sources, code, decisions, mockups, analysis, or user input.

## Details

- Main project purpose: to be defined.
- Key users or stakeholders: to be defined.
- Main modules or processes: to be defined.
- Current constraints or risks: to be defined.

## Sources

| Source | Use |
|---|---|
| Project initialization | Initial placeholder |

## Linked Decisions

| Decision | Impact |
|---|---|
|  |  |

## Open Questions

| Question | Status |
|---|---|
| What is the concise project purpose? | Open |

## Related Links

- [[index]]
`;

  writeText("wiki/overview.md", content);
  console.log("Created wiki/overview.md.");
}

async function chooseProfile(): Promise<ProfileName> {
  const argProfile = readProfileArg();
  if (argProfile) return argProfile;

  if (!process.stdin.isTTY) return "refresh";

  printLogo();
  printProfiles();

  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question("Choose profile [minimal/wiki/decisions/full/adopt/refresh/custom]: ")).trim().toLowerCase();
    if (isProfileName(answer)) return answer;
    if (answer === "1") return "minimal";
    if (answer === "2") return "wiki";
    if (answer === "3") return "decisions";
    if (answer === "4") return "full";
    if (answer === "5") return "adopt";
    if (answer === "6") return "refresh";
    if (answer === "7") return "custom";
    console.log("Unknown profile. Using refresh.");
    return "refresh";
  } finally {
    rl.close();
  }
}

async function customizeAdoption(base: AdoptionConfig): Promise<AdoptionConfig> {
  if (base.profile !== "custom" || !process.stdin.isTTY) return base;

  const rl = createInterface({ input, output });
  try {
    const wiki = await askYesNo(rl, "Enable persistent wiki memory?", false);
    const decisions = await askYesNo(rl, "Enable ADR decisions governance?", true);
    const handoff = await askYesNo(rl, "Enable handoff memory and current planning files?", false);
    const mockups = await askYesNo(rl, "Enable mockup governance?", false);
    const tests = await askChoice(rl, "Tests governance [disabled/existing/pom]", ["disabled", "existing", "pom"], "disabled");
    const planning = handoff ? "structured" : "light";

    return {
      profile: "custom",
      wiki: wiki ? "enabled" : "disabled",
      decisions: decisions ? "enabled" : "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: mockups ? "enabled" : "disabled",
      planning,
      tasks: planning,
      tests,
    };
  } finally {
    rl.close();
  }
}

async function askYesNo(rl: ReturnType<typeof createInterface>, question: string, defaultValue: boolean): Promise<boolean> {
  const suffix = defaultValue ? " [Y/n]: " : " [y/N]: ";
  const answer = (await rl.question(`${question}${suffix}`)).trim().toLowerCase();
  if (!answer) return defaultValue;
  return ["y", "yes"].includes(answer);
}

async function askChoice<T extends string>(
  rl: ReturnType<typeof createInterface>,
  question: string,
  allowed: T[],
  defaultValue: T,
): Promise<T> {
  const answer = (await rl.question(`${question} (${defaultValue}): `)).trim().toLowerCase();
  if (!answer) return defaultValue;
  return allowed.includes(answer as T) ? (answer as T) : defaultValue;
}

function readProfileArg(): ProfileName | undefined {
  const profileIndex = process.argv.findIndex((arg) => arg === "--profile");
  const value = profileIndex >= 0 ? process.argv[profileIndex + 1] : undefined;
  if (value && isProfileName(value)) return value;

  const inline = process.argv.find((arg) => arg.startsWith("--profile="))?.split("=").at(1);
  if (inline && isProfileName(inline)) return inline;

  return undefined;
}

function isProfileName(value: string): value is ProfileName {
  return Object.prototype.hasOwnProperty.call(profiles, value);
}

function printLogo(): void {
  console.log("");
  console.log("POM - Project Operating Memory");
  console.log("================================");
  console.log("");
}

function printProfiles(): void {
  const ordered: ProfileName[] = ["minimal", "wiki", "decisions", "full", "adopt", "refresh", "custom"];
  ordered.forEach((name, index) => {
    const profile = profiles[name];
    console.log(`${index + 1}. ${profile.label}`);
    console.log(`   ${profile.description}`);
  });
  console.log("");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPomRepositoryRoot(): boolean {
  return (
    pathExists("WIKI_METHOD.md") &&
    pathExists("templates/AGENTS_POM_SECTION_TEMPLATE.md") &&
    pathExists("prompts") &&
    pathExists("skills") &&
    pathExists("scripts/install-pom.ts") &&
    !pathExists("pom")
  );
}

async function main(): Promise<void> {
  if (isPomRepositoryRoot()) {
    console.log("This appears to be the POM repository root.");
    console.log("pom:init is intended to run from a target project root where POM is installed as pom/.");
    console.log("Example: node --experimental-strip-types pom/scripts/install-pom.ts --profile minimal");
    return;
  }

  const profileName = await chooseProfile();
  const adoption = await customizeAdoption(profiles[profileName].adoption);

  upsertAgentInstructionSections();
  installCodingAgentFiles();
  upsertPackageScripts();
  installPreCommitHook();

  if (adoption.profile !== "refresh") {
    createOrUpdateConfig(adoption);
    createProfileFiles(adoption);
  } else {
    console.log("Refresh profile selected: pom.config.json and governance folders were not changed.");
  }

  console.log("POM init complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
