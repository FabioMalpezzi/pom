// Persistence for `pom:tandem`: state.json, the append-only LEDGER.md, the
// numbered turn files, and the BRIEF.md sections the script owns.
//
// Layout of a collaboration folder (default collaboration/<slug>/):
//   BRIEF.md              goal, roles, rules, tasks, outcome (from the template)
//   LEDGER.md             one `## [timestamp] <role> | task <id> | cycle <n> | <event>` per action
//   state.json            roles, backends, sessions, tasks, cap, budget
//   turns/NNN-<role>-<task>.md   message sent and reply received, one file per call
//   .controller-worktree/ Git worktree of the controller (ignored by Git)
//   .sessions/            pi session storage (ignored by Git)

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const TASK_STATUSES = ["pending", "in_progress", "approved", "stalled", "escalated"];
export const CONTROLLER_WORKTREE_DIRNAME = ".controller-worktree";
export const SESSIONS_DIRNAME = ".sessions";

/** Files the collaboration folder keeps out of Git: the nested worktree and the session store. */
// Default: full responses under turns/ are raw evidence and stay out of Git;
// BRIEF.md and LEDGER.md are the tracked record. `init --track-turns` keeps turns/ versioned.
export const COLLABORATION_GITIGNORE_LINES = [`${CONTROLLER_WORKTREE_DIRNAME}/`, `${SESSIONS_DIRNAME}/`, "turns/"];
export const COLLABORATION_GITIGNORE_TRACKED_TURNS_LINES = [`${CONTROLLER_WORKTREE_DIRNAME}/`, `${SESSIONS_DIRNAME}/`];

/**
 * Writes the collaboration `.gitignore`, or adds only the missing lines when
 * the folder already has one (a hand-edited ignore file is never overwritten).
 * @returns {string[]} the lines that were added
 */
export function ensureGitignoreLines(path, lines) {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const present = new Set(existing.split(/\r?\n/).map((line) => line.trim()));
  const missing = lines.filter((line) => !present.has(line));
  if (missing.length === 0 && existing !== "") return [];
  const separator = existing === "" || existing.endsWith("\n") ? "" : "\n";
  writeFileSync(path, `${existing}${separator}${missing.map((line) => `${line}\n`).join("")}`);
  return missing;
}

export function timestamp(date = new Date()) {
  return date.toISOString().slice(0, 16);
}

export function statePath(dir) {
  return join(dir, "state.json");
}

export function loadState(dir) {
  const path = statePath(dir);
  if (!existsSync(path)) throw new Error(`No tandem state at ${path}. Run \`init\` first (or pass --dir).`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`state.json is not valid JSON: ${path}; restore it from Git or re-run init --reopen after fixing it`);
  }
}

/** Atomic: the JSON goes to a temporary file first, then `rename` replaces state.json in one step. */
export function saveState(dir, state) {
  state.updated = new Date().toISOString();
  const path = statePath(dir);
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(temporary, path);
}

/** The key of a task in the per-phase budget map: its phase label, or `-` when it has none. */
export function phaseKey(task) {
  return task.phase || "-";
}

/**
 * Units of the phase budget still available to a phase. Every phase starts
 * with the full budget the first time one of its tasks consumes a unit.
 * @returns {number | null} null when the tandem has no phase budget
 */
export function phaseBudgetRemaining(state, task) {
  if (state.phaseBudget === null) return null;
  const remaining = state.phaseBudgetRemaining && typeof state.phaseBudgetRemaining === "object" ? state.phaseBudgetRemaining : {};
  const value = remaining[phaseKey(task)];
  return Number.isInteger(value) ? value : state.phaseBudget;
}

/** One `<phase>: <remaining> of <budget>` fragment per phase present in the tasks, `-` for tasks without a phase. */
export function phaseBudgetSummary(state) {
  if (state.phaseBudget === null) return "none";
  const phases = [...new Set(state.tasks.map(phaseKey))];
  if (phases.length === 0) return `${state.phaseBudget} per phase`;
  const parts = phases.map((phase) => `${phase}: ${phaseBudgetRemaining(state, { phase: phase === "-" ? null : phase })} remaining of ${state.phaseBudget}`);
  return `${state.phaseBudget} per phase (${parts.join(", ")})`;
}

export function findTask(state, id) {
  const task = state.tasks.find((entry) => entry.id === id);
  if (!task) throw new Error(`Unknown task "${id}". Known tasks: ${state.tasks.map((entry) => entry.id).join(", ") || "none"}.`);
  return task;
}

/**
 * Appends one ledger entry: the heading line, then the turn path when the
 * entry comes from a backend call, then an optional free-text note.
 * @param {string} dir
 * @param {{ role: string, taskId: string, cycle: number | string, event: string, turnPath?: string, note?: string }} entry
 */
