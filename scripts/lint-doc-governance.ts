#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

type Severity = "error" | "warning";

type Finding = {
  severity: Severity;
  rule: string;
  message: string;
  file?: string;
};

const ROOT = process.cwd();
const ADR_INDEX_SUMMARY_MAX_LENGTH = 250;

const findings: Finding[] = [];

type LintConfig = {
  adoption: {
    profile: string;
    wiki: string;
    decisions: string;
    analysis: string;
    docs: string;
    mockups: string;
    planning: string;
    tasks: string;
    tests: string;
  };
  root: {
    allowedMarkdown: string[];
  };
  analysis: {
    allowedDirs: string[];
    allowMarkdownAtRoot: boolean;
  };
  templates: Record<string, string>;
  documentation: {
    officialRoot: string;
    existingRoots: string[];
    knownRootCandidates: string[];
    preferExistingStructure: boolean;
    requireApprovalBeforeMigratingDocs: boolean;
    severity: Severity;
  };
  source: {
    roots: string[];
    knownRootCandidates: string[];
    preferExistingStructure: boolean;
    requireApprovalBeforeMigratingSources: boolean;
    severity: Severity;
  };
  wiki: {
    baseIndexSections: string[];
    categorySections: Record<string, string[]>;
    projectIndexSections: string[];
    logEntryPattern: string;
    minPageLength: number;
  };
  decisions: {
    root: string;
    adrPathPattern: string;
    datePattern: string;
    indexPath: string;
    categoryField: string;
    areaField: string;
    requireTemplateSections: boolean;
  };
  taskPlans: {
    root: string;
    taskPathPattern: string;
    indexPath: string;
    requireTemplateSections: boolean;
  };
  mockups: {
    packagesDir: string;
    manifestName: string;
    manifestTypePattern: string;
    manifestDatePattern: string;
    reconciliationSearchDir: string;
    reconciliationFilePattern: string;
    skipReconciliationText: string;
  };
  tests: {
    root: string;
    areas: string[];
    recommendedLayout: string[];
    crossSystemDir: string;
    preferExistingStructure: boolean;
    requireApprovalBeforeMigratingExistingTests: boolean;
    severity: Severity;
  };
  handoff: {
    projectStatePath: string;
    severity: Severity;
    maxLines: number;
    triggerPaths: string[];
    forbiddenHeadings: string[];
  };
};

const defaultConfig: LintConfig = {
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
  root: {
    allowedMarkdown: [
      "README.md",
      "AGENTS.md",
      "AGENTS.MD",
      "agents.md",
      "CLAUDE.md",
      "GEMINI.md",
      "CONVENTIONS.md",
      "PROJECT_STATE.md",
      "CURRENT_PLAN.md",
      "WIKI_METHOD.md",
    ],
  },
  analysis: {
    allowedDirs: [],
    allowMarkdownAtRoot: false,
  },
  templates: {
    adr: "pom/templates/ADR_TEMPLATE.md",
    currentPlan: "pom/templates/CURRENT_PLAN_TEMPLATE.md",
    doc: "pom/templates/DOC_TEMPLATE.md",
    experiment: "pom/templates/EXPERIMENT_TEMPLATE.md",
    mockManifest: "pom/templates/MOCK_MANIFEST_TEMPLATE.md",
    reconciliation: "pom/templates/RECONCILIATION_TEMPLATE.md",
    taskPlan: "pom/templates/TASK_PLAN_TEMPLATE.md",
    wikiIndex: "pom/templates/WIKI_INDEX_TEMPLATE.md",
    wikiLog: "pom/templates/WIKI_LOG_TEMPLATE.md",
    wikiPage: "pom/templates/WIKI_PAGE_TEMPLATE.md",
  },
  documentation: {
    officialRoot: "docs",
    existingRoots: [],
    knownRootCandidates: ["docs", "doc"],
    preferExistingStructure: true,
    requireApprovalBeforeMigratingDocs: true,
    severity: "warning",
  },
  source: {
    roots: [],
    knownRootCandidates: ["src", "apps", "packages", "services", "frontend", "backend"],
    preferExistingStructure: true,
    requireApprovalBeforeMigratingSources: true,
    severity: "warning",
  },
  wiki: {
    baseIndexSections: ["## Overview"],
    categorySections: {},
    projectIndexSections: [],
    logEntryPattern: String.raw`^## \[\d{4}-\d{2}-\d{2}\] [a-z0-9_-]+ \| .+`,
    minPageLength: 120,
  },
  decisions: {
    root: "decisions",
    adrPathPattern: String.raw`^decisions/ADR-\d{4}-.+\.md$`,
    datePattern: String.raw`\| Date \|\s*\d{4}-\d{2}-\d{2}\s*\|`,
    indexPath: "decisions/ADR_INDEX.md",
    categoryField: "Category",
    areaField: "Area",
    requireTemplateSections: true,
  },
  taskPlans: {
    root: "tasks",
    taskPathPattern: String.raw`^tasks/.+\.md$`,
    indexPath: "tasks/README.md",
    requireTemplateSections: false,
  },
  mockups: {
    packagesDir: "mockups/packages",
    manifestName: "MOCK_MANIFEST.md",
    manifestTypePattern: String.raw`## Type\s+[\s\S]*?(Complete|Partial)`,
    manifestDatePattern: String.raw`## Date\s+[\s\S]*?\d{4}-\d{2}-\d{2}`,
    reconciliationSearchDir: "analysis",
    reconciliationFilePattern: String.raw`mock.*reconciliation.*\.md$`,
    skipReconciliationText: "Does not require functional reconciliation",
  },
  tests: {
    root: "tests",
    areas: [],
    recommendedLayout: ["e2e", "integration", "fixtures", "evidence"],
    crossSystemDir: "cross-system",
    preferExistingStructure: true,
    requireApprovalBeforeMigratingExistingTests: true,
    severity: "warning",
  },
  handoff: {
    projectStatePath: "PROJECT_STATE.md",
    severity: "warning",
    maxLines: 180,
    triggerPaths: [],
    forbiddenHeadings: ["## Log", "## Timeline", "## Changelog", "## History"],
  },
};

