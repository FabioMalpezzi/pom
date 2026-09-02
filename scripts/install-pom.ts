#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import {
  CLAUDE_AGENT_TEMPLATES,
  DIRECTORY_AGENT_INSTRUCTION_TARGETS,
  EXISTING_AGENT_INSTRUCTION_FILES,
  FALLBACK_AGENT_INSTRUCTION_FILE,
} from "./lib/install-agent-targets.ts";
import { chooseProfile, customizeAdoption, readNoPullArg, readOwnershipArg, readPresetArg, readProfileArg } from "./lib/install-cli.ts";
import { pullPomIfGitRepo } from "./lib/install-git.ts";
import { isPomSourceRoot } from "./lib/pom-source.mjs";
import { configuredPath, defaultDecisionIndexPath, escapeRegex, isRecord } from "./lib/install-helpers.ts";
import { installPreCommitHook } from "./lib/install-hook.ts";
import {
  isOwnershipMode,
  isProfileName,
  presets,
  profiles,
  type AdoptionConfig,
  type GitContext,
  type OwnershipConfig,
  type OwnershipMode,
  type PackageJson,
  type PresetName,
  type ProfileName,
  type ProjectConfig,
} from "./lib/install-model.ts";

const ROOT = process.cwd();
const START_MARKER = "<!-- POM:START -->";
const END_MARKER = "<!-- POM:END -->";
const TODAY = new Date().toISOString().slice(0, 10);

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

function resolveRootPath(path: string): string {
  return isAbsolute(path) ? path : join(ROOT, path);
}

function runGit(args: string[]): string | undefined {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return undefined;
  }
}

function getGitContext(): GitContext {
  const inside = runGit(["rev-parse", "--is-inside-work-tree"]);
  if (inside !== "true") {
    return { insideWorkTree: false, isProjectRoot: false };
  }

  const topLevel = runGit(["rev-parse", "--show-toplevel"]);
  const isProjectRoot = topLevel ? resolve(topLevel) === resolve(ROOT) : false;
  return { insideWorkTree: true, topLevel, isProjectRoot };
}

function ensureGitRepository(): GitContext {
  const current = getGitContext();
  if (current.insideWorkTree) {
    if (!current.isProjectRoot && current.topLevel) {
      console.log(`Target project root is inside an existing Git worktree at ${current.topLevel}.`);
      console.log("POM will not create a nested Git repository or install a pre-commit hook automatically from this subdirectory.");
    }
    return current;
  }

  execFileSync("git", ["init"], { cwd: ROOT, stdio: "pipe" });
  console.log("Initialized Git repository in the target project root.");
  return getGitContext();
}

function ensureDir(path: string): void {
  mkdirSync(join(ROOT, path), { recursive: true });
}

