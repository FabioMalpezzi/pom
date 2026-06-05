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
import { chooseProfile, customizeAdoption, readOwnershipArg, readPresetArg, readProfileArg } from "./lib/install-cli.ts";
import { pullPomIfGitRepo } from "./lib/install-git.ts";
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
const HOOK_START_MARKER = "# POM:START pre-commit";
const HOOK_END_MARKER = "# POM:END pre-commit";
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

function resolveProjectReaderScript(): string {
  if (pathExists("pom/scripts/project-reader/server.mjs")) return "pom/scripts/project-reader/server.mjs";
  if (pathExists("scripts/project-reader/server.mjs")) return "scripts/project-reader/server.mjs";
  return "pom/scripts/project-reader/server.mjs";
}

function resolveWorkflowLintScript(): string {
  if (pathExists("pom/scripts/lint-workflows.mjs")) return "pom/scripts/lint-workflows.mjs";
  if (pathExists("scripts/lint-workflows.mjs")) return "scripts/lint-workflows.mjs";
  return "pom/scripts/lint-workflows.mjs";
}

function resolveWorkflowMermaidScript(): string {
  if (pathExists("pom/scripts/to-mermaid.mjs")) return "pom/scripts/to-mermaid.mjs";
  if (pathExists("scripts/to-mermaid.mjs")) return "scripts/to-mermaid.mjs";
  return "pom/scripts/to-mermaid.mjs";
}