const config = loadConfig();
const allowedRootMarkdown = new Set(config.root.allowedMarkdown);
const allowedAnalysisDirs = new Set(config.analysis.allowedDirs);

const templatePaths = {
  adr: "pom/templates/ADR_TEMPLATE.md",
  currentPlan: "pom/templates/CURRENT_PLAN_TEMPLATE.md",
  doc: "pom/templates/DOC_TEMPLATE.md",
  experiment: "pom/templates/EXPERIMENT_TEMPLATE.md",
  mockManifest: "pom/templates/MOCK_MANIFEST_TEMPLATE.md",
  reconciliation: "pom/templates/RECONCILIATION_TEMPLATE.md",
  taskPlan: "pom/templates/TASK_PLAN_TEMPLATE.md",
  wikiIndex: "pom/templates/WIKI_INDEX_TEMPLATE.md",
  wikiLog: "pom/templates/WIKI_LOG_TEMPLATE.md",
  wikiPage: "pom/templates/WIKI_PAGE_TEMPLATE.md",
  ...config.templates,
};

const requiredAdrSections = sectionsFromTemplate(templatePaths.adr);
const requiredDocsSections = sectionsFromTemplate(templatePaths.doc);
const requiredMockManifestSections = sectionsFromTemplate(templatePaths.mockManifest);
const requiredTaskPlanSections = sectionsFromTemplate(templatePaths.taskPlan);

const wikiCategorySections = config.wiki.categorySections;

function add(severity: Severity, rule: string, message: string, file?: string): void {
  findings.push({ severity, rule, message, file });
}

function loadConfig(): LintConfig {
  const configPath = join(ROOT, "pom.config.json");
  if (!existsSync(configPath)) return defaultConfig;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    add("error", "config-invalid", `pom.config.json is not valid JSON: ${String(error)}`, "pom.config.json");
    return defaultConfig;
  }

  if (!isRecord(parsed)) {
    add("error", "config-invalid", "pom.config.json must contain a JSON object.", "pom.config.json");
    return defaultConfig;
  }

  const merged = mergeConfig(defaultConfig, parsed);
  validateConfig(merged);
  return merged;
}

function mergeConfig(base: LintConfig, raw: Record<string, unknown>): LintConfig {
  return {
    adoption: {
      profile: readString(raw, "adoption.profile", base.adoption.profile),
      wiki: readString(raw, "adoption.wiki", base.adoption.wiki),
      decisions: readString(raw, "adoption.decisions", base.adoption.decisions),
      analysis: readString(raw, "adoption.analysis", base.adoption.analysis),
      docs: readString(raw, "adoption.docs", base.adoption.docs),
      mockups: readString(raw, "adoption.mockups", base.adoption.mockups),
      planning: readString(raw, "adoption.planning", base.adoption.planning),
      tasks: readString(raw, "adoption.tasks", base.adoption.tasks),
      tests: readString(raw, "adoption.tests", base.adoption.tests),
    },
    root: {
      allowedMarkdown: readStringArray(raw, "root.allowedMarkdown", base.root.allowedMarkdown),
    },
    analysis: {
      allowedDirs: readStringArray(raw, "analysis.allowedDirs", base.analysis.allowedDirs),
      allowMarkdownAtRoot: readBoolean(raw, "analysis.allowMarkdownAtRoot", base.analysis.allowMarkdownAtRoot),
    },
    templates: readStringRecord(raw, "templates", base.templates),
    documentation: {
      officialRoot: readString(raw, "documentation.officialRoot", base.documentation.officialRoot),
      existingRoots: readStringArray(raw, "documentation.existingRoots", base.documentation.existingRoots),
      knownRootCandidates: readStringArray(
        raw,
        "documentation.knownRootCandidates",
        base.documentation.knownRootCandidates,
      ),
      preferExistingStructure: readBoolean(
        raw,
        "documentation.preferExistingStructure",
        base.documentation.preferExistingStructure,
      ),
      requireApprovalBeforeMigratingDocs: readBoolean(
        raw,
        "documentation.requireApprovalBeforeMigratingDocs",
        base.documentation.requireApprovalBeforeMigratingDocs,
      ),
      severity: readSeverity(raw, "documentation.severity", base.documentation.severity),
    },
    source: {
      roots: readStringArray(raw, "source.roots", base.source.roots),
      knownRootCandidates: readStringArray(raw, "source.knownRootCandidates", base.source.knownRootCandidates),
      preferExistingStructure: readBoolean(raw, "source.preferExistingStructure", base.source.preferExistingStructure),
      requireApprovalBeforeMigratingSources: readBoolean(
        raw,
        "source.requireApprovalBeforeMigratingSources",
        base.source.requireApprovalBeforeMigratingSources,
      ),
      severity: readSeverity(raw, "source.severity", base.source.severity),
    },
    wiki: {
      baseIndexSections: readStringArray(raw, "wiki.baseIndexSections", base.wiki.baseIndexSections),
      categorySections: readStringArrayRecord(raw, "wiki.categorySections", base.wiki.categorySections),
      projectIndexSections: readStringArray(raw, "wiki.projectIndexSections", base.wiki.projectIndexSections),
      logEntryPattern: readString(raw, "wiki.logEntryPattern", base.wiki.logEntryPattern),
      minPageLength: readNumber(raw, "wiki.minPageLength", base.wiki.minPageLength),
    },
    decisions: {
      root: readString(raw, "decisions.root", base.decisions.root),
      adrPathPattern: readString(raw, "decisions.adrPathPattern", base.decisions.adrPathPattern),
      datePattern: readString(raw, "decisions.datePattern", base.decisions.datePattern),
      indexPath: readString(raw, "decisions.indexPath", base.decisions.indexPath),
      categoryField: readString(raw, "decisions.categoryField", base.decisions.categoryField),
      areaField: readString(raw, "decisions.areaField", base.decisions.areaField),
      requireTemplateSections: readBoolean(
        raw,
        "decisions.requireTemplateSections",
        base.decisions.requireTemplateSections,
      ),
    },
    taskPlans: {
      root: readString(raw, "taskPlans.root", base.taskPlans.root),
      taskPathPattern: readString(raw, "taskPlans.taskPathPattern", base.taskPlans.taskPathPattern),
      indexPath: readString(raw, "taskPlans.indexPath", base.taskPlans.indexPath),
      requireTemplateSections: readBoolean(
        raw,
        "taskPlans.requireTemplateSections",
        base.taskPlans.requireTemplateSections,
      ),
    },
    mockups: {
      packagesDir: readString(raw, "mockups.packagesDir", base.mockups.packagesDir),
      manifestName: readString(raw, "mockups.manifestName", base.mockups.manifestName),
      manifestTypePattern: readString(raw, "mockups.manifestTypePattern", base.mockups.manifestTypePattern),
      manifestDatePattern: readString(raw, "mockups.manifestDatePattern", base.mockups.manifestDatePattern),
      reconciliationSearchDir: readString(raw, "mockups.reconciliationSearchDir", base.mockups.reconciliationSearchDir),
      reconciliationFilePattern: readString(raw, "mockups.reconciliationFilePattern", base.mockups.reconciliationFilePattern),
      skipReconciliationText: readString(raw, "mockups.skipReconciliationText", base.mockups.skipReconciliationText),
    },
    tests: {
      root: readString(raw, "tests.root", base.tests.root),
      areas: readStringArray(raw, "tests.areas", base.tests.areas),
      recommendedLayout: readStringArray(raw, "tests.recommendedLayout", base.tests.recommendedLayout),
      crossSystemDir: readString(raw, "tests.crossSystemDir", base.tests.crossSystemDir),
      preferExistingStructure: readBoolean(raw, "tests.preferExistingStructure", base.tests.preferExistingStructure),
      requireApprovalBeforeMigratingExistingTests: readBoolean(
        raw,
        "tests.requireApprovalBeforeMigratingExistingTests",
        base.tests.requireApprovalBeforeMigratingExistingTests,
      ),
      severity: readSeverity(raw, "tests.severity", base.tests.severity),
    },
    handoff: {
      projectStatePath: readString(raw, "handoff.projectStatePath", base.handoff.projectStatePath),
      severity: readSeverity(raw, "handoff.severity", base.handoff.severity),
      maxLines: readNumber(raw, "handoff.maxLines", base.handoff.maxLines),
      triggerPaths: readStringArray(raw, "handoff.triggerPaths", base.handoff.triggerPaths),
      forbiddenHeadings: readStringArray(raw, "handoff.forbiddenHeadings", base.handoff.forbiddenHeadings),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPath(root: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!isRecord(current)) return undefined;
    return current[part];
  }, root);
}

