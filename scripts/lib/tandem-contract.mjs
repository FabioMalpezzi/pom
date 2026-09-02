// Fixed message contracts exchanged by `pom:tandem` (scripts/tandem.mjs).
//
// The skill (skills/tandem.md) quotes these texts; keeping them here means
// the script and the skill say the same thing. Only the parsing helpers know
// the shape of the replies, so a change to the contract lands in one file.

/** The verdict line the controller must put first when it reviews. */
export const VERDICT_APPROVE = "VERDICT: APPROVE";
export const VERDICT_REVISE = "VERDICT: REVISE";

/** Instructions appended to every review request sent to the controller. */
export const REVIEW_CONTRACT = [
  "Reply with exactly: a first line `VERDICT: APPROVE` or `VERDICT: REVISE`,",
  "then a numbered list `FINDINGS:` where each finding has severity blocking|minor,",
  "location, what is wrong, what evidence would satisfy you.",
  "You may run tests, builds, and scripts inside your own worktree to verify.",
  "Do not modify the executor workspace; your worktree is reset after this review.",
].join(" ");

/** Instructions appended to every findings hand-off sent to the executor. */
export const RESPOND_CONTRACT = [
  "For each finding reply `F<n>: FIXED <what changed, files>` or `F<n>: DISPUTED <evidence>`;",
  "then apply fixes in the workspace.",
].join(" ");

/**
 * Builds the review request for the controller.
 * @param {{ taskId: string, title: string, deliverable: string, checked: string }} input
 *   `checked` describes the revision the controller worktree was synchronised
 *   to (commit id, plus "with uncommitted changes applied" when a patch was
 *   applied), so the verdict is anchored to something reproducible.
 */
export function reviewMessage({ taskId, title, deliverable, checked }) {
  return [
    `Review task ${taskId}: ${title}.`,
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

/**
 * Reads the verdict from a controller reply. The contract asks for the
 * verdict on the first line; a reply that buries it after a preamble is still
 * accepted, a reply without any `VERDICT:` line is `null` (indeterminate).
 * @param {string} reply
 * @returns {"APPROVE" | "REVISE" | null}
 */
export function parseVerdict(reply) {
  for (const rawLine of reply.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[*_`#>\s-]+|[*_`\s]+$/g, "");
    const match = line.match(/^VERDICT:\s*(APPROVE|REVISE)\b/i);
    if (match) return match[1].toUpperCase() === "APPROVE" ? "APPROVE" : "REVISE";
  }
  return null;
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
 * Splits an executor reply into `F<n>: FIXED|DISPUTED` items.
 * @param {string} reply
 * @returns {{ id: string, status: "FIXED" | "DISPUTED", detail: string }[]}
 */
export function parseFindingReplies(reply) {
  const items = [];
  for (const rawLine of reply.split(/\r?\n/)) {
    const match = rawLine.trim().match(/^[*_`#>\s-]*(F\d+)\s*:\s*(FIXED|DISPUTED)\b\s*(.*)$/i);
    if (match) items.push({ id: match[1].toUpperCase(), status: match[2].toUpperCase() === "FIXED" ? "FIXED" : "DISPUTED", detail: match[3].trim() });
  }
  return items;
}
