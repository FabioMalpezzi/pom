// Fixed message contracts exchanged by `pom:tandem` (scripts/tandem.mjs).
//
// The skill (skills/tandem.md) quotes these texts; keeping them here means
// the script and the skill say the same thing. Only the parsing helpers know
// the shape of the replies, so a change to the contract lands in one file.

/** The verdict line the controller must put first when it reviews. */
export const VERDICT_APPROVE = "VERDICT: APPROVE";
export const VERDICT_REVISE = "VERDICT: REVISE";

/** The one finding format, quoted by the review contract, the skill, and the prompt. */
export const FINDING_FORMAT = "N. blocking|minor | <location> | <what is wrong> | <evidence that would satisfy you>";

/** Instructions appended to every review request sent to the controller. */
export const REVIEW_CONTRACT = [
  "Reply with exactly: a first line `VERDICT: APPROVE` or `VERDICT: REVISE` (nothing before it, one VERDICT line only),",
  `then a line \`FINDINGS:\` followed by one numbered finding per line in the format \`${FINDING_FORMAT}\`.`,
  "You may run tests, builds, and scripts inside your own worktree to verify.",
  "Do not modify the executor workspace; your worktree is reset after this review.",
].join(" ");

/** Instructions appended to every findings hand-off sent to the executor. */
export const RESPOND_CONTRACT = [
  "For each finding N reply on its own line `F<N>: FIXED <what changed, files>` or `F<N>: DISPUTED <evidence>`",
  "(N is the finding number; a blocking finding disputed without evidence is not accepted); then apply fixes in the workspace.",
].join(" ");

/**
 * Builds the review request for the controller.
 * @param {{ taskId: string, title: string, done?: string | null, deliverable: string, checked: string }} input
 *   `done` is the definition of done written in the brief for this task
 *   (`task add --done`), when present; `checked` describes the revision the
 *   controller worktree was synchronised to (commit id, plus "with
 *   uncommitted changes applied" when a patch was applied), so the verdict is
 *   anchored to something reproducible.
 */
export function reviewMessage({ taskId, title, done = null, deliverable, checked }) {
  return [
    `Review task ${taskId}: ${title}.`,
    `Definition of done: ${title}${done ? ` - ${done.trim()}` : ""}`,
    `Deliverable: ${deliverable}`,
    `Checked revision: ${checked}.`,
    REVIEW_CONTRACT,
  ].join("\n");
}

/**
 * Builds the findings hand-off for the executor.
 * @param {{ taskId: string, title: string, findings: string }} input
 */
export function respondMessage({ taskId, title, findings }) {
  return [
    `Findings on task ${taskId}: ${title}.`,
    "",
    findings.trim(),
    "",
    RESPOND_CONTRACT,
  ].join("\n");
}

/** Removes the Markdown emphasis tolerated around a contract line: `**`, backticks, and spaces. */
function stripEmphasis(line) {
  return line.replace(/[*`]/g, "").trim();
}

/**
 * Reads the verdict from a controller reply. The verdict is the FIRST
 * non-empty line, after removing `**`, backticks, and spaces, and must be
 * exactly `VERDICT: APPROVE` or `VERDICT: REVISE` (case-insensitive): a verdict buried after a
 * preamble, quoted inside a sentence, or written as a list item does not
 * count. Two VERDICT lines with different values anywhere in the reply are a
 * contradiction. Both cases are non-conforming (exit 2 in the script).
 * @param {string} reply
 * @returns {{ verdict: "APPROVE" | "REVISE" | null, problem: string | null }}
 */
export function parseVerdict(reply) {
  const lines = reply.split(/\r?\n/);
  const mentioned = new Set();
  for (const line of lines) {
    const match = stripEmphasis(line).match(/^[\s#>-]*VERDICT:\s*(APPROVE|REVISE)\b/i);
    if (match) mentioned.add(match[1].toUpperCase());
  }
  if (mentioned.size > 1) {
    return { verdict: null, problem: "the reply contains both `VERDICT: APPROVE` and `VERDICT: REVISE`" };
  }
  const first = lines.map(stripEmphasis).find((line) => line !== "");
  const match = first === undefined ? null : first.match(/^VERDICT:\s*(APPROVE|REVISE)$/i);
  if (!match) return { verdict: null, problem: "the first non-empty line is not `VERDICT: APPROVE` or `VERDICT: REVISE`" };
  return { verdict: match[1].toUpperCase() === "APPROVE" ? "APPROVE" : "REVISE", problem: null };
}

/**
 * Returns the findings block of a controller reply (everything from the
 * `FINDINGS:` line on), or the whole reply when the marker is missing so the
 * executor still receives what the controller wrote.
 * @param {string} reply
 */
export function extractFindings(reply) {
  const index = reply.search(/^\s*[*_`#>-]*\s*FINDINGS:/im);
  return (index >= 0 ? reply.slice(index) : reply).trim();
}

/**
 * Reads the number and severity of each finding in a findings block written
 * in the contract format (`N. blocking|minor | ...`; the older `N. blocking -`
 * shape is tolerated). Findings without a recognisable severity are skipped.
 * @param {string} findings
 * @returns {{ id: string, severity: "blocking" | "minor" }[]}
 */
export function parseFindings(findings) {
  const items = [];
  for (const rawLine of findings.split(/\r?\n/)) {
    const match = stripEmphasis(rawLine).match(/^[\s#>-]*(\d+)[.)]\s*(?:\[\s*)?(blocking|minor)\b/i);
    if (match) items.push({ id: `F${match[1]}`, severity: match[2].toLowerCase() === "blocking" ? "blocking" : "minor" });
  }
  return items;
}

/**
 * Splits an executor reply into `F<n>: FIXED|DISPUTED` items. Tolerated
 * shapes: `1. F1: FIXED`, `1) F1: FIXED`, `**F1**: FIXED`, `F1 - FIXED`,
 * `- F1: FIXED`.
 * @param {string} reply
 * @returns {{ id: string, status: "FIXED" | "DISPUTED", detail: string }[]}
 */
export function parseFindingReplies(reply) {
  const items = [];
  for (const rawLine of reply.split(/\r?\n/)) {
    const match = stripEmphasis(rawLine).match(/^[\s#>-]*(?:\d+[.)]\s*)?(F\d+)\s*[:\-–]\s*(FIXED|DISPUTED)\b\s*[:\-–]?\s*(.*)$/i);
    if (match) items.push({ id: match[1].toUpperCase(), status: match[2].toUpperCase() === "FIXED" ? "FIXED" : "DISPUTED", detail: match[3].trim() });
  }
  return items;
}

/** Evidence after `DISPUTED` must carry at least this many letters or digits (a dash or "see above" is not evidence). */
export const MIN_EVIDENCE_CHARS = 12;

function hasEvidence(detail) {
  return (detail.match(/[\p{L}\p{N}]/gu) || []).length >= MIN_EVIDENCE_CHARS;
}

/**
 * Names the blocking findings the executor disputed without evidence after
 * `DISPUTED` (fewer than MIN_EVIDENCE_CHARS letters or digits); such a reply
 * is non-conforming.
 * @param {string} findings the findings block sent to the executor
 * @param {{ id: string, status: string, detail: string }[]} replies
 * @returns {string[]} finding ids
 */
export function disputedWithoutEvidence(findings, replies) {
  const blocking = new Set(parseFindings(findings).filter((item) => item.severity === "blocking").map((item) => item.id));
  return replies.filter((item) => item.status === "DISPUTED" && !hasEvidence(item.detail) && blocking.has(item.id)).map((item) => item.id);
}
