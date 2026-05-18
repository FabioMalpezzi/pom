import { statSync } from "node:fs";
import { join } from "node:path";
import type { LintContext } from "./lint-context.ts";
import { isSamePathOrInside, pathExists, readText, walkFiles } from "./lint-helpers.ts";
import { isGeneratedGovernanceIndex } from "./lint-structure.ts";

export function checkDocs(context: LintContext): void {
  if (!context.docsGovernanceEnabled) return;

  const docsRoot = context.config.documentation.officialRoot;
  if (!pathExists(context.root, docsRoot)) return;

  const docs = walkFiles(context.root, docsRoot, (path) => path.endsWith(".md"));
  for (const file of docs) {
    if (isSpecializedGovernancePath(context, file)) continue;

    const text = readText(context.root, file);
    for (const section of context.requiredDocsSections) {
      if (!text.includes(section)) {
        context.add("error", "docs-sources", `Official document is missing required section: ${section}`, file);
      }
    }
  }
}

export function checkDocumentationRoots(context: LintContext): void {
  if (!context.docsGovernanceEnabled) return;

  const declared = new Set([
    context.config.documentation.officialRoot,
    ...context.config.documentation.existingRoots,
  ]);

  for (const candidate of context.config.documentation.knownRootCandidates) {
    if (!pathExists(context.root, candidate) || declared.has(candidate)) continue;
    if (!statSync(join(context.root, candidate)).isDirectory()) continue;

    context.add(
      context.config.documentation.severity,
      "docs-root-undeclared",
      `Existing documentation folder is not declared in pom.config.json: ${candidate}. Ask whether to adapt to the existing structure or use/adapt the POM proposal.`,
      candidate,
    );
  }
}

export function checkSourceRoots(context: LintContext): void {
  if (context.isExternalOverlay) return;

  const declared = new Set(context.config.source.roots);

  for (const candidate of context.config.source.knownRootCandidates) {
    if (!pathExists(context.root, candidate) || declared.has(candidate)) continue;
    if (!statSync(join(context.root, candidate)).isDirectory()) continue;

    context.add(
      context.config.source.severity,
      "source-root-undeclared",
      `Existing source folder is not declared in pom.config.json: ${candidate}. Ask whether to adapt to the existing structure or use/adapt the POM proposal.`,
      candidate,
    );
  }
}

function isSpecializedGovernancePath(context: LintContext, path: string): boolean {
  const roots = [
    context.config.analysis.root,
    context.config.decisions.root,
    context.config.taskPlans.root,
  ].filter(Boolean);
  return roots.some((root) => isSamePathOrInside(path, root));
}

export { isGeneratedGovernanceIndex };
