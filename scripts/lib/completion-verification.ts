export type CompletionDocType = "task" | "adr" | "spec";

export type CompletionVerificationFinding = {
  severity: "warning";
  rule: string;
  message: string;
  file: string;
};

export function parseMetadataTable(text: string): Map<string, string> {
  const fields = new Map<string, string>();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;

    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

    if (cells.length < 2) continue;
    if (["field", "campo"].includes(cells[0].toLowerCase())) continue;

    fields.set(cells[0].toLowerCase(), cells[1]);
  }

  for (const match of text.matchAll(/^\*\*([^*:\n]+):?\*\*\s*:?\s*(.+)$/gm)) {
    const key = match[1]?.trim().toLowerCase();
    const value = match[2]?.trim();
    if (key && value && !fields.has(key)) {
      fields.set(key, value);
    }
  }

  return fields;
}

export function parseDocumentStatus(text: string): string {
  const fields = parseMetadataTable(text);
  const metadataStatus = fields.get("status") ?? fields.get("stato") ?? "";
  if (isUsableMetadata(metadataStatus)) return metadataStatus;

  const statusSection = text.match(/^## Status\s*\n+([^\n#]+)/m)?.[1]?.trim() ?? "";
  return statusSection;
}

export function isCompleteStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();
  return (
    normalized === "complete" ||
    normalized === "completed" ||
    normalized === "done" ||
    normalized.startsWith("complete with exceptions")
  );
}

export function isAcceptedStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();
  return normalized === "accepted" || normalized.startsWith("accepted with exceptions");
}

export function isUsableMetadata(value: string): boolean {
  if (!value.trim()) return false;
  const normalized = value.toLowerCase();
  return !["none", "nessuno", "n/a", "na", "-", "tbd", "todo", "to define", "da definire"].includes(normalized);
}

export function hasCompletionVerificationSection(text: string): boolean {
  return /## Completion Verification/i.test(text) || /## Verification/i.test(text);
}

export function hasGoalBackwardCheck(text: string): boolean {
  return /goal-backward/i.test(text) || /what must be true/i.test(text);
}

export function hasThesisAntithesis(text: string): boolean {
  return /### Thesis/i.test(text) && /### Antithesis/i.test(text);
}

export function hasScenarioTests(text: string): boolean {
  return /scenario test/i.test(text) || /positive scenario/i.test(text) || /error\/misuse/i.test(text);
}

export function hasExceptionReason(text: string): boolean {
  const match = text.match(/Exception reason:\s*(.+)/i);
  if (!match) return false;
  const reason = match[1].trim();
  return reason !== "_none_" && reason !== "none" && reason.length > 0;
}

export function completionVerificationFindings(
  text: string,
  file: string,
  docType: CompletionDocType,
): CompletionVerificationFinding[] {
  const label = docType === "adr" ? "ADR" : "Document";
  const closedStatus = docType === "adr" ? "Accepted" : "Complete";

  if (!hasCompletionVerificationSection(text)) {
    return [
      {
        severity: "warning",
        rule: "completion-verification-missing",
        message: `${label} is marked ${closedStatus} but has no Completion Verification section.`,
        file,
      },
    ];
  }

  if (hasExceptionReason(text)) {
    return [
      {
        severity: "warning",
        rule: "completion-verification-exception",
        message: `${label} is ${closedStatus} with exceptions. Review the exception reason.`,
        file,
      },
    ];
  }

  if (docType === "adr" && !hasThesisAntithesis(text)) {
    return [
      {
        severity: "warning",
        rule: "completion-verification-thesis",
        message: "ADR is marked Accepted but Thesis/Antithesis sections are empty or missing.",
        file,
      },
    ];
  }

  return [];
}
