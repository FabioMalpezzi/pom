import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Severity = "error" | "warning";

export type Finding = {
  severity: Severity;
  rule: string;
  message: string;
  file?: string;
};

export type LintConfig = {
  ownership: {
    mode: string;
    localOnly: boolean;
    preserveExistingConventions: boolean;
  };
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
    root: string;
    allowedDirs: string[];
    allowMarkdownAtRoot: boolean;
    indexPath: string;
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
    docsPathsRequiringAdr: string[];
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
  ownership: {
    mode: "unknown",
    localOnly: false,
    preserveExistingConventions: true,
  },
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
      "CONTEXT.md",
      "PROJECT_STATE.md",
      "CURRENT_PLAN.md",
      "WIKI_METHOD.md",
    ],
  },
  analysis: {
    root: "analysis",
    allowedDirs: [],
    allowMarkdownAtRoot: false,
    indexPath: "analysis/ANALYSIS_INDEX.md",
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
    indexPath: "decisions/DECISIONS_INDEX.md",
    categoryField: "Category",
    areaField: "Area",
    docsPathsRequiringAdr: [],
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

export function loadLintConfig(root: string): { config: LintConfig; findings: Finding[] } {
  const findings: Finding[] = [];
  const add = (severity: Severity, rule: string, message: string, file?: string): void => {
    findings.push({ severity, rule, message, file });
  };

  const configPath = join(root, "pom.config.json");
  if (!existsSync(configPath)) return { config: defaultConfig, findings };

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    add("error", "config-invalid", `pom.config.json is not valid JSON: ${String(error)}`, "pom.config.json");
    return { config: defaultConfig, findings };
  }

  if (!isRecord(parsed)) {
    add("error", "config-invalid", "pom.config.json must contain a JSON object.", "pom.config.json");
    return { config: defaultConfig, findings };
  }

  const readers = createReaders(add);
  const merged = mergeConfig(defaultConfig, parsed, readers);
  validateConfig(merged, add);
  return { config: merged, findings };
}

type ConfigReaders = ReturnType<typeof createReaders>;

function mergeConfig(base: LintConfig, raw: Record<string, unknown>, readers: ConfigReaders): LintConfig {
  const {
    readBoolean,
    readNumber,
    readSeverity,
    readString,
    readStringArray,
    readStringArrayRecord,
    readStringRecord,
  } = readers;

  return {
    ownership: {
      mode: readString(raw, "ownership.mode", base.ownership.mode),
      localOnly: readBoolean(raw, "ownership.localOnly", base.ownership.localOnly),
      preserveExistingConventions: readBoolean(
        raw,
        "ownership.preserveExistingConventions",
        base.ownership.preserveExistingConventions,
      ),
    },
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
      root: readString(raw, "analysis.root", base.analysis.root),
      allowedDirs: readStringArray(raw, "analysis.allowedDirs", base.analysis.allowedDirs),
      allowMarkdownAtRoot: readBoolean(raw, "analysis.allowMarkdownAtRoot", base.analysis.allowMarkdownAtRoot),
      indexPath: readString(raw, "analysis.indexPath", base.analysis.indexPath),
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
      docsPathsRequiringAdr: readStringArray(raw, "decisions.docsPathsRequiringAdr", base.decisions.docsPathsRequiringAdr),
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

function createReaders(add: (severity: Severity, rule: string, message: string, file?: string) => void) {
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

  function readStringRecord(
    root: Record<string, unknown>,
    path: string,
    fallback: Record<string, string>,
  ): Record<string, string> {
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

  return {
    readBoolean,
    readNumber,
    readSeverity,
    readString,
    readStringArray,
    readStringArrayRecord,
    readStringRecord,
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

function validateConfig(
  current: LintConfig,
  add: (severity: Severity, rule: string, message: string, file?: string) => void,
): void {
  validateEnum(add, "ownership.mode", current.ownership.mode, ["owned", "team", "external_overlay", "unknown"]);

  validateEnum(add, "adoption.profile", current.adoption.profile, [
    "minimal",
    "wiki",
    "decisions",
    "full",
    "adopt",
    "refresh",
    "custom",
  ]);
  validateEnum(add, "adoption.wiki", current.adoption.wiki, ["enabled", "disabled"]);
  validateEnum(add, "adoption.decisions", current.adoption.decisions, ["enabled", "disabled"]);
  validateEnum(add, "adoption.analysis", current.adoption.analysis, ["enabled", "optional", "disabled"]);
  validateEnum(add, "adoption.docs", current.adoption.docs, ["enabled", "optional", "disabled"]);
  validateEnum(add, "adoption.mockups", current.adoption.mockups, ["enabled", "disabled"]);
  validateEnum(add, "adoption.planning", current.adoption.planning, ["light", "structured"]);
  validateEnum(add, "adoption.tasks", current.adoption.tasks, ["light", "structured"]);
  validateEnum(add, "adoption.tests", current.adoption.tests, ["disabled", "existing", "pom"]);

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

function validateEnum(
  add: (severity: Severity, rule: string, message: string, file?: string) => void,
  path: string,
  value: string,
  allowed: string[],
): void {
  if (allowed.includes(value)) return;
  add("error", "config-invalid", `Field ${path} must be one of: ${allowed.join(", ")}.`, "pom.config.json");
}