function copyTemplateIfMissing(templatePath: string, targetPath: string, transform: (text: string) => string = (text) => text): void {
  if (pathExists(targetPath)) {
    console.log(`${targetPath} already exists, skipped.`);
    return;
  }
  const text = transform(readText(templatePath).replaceAll("YYYY-MM-DD", TODAY));
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

/**
 * Resolves a POM script path for `package.json`: the installed `pom/` copy
 * wins, the POM Source layout is the fallback, and the `pom/` form is kept as
 * the expected value when neither exists yet.
 */
function resolvePomScript(relativePath: string): string {
  const installed = `pom/${relativePath}`;
  if (pathExists(installed)) return installed;
  if (pathExists(relativePath)) return relativePath;
  return installed;
}

/** The `pom:*` scripts every target project gets, in the order they are documented. */
function expectedPomScripts(): Record<string, string> {
  const tsScript = (path: string) => `node --experimental-strip-types ${resolvePomScript(path)}`;
  const jsScript = (path: string) => `node ${resolvePomScript(path)}`;
  return {
    "pom:init": tsScript("scripts/install-pom.ts"),
    "pom:update": "node pom-update.mjs",
    "pom:help": tsScript("scripts/pom-help.ts"),
    "pom:lint": tsScript("scripts/lint-doc-governance.ts"),
    "pom:reader": jsScript("scripts/project-reader/server.mjs"),
    "pom:wiki:render": jsScript("scripts/render-wiki.mjs"),
    "pom:workflow:lint": jsScript("scripts/lint-workflows.mjs"),
    "pom:workflow:mermaid": jsScript("scripts/to-mermaid.mjs"),
    "pom:workflow:xstate": jsScript("scripts/to-xstate.mjs"),
    "pom:tandem": jsScript("scripts/tandem.mjs"),
  };
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

  const hasRestartMemory =
    adoption.profile === "full" || (adoption.profile === "custom" && adoption.planning === "structured");
  const hasGovernedDocuments =
    adoption.wiki === "enabled" ||
    adoption.decisions === "enabled" ||
    adoption.planning === "structured" ||
    adoption.tasks === "structured" ||
    adoption.docs === "enabled" ||
    adoption.mockups === "enabled";

  const modules: Array<{ file: string; condition: boolean }> = [
    { file: "00-core.md", condition: true },
    { file: "10-wiki.md", condition: adoption.wiki === "enabled" },
    { file: "20-decisions.md", condition: adoption.decisions === "enabled" },
    { file: "30-planning.md", condition: adoption.planning === "structured" || adoption.tasks === "structured" },
    { file: "40-handoff.md", condition: hasRestartMemory },
    { file: "50-templates.md", condition: hasGovernedDocuments },
    { file: "60-skills.md", condition: true },
    { file: "70-experiments.md", condition: adoption.analysis === "enabled" },
    { file: "80-docs-source.md", condition: adoption.docs === "enabled" },
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

function buildPomInitCommand(presetName: PresetName | undefined, profileName: ProfileName, ownership: OwnershipMode | undefined): string {
  if (presetName) return `npm run pom:init -- --preset ${presetName}`;

  const args = [`--profile ${profileName}`];
  if (ownership) args.push(`--ownership ${ownership}`);
  return `npm run pom:init -- ${args.join(" ")}`;
}

function installCodingAgentFiles(rerunCommand: string): void {
  installClaudeAgentFiles(rerunCommand);
}

function installClaudeAgentFiles(rerunCommand: string): void {
  const shouldInstall = pathIsDirectory(".claude") || pathIsDirectory(".claude/agents");
  if (!shouldInstall) {
    console.log("Optional Claude Code agent files not installed: .claude/ not found.");
    console.log("To enable them, run:");
    console.log("  mkdir -p .claude");
    console.log(`  ${rerunCommand}`);
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
  const expectedScripts = expectedPomScripts();
  if (!pathExists(packagePath)) {
    const content: PackageJson = { private: true, type: "module", scripts: expectedScripts };
    writeText(packagePath, `${JSON.stringify(content, null, 2)}\n`);
    console.log(`Created package.json with ${Object.keys(expectedScripts).join(", ")}.`);
    return;
  }

  let parsed: PackageJson;
  try {
    parsed = JSON.parse(readText(packagePath)) as PackageJson;
  } catch (error) {
    throw new Error(`package.json is not valid JSON: ${String(error)}`);
  }

  const scripts = { ...(parsed.scripts ?? {}) };
  let changed = false;
  for (const [name, expected] of Object.entries(expectedScripts)) {
    if (!scripts[name]) {
      scripts[name] = expected;
      changed = true;
      continue;
    }
    if (scripts[name] !== expected) {
      // Avoid clobbering project-specific script overrides. Warn so the user/agent
      // can decide whether the deviation is intentional or a stale install.
      console.log(`Warning: package.json script "${name}" differs from the POM default.`);
      console.log(`  current:  ${scripts[name]}`);
      console.log(`  expected: ${expected}`);
    }
  }

  if (!changed) {
    console.log(`package.json already contains ${Object.keys(expectedScripts).join(", ")}.`);
    return;
  }

  parsed.scripts = scripts;
  writeText(packagePath, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log(`Updated package.json with ${Object.keys(expectedScripts).filter((name) => scripts[name] === expectedScripts[name]).join(", ")}.`);
}

function createOrUpdateConfig(adoption: AdoptionConfig, ownership: OwnershipMode | undefined): ProjectConfig {
  const configPath = "pom.config.json";
  if (!pathExists(configPath)) {
    const template = JSON.parse(readText(resolveTemplate("POM_CONFIG_TEMPLATE.json"))) as Record<string, unknown>;
    template.ownership = ownershipConfig(ownership);
    template.adoption = adoption;
    alignDecisionDefaults(template);
    writeText(configPath, `${JSON.stringify(template, null, 2)}\n`);
    console.log(`Created ${configPath} with ${adoption.profile} adoption profile.`);
    return template;
  }

  const config = readRequiredProjectConfig(configPath);
  if (ownership) {
    config.ownership = ownershipConfig(ownership, config.ownership);
  } else if (!config.ownership) {
    config.ownership = ownershipConfig(undefined);
  }
  config.adoption = adoption;
  alignDecisionDefaults(config);

  // Rewrite only when something changed, so a rerun with the same mode does
  // not touch the file or claim an update it did not make.
  const next = `${JSON.stringify(config, null, 2)}\n`;
  if (next === readText(configPath)) {
    console.log(`${configPath} already has the ${adoption.profile} adoption profile.`);
    return config;
  }
  writeText(configPath, next);
  console.log(`Updated ${configPath} adoption profile to ${adoption.profile}.`);
  return config;
}

function readProjectConfigIfPresent(): ProjectConfig {
  if (!pathExists("pom.config.json")) return {};
  try {
    const parsed = JSON.parse(readText("pom.config.json"));
    if (!isRecord(parsed)) throw new Error("pom.config.json must contain a JSON object.");
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read pom.config.json: ${message}`);
  }
}

function readAdoptionFromConfig(config: ProjectConfig): AdoptionConfig | undefined {
  if (!isRecord(config.adoption)) return undefined;

  const raw = config.adoption;
  const defaultProfile = profiles.minimal.adoption.profile;
  const profile = typeof raw.profile === "string" && isProfileName(raw.profile) ? raw.profile : defaultProfile;
  const base = profiles[profile].adoption;

  return {
    profile,
    wiki: enumValue(raw.wiki, ["enabled", "disabled"], base.wiki),
    decisions: enumValue(raw.decisions, ["enabled", "disabled"], base.decisions),
    analysis: enumValue(raw.analysis, ["enabled", "optional", "disabled"], base.analysis),
    docs: enumValue(raw.docs, ["enabled", "optional", "disabled"], base.docs),
    mockups: enumValue(raw.mockups, ["enabled", "disabled"], base.mockups),
    planning: enumValue(raw.planning, ["light", "structured"], base.planning),
    tasks: enumValue(raw.tasks, ["light", "structured"], base.tasks),
    tests: enumValue(raw.tests, ["disabled", "existing", "pom"], base.tests),
  };
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function readRequiredProjectConfig(path: string): ProjectConfig {
  const parsed = JSON.parse(readText(path));
  if (!isRecord(parsed)) throw new Error(`${path} must contain a JSON object.`);
  return parsed;
}

function alignDecisionDefaults(config: ProjectConfig): void {
  if (!isRecord(config.decisions)) return;
  const root = configuredPath(config, "decisions.root", "decisions");
  if (root === "decisions") return;

  const defaultPattern = String.raw`^decisions/ADR-\d{4}-.+\.md$`;
  if (typeof config.decisions.adrPathPattern !== "string" || config.decisions.adrPathPattern === defaultPattern) {
    config.decisions.adrPathPattern = `^${escapeRegex(root)}/ADR-\\d{4}-.+\\.md$`;
  }
  if (
    typeof config.decisions.indexPath !== "string" ||
    config.decisions.indexPath === "decisions/DECISIONS_INDEX.md"
  ) {
    config.decisions.indexPath = defaultDecisionIndexPath(root);
  }
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

function createProfileFiles(adoption: AdoptionConfig, config: ProjectConfig): void {
  if (adoption.wiki === "enabled") {
    const wikiRoot = configuredPath(config, "wiki.root", "wiki");
    ensureDir(wikiRoot);
    console.log(`Ensured ${wikiRoot}/ exists.`);
    copyTemplateIfMissing(resolveTemplate("WIKI_INDEX_TEMPLATE.md"), `${wikiRoot}/index.md`);
    copyTemplateIfMissing(resolveTemplate("WIKI_LOG_TEMPLATE.md"), `${wikiRoot}/log.md`);
    copyTemplateIfMissing(resolveTemplate("WIKI_READER_SHORTCUT.html"), "wiki.html", (text) =>
      text.replaceAll("wiki/_site/", `${wikiRoot}/_site/`),
    );
    createWikiOverviewIfMissing(wikiRoot);
  }
  if (adoption.decisions === "enabled") {
    const decisionsRoot = configuredPath(config, "decisions.root", "decisions");
    ensureDir(decisionsRoot);
    console.log(`Ensured ${decisionsRoot}/ exists.`);
  }

  if (adoption.mockups === "enabled") {
    const packagesDir = configuredPath(config, "mockups.packagesDir", "mockups/packages");
    ensureDir(packagesDir);
    console.log(`Ensured ${packagesDir}/ exists.`);
  }

  if (adoption.profile === "full" || (adoption.profile === "custom" && adoption.planning === "structured")) {
    copyTemplateIfMissing(resolveTemplate("PROJECT_STATE_TEMPLATE.md"), configuredPath(config, "handoff.projectStatePath", "PROJECT_STATE.md"));
    copyTemplateIfMissing(resolveTemplate("CURRENT_PLAN_TEMPLATE.md"), configuredPath(config, "handoff.currentPlanPath", "CURRENT_PLAN.md"));
  }
}

function createWikiOverviewIfMissing(wikiRoot: string): void {
  const overviewPath = `${wikiRoot}/overview.md`;
  if (pathExists(overviewPath)) return;

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

  writeText(overviewPath, content);
  console.log(`Created ${overviewPath}.`);
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

function isPomRepositoryRoot(): boolean {
  return isPomSourceRoot(ROOT) && !pathExists("pom");
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
  let projectConfig = readProjectConfigIfPresent();
  const instructionAdoption =
    adoption.profile === "refresh" ? readAdoptionFromConfig(projectConfig) ?? adoption : adoption;

  ensureGitRepository();

  // pom-update.mjs pulls pom/ itself and passes --no-pull, so the refresh does
  // not fetch twice.
  if (adoption.profile === "refresh" && !readNoPullArg()) {
    pullPomIfGitRepo(ROOT);
  }

  upsertAgentInstructionSections(instructionAdoption);
  installCodingAgentFiles(buildPomInitCommand(presetName, profileName, ownership));
  installPomUpdateScript();
  upsertPackageScripts();

  if (adoption.profile !== "refresh") {
    projectConfig = createOrUpdateConfig(adoption, ownership);
    createProfileFiles(adoption, projectConfig);
  } else {
    console.log("Refresh profile selected: pom.config.json and governance folders were not changed.");
  }

  installPreCommitHook({ root: ROOT, config: projectConfig, gitContext: getGitContext(), runGit });

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
