import type { Finding } from "./lint-config.ts";

export function printResults(findings: Finding[]): void {
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

  printSuggestedWorkflows(findings);

  console.log("");
  console.log(`Doc governance lint: ${errors.length} errors, ${warnings.length} warnings`);
  console.log("After fixing findings, rerun: npm run pom:lint");
}

function printSuggestedWorkflows(findings: Finding[]): void {
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
