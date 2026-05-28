import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LintContext } from "./lint-context.ts";
import { walkFiles } from "./lint-helpers.ts";

const WORKING_STATUSES = new Set(["new", "triaged", "in_progress", "parked"]);
const PROCESSED_STATUSES = new Set(["resolved", "discarded"]);
const DEFAULT_ANNOTATIONS_DIR = ".pom-reader/annotations";

type AnnotationRecord = {
  annotationId?: unknown;
  status?: unknown;
  target?: {
    path?: unknown;
  };
  annotation?: unknown;
  agentReport?: unknown;
};

export function checkReaderNotes(context: LintContext): void {
  if (!existsSync(join(context.root, DEFAULT_ANNOTATIONS_DIR))) return;

  const workingNotes: string[] = [];

  for (const file of walkFiles(context.root, DEFAULT_ANNOTATIONS_DIR, (path) => path.endsWith(".json"))) {
    const annotation = readAnnotation(context, file);
    if (!annotation) continue;

    const status = String(annotation.status || "").trim();
    if (annotation.agentReport || PROCESSED_STATUSES.has(status)) continue;

    if (!WORKING_STATUSES.has(status)) {
      context.add(
        "warning",
        "reader-note-status",
        `Project Reader annotation has an unknown working status: ${status || "(missing)"}.`,
        file,
      );
      continue;
    }

    const id = String(annotation.annotationId || file);
    const target = String(annotation.target?.path || "unknown target");
    workingNotes.push(`${id} (${status}) -> ${target}`);
  }

  if (!workingNotes.length) return;

  const shown = workingNotes.slice(0, 5).join("; ");
  const suffix = workingNotes.length > 5 ? `; and ${workingNotes.length - 5} more` : "";
  context.add(
    "warning",
    "reader-notes-open",
    `Project Reader has ${workingNotes.length} working annotation(s): ${shown}${suffix}. Process them with skills/reader-notes.md, or pom/skills/reader-notes.md in a target project.`,
    DEFAULT_ANNOTATIONS_DIR,
  );
}

function readAnnotation(context: LintContext, file: string): AnnotationRecord | undefined {
  try {
    return JSON.parse(readFileSync(join(context.root, file), "utf8")) as AnnotationRecord;
  } catch (error) {
    context.add(
      "warning",
      "reader-note-json",
      `Project Reader annotation JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}.`,
      file,
    );
    return undefined;
  }
}
