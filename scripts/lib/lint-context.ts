import {
  completionVerificationFindings,
  type CompletionDocType,
} from "./completion-verification.ts";
import { loadLintConfig, type Finding, type LintConfig, type Severity } from "./lint-config.ts";
import { sectionsFromTemplate } from "./lint-helpers.ts";

export type LintContext = {
  root: string;
  config: LintConfig;
  findings: Finding[];
  templatePaths: Record<string, string>;
  requiredAdrSections: string[];
  requiredDocsSections: string[];
  requiredMockManifestSections: string[];
  requiredTaskPlanSections: string[];
  isExternalOverlay: boolean;
  analysisGovernanceEnabled: boolean;
  docsGovernanceEnabled: boolean;
  wikiGovernanceEnabled: boolean;
  decisionsGovernanceEnabled: boolean;
  mockupsGovernanceEnabled: boolean;
  taskPlansGovernanceEnabled: boolean;
  testsGovernanceEnabled: boolean;
  allowedRootMarkdown: Set<string>;
  allowedAnalysisDirs: Set<string>;
  add: (severity: Severity, rule: string, message: string, file?: string) => void;
};

const DEFAULT_TEMPLATE_PATHS: Record<string, string> = {
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
};

export function createLintContext(root: string): LintContext {
  const loaded = loadLintConfig(root);
  const config = loaded.config;
  const findings: Finding[] = [...loaded.findings];

  const isExternalOverlay = config.ownership.mode === "external_overlay";
  const templatePaths = { ...DEFAULT_TEMPLATE_PATHS, ...config.templates };

  const add: LintContext["add"] = (severity, rule, message, file) => {
    findings.push({ severity, rule, message, file });
  };

  return {
    root,
    config,
    findings,
    templatePaths,
    requiredAdrSections: sectionsFromTemplate(root, templatePaths.adr),
    requiredDocsSections: sectionsFromTemplate(root, templatePaths.doc),
    requiredMockManifestSections: sectionsFromTemplate(root, templatePaths.mockManifest),
    requiredTaskPlanSections: sectionsFromTemplate(root, templatePaths.taskPlan),
    isExternalOverlay,
    analysisGovernanceEnabled: config.adoption.analysis !== "disabled" && !isExternalOverlay,
    docsGovernanceEnabled: config.adoption.docs !== "disabled" && !isExternalOverlay,
    wikiGovernanceEnabled: config.adoption.wiki === "enabled",
    decisionsGovernanceEnabled: config.adoption.decisions === "enabled",
    mockupsGovernanceEnabled: config.adoption.mockups === "enabled",
    taskPlansGovernanceEnabled: !isExternalOverlay || config.adoption.tasks === "structured",
    testsGovernanceEnabled: config.adoption.tests !== "disabled" && !isExternalOverlay,
    allowedRootMarkdown: new Set(config.root.allowedMarkdown),
    allowedAnalysisDirs: new Set(config.analysis.allowedDirs),
    add,
  };
}

export function checkCompletionVerification(
  context: LintContext,
  text: string,
  file: string,
  docType: CompletionDocType,
): void {
  for (const finding of completionVerificationFindings(text, file, docType)) {
    context.add(finding.severity, finding.rule, finding.message, finding.file);
  }
}
