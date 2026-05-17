#!/usr/bin/env node

import { execFileSync } from "node:child_process";
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
type OwnershipMode = "owned" | "team" | "external_overlay" | "unknown";
type PresetName = "owned" | "team" | "overlay" | "minimal";

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

type OwnershipConfig = {
  mode: OwnershipMode;
  localOnly?: boolean;
  preserveExistingConventions?: boolean;
  note?: string;
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

const presets: Record<PresetName, { profile: ProfileName; ownership: OwnershipMode; description: string }> = {
  owned: {
    profile: "adopt",
    ownership: "owned",
    description: "Project is yours; POM may become project governance when useful.",
  },
  team: {
    profile: "adopt",
    ownership: "team",
    description: "Shared/team project; preserve existing conventions unless explicitly changed.",
  },
  overlay: {
    profile: "adopt",
    ownership: "external_overlay",
    description: "Third-party cloned repository; POM is local understanding memory only.",
  },
  minimal: {
    profile: "minimal",
    ownership: "unknown",
    description: "Minimal local POM setup with no ownership assumption.",
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

function resolveWikiRenderScript(): string {
  if (pathExists("pom/scripts/render-wiki.mjs")) return "pom/scripts/render-wiki.mjs";
  if (pathExists("scripts/render-wiki.mjs")) return "scripts/render-wiki.mjs";
  return "pom/scripts/render-wiki.mjs";
}

function resolveUpdateScriptTemplate(): string {
  return resolveTemplate("POM_UPDATE_TEMPLATE.mjs");
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

function assembleAgentsTemplate(adoption: AdoptionConfig): string {
  const modulesDir = resolveModulesDir();
  if (!modulesDir) {
    // Fallback: use the monolithic template
    return readText(resolvePomSectionTemplate()).trim();
  }

  const modules: Array<{ file: string; condition: boolean }> = [
    { file: "00-core.md", condition: true },
    { file: "10-wiki.md", condition: adoption.wiki === "enabled" },
    { file: "20-decisions.md", condition: adoption.decisions === "enabled" },
    { file: "30-planning.md", condition: adoption.planning === "structured" || adoption.tasks === "structured" },
    { file: "40-handoff.md", condition: true },
    { file: "50-templates.md", condition: true },
    { file: "60-skills.md", condition: true },
    { file: "70-experiments.md", condition: adoption.analysis !== "disabled" },
    { file: "80-docs-source.md", condition: adoption.docs !== "disabled" },
    { file: "90-mockups.md", condition: adoption.mockups === "enabled" },
  ];

  const parts: string[] = [];
  for (const mod of modules) {
    if (!mod.condition) continue;
    const modPath = join(modulesDir, mod.file);
    if (existsSync(join(ROOT, modPath))) {
      parts.push(readText(modPath).trim());
    }
  }

  return parts.join("\n\n");
}

function resolveModulesDir(): string | undefined {
  const candidates = ["pom/templates/agents", "templates/agents"];
  for (const candidate of candidates) {
    if (pathExists(candidate) && statSync(join(ROOT, candidate)).isDirectory()) return candidate;
  }
  return undefined;
}

function upsertAgentInstructionSections(adoption: AdoptionConfig): void {
  const assembled = assembleAgentsTemplate(adoption);
  const section = `${START_MARKER}\n${assembled}\n${END_MARKER}`;
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

function installPomUpdateScript(): void {
  const target = "pom-update.mjs";
  const next = readText(resolveUpdateScriptTemplate());
  const current = pathExists(target) ? readText(target) : "";

  if (current === next) {
    console.log(`${target} already contains the current POM updater.`);
    return;
  }

  writeText(target, next);
  console.log(`Installed or updated ${target}.`);
}

function upsertPackageScripts(): void {
  const packagePath = "package.json";
  if (!pathExists(packagePath)) {
    const lintScript = resolveLintScript();
    const helpScript = resolveHelpScript();
    const wikiRenderScript = resolveWikiRenderScript();
    const content: PackageJson = {
      private: true,
      type: "module",
      scripts: {
        "pom:init": "node --experimental-strip-types pom/scripts/install-pom.ts",
        "pom:update": "node pom-update.mjs",
        "pom:help": `node --experimental-strip-types ${helpScript}`,
        "pom:lint": `node --experimental-strip-types ${lintScript}`,
        "pom:wiki:render": `node ${wikiRenderScript}`,
      },
    };
    writeText(packagePath, `${JSON.stringify(content, null, 2)}\n`);
    console.log("Created package.json with pom:init, pom:update, pom:help, pom:lint, and pom:wiki:render scripts.");
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
  const wikiRenderScript = resolveWikiRenderScript();
  const initCommand = pathExists("pom/scripts/install-pom.ts")
    ? "node --experimental-strip-types pom/scripts/install-pom.ts"
    : "node --experimental-strip-types scripts/install-pom.ts";

  let changed = false;
  if (!scripts["pom:init"]) {
    scripts["pom:init"] = initCommand;
    changed = true;
  }
  if (!scripts["pom:update"]) {
    scripts["pom:update"] = "node pom-update.mjs";
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
  if (!scripts["pom:wiki:render"]) {
    scripts["pom:wiki:render"] = `node ${wikiRenderScript}`;
    changed = true;
  }

  if (!changed) {
    console.log("package.json already contains pom:init, pom:update, pom:help, pom:lint, and pom:wiki:render.");
    return;
  }

  parsed.scripts = scripts;
  writeText(packagePath, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log("Updated package.json with pom:init, pom:update, pom:help, pom:lint, and pom:wiki:render scripts.");
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
    echo "POM pre-commit notice: this commit touches governed project-memory files but not PROJECT_STATE.md."
    echo "Most commits do not need a PROJECT_STATE.md update. Update it only when the next person resuming would otherwise see a wrong starting picture: a closed important task, a new risk or open decision, a substantial ADR/spec/roadmap change, or an explicit handoff request."
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

function createOrUpdateConfig(adoption: AdoptionConfig, ownership: OwnershipMode | undefined): void {
  const configPath = "pom.config.json";
  if (!pathExists(configPath)) {
    const template = JSON.parse(readText(resolveTemplate("POM_CONFIG_TEMPLATE.json"))) as Record<string, unknown>;
    template.ownership = ownershipConfig(ownership);
    template.adoption = adoption;
    writeText(configPath, `${JSON.stringify(template, null, 2)}\n`);
    console.log(`Created ${configPath} with ${adoption.profile} adoption profile.`);
    return;
  }

  const config = JSON.parse(readText(configPath)) as Record<string, unknown>;
  if (ownership) {
    config.ownership = ownershipConfig(ownership, config.ownership);
  } else if (!config.ownership) {
    config.ownership = ownershipConfig(undefined);
  }
  config.adoption = adoption;
  writeText(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Updated ${configPath} adoption profile to ${adoption.profile}.`);
}

function ownershipConfig(ownership: OwnershipMode | undefined, existing?: unknown): OwnershipConfig {
  const existingRecord = typeof existing === "object" && existing !== null ? (existing as Record<string, unknown>) : {};
  const mode = ownership ?? (isOwnershipMode(String(existingRecord.mode)) ? (existingRecord.mode as OwnershipMode) : "unknown");
  const base: OwnershipConfig = {
    mode,
    note: String(existingRecord.note ?? "Use owned, team, or external_overlay. For external_overlay, POM is local understanding memory and must not govern upstream project structure."),
  };

  if (mode === "external_overlay") {
    return {
      ...base,
      localOnly: true,
      preserveExistingConventions: true,
    };
  }

  if (typeof existingRecord.localOnly === "boolean") base.localOnly = existingRecord.localOnly;
  if (typeof existingRecord.preserveExistingConventions === "boolean") {
    base.preserveExistingConventions = existingRecord.preserveExistingConventions;
  }

  return base;
}

function createProfileFiles(adoption: AdoptionConfig): void {
  if (adoption.wiki === "enabled") {
    ensureDir("wiki");
    console.log("Ensured wiki/ exists.");
    copyTemplateIfMissing(resolveTemplate("WIKI_INDEX_TEMPLATE.md"), "wiki/index.md");
    copyTemplateIfMissing(resolveTemplate("WIKI_LOG_TEMPLATE.md"), "wiki/log.md");
    copyTemplateIfMissing(resolveTemplate("WIKI_READER_SHORTCUT.html"), "wiki.html");
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

async function chooseProfile(argProfile: ProfileName | undefined): Promise<{ profile: ProfileName; ownership?: OwnershipMode }> {
  if (argProfile) return { profile: argProfile };

  if (!process.stdin.isTTY) {
    if (pathExists("pom.config.json")) return { profile: "refresh" };
    printPresetGuide();
    process.exit(1);
  }

  printLogo();
  console.log("Common presets:");
  for (const [name, preset] of Object.entries(presets)) {
    console.log(`- ${name}: ${preset.description}`);
  }
  console.log("");
  printProfiles();

  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question("Choose preset/profile [owned/team/overlay/minimal/wiki/decisions/full/adopt/refresh/custom]: ")).trim().toLowerCase();
    if (isPresetName(answer)) return { profile: presets[answer].profile, ownership: presets[answer].ownership };
    if (isProfileName(answer)) return { profile: answer };
    if (answer === "1") return { profile: "minimal" };
    if (answer === "2") return { profile: "wiki" };
    if (answer === "3") return { profile: "decisions" };
    if (answer === "4") return { profile: "full" };
    if (answer === "5") return { profile: "adopt" };
    if (answer === "6") return { profile: "refresh" };
    if (answer === "7") return { profile: "custom" };
    console.log("Unknown profile. Using refresh.");
    return { profile: "refresh" };
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

function readNamedArg(name: string, allowedValues: string[]): string | undefined {
  const exactIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  if (exactIndex >= 0) {
    const value = process.argv[exactIndex + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing --${name} value. Use one of: ${allowedValues.join(", ")}.`);
    }
    if (!allowedValues.includes(value)) {
      throw new Error(`Unknown --${name} value: ${value}. Use one of: ${allowedValues.join(", ")}.`);
    }
    return value;
  }

  const inlinePrefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(inlinePrefix));
  if (!inline) return undefined;

  const value = inline.slice(inlinePrefix.length);
  if (!value) {
    throw new Error(`Missing --${name} value. Use one of: ${allowedValues.join(", ")}.`);
  }
  if (!allowedValues.includes(value)) {
    throw new Error(`Unknown --${name} value: ${value}. Use one of: ${allowedValues.join(", ")}.`);
  }
  return value;
}

function readProfileArg(): ProfileName | undefined {
  return readNamedArg("profile", Object.keys(profiles)) as ProfileName | undefined;
}

function readOwnershipArg(): OwnershipMode | undefined {
  return readNamedArg("ownership", ["owned", "team", "external_overlay", "unknown"]) as OwnershipMode | undefined;
}

function readPresetArg(): PresetName | undefined {
  return readNamedArg("preset", Object.keys(presets)) as PresetName | undefined;
}

function resolveOwnershipMode(arg: OwnershipMode | undefined): OwnershipMode | undefined {
  if (arg) return arg;
  return readExistingOwnershipMode();
}

function readExistingOwnershipMode(): OwnershipMode | undefined {
  if (!pathExists("pom.config.json")) return undefined;
  try {
    const config = JSON.parse(readText("pom.config.json")) as Record<string, unknown>;
    const ownership = config.ownership;
    if (typeof ownership !== "object" || ownership === null) return undefined;
    const mode = (ownership as Record<string, unknown>).mode;
    return typeof mode === "string" && isOwnershipMode(mode) ? mode : undefined;
  } catch {
    return undefined;
  }
}

function isProfileName(value: string): value is ProfileName {
  return Object.prototype.hasOwnProperty.call(profiles, value);
}

function isPresetName(value: string): value is PresetName {
  return Object.prototype.hasOwnProperty.call(presets, value);
}

function isOwnershipMode(value: string): value is OwnershipMode {
  return ["owned", "team", "external_overlay", "unknown"].includes(value);
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
      throw new Error("Missing or unsupported --lang value. Use en or it.");
    }
    return normalized;
  }

  const envLanguage = process.env.POM_LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  return normalizeLanguage(envLanguage) || "en";
}

function printPresetGuide(): void {
  if (detectLanguage() === "it") {
    console.log("");
    console.log("POM richiede una modalita di adozione esplicita quando il setup non e interattivo.");
    console.log("");
    console.log("Usa uno di questi preset:");
    console.log("  npm run pom:init -- --preset owned     # progetto tuo");
    console.log("  npm run pom:init -- --preset team      # progetto condiviso/team");
    console.log("  npm run pom:init -- --preset overlay   # repository clonato di terzi");
    console.log("  npm run pom:init -- --preset minimal   # setup POM locale minimale");
    console.log("");
    console.log("Forma esplicita avanzata:");
    console.log("  npm run pom:init -- --profile adopt --ownership external_overlay");
    console.log("");
    return;
  }

  console.log("");
  console.log("POM needs an explicit adoption mode in non-interactive setup.");
  console.log("");
  console.log("Use one of these presets:");
  console.log("  npm run pom:init -- --preset owned     # project is yours");
  console.log("  npm run pom:init -- --preset team      # shared/team project");
  console.log("  npm run pom:init -- --preset overlay   # third-party cloned repo");
  console.log("  npm run pom:init -- --preset minimal   # minimal local POM setup");
  console.log("");
  console.log("Advanced explicit form:");
  console.log("  npm run pom:init -- --profile adopt --ownership external_overlay");
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

function pullPomIfGitRepo(): void {
  const pomGit = join(ROOT, "pom", ".git");
  if (!existsSync(pomGit)) return;

  console.log("Pulling latest POM changes...");
  try {
    execFileSync("git", ["-C", join(ROOT, "pom"), "checkout", "main"], { stdio: "pipe" });
  } catch {
    // may already be on main
  }
  try {
    execFileSync("git", ["-C", join(ROOT, "pom"), "pull", "origin", "main", "--ff-only"], { stdio: "inherit" });
  } catch {
    console.log("Warning: could not pull pom/. Continuing with existing version.");
  }
}

async function main(): Promise<void> {
  if (isPomRepositoryRoot()) {
    console.log("This appears to be the POM repository root.");
    console.log("pom:init is intended to run from a target project root where POM is installed as pom/.");
    console.log("Example: node --experimental-strip-types pom/scripts/install-pom.ts --profile minimal");
    return;
  }

  const presetName = readPresetArg();
  const profileArg = readProfileArg();
  const ownershipArg = readOwnershipArg();

  if (presetName && (profileArg || ownershipArg)) {
    throw new Error("Do not combine --preset with --profile or --ownership. Use either a preset or the explicit advanced form.");
  }

  const preset = presetName ? presets[presetName] : undefined;
  const selected = await chooseProfile(preset?.profile ?? profileArg);
  const profileName = selected.profile;
  const ownership = resolveOwnershipMode(preset?.ownership ?? ownershipArg ?? selected.ownership);
  const adoption = applyOwnershipDefaults(await customizeAdoption(profiles[profileName].adoption), ownership);

  if (adoption.profile === "refresh") {
    pullPomIfGitRepo();
  }

  upsertAgentInstructionSections(adoption);
  installCodingAgentFiles();
  installPomUpdateScript();
  upsertPackageScripts();
  installPreCommitHook();

  if (adoption.profile !== "refresh") {
    createOrUpdateConfig(adoption, ownership);
    createProfileFiles(adoption);
  } else {
    console.log("Refresh profile selected: pom.config.json and governance folders were not changed.");
  }

  console.log("POM init complete.");
}

function applyOwnershipDefaults(adoption: AdoptionConfig, ownership: OwnershipMode | undefined): AdoptionConfig {
  if (ownership !== "external_overlay") return adoption;

  return {
    ...adoption,
    decisions: "disabled",
    docs: "disabled",
    tests: "disabled",
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
