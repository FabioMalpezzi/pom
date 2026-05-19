import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isAcceptedStatus, isUsableMetadata, parseMetadataTable } from "./completion-verification.ts";
import { checkCompletionVerification, type LintContext } from "./lint-context.ts";
import {
  configuredIndexPath,
  markdownCell,
  pathExists,
  readText,
  relativeFromIndex,
  truncateSummary,
  walkFiles,
} from "./lint-helpers.ts";

type AdrIndexEntry = {
  file: string;
  title: string;
  status: string;
  date: string;
  category: string;
  area: string;
  summary: string;
  supersededBy: string;
};

export function checkDecisions(context: LintContext): void {
  if (!context.decisionsGovernanceEnabled) return;

  const decisionsRoot = context.config.decisions.root || "decisions";
  if (!pathExists(context.root, decisionsRoot)) return;

  const adrFiles = walkFiles(
    context.root,
    decisionsRoot,
    (path) => path.endsWith(".md") && new RegExp(context.config.decisions.adrPathPattern).test(path),
  );

  const indexEntries: AdrIndexEntry[] = [];

  for (const file of adrFiles) {
    const text = readText(context.root, file);
    const fields = parseMetadataTable(text);
    const title = parseAdrTitle(context, text, file);
    const status = fields.get("status") ?? fields.get("stato") ?? "";
    const date = fields.get("date") ?? fields.get("data") ?? "";
    const category = fields.get(context.config.decisions.categoryField.toLowerCase()) ?? "";
    const area = fields.get(context.config.decisions.areaField.toLowerCase()) ?? "";
    const summary = fields.get("summary") ?? "";
    const supersededBy =
      fields.get("replaced by") ?? fields.get("superseded by") ?? fields.get("sostituita da") ?? "";

    if (context.config.decisions.requireTemplateSections) {
      for (const section of context.requiredAdrSections) {
        if (!text.includes(section)) {
          context.add("error", "adr-required-section", `ADR is missing required section: ${section}`, file);
        }
      }
    }

    if (!new RegExp(context.config.decisions.datePattern).test(text)) {
      context.add("warning", "adr-date", "ADR is missing a YYYY-MM-DD date in the opening metadata table.", file);
    }

    if (!isUsableMetadata(status)) {
      context.add("warning", "adr-status", "ADR is missing a Status field in the opening metadata.", file);
    }

    if (isProvisionalAdrStatus(status)) {
      context.add(
        "warning",
        "adr-provisional-status",
        "ADR status looks provisional. Keep undecided alternatives in Open Discussion or analysis until the decision is explicit.",
        file,
      );
    }

    if (isAcceptedStatus(status)) {
      checkCompletionVerification(context, text, file, "adr");
    }

    if (!isUsableMetadata(category)) {
      context.add(
        "warning",
        "adr-category",
        `ADR is missing a classifiable ${context.config.decisions.categoryField} in the opening metadata table.`,
        file,
      );
    }

    if (!isUsableMetadata(area)) {
      context.add(
        "warning",
        "adr-area",
        `ADR is missing a classifiable ${context.config.decisions.areaField} in the opening metadata table.`,
        file,
      );
    }

    indexEntries.push({ file, title, status, date, category, area, summary, supersededBy });
  }

  writeAdrIndex(context, indexEntries);
}

function parseAdrTitle(context: LintContext, text: string, file: string): string {
  const firstHeading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (firstHeading) return firstHeading;
  return stripDecisionRoot(context, file).replace(/\.md$/, "");
}

function isProvisionalAdrStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();
  return ["draft", "planned", "backlog", "waiting", "blocked", "bozza", "pianificato", "pianificata"].includes(
    normalized,
  );
}

function stripDecisionRoot(context: LintContext, file: string): string {
  const root = context.config.decisions.root.replace(/\\/g, "/").replace(/\/$/, "");
  if (root && file.startsWith(`${root}/`)) {
    return file.slice(root.length + 1);
  }
  return file.replace(/^decisions\//, "");
}

function adrLink(context: LintContext, entry: AdrIndexEntry): string {
  const indexPath = configuredIndexPath(
    context.config.decisions.indexPath,
    context.config.decisions.root || "decisions",
  );
  return `[${markdownCell(entry.title)}](${relativeFromIndex(indexPath, entry.file)})`;
}

function writeAdrIndex(context: LintContext, entries: AdrIndexEntry[]): void {
  const indexPath = configuredIndexPath(
    context.config.decisions.indexPath,
    context.config.decisions.root || "decisions",
  );
  if (!indexPath) return;

  const classified = entries.filter((entry) => isUsableMetadata(entry.category) && isUsableMetadata(entry.area));
  const unclassified = entries.filter((entry) => !isUsableMetadata(entry.category) || !isUsableMetadata(entry.area));

  const lines: string[] = [
    "# ADR Index",
    "",
    "Generated by `npm run pom:lint` from ADR metadata. Do not edit manually.",
    "",
    "## Classified ADRs",
    "",
  ];

  if (classified.length === 0) {
    lines.push("_No classified ADRs._", "");
  } else {
    const grouped = new Map<string, AdrIndexEntry[]>();
    for (const entry of classified) {
      const key = `${entry.category} / ${entry.area}`;
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }

    for (const [group, groupEntries] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`### ${group}`, "");
      lines.push("| ADR | Status | Date | Summary | Replaced by |");
      lines.push("|---|---|---|---|---|");
      for (const entry of groupEntries.sort((a, b) => a.file.localeCompare(b.file))) {
        lines.push(
          `| ${adrLink(context, entry)} | ${markdownCell(entry.status)} | ${markdownCell(entry.date)} | ${markdownCell(
            truncateSummary(entry.summary),
          )} | ${markdownCell(entry.supersededBy)} |`,
        );
      }
      lines.push("");
    }
  }

  lines.push("## Unclassified ADRs", "");
  if (unclassified.length === 0) {
    lines.push("_No unclassified ADRs._", "");
  } else {
    lines.push("| ADR | Status | Date | Summary | Category | Area |");
    lines.push("|---|---|---|---|---|---|");
    for (const entry of unclassified.sort((a, b) => a.file.localeCompare(b.file))) {
      lines.push(
        `| ${adrLink(context, entry)} | ${markdownCell(entry.status)} | ${markdownCell(entry.date)} | ${markdownCell(
          truncateSummary(entry.summary),
        )} | ${markdownCell(entry.category)} | ${markdownCell(entry.area)} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Rule", "");
  lines.push("- The authoritative decision source remains the individual ADR.");
  lines.push("- This index is a generated navigation and search view.");
  lines.push("- Fine-grained history remains in Git.");
  lines.push("");

  const content = `${lines.join("\n")}`;
  const absolutePath = join(context.root, indexPath);
  mkdirSync(dirname(absolutePath), { recursive: true });

  if (!existsSync(absolutePath) || readFileSync(absolutePath, "utf8") !== content) {
    writeFileSync(absolutePath, content);
  }
}
