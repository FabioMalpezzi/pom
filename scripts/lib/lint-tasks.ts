import { normalize } from "node:path";
import { isCompleteStatus, isUsableMetadata, parseDocumentStatus } from "./completion-verification.ts";
import { checkCompletionVerification, type LintContext } from "./lint-context.ts";
import { configuredIndexPath, pathExists, readText, walkFiles } from "./lint-helpers.ts";
import { ensureFolderIndex } from "./lint-structure.ts";

export function checkTaskPlans(context: LintContext): void {
  if (!context.taskPlansGovernanceEnabled) return;

  const taskRoot = context.config.taskPlans.root || "tasks";
  if (!pathExists(context.root, taskRoot)) return;

  const taskPattern = new RegExp(context.config.taskPlans.taskPathPattern);
  const indexPath = configuredIndexPath(context.config.taskPlans.indexPath, taskRoot);
  ensureFolderIndex(context, indexPath, taskRoot, "Task Index", "Task", "task plan");
  const taskFiles = walkFiles(context.root, taskRoot, (path) => path.endsWith(".md") && taskPattern.test(path));

  for (const file of taskFiles) {
    const normalizedFile = normalize(file).replace(/\\/g, "/");
    if (normalizedFile === indexPath) continue;

    const text = readText(context.root, file);
    const status = parseDocumentStatus(text);

    if (!isUsableMetadata(status)) {
      context.add("warning", "task-status", "Task plan is missing a Status section or metadata field.", file);
    }

    if (isCompleteStatus(status)) {
      checkCompletionVerification(context, text, file, "task");
    }

    if (context.config.taskPlans.requireTemplateSections) {
      for (const section of context.requiredTaskPlanSections) {
        if (!text.includes(section)) {
          context.add("error", "task-required-section", `Task plan is missing required section: ${section}`, file);
        }
      }
    }
  }
}