function readString(root: Record<string, unknown>, path: string, fallback: string): string {
  const value = readPath(root, path);
  if (value === undefined) return fallback;
  if (typeof value === "string") return value;
  add("error", "config-invalid", `Field ${path} must be a string.`, "pom.config.json");
  return fallback;
}

function readNumber(root: Record<string, unknown>, path: string, fallback: number): number {
  const value = readPath(root, path);
  if (value === undefined) return fallback;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  add("error", "config-invalid", `Field ${path} must be a number >= 0.`, "pom.config.json");
  return fallback;
}

function readBoolean(root: Record<string, unknown>, path: string, fallback: boolean): boolean {
  const value = readPath(root, path);
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  add("error", "config-invalid", `Field ${path} must be a boolean.`, "pom.config.json");
  return fallback;
}

function readSeverity(root: Record<string, unknown>, path: string, fallback: Severity): Severity {
  const value = readPath(root, path);
  if (value === undefined) return fallback;
  if (value === "error" || value === "warning") return value;
  add("error", "config-invalid", `Field ${path} must be "error" or "warning".`, "pom.config.json");
  return fallback;
}

function readStringArray(root: Record<string, unknown>, path: string, fallback: string[]): string[] {
  const value = readPath(root, path);
  if (value === undefined) return fallback;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  add("error", "config-invalid", `Field ${path} must be an array of strings.`, "pom.config.json");
  return fallback;
}

function readStringRecord(root: Record<string, unknown>, path: string, fallback: Record<string, string>): Record<string, string> {
  const value = readPath(root, path);
  if (value === undefined) return fallback;
  if (isRecord(value) && Object.values(value).every((item) => typeof item === "string")) {
    return { ...fallback, ...(value as Record<string, string>) };
  }
  add("error", "config-invalid", `Field ${path} must be an object with string values.`, "pom.config.json");
  return fallback;
}

function readStringArrayRecord(
  root: Record<string, unknown>,
  path: string,
  fallback: Record<string, string[]>,
): Record<string, string[]> {
  const value = readPath(root, path);
  if (value === undefined) return fallback;
  if (
    isRecord(value) &&
    Object.values(value).every((item) => Array.isArray(item) && item.every((entry) => typeof entry === "string"))
  ) {
    return value as Record<string, string[]>;
  }
  add("error", "config-invalid", `Field ${path} must be an object with string-array values.`, "pom.config.json");
  return fallback;
}

