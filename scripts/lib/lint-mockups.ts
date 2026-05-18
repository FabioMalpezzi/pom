import { statSync } from "node:fs";
import { join } from "node:path";
import type { LintContext } from "./lint-context.ts";
import { listDir, pathExists, readText, walkFiles } from "./lint-helpers.ts";

export function checkMockReconciliation(context: LintContext): void {
  if (!context.mockupsGovernanceEnabled) return;

  const packagesDir = context.config.mockups.packagesDir;
  const declaredMockDirs = pathExists(context.root, packagesDir)
    ? listDir(context.root, packagesDir)
        .filter((entry) => statSync(join(context.root, packagesDir, entry)).isDirectory())
        .map((entry) => join(packagesDir, entry))
    : [];

  if (declaredMockDirs.length === 0) return;

  for (const mockDir of declaredMockDirs) {
    checkMockManifest(context, mockDir);
  }

  const packagesNeedingReconciliation = declaredMockDirs.filter((mockDir) => {
    const manifest = join(mockDir, context.config.mockups.manifestName);
    if (!pathExists(context.root, manifest)) return true;
    return !readText(context.root, manifest)
      .toLowerCase()
      .includes(context.config.mockups.skipReconciliationText.toLowerCase());
  });

  if (packagesNeedingReconciliation.length === 0) return;

  const reconciliationExists =
    walkFiles(context.root, context.config.mockups.reconciliationSearchDir, (path) =>
      new RegExp(context.config.mockups.reconciliationFilePattern, "i").test(path),
    ).length > 0;

  if (!reconciliationExists) {
    context.add(
      "warning",
      "mock-reconciliation",
      `Found mock packages requiring reconciliation (${packagesNeedingReconciliation.join(", ")}) but no reconciliation document in analysis/.`,
      packagesDir,
    );
  }
}

function checkMockManifest(context: LintContext, mockDir: string): void {
  const manifest = join(mockDir, context.config.mockups.manifestName);

  if (!pathExists(context.root, manifest)) {
    context.add(
      "error",
      "mock-manifest-missing",
      "Mock package is missing MOCK_MANIFEST.md: it cannot trigger wiki/docs updates.",
      mockDir,
    );
    return;
  }

  const text = readText(context.root, manifest);

  for (const section of context.requiredMockManifestSections) {
    if (!text.includes(section)) {
      context.add(
        "error",
        "mock-manifest-section",
        `MOCK_MANIFEST.md is missing required section: ${section}`,
        manifest,
      );
    }
  }

  if (!new RegExp(context.config.mockups.manifestTypePattern, "i").test(text)) {
    context.add("error", "mock-manifest-type", "MOCK_MANIFEST.md must declare Type: Complete or Partial.", manifest);
  }

  if (!new RegExp(context.config.mockups.manifestDatePattern, "i").test(text)) {
    context.add("error", "mock-manifest-date", "MOCK_MANIFEST.md must declare a YYYY-MM-DD date.", manifest);
  }
}
