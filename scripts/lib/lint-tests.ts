import { statSync } from "node:fs";
import { join } from "node:path";
import type { LintContext } from "./lint-context.ts";
import { listDir, pathExists } from "./lint-helpers.ts";

export function checkTestsLayout(context: LintContext): void {
  if (!context.testsGovernanceEnabled) return;

  const testsRoot = context.config.tests.root;
  if (!pathExists(context.root, testsRoot)) return;

  const allowedAreas = new Set(context.config.tests.areas);
  const recommendedLayout = new Set(context.config.tests.recommendedLayout);
  const topLevelEntries = listDir(context.root, testsRoot);

  for (const entry of topLevelEntries) {
    const entryPath = join(testsRoot, entry);
    const stat = statSync(join(context.root, entryPath));

    if (stat.isFile()) {
      context.add(
        context.config.tests.severity,
        "tests-root-file",
        `File directly under ${testsRoot}/: prefer ${testsRoot}/<module-or-area>/... or an approved existing structure.`,
        entryPath,
      );
      continue;
    }

    if (!stat.isDirectory()) continue;
    if (entry === context.config.tests.crossSystemDir) continue;

    if (allowedAreas.size > 0 && !allowedAreas.has(entry)) {
      context.add(
        context.config.tests.severity,
        "tests-unknown-area",
        `Test area is not listed in pom.config.json: ${entry}. Update tests.areas or confirm a different structure.`,
        entryPath,
      );
    }

    checkTestAreaLayout(context, entryPath, recommendedLayout);
  }
}

function checkTestAreaLayout(context: LintContext, areaPath: string, recommendedLayout: Set<string>): void {
  const entries = listDir(context.root, areaPath);
  if (entries.length === 0) return;

  for (const entry of entries) {
    const entryPath = join(areaPath, entry);
    const stat = statSync(join(context.root, entryPath));

    if (stat.isFile()) {
      context.add(
        context.config.tests.severity,
        "tests-area-file",
        `File directly under ${areaPath}/: prefer subfolders ${[...recommendedLayout].join(", ")} or document the existing structure.`,
        entryPath,
      );
      continue;
    }

    if (stat.isDirectory() && recommendedLayout.size > 0 && !recommendedLayout.has(entry)) {
      context.add(
        context.config.tests.severity,
        "tests-layout-divergence",
        `Test subfolder is not part of the POM convention: ${entry}. Ask whether to adapt to the existing structure or update pom.config.json.`,
        entryPath,
      );
    }
  }
}