function validateConfig(current: LintConfig): void {
  validateEnum("adoption.profile", current.adoption.profile, ["minimal", "wiki", "decisions", "full", "adopt", "refresh", "custom"]);
  validateEnum("adoption.wiki", current.adoption.wiki, ["enabled", "disabled"]);
  validateEnum("adoption.decisions", current.adoption.decisions, ["enabled", "disabled"]);
  validateEnum("adoption.analysis", current.adoption.analysis, ["enabled", "optional", "disabled"]);
  validateEnum("adoption.docs", current.adoption.docs, ["enabled", "optional", "disabled"]);
  validateEnum("adoption.mockups", current.adoption.mockups, ["enabled", "disabled"]);
  validateEnum("adoption.planning", current.adoption.planning, ["light", "structured"]);
  validateEnum("adoption.tasks", current.adoption.tasks, ["light", "structured"]);
  validateEnum("adoption.tests", current.adoption.tests, ["disabled", "existing", "pom"]);

  for (const [name, pattern] of Object.entries({
    "wiki.logEntryPattern": current.wiki.logEntryPattern,
    "decisions.adrPathPattern": current.decisions.adrPathPattern,
    "decisions.datePattern": current.decisions.datePattern,
    "taskPlans.taskPathPattern": current.taskPlans.taskPathPattern,
    "mockups.manifestTypePattern": current.mockups.manifestTypePattern,
    "mockups.manifestDatePattern": current.mockups.manifestDatePattern,
    "mockups.reconciliationFilePattern": current.mockups.reconciliationFilePattern,
  })) {
    try {
      new RegExp(pattern);
    } catch {
      add("error", "config-invalid", `Field ${name} contains an invalid regex.`, "pom.config.json");
    }
  }
}

function validateEnum(path: string, value: string, allowed: string[]): void {
  if (allowed.includes(value)) return;
  add("error", "config-invalid", `Field ${path} must be one of: ${allowed.join(", ")}.`, "pom.config.json");
}

function resolveTemplatePath(path: string): string | undefined {
  const direct = join(ROOT, path);
  if (existsSync(direct)) return direct;

  if (path.startsWith("pom/")) {
    const local = join(ROOT, path.slice("pom/".length));
    if (existsSync(local)) return local;
  }

  return undefined;
}

