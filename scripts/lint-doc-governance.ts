#!/usr/bin/env node

import { createLintContext } from "./lib/lint-context.ts";
import { checkDecisions } from "./lib/lint-decisions.ts";
import { checkDocs, checkDocumentationRoots, checkSourceRoots } from "./lib/lint-docs-source.ts";
import { checkGitWorkflow, checkProjectStateShape } from "./lib/lint-handoff.ts";
import { checkMockReconciliation } from "./lib/lint-mockups.ts";
import { checkReaderNotes } from "./lib/lint-reader-notes.ts";
import { printResults } from "./lib/lint-reporter.ts";
import { checkSourceFileSizes } from "./lib/lint-source-size.ts";
import {
  checkAnalysisLayout,
  checkIndexNamingConvention,
  checkRootMarkdown,
} from "./lib/lint-structure.ts";
import { checkTaskPlans } from "./lib/lint-tasks.ts";
import { checkTestsLayout } from "./lib/lint-tests.ts";
import {
  checkWikiDocuments,
  checkWikiIndexCoverage,
  renderWikiReaderIfNeeded,
} from "./lib/lint-wiki.ts";

const context = createLintContext(process.cwd());

checkRootMarkdown(context);
checkAnalysisLayout(context);
checkDocumentationRoots(context);
checkSourceRoots(context);
checkDecisions(context);
checkTaskPlans(context);
checkIndexNamingConvention(context);
checkDocs(context);
checkMockReconciliation(context);
checkReaderNotes(context);
checkWikiDocuments(context);
checkWikiIndexCoverage(context);
checkTestsLayout(context);
checkProjectStateShape(context);
checkGitWorkflow(context);
checkSourceFileSizes(context);
printResults(context.findings);

if (context.findings.some((finding) => finding.severity === "error")) {
  process.exit(1);
}

renderWikiReaderIfNeeded(context);
