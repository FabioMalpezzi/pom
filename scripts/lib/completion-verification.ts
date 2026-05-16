export type CompletionDocType = "task" | "adr" | "spec";

export type CompletionVerificationFinding = {
  severity: "warning";
  rule: string;
  message: string;
  file: string;
};

export function parseMetadataTable(text: string): Map<string, string> {
  const fields = new Map<string, string>();
  const openingBlock = openingMetadataBlock(text);

  for (const line of openingTableLines(openingBlock)) {
    const trimmed = line.trim();
    if (/^\|\s*-+/.test(trimmed)) continue;

    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

    if (cells.length < 2) continue;
    if (["field", "campo"].includes(cells[0].toLowerCase())) continue;

    fields.set(cells[0].toLowerCase(), cells[1]);
  }

  for (const match of openingBlock.matchAll(/^\*\*([^*:\n]+):?\*\*\s*:?\s*(.+)$/gm)) {
    const key = match[1]?.trim().toLowerCase();
    const value = match[2]?.trim();
    if (key && value && !fields.has(key)) {
      fields.set(key, value);
    }
  }

  return fields;
}

function openingMetadataBlock(text: string): string {
  const lines = text.split("\n");
  let index = 0;

  if (lines[index]?.trim() === "---") {
    index++;
    while (index < lines.length && lines[index].trim() !== "---") index++;
    if (index < lines.length) index++;
  }

  while (index < lines.length && (lines[index].trim() === "" || /^#(?!#)\s+/.test(lines[index].trim()))) {
    index++;
  }

  const block: string[] = [];
  while (index < lines.length && !/^##\s+/.test(lines[index])) {
    block.push(lines[index]);
    index++;
  }

  return block.join("\n");
}

function openingTableLines(text: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("|") && trimmed.endsWith("|");
  });
  if (start < 0 || lines.slice(0, start).some((line) => line.trim())) return [];

  const table: string[] = [];
  for (let index = start; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) break;
    table.push(lines[index]);
  }
  return table;
}

export function parseDocumentStatus(text: string): string {
  const fields = parseMetadataTable(text);
  const metadataStatus = fields.get("status") ?? fields.get("stato") ?? "";
  if (isUsableMetadata(metadataStatus)) return metadataStatus;

  const statusSection = text.match(/^## (?:Status|Stato)\s*\n+([^\n#]+)/im)?.[1]?.trim() ?? "";
  return statusSection;
}

export function isCompleteStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();
  return (
    normalized === "complete" ||
    normalized === "completed" ||
    normalized === "done" ||
    normalized === "completo" ||
    normalized === "completato" ||
    normalized === "completata" ||
    normalized === "fatto" ||
    normalized === "fatta" ||
    normalized.startsWith("complete with exceptions") ||
    normalized.startsWith("completo con eccezioni") ||
    normalized.startsWith("completato con eccezioni") ||
    normalized.startsWith("completata con eccezioni")
  );
}

export function isAcceptedStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();
  return (
    normalized === "accepted" ||
    normalized === "accettato" ||
    normalized === "accettata" ||
    normalized.startsWith("accepted with exceptions") ||
    normalized.startsWith("accettato con eccezioni") ||
    normalized.startsWith("accettata con eccezioni")
  );
}

export function isUsableMetadata(value: string): boolean {
  if (!value.trim()) return false;
  const normalized = value.toLowerCase();
  return !["none", "nessuno", "n/a", "na", "-", "tbd", "todo", "to define", "da definire"].includes(normalized);
}

export function hasCompletionVerificationSection(text: string): boolean {
  return /## Completion Verification/i.test(text) || /## Verification/i.test(text) || /## Verifica/i.test(text);
}

export function hasGoalBackwardCheck(text: string): boolean {
  return /goal-backward/i.test(text) || /what must be true/i.test(text) || /cosa deve essere vero/i.test(text);
}

export function hasThesisAntithesis(text: string): boolean {
  return (/### Thesis/i.test(text) || /### Tesi/i.test(text)) && (/### Antithesis/i.test(text) || /### Antitesi/i.test(text));
}

export function hasScenarioTests(text: string): boolean {
  return /scenario test/i.test(text) || /positive scenario/i.test(text) || /error\/misuse/i.test(text) || /test di scenario/i.test(text);
}

export function hasExceptionReason(text: string): boolean {
  const match = text.match(/(?:Exception reason|Motivo eccezione|Motivo dell'eccezione):\s*(.+)/i);
  if (!match) return false;
  const reason = match[1].trim();
  return !["_none_", "none", "_nessuna_", "nessuna"].includes(reason.toLowerCase()) && reason.length > 0;
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
