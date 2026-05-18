import type { LintContext } from "./lint-context.ts";
import { gitChangedFiles, pathExists, readText } from "./lint-helpers.ts";
import { isGeneratedGovernanceIndex } from "./lint-structure.ts";

export function checkGitWorkflow(context: LintContext): void {
  const onError = (message: string) => context.add("warning", "git-status", message);
  const changed = gitChangedFiles(context.root, onError);
  if (changed.size === 0) return;

  const changedWiki = context.wikiGovernanceEnabled
    ? [...changed].filter((path) => path.startsWith("wiki/") && path.endsWith(".md"))
    : [];
  const officialDocsRoot = context.config.documentation.officialRoot.replace(/\/$/, "");
  const changedDocs = context.docsGovernanceEnabled
    ? [...changed].filter(
        (path) =>
          path.startsWith(`${officialDocsRoot}/`) &&
          path.endsWith(".md") &&
          !isGeneratedGovernanceIndex(context, path),
      )
    : [];
  const decisionsRoot = (context.config.decisions.root || "decisions").replace(/\/$/, "");
  const changedDecisions = context.decisionsGovernanceEnabled
    ? [...changed].filter(
        (path) =>
          path.startsWith(`${decisionsRoot}/`) && new RegExp(context.config.decisions.adrPathPattern).test(path),
      )
    : [];

  if (changedWiki.length > 0 && !changed.has("wiki/log.md")) {
    context.add(
      "warning",
      "wiki-log-changed",
      "There are wiki changes without an update to wiki/log.md.",
      "wiki/log.md",
    );
  }

  if (changedDocs.length > 0 && changedDecisions.length === 0) {
    const requiringAdr = context.config.decisions.docsPathsRequiringAdr;
    const needsAdr =
      requiringAdr.length === 0
        ? changedDocs.length > 0
        : changedDocs.some((path) => requiringAdr.some((prefix) => path.startsWith(prefix)));
    if (needsAdr) {
      context.add(
        "warning",
        "docs-without-adr",
        `There are ${context.config.documentation.officialRoot}/ changes without a modified or added ADR.`,
        `${decisionsRoot}/`,
      );
    }
  }

  checkProjectStateHandoff(context, changed);
}

function checkProjectStateHandoff(context: LintContext, changed: Set<string>): void {
  const statePath = context.config.handoff.projectStatePath;
  if (!pathExists(context.root, statePath)) return;

  const stateChanged = changed.has(statePath);
  const triggeredPaths = [...changed].filter((path) =>
    context.config.handoff.triggerPaths.some((trigger) => path === trigger || path.startsWith(trigger)),
  );

  if (triggeredPaths.length > 0 && !stateChanged) {
    context.add(
      context.config.handoff.severity,
      "project-state-handoff",
      `Operational changes detected (${triggeredPaths.join(", ")}) without reconciling ${statePath}. Check whether it should be updated before commit.`,
      statePath,
    );
  }
}

export function checkProjectStateShape(context: LintContext): void {
  const statePath = context.config.handoff.projectStatePath;
  if (!pathExists(context.root, statePath)) return;

  const text = readText(context.root, statePath);
  const lines = text.trimEnd().split("\n");

  if (lines.length > context.config.handoff.maxLines) {
    context.add(
      "warning",
      "project-state-too-long",
      `${statePath} has ${lines.length} lines: keep it concise and under ${context.config.handoff.maxLines} lines, moving history to wiki/log.md, ${context.config.decisions.root || "decisions"}/, or Git.`,
      statePath,
    );
  }

  for (const heading of context.config.handoff.forbiddenHeadings) {
    if (text.includes(heading)) {
      context.add(
        "warning",
        "project-state-log-heading",
        `${statePath} contains a log-like section (${heading}). PROJECT_STATE.md must remain current state and next step, not chronology.`,
        statePath,
      );
    }
  }
}