function resolveWorkflowXstateScript(): string {
  if (pathExists("pom/scripts/to-xstate.mjs")) return "pom/scripts/to-xstate.mjs";
  if (pathExists("scripts/to-xstate.mjs")) return "scripts/to-xstate.mjs";
  return "pom/scripts/to-xstate.mjs";
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
  if (!pathExists(packagePath)) {
    const lintScript = resolveLintScript();
    const helpScript = resolveHelpScript();
    const wikiRenderScript = resolveWikiRenderScript();
    const projectReaderScript = resolveProjectReaderScript();
    const workflowLintScript = resolveWorkflowLintScript();
    const workflowMermaidScript = resolveWorkflowMermaidScript();
    const workflowXstateScript = resolveWorkflowXstateScript();
    const content: PackageJson = {
      private: true,
      type: "module",
      scripts: {
        "pom:init": "node --experimental-strip-types pom/scripts/install-pom.ts",
        "pom:update": "node pom-update.mjs",
        "pom:help": `node --experimental-strip-types ${helpScript}`,
        "pom:lint": `node --experimental-strip-types ${lintScript}`,
        "pom:reader": `node ${projectReaderScript}`,
        "pom:wiki:render": `node ${wikiRenderScript}`,
        "pom:workflow:lint": `node ${workflowLintScript}`,
        "pom:workflow:mermaid": `node ${workflowMermaidScript}`,
        "pom:workflow:xstate": `node ${workflowXstateScript}`,
      },
    };
    writeText(packagePath, `${JSON.stringify(content, null, 2)}\n`);
    console.log("Created package.json with pom:init, pom:update, pom:help, pom:lint, pom:reader, pom:wiki:render, and pom:workflow:* scripts.");
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
  const projectReaderScript = resolveProjectReaderScript();
  const workflowLintScript = resolveWorkflowLintScript();
  const workflowMermaidScript = resolveWorkflowMermaidScript();
  const workflowXstateScript = resolveWorkflowXstateScript();
  const initCommand = pathExists("pom/scripts/install-pom.ts")
    ? "node --experimental-strip-types pom/scripts/install-pom.ts"
    : "node --experimental-strip-types scripts/install-pom.ts";

  const expectedScripts: Record<string, string> = {
    "pom:init": initCommand,
    "pom:update": "node pom-update.mjs",
    "pom:help": `node --experimental-strip-types ${helpScript}`,
    "pom:lint": `node --experimental-strip-types ${lintScript}`,
    "pom:reader": `node ${projectReaderScript}`,
    "pom:wiki:render": `node ${wikiRenderScript}`,
    "pom:workflow:lint": `node ${workflowLintScript}`,
    "pom:workflow:mermaid": `node ${workflowMermaidScript}`,
    "pom:workflow:xstate": `node ${workflowXstateScript}`,
  };

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
    console.log("package.json already contains pom:init, pom:update, pom:help, pom:lint, pom:reader, and pom:wiki:render.");
    return;
  }

  parsed.scripts = scripts;
  writeText(packagePath, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log("Updated package.json with pom:init, pom:update, pom:help, pom:lint, pom:reader, and pom:wiki:render scripts.");
}

function installPreCommitHook(config: ProjectConfig): void {
  const gitContext = getGitContext();
  if (!gitContext.insideWorkTree) {
    console.log("Git hooks not installed: target project is not in a Git worktree.");
    return;
  }
  if (!gitContext.isProjectRoot) {
    console.log("Git hook not installed automatically: target project root is not the Git worktree root.");
    return;
  }

  const hookGitPath = runGit(["rev-parse", "--git-path", "hooks/pre-commit"]);
  if (!hookGitPath) {
    console.log("Git hook not installed automatically: could not resolve the Git hook path.");
    return;
  }

  const hookPath = resolveRootPath(hookGitPath);
  mkdirSync(dirname(hookPath), { recursive: true });
  const current = existsSync(hookPath) ? readFileSync(hookPath, "utf8") : "#!/bin/sh\n";
  const governedPathArgs = governedMemoryPaths(config).map(shellQuote).join(" ");
  const projectStatePath = shellQuote(configuredPath(config, "handoff.projectStatePath", "PROJECT_STATE.md"));
  const hookBlock = `${HOOK_START_MARKER}
echo "POM pre-commit: running npm run pom:lint"
npm run pom:lint
pom_lint_status=$?
if [ "$pom_lint_status" -ne 0 ]; then
  echo "POM pre-commit: pom:lint failed. Fix findings and rerun npm run pom:lint."
  exit "$pom_lint_status"
fi

if [ -f ${projectStatePath} ]; then
  pom_changed="$(git diff --cached --name-only -- ${governedPathArgs} 2>/dev/null)"
  pom_state_changed="$(git diff --cached --name-only -- ${projectStatePath} 2>/dev/null)"
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
    writeFileSync(hookPath, next);
    chmodSync(hookPath, 0o755);
    console.log("Installed or updated Git pre-commit hook with POM checks.");
  } else {
    chmodSync(hookPath, 0o755);
    console.log("Git pre-commit hook already contains the current POM block.");
  }
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
  writeText(configPath, `${JSON.stringify(config, null, 2)}\n`);
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

function configuredPath(config: ProjectConfig, path: string, fallback: string): string {
  const value = configString(config, path, fallback);
  const normalized = value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalized || normalized === "." || normalized.includes("../") || normalized.startsWith("..")) return fallback;
  return normalized;
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

function defaultDecisionIndexPath(root: string): string {
  const folderName = root.split("/").filter(Boolean).at(-1) || "decisions";
  return `${root}/${folderName.toUpperCase()}_INDEX.md`;
}

function configString(config: ProjectConfig, path: string, fallback: string): string {
  const value = path.split(".").reduce<unknown>((current, part) => {
    if (!isRecord(current)) return undefined;
    return current[part];
  }, config);
  return typeof value === "string" ? value : fallback;
}

function governedMemoryPaths(config: ProjectConfig): string[] {
  const paths = [
    "wiki",
    configuredPath(config, "decisions.root", "decisions"),
    configuredPath(config, "documentation.officialRoot", "docs"),
    configuredPath(config, "analysis.root", "analysis"),
    firstPathSegment(configuredPath(config, "mockups.packagesDir", "mockups/packages")),
    configuredPath(config, "taskPlans.root", "tasks"),
    "pom.config.json",
    "CURRENT_PLAN.md",
    "specs",
  ];
  return [...new Set(paths.filter(Boolean))];
}

function firstPathSegment(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? path;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    ensureDir("wiki");
    console.log("Ensured wiki/ exists.");
    copyTemplateIfMissing(resolveTemplate("WIKI_INDEX_TEMPLATE.md"), "wiki/index.md");
    copyTemplateIfMissing(resolveTemplate("WIKI_LOG_TEMPLATE.md"), "wiki/log.md");
    copyTemplateIfMissing(resolveTemplate("WIKI_READER_SHORTCUT.html"), "wiki.html");
    createWikiOverviewIfMissing();
  }
  if (adoption.decisions === "enabled") {
    const decisionsRoot = configuredPath(config, "decisions.root", "decisions");
    ensureDir(decisionsRoot);
    console.log(`Ensured ${decisionsRoot}/ exists.`);
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

  if (adoption.profile === "refresh") {
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

  installPreCommitHook(projectConfig);

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