function sectionsFromTemplate(path: string): string[] {
  const resolved = resolveTemplatePath(path);
  if (!resolved) return [];
  const text = readFileSync(resolved, "utf8");
  return [...text.matchAll(/^## [^\n]+/gm)].map((match) => match[0].trim());
}

function pathExists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

function readText(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function listDir(path: string): string[] {
  if (!pathExists(path)) return [];
  return readdirSync(join(ROOT, path)).sort();
}

function walkFiles(dir: string, predicate: (path: string) => boolean = () => true): string[] {
  if (!pathExists(dir)) return [];

  const results: string[] = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of readdirSync(join(ROOT, current))) {
      const full = join(current, entry);
      const stat = statSync(join(ROOT, full));
      if (stat.isDirectory()) {
        if (entry === ".git" || entry === "node_modules" || entry === ".obsidian") continue;
        stack.push(full);
      } else if (predicate(full)) {
        results.push(full);
      }
    }
  }

  return results.sort();
}

function gitChangedFiles(): Set<string> {
  try {
    const output = execFileSync("git", ["status", "--porcelain"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    const changed = new Set<string>();
    for (const line of output.split("\n")) {
      if (!line.trim()) continue;
      const raw = line.slice(3).trim();
      const renamed = raw.includes(" -> ") ? raw.split(" -> ").at(-1)! : raw;
      changed.add(renamed);
    }
    return changed;
  } catch {
    add("warning", "git-status", "Unable to read git status; Git-based checks were skipped.");
    return new Set();
  }
}

function checkRootMarkdown(): void {
  for (const entry of listDir(".")) {
    const path = entry;
    if (!path.toLowerCase().endsWith(".md")) continue;
    if (!allowedRootMarkdown.has(path)) {
      add(
        "error",
        "root-markdown",
        "Keep the project root clean: move Markdown documents to analysis/, wiki/, decisions/, or docs/.",
        path,
      );
    }
  }
}

function checkAnalysisLayout(): void {
  if (!pathExists("analysis")) return;

  for (const entry of listDir("analysis")) {
    const path = join("analysis", entry);
    const stat = statSync(join(ROOT, path));

    if (!config.analysis.allowMarkdownAtRoot && stat.isFile() && entry.toLowerCase().endsWith(".md")) {
      add("error", "analysis-root-file", "Do not leave Markdown files directly under analysis/.", path);
    }

    if (stat.isDirectory() && allowedAnalysisDirs.size > 0 && !allowedAnalysisDirs.has(entry)) {
      add("warning", "analysis-unknown-dir", "analysis/ folder is not declared by the current taxonomy.", path);
    }
  }
}

type AdrIndexEntry = {
  file: string;
  title: string;
  status: string;
  date: string;
  category: string;
  area: string;
  summary: string;
  supersededBy: string;
};

function parseMetadataTable(text: string): Map<string, string> {
  const fields = new Map<string, string>();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;

    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

    if (cells.length < 2) continue;
    if (["field", "campo"].includes(cells[0].toLowerCase())) continue;

    fields.set(cells[0].toLowerCase(), cells[1]);
  }

  for (const match of text.matchAll(/^\*\*([^*:\n]+):?\*\*\s*:?\s*(.+)$/gm)) {
    const key = match[1]?.trim().toLowerCase();
    const value = match[2]?.trim();
    if (key && value && !fields.has(key)) {
      fields.set(key, value);
    }
  }

  return fields;
}

function parseDocumentStatus(text: string): string {
  const fields = parseMetadataTable(text);
  const metadataStatus = fields.get("status") ?? fields.get("stato") ?? "";
  if (isUsableMetadata(metadataStatus)) return metadataStatus;

  const statusSection = text.match(/^## Status\s*\n+([^\n#]+)/m)?.[1]?.trim() ?? "";
  return statusSection;
}

function stripDecisionRoot(file: string): string {
  const root = config.decisions.root.replace(/\\/g, "/").replace(/\/$/, "");
  if (root && file.startsWith(`${root}/`)) {
    return file.slice(root.length + 1);
  }
  return file.replace(/^decisions\//, "");
}

function parseAdrTitle(text: string, file: string): string {
  const firstHeading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (firstHeading) return firstHeading;
  return stripDecisionRoot(file).replace(/\.md$/, "");
}

function isUsableMetadata(value: string): boolean {
  if (!value.trim()) return false;
  const normalized = value.toLowerCase();
  return !["none", "nessuno", "n/a", "na", "-", "tbd", "todo", "to define", "da definire"].includes(normalized);
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").trim() || "-";
}

function truncateSummary(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= ADR_INDEX_SUMMARY_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, ADR_INDEX_SUMMARY_MAX_LENGTH - 3).trimEnd()}...`;
}

function adrLink(entry: AdrIndexEntry): string {
  const indexDir = dirname(config.decisions.indexPath);
  let link = relative(indexDir, entry.file).replace(/\\/g, "/");
  if (!link.startsWith(".") && !link.startsWith("/")) {
    link = `./${link}`;
  }
  return `[${markdownCell(entry.title)}](${link})`;
}

function writeAdrIndex(entries: AdrIndexEntry[]): void {
  const indexPath = config.decisions.indexPath;
  if (!indexPath) return;

  const classified = entries.filter((entry) => isUsableMetadata(entry.category) && isUsableMetadata(entry.area));
  const unclassified = entries.filter((entry) => !isUsableMetadata(entry.category) || !isUsableMetadata(entry.area));

  const lines: string[] = [
    "# ADR Index",
    "",
    "Generated by `npm run pom:lint` from ADR metadata. Do not edit manually.",
    "",
    "## Classified ADRs",
    "",
  ];

  if (classified.length === 0) {
    lines.push("_No classified ADRs._", "");
  } else {
    const grouped = new Map<string, AdrIndexEntry[]>();
    for (const entry of classified) {
      const key = `${entry.category} / ${entry.area}`;
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }

    for (const [group, groupEntries] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`### ${group}`, "");
      lines.push("| ADR | Status | Date | Summary | Replaced by |");
      lines.push("|---|---|---|---|---|");
      for (const entry of groupEntries.sort((a, b) => a.file.localeCompare(b.file))) {
        lines.push(
          `| ${adrLink(entry)} | ${markdownCell(entry.status)} | ${markdownCell(entry.date)} | ${markdownCell(truncateSummary(entry.summary))} | ${markdownCell(entry.supersededBy)} |`,
        );
      }
      lines.push("");
    }
  }

  lines.push("## Unclassified ADRs", "");
  if (unclassified.length === 0) {
    lines.push("_No unclassified ADRs._", "");
  } else {
    lines.push("| ADR | Status | Date | Summary | Category | Area |");
    lines.push("|---|---|---|---|---|---|");
    for (const entry of unclassified.sort((a, b) => a.file.localeCompare(b.file))) {
      lines.push(
        `| ${adrLink(entry)} | ${markdownCell(entry.status)} | ${markdownCell(entry.date)} | ${markdownCell(truncateSummary(entry.summary))} | ${markdownCell(entry.category)} | ${markdownCell(entry.area)} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Rule", "");
  lines.push("- The authoritative decision source remains the individual ADR.");
  lines.push("- This index is a generated navigation and search view.");
  lines.push("- Fine-grained history remains in Git.");
  lines.push("");

  const content = `${lines.join("\n")}`;
  const absolutePath = join(ROOT, indexPath);
  mkdirSync(dirname(absolutePath), { recursive: true });

  if (!existsSync(absolutePath) || readFileSync(absolutePath, "utf8") !== content) {
    writeFileSync(absolutePath, content);
  }
}

function checkDecisions(): void {
  const decisionsRoot = config.decisions.root || "decisions";
  if (!pathExists(decisionsRoot)) return;

  const adrFiles = walkFiles(
    decisionsRoot,
    (path) => path.endsWith(".md") && new RegExp(config.decisions.adrPathPattern).test(path),
  );

  const indexEntries: AdrIndexEntry[] = [];

  for (const file of adrFiles) {
    const text = readText(file);
    const fields = parseMetadataTable(text);
    const title = parseAdrTitle(text, file);
    const status = fields.get("status") ?? fields.get("stato") ?? "";
    const date = fields.get("date") ?? fields.get("data") ?? "";
    const category = fields.get(config.decisions.categoryField.toLowerCase()) ?? "";
    const area = fields.get(config.decisions.areaField.toLowerCase()) ?? "";
    const summary = fields.get("summary") ?? "";
    const supersededBy = fields.get("replaced by") ?? fields.get("superseded by") ?? fields.get("sostituita da") ?? "";

    if (config.decisions.requireTemplateSections) {
      for (const section of requiredAdrSections) {
        if (!text.includes(section)) {
          add("error", "adr-required-section", `ADR is missing required section: ${section}`, file);
        }
      }
    }

    if (!new RegExp(config.decisions.datePattern).test(text)) {
      add("warning", "adr-date", "ADR is missing a YYYY-MM-DD date in the opening metadata table.", file);
    }

    if (!isUsableMetadata(status)) {
      add("warning", "adr-status", "ADR is missing a Status field in the opening metadata.", file);
    }

    if (!isUsableMetadata(category)) {
      add("warning", "adr-category", `ADR is missing a classifiable ${config.decisions.categoryField} in the opening metadata table.`, file);
    }

    if (!isUsableMetadata(area)) {
      add("warning", "adr-area", `ADR is missing a classifiable ${config.decisions.areaField} in the opening metadata table.`, file);
    }

    indexEntries.push({ file, title, status, date, category, area, summary, supersededBy });
  }

  writeAdrIndex(indexEntries);
}

function checkTaskPlans(): void {
  const taskRoot = config.taskPlans.root || "tasks";
  if (!pathExists(taskRoot)) return;

  const taskPattern = new RegExp(config.taskPlans.taskPathPattern);
  const indexPath = normalize(config.taskPlans.indexPath || join(taskRoot, "README.md")).replace(/\\/g, "/");
  const taskFiles = walkFiles(taskRoot, (path) => path.endsWith(".md") && taskPattern.test(path));

  for (const file of taskFiles) {
    const normalizedFile = normalize(file).replace(/\\/g, "/");
    if (normalizedFile === indexPath) continue;

    const text = readText(file);
    const status = parseDocumentStatus(text);

    if (!isUsableMetadata(status)) {
      add("warning", "task-status", "Task plan is missing a Status section or metadata field.", file);
    }

    if (config.taskPlans.requireTemplateSections) {
      for (const section of requiredTaskPlanSections) {
        if (!text.includes(section)) {
          add("error", "task-required-section", `Task plan is missing required section: ${section}`, file);
        }
      }
    }
  }
}

function checkDocs(): void {
  const docsRoot = config.documentation.officialRoot;
  if (!pathExists(docsRoot)) return;

  const docs = walkFiles(docsRoot, (path) => path.endsWith(".md"));
  for (const file of docs) {
    const text = readText(file);
    for (const section of requiredDocsSections) {
      if (!text.includes(section)) {
        add("error", "docs-sources", `Official document is missing required section: ${section}`, file);
      }
    }
  }
}

function checkDocumentationRoots(): void {
  const declared = new Set([config.documentation.officialRoot, ...config.documentation.existingRoots]);

  for (const candidate of config.documentation.knownRootCandidates) {
    if (!pathExists(candidate) || declared.has(candidate)) continue;
    if (!statSync(join(ROOT, candidate)).isDirectory()) continue;

    add(
      config.documentation.severity,
      "docs-root-undeclared",
      `Existing documentation folder is not declared in pom.config.json: ${candidate}. Ask whether to adapt to the existing structure or use/adapt the POM proposal.`,
      candidate,
    );
  }
}

function checkSourceRoots(): void {
  const declared = new Set(config.source.roots);

  for (const candidate of config.source.knownRootCandidates) {
    if (!pathExists(candidate) || declared.has(candidate)) continue;
    if (!statSync(join(ROOT, candidate)).isDirectory()) continue;

    add(
      config.source.severity,
      "source-root-undeclared",
      `Existing source folder is not declared in pom.config.json: ${candidate}. Ask whether to adapt to the existing structure or use/adapt the POM proposal.`,
      candidate,
    );
  }
}

function checkMockReconciliation(): void {
  const packagesDir = config.mockups.packagesDir;
  const declaredMockDirs = pathExists(packagesDir)
    ? listDir(packagesDir)
        .filter((entry) => statSync(join(ROOT, packagesDir, entry)).isDirectory())
        .map((entry) => join(packagesDir, entry))
    : [];

  if (declaredMockDirs.length === 0) return;

  for (const mockDir of declaredMockDirs) {
    checkMockManifest(mockDir);
  }

  const packagesNeedingReconciliation = declaredMockDirs.filter((mockDir) => {
    const manifest = join(mockDir, config.mockups.manifestName);
    if (!pathExists(manifest)) return true;
    return !readText(manifest).toLowerCase().includes(config.mockups.skipReconciliationText.toLowerCase());
  });

  if (packagesNeedingReconciliation.length === 0) return;

  const reconciliationExists =
    walkFiles(config.mockups.reconciliationSearchDir, (path) =>
      new RegExp(config.mockups.reconciliationFilePattern, "i").test(path),
    ).length > 0;
  if (!reconciliationExists) {
    add(
      "warning",
      "mock-reconciliation",
      `Found mock packages requiring reconciliation (${packagesNeedingReconciliation.join(", ")}) but no reconciliation document in analysis/.`,
      packagesDir,
    );
  }
}

function checkMockManifest(mockDir: string): void {
  const manifest = join(mockDir, config.mockups.manifestName);

  if (!pathExists(manifest)) {
    add("error", "mock-manifest-missing", "Mock package is missing MOCK_MANIFEST.md: it cannot trigger wiki/docs updates.", mockDir);
    return;
  }

  const text = readText(manifest);

  for (const section of requiredMockManifestSections) {
    if (!text.includes(section)) {
      add("error", "mock-manifest-section", `MOCK_MANIFEST.md is missing required section: ${section}`, manifest);
    }
  }

  if (!new RegExp(config.mockups.manifestTypePattern, "i").test(text)) {
    add("error", "mock-manifest-type", "MOCK_MANIFEST.md must declare Type: Complete or Partial.", manifest);
  }

  if (!new RegExp(config.mockups.manifestDatePattern, "i").test(text)) {
    add("error", "mock-manifest-date", "MOCK_MANIFEST.md must declare a YYYY-MM-DD date.", manifest);
  }
}

function checkWikiIndexCoverage(): void {
  if (!pathExists("wiki/index.md")) return;

  const index = readText("wiki/index.md");
  const wikiPages = walkFiles(
    "wiki",
    (path) => path.endsWith(".md") && !["wiki/index.md", "wiki/log.md"].includes(path),
  );

  for (const page of wikiPages) {
    const wikiRelative = page.replace(/^wiki\//, "");
    const basename = wikiRelative.replace(/\.md$/, "");
    const obsidianLink = `[[${basename}]]`;
    const markdownLink = `](${wikiRelative})`;
    const plainPath = wikiRelative;

    if (!index.includes(obsidianLink) && !index.includes(markdownLink) && !index.includes(plainPath)) {
      add("warning", "wiki-index-coverage", "Wiki page is not referenced in wiki/index.md.", page);
    }
  }
}

function checkWikiDocuments(): void {
  if (!pathExists("wiki")) return;

  const wikiPages = walkFiles("wiki", (path) => path.endsWith(".md"));
  const wikiPageSet = new Set(wikiPages);

  for (const page of wikiPages) {
    const text = readText(page);
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      add("error", "wiki-empty-page", "Wiki page is empty.", page);
      continue;
    }

    const h1Matches = text.match(/^# .+/gm) ?? [];
    if (h1Matches.length === 0) {
      add("error", "wiki-missing-h1", "Each wiki page must have one H1 title.", page);
    } else if (h1Matches.length > 1) {
      add("warning", "wiki-multiple-h1", "Wiki page contains multiple H1 titles.", page);
    }

    if (trimmed.length < config.wiki.minPageLength && !page.endsWith(".gitkeep")) {
      add("warning", "wiki-too-short", "Wiki page is very short: verify that it is not an unmarked stub.", page);
    }

    for (const [prefix, sections] of Object.entries(wikiCategorySections)) {
      if (!page.startsWith(prefix)) continue;
      for (const section of sections) {
        if (!text.includes(section)) {
          add("warning", "wiki-category-section", `Page under ${prefix} is missing expected section: ${section}`, page);
        }
      }
    }
  }

  checkWikiBaseRules(wikiPages, wikiPageSet);
  checkWikiProjectRules();
}

function checkWikiBaseRules(wikiPages: string[], wikiPageSet: Set<string>): void {
  checkWikiLinks(wikiPages, wikiPageSet);
  checkWikiLogFormat();
  checkWikiIndexBaseShape();
}

function checkWikiLinks(wikiPages: string[], wikiPageSet: Set<string>): void {
  for (const page of wikiPages) {
    const text = stripMarkdownCode(readText(page));

    for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const rawTarget = match[1].split("|")[0].split("#")[0].trim();
      if (!rawTarget) continue;

      const normalizedTarget = rawTarget.replace(/^wiki\//, "").replace(/\.md$/, "");
      const candidate = normalize(`wiki/${normalizedTarget}.md`);

      if (!wikiPageSet.has(candidate)) {
        add("error", "wiki-broken-wikilink", `Broken Obsidian link: [[${rawTarget}]]`, page);
      }
    }

    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim();
      if (
        !rawTarget ||
        rawTarget.startsWith("#") ||
        /^[a-z]+:\/\//i.test(rawTarget) ||
        rawTarget.startsWith("mailto:")
      ) {
        continue;
      }

      const targetWithoutAnchor = rawTarget.split("#")[0];
      if (!targetWithoutAnchor.endsWith(".md")) continue;

      const candidate = normalize(join(dirname(page), targetWithoutAnchor));
      if (!existsSync(join(ROOT, candidate))) {
        add("error", "wiki-broken-md-link", `Broken local Markdown link: ${rawTarget}`, page);
      }
    }
  }
}

function stripMarkdownCode(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "");
}

function checkWikiLogFormat(): void {
  if (!pathExists("wiki/log.md")) return;

  const text = readText("wiki/log.md");
  const entries = [...text.matchAll(/^## .+$/gm)].map((match) => match[0]);
  const logEntryRegex = new RegExp(config.wiki.logEntryPattern);
  const invalid = entries.filter((entry) => !logEntryRegex.test(entry));

  for (const entry of invalid) {
    add(
      "warning",
      "wiki-log-entry-format",
      `Log entry does not match '## [YYYY-MM-DD] action | detail': ${entry}`,
      "wiki/log.md",
    );
  }
}

function checkWikiIndexBaseShape(): void {
  if (!pathExists("wiki/index.md")) return;

  const text = readText("wiki/index.md");
  const requiredSections = config.wiki.baseIndexSections;

  for (const section of requiredSections) {
    if (!text.includes(section)) {
      add("warning", "wiki-index-base-section", `wiki/index.md is missing expected base POM section: ${section}`, "wiki/index.md");
    }
  }
}

function checkWikiProjectRules(): void {
  checkProjectWikiIndexShape();
}

function checkProjectWikiIndexShape(): void {
  if (!pathExists("wiki/index.md")) return;

  const text = readText("wiki/index.md");
  const projectSections = config.wiki.projectIndexSections;

  for (const section of projectSections) {
    if (!text.includes(section)) {
      add("warning", "project-wiki-index-section", `wiki/index.md is missing expected project section: ${section}`, "wiki/index.md");
    }
  }
}

function checkTestsLayout(): void {
  const testsRoot = config.tests.root;
  if (!pathExists(testsRoot)) return;

  const allowedAreas = new Set(config.tests.areas);
  const recommendedLayout = new Set(config.tests.recommendedLayout);
  const topLevelEntries = listDir(testsRoot);

  for (const entry of topLevelEntries) {
    const entryPath = join(testsRoot, entry);
    const stat = statSync(join(ROOT, entryPath));

    if (stat.isFile()) {
      add(
        config.tests.severity,
        "tests-root-file",
        `File directly under ${testsRoot}/: prefer ${testsRoot}/<module-or-area>/... or an approved existing structure.`,
        entryPath,
      );
      continue;
    }

    if (!stat.isDirectory()) continue;
    if (entry === config.tests.crossSystemDir) continue;

    if (allowedAreas.size > 0 && !allowedAreas.has(entry)) {
      add(
        config.tests.severity,
        "tests-unknown-area",
        `Test area is not listed in pom.config.json: ${entry}. Update tests.areas or confirm a different structure.`,
        entryPath,
      );
    }

    checkTestAreaLayout(entryPath, recommendedLayout);
  }
}

function checkTestAreaLayout(areaPath: string, recommendedLayout: Set<string>): void {
  const entries = listDir(areaPath);
  if (entries.length === 0) return;

  for (const entry of entries) {
    const entryPath = join(areaPath, entry);
    const stat = statSync(join(ROOT, entryPath));

    if (stat.isFile()) {
      add(
        config.tests.severity,
        "tests-area-file",
        `File directly under ${areaPath}/: prefer subfolders ${[...recommendedLayout].join(", ")} or document the existing structure.`,
        entryPath,
      );
      continue;
    }

    if (stat.isDirectory() && recommendedLayout.size > 0 && !recommendedLayout.has(entry)) {
      add(
        config.tests.severity,
        "tests-layout-divergence",
        `Test subfolder is not part of the POM convention: ${entry}. Ask whether to adapt to the existing structure or update pom.config.json.`,
        entryPath,
      );
    }
  }
}

function checkGitWorkflow(): void {
  const changed = gitChangedFiles();
  if (changed.size === 0) return;

  const changedWiki = [...changed].filter((path) => path.startsWith("wiki/") && path.endsWith(".md"));
  const changedDocs = [...changed].filter((path) => path.startsWith("docs/") && path.endsWith(".md"));
  const decisionsRoot = (config.decisions.root || "decisions").replace(/\/$/, "");
  const changedDecisions = [...changed].filter((path) => path.startsWith(`${decisionsRoot}/`) && new RegExp(config.decisions.adrPathPattern).test(path));

  if (changedWiki.length > 0 && !changed.has("wiki/log.md")) {
    add("warning", "wiki-log-changed", "There are wiki changes without an update to wiki/log.md.", "wiki/log.md");
  }

  if (changedDocs.length > 0 && changedDecisions.length === 0) {
    add(
      "warning",
      "docs-without-adr",
      `There are ${config.documentation.officialRoot}/ changes without a modified or added ADR.`,
      `${decisionsRoot}/`,
    );
  }

  checkProjectStateHandoff(changed);
}

function checkProjectStateHandoff(changed: Set<string>): void {
  const statePath = config.handoff.projectStatePath;
  if (!pathExists(statePath)) return;

  const stateChanged = changed.has(statePath);
  const triggeredPaths = [...changed].filter((path) =>
    config.handoff.triggerPaths.some((trigger) => path === trigger || path.startsWith(trigger)),
  );

  if (triggeredPaths.length > 0 && !stateChanged) {
    add(
      config.handoff.severity,
      "project-state-handoff",
      `Operational changes detected (${triggeredPaths.join(", ")}) without reconciling ${statePath}. Check whether it should be updated before commit.`,
      statePath,
    );
  }
}

function checkProjectStateShape(): void {
  const statePath = config.handoff.projectStatePath;
  if (!pathExists(statePath)) return;

  const text = readText(statePath);
  const lines = text.trimEnd().split("\n");

  if (lines.length > config.handoff.maxLines) {
    add(
      "warning",
      "project-state-too-long",
      `${statePath} has ${lines.length} lines: keep it concise and under ${config.handoff.maxLines} lines, moving history to wiki/log.md, decisions/, or Git.`,
      statePath,
    );
  }

  for (const heading of config.handoff.forbiddenHeadings) {
    if (text.includes(heading)) {
      add(
        "warning",
        "project-state-log-heading",
        `${statePath} contains a log-like section (${heading}). PROJECT_STATE.md must remain current state and next step, not chronology.`,
        statePath,
      );
    }
  }
}

function printResults(): void {
  const errors = findings.filter((finding) => finding.severity === "error");
  const warnings = findings.filter((finding) => finding.severity === "warning");

  if (findings.length === 0) {
    console.log("Doc governance lint: OK");
    return;
  }

  for (const finding of findings) {
    const label = finding.severity === "error" ? "ERROR" : "WARN";
    const file = finding.file ? ` ${finding.file}` : "";
    console.log(`[${label}] ${finding.rule}${file}`);
    console.log(`  ${finding.message}`);
  }

  printSuggestedWorkflows();

  console.log("");
  console.log(`Doc governance lint: ${errors.length} errors, ${warnings.length} warnings`);
  console.log("After fixing findings, rerun: npm run pom:lint");
}

function printSuggestedWorkflows(): void {
  const suggestions = new Set<string>();

  for (const finding of findings) {
    if (finding.rule.startsWith("config-")) {
      suggestions.add("Config findings: read pom/skills/config.md and update pom.config.json.");
    } else if (finding.rule.startsWith("wiki-")) {
      suggestions.add("Wiki findings: read pom/skills/wiki.md in lint or stale mode before changing wiki pages.");
    } else if (finding.rule.startsWith("adr-") || finding.rule === "docs-without-adr") {
      suggestions.add("ADR findings: update ADR metadata using pom/templates/ADR_TEMPLATE.md, then rerun pom:lint.");
    } else if (finding.rule.startsWith("mock-")) {
      suggestions.add("Mockup findings: use pom/templates/MOCK_MANIFEST_TEMPLATE.md and reconcile changes through analysis/.");
    } else if (finding.rule.startsWith("tests-")) {
      suggestions.add("Test findings: update pom.config.json test settings or align tests with the approved project convention.");
    } else if (finding.rule.startsWith("project-state-")) {
      suggestions.add("Handoff findings: update PROJECT_STATE.md from pom/templates/PROJECT_STATE_TEMPLATE.md.");
    } else if (finding.rule.includes("root") || finding.rule.startsWith("source-") || finding.rule.startsWith("docs-")) {
      suggestions.add("Structure findings: read pom/skills/config.md before moving files or changing folder conventions.");
    }
  }

  if (suggestions.size === 0) return;

  console.log("");
  console.log("Suggested workflows:");
  for (const suggestion of suggestions) {
    console.log(`- ${suggestion}`);
  }
}

checkRootMarkdown();
checkAnalysisLayout();
checkDocumentationRoots();
checkSourceRoots();
checkDecisions();
checkTaskPlans();
checkDocs();
checkMockReconciliation();
checkWikiDocuments();
checkWikiIndexCoverage();
checkTestsLayout();
checkProjectStateShape();
checkGitWorkflow();
printResults();

if (findings.some((finding) => finding.severity === "error")) {
  process.exit(1);
}