export function appendLedger(dir, { role, taskId, cycle, event, turnPath, note }) {
  const lines = [`## [${timestamp()}] ${role} | task ${taskId} | cycle ${cycle} | ${event}`];
  if (turnPath) lines.push(`turn: ${turnPath}`);
  if (note) lines.push(note);
  lines.push("");
  appendFileSync(join(dir, "LEDGER.md"), `${lines.join("\n")}\n`);
}

/** Next zero-padded turn number, derived from the files already on disk. */
export function nextTurnNumber(dir) {
  const turnsDir = join(dir, "turns");
  mkdirSync(turnsDir, { recursive: true });
  const numbers = readdirSync(turnsDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.match(/^(\d{3})-/))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

/**
 * Writes a turn file and returns its path relative to the collaboration folder.
 * @param {string} dir
 * @param {{ role: string, taskId: string, metadata: Record<string, string>, message: string, reply: string }} turn
 */
export function writeTurn(dir, { role, taskId, metadata, message, reply }) {
  const number = String(nextTurnNumber(dir)).padStart(3, "0");
  const relativePath = `turns/${number}-${role}-${taskId}.md`;
  const rows = Object.entries(metadata).map(([key, value]) => `| ${key} | ${escapeCell(value)} |`);
  const content = [
    `# Turn ${number} - ${role} - task ${taskId}`,
    "",
    "| Field | Value |",
    "|---|---|",
    ...rows,
    "",
    "## Message",
    "",
    message.trim(),
    "",
    "## Reply",
    "",
    reply.trim() || "(empty reply)",
    "",
  ].join("\n");
  writeFileSync(join(dir, relativePath), content);
  return relativePath;
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * Markdown table of the tasks, shared by BRIEF.md and `status`, followed by
 * the definition of done of every task that has one (`task add --done`).
 */
export function tasksTable(state) {
  const header = ["| Id | Title | Phase | Status | Cycles |", "|---|---|---|---|---|"];
  if (state.tasks.length === 0) return [...header, "| - | (no task yet) | - | - | - |"].join("\n");
  const rows = state.tasks.map((task) => `| ${task.id} | ${escapeCell(task.title)} | ${task.phase || "-"} | ${task.status} | ${task.cycles}/${state.cap} |`);
  const done = state.tasks.filter((task) => task.done).map((task) => `- ${task.id}: ${escapeCell(task.done)}`);
  const lines = [...header, ...rows];
  if (done.length) lines.push("", "Definition of done:", "", ...done);
  return lines.join("\n");
}

/**
 * Replaces the body of a `## Heading` section (up to the next `## ` heading)
 * in a Markdown document; appends the section when it is missing.
 */
export function replaceSection(markdown, heading, body) {
  const pattern = new RegExp(`(^|\\n)## ${escapeRegExp(heading)}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`);
  const replacement = `$1## ${heading}\n\n${body.trim()}\n`;
  if (pattern.test(markdown)) return markdown.replace(pattern, replacement);
  return `${markdown.replace(/\s*$/, "")}\n\n## ${heading}\n\n${body.trim()}\n`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Fills the template placeholders (see templates/TANDEM_BRIEF_TEMPLATE.md) from the state. */
export function renderBrief(template, state) {
  const role = (name) => state.roles[name];
  const values = {
    "<topic>": state.topic,
    "<YYYY-MM-DD>": state.created.slice(0, 10),
    "<controller backend>": role("controller").backend,
    "<controller model>": role("controller").model || "(backend default)",
    "<executor backend>": role("executor").backend,
    "<executor model>": role("executor").model || "(backend default)",
    "<controller worktree>": state.controllerWorktree,
    "<folder>": state.dir,
    "<setup>": state.setup ? `\`${state.setup}\` (run in the controller worktree at init and at reopen)` : "none",
    "<guard ignore>": `\`*.log\`, \`*.pid\` under ignored folders${(state.guardIgnore || []).length ? `; plus ${state.guardIgnore.map((glob) => `\`${glob}\``).join(", ")}` : ""}`,
    "<cap>": String(state.cap),
    "<phase budget>": state.phaseBudget === null ? "none" : String(state.phaseBudget),
    "<model diversity>": state.modelDiversity,
  };
  let brief = template;
  for (const [placeholder, value] of Object.entries(values)) brief = brief.split(placeholder).join(value);
  return replaceSection(brief, "Tasks", tasksTable(state));
}

export function readBrief(dir) {
  return readFileSync(join(dir, "BRIEF.md"), "utf8");
}

export function writeBrief(dir, content) {
  writeFileSync(join(dir, "BRIEF.md"), content);
}
