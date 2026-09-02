#!/usr/bin/env node
// pom:tandem - two coding agents, one controller and one executor, working on
// the same deliverable through persistent non-interactive sessions.
//
// Usage (from the target project root):
//   node scripts/tandem.mjs init --topic <slug> --controller <backend>[:<model>] --executor <backend>[:<model>]
//                              [--dir <path>] [--cap 4] [--phase-budget N] [--controller-worktree <path>]
//   node scripts/tandem.mjs task add --topic <slug> --id T1 --title "<...>" [--phase <label>]
//   node scripts/tandem.mjs task list --topic <slug>        (alias: status --topic <slug>)
//   node scripts/tandem.mjs send --topic <slug> --role controller|executor --task T1 (--message "<text>" | --message-file <path>)
//   node scripts/tandem.mjs review --topic <slug> --task T1 --deliverable <path or text>
//   node scripts/tandem.mjs respond --topic <slug> --task T1 [--findings <path or text>]
//   node scripts/tandem.mjs close --topic <slug> [--keep-worktrees]
//
// Backends: pi, codex, claude (see scripts/lib/tandem-backends.mjs). The
// executor writes in the project root; the controller runs inside its own Git
// worktree, synchronised to the executor's revision before every call and
// reset afterwards (scripts/lib/tandem-git.mjs). The contracts the two roles
// must honour live in scripts/lib/tandem-contract.mjs.
//
// Exit codes: 0 ok, 1 usage or backend error, 2 reply without a verdict,
// 3 cap or phase budget reached, 4 the controller modified the executor
// workspace. Set POM_TANDEM_FAKE_BACKEND=<script> to replace the real
// executables (tests), POM_TANDEM_TIMEOUT_MS to bound a single call.
//
// Target-installed: the installer registers it as `npm run pom:tandem`.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hasArg, positionalArgs, readRawArg, unknownOptions } from "./lib/cli-args.mjs";
import { buildInvocation, extractReply, initialSessionId, parseAgentSpec, runBackend } from "./lib/tandem-backends.mjs";
import { extractFindings, parseFindingReplies, parseVerdict, respondMessage, reviewMessage } from "./lib/tandem-contract.mjs";
import {
  createControllerWorktree, fingerprintsEqual, headCommit, isGitWorktree, removeControllerWorktree,
  restoreControllerWorktree, syncControllerWorktree, workspaceFingerprint,
} from "./lib/tandem-git.mjs";
import {
  COLLABORATION_GITIGNORE, COLLABORATION_GITIGNORE_TRACKED_TURNS, CONTROLLER_WORKTREE_DIRNAME, SESSIONS_DIRNAME, appendLedger, findTask, loadState,
  nextTurnNumber, readBrief, renderBrief, replaceSection, saveState, tasksTable, writeBrief, writeTurn,
} from "./lib/tandem-state.mjs";

const ROOT = process.cwd();
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EXIT = { OK: 0, USAGE: 1, NONCONFORMING: 2, LIMIT: 3, TAMPER: 4 };
const ROLES = ["controller", "executor"];
const VALUE_OPTIONS = [
  "topic", "dir", "controller", "executor", "cap", "phase-budget", "controller-worktree",
  "id", "title", "phase", "role", "task", "message", "message-file", "deliverable", "findings",
];
const FLAG_OPTIONS = ["keep-worktrees", "help"];
const USAGE = [
  "Usage: node scripts/tandem.mjs <command> [options]",
  "  init --topic <slug> --controller <backend>[:<model>] --executor <backend>[:<model>] [--dir <path>] [--cap 4] [--phase-budget N] [--controller-worktree <path>] [--track-turns]",
  "  task add --topic <slug> --id <id> --title <title> [--phase <label>]",
  "  task list | status --topic <slug>",
  "  send --topic <slug> --role controller|executor --task <id> (--message <text> | --message-file <path>)",
  "  review --topic <slug> --task <id> --deliverable <path or text>",
  "  respond --topic <slug> --task <id> [--findings <path or text>]",
  "  close --topic <slug> [--keep-worktrees]",
  "Exit codes: 0 ok, 1 usage/backend error, 2 reply without VERDICT, 3 cap or phase budget reached, 4 controller modified the executor workspace.",
].join("\n");
const SAME_MODEL_WARNING = "controller and executor share the same backend and model; independence relies on separate sessions only";

/**
 * Full responses under turns/ are raw evidence: unless the tandem was
 * initialised with --track-turns they must stay out of Git. Warn when the
 * ignore rule was removed, so the check does not depend on the coordinator
 * remembering it.
 */
function ensureTurnsPolicy(dir, state) {
  if (state.trackTurns) return;
  const result = spawnSync("git", ["check-ignore", "-q", "--", join(dir, "turns")], { cwd: ROOT, stdio: "ignore" });
  if (result.status !== 0) {
    console.error(`warning: ${displayPath(join(dir, "turns"))} is not ignored by Git; restore "turns/" in ${displayPath(join(dir, ".gitignore"))} or re-run init with --track-turns.`);
  }
}

/**
 * Prints a role reply between clear delimiters so the coordinator can relay
 * it verbatim in its chat: the user reads reviews through the coordinator,
 * not through this output.
 */
function printReply(roleName, taskId, outcome) {
  console.log(`=== ${roleName} reply | task ${taskId} | ${outcome.turnPath} ===`);
  console.log(outcome.reply);
  console.log(`=== end of ${roleName} reply ===`);
}

class TandemError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/** Aborts the command; `main` turns the error into stderr text and the exit code (so `finally` blocks still run). */
function fail(message, code = EXIT.USAGE) {
  throw new TandemError(message, code);
}

function requireArg(argv, name) {
  const value = readRawArg(name, argv);
  if (value === undefined || value === "") fail(`Missing --${name}.\n${USAGE}`);
  return value;
}

function positiveInteger(argv, name, fallback) {
  const raw = readRawArg(name, argv);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) fail(`--${name} must be a positive integer (got "${raw}").`);
  return value;
}

function collaborationDir(argv) {
  const dir = readRawArg("dir", argv);
  if (dir) return resolve(ROOT, dir);
  const topic = requireArg(argv, "topic");
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(topic)) fail(`--topic must be a slug (letters, digits, ".", "_", "-"); got "${topic}".`);
  return resolve(ROOT, "collaboration", topic);
}

function displayPath(path) {
  const rel = relative(ROOT, path);
  return rel && !rel.startsWith("..") ? rel : path;
}

function resolveBriefTemplate() {
  const candidates = [
    join(ROOT, "pom", "templates", "TANDEM_BRIEF_TEMPLATE.md"),
    join(ROOT, "templates", "TANDEM_BRIEF_TEMPLATE.md"),
    join(SCRIPT_DIR, "..", "templates", "TANDEM_BRIEF_TEMPLATE.md"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) fail("templates/TANDEM_BRIEF_TEMPLATE.md not found (looked under pom/templates, templates, and next to this script).");
  return readFileSync(found, "utf8");
}

function readTextOrFile(value) {
  const path = resolve(ROOT, value);
  return existsSync(path) ? readFileSync(path, "utf8") : value;
}

// --- backend calls -----------------------------------------------------------

function roleCwd(state) {
  return { controller: resolve(ROOT, state.controllerWorktree), executor: ROOT };
}

/** Runs one call for a role, records the turn, and returns the reply. Never touches counters. */
function callRole(state, dir, roleName, taskId, message, extraMetadata = {}) {
  const role = state.roles[roleName];
  const cwd = roleCwd(state)[roleName];
  const sessionDir = join(dir, SESSIONS_DIRNAME, "pi");
  const outputFile = join(dir, SESSIONS_DIRNAME, `${roleName}-last-message.txt`);
  mkdirSync(sessionDir, { recursive: true });
  rmSync(outputFile, { force: true });

  const invocation = buildInvocation({
    backend: role.backend, model: role.model, sessionId: role.sessionId, sessionStarted: role.sessionStarted,
    cwd, sessionDir, message, outputFile,
  });
  const timeout = process.env.POM_TANDEM_TIMEOUT_MS ? Number(process.env.POM_TANDEM_TIMEOUT_MS) : undefined;
  const result = runBackend(invocation, { cwd, timeout });
  const commandLine = [invocation.command, ...invocation.args.map((arg) => (arg === message ? "<message>" : arg))].join(" ");
  if (result.status !== 0) {
    const turnPath = writeTurn(dir, {
      role: roleName, taskId, message,
      metadata: { Backend: role.backend, Model: role.model || "(default)", Command: commandLine, "Exit status": String(result.status), ...extraMetadata },
      reply: `(backend failed)\n\n${result.stderr.trim()}\n${result.stdout.trim()}`,
    });
    appendLedger(dir, { role: roleName, taskId, cycle: cycleOf(state, taskId), event: `backend ${role.backend} failed (exit ${result.status})`, turnPath });
    saveState(dir, state);
    fail(`${role.backend} exited with ${result.status}.\n${result.stderr.trim()}`);
  }
  const { reply, sessionId } = extractReply(role.backend, { stdout: result.stdout, outputFile });
  if (sessionId && !role.sessionId) role.sessionId = sessionId;
  role.sessionStarted = true;
  role.calls = (role.calls || 0) + 1;
  const turnPath = writeTurn(dir, {
    role: roleName, taskId, message, reply,
    metadata: { Backend: role.backend, Model: role.model || "(default)", Session: role.sessionId || "(none)", Cwd: displayPath(cwd), Command: commandLine, ...extraMetadata },
  });
  return { reply, turnPath };
}

function cycleOf(state, taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  return task ? task.cycles : 0;
}

/**
 * Synchronises the controller worktree with the executor revision, runs `fn`,
 * resets the worktree, and proves the executor workspace is untouched.
 */
function withControllerWorktree(state, dir, taskId, fn) {
  const worktree = roleCwd(state).controller;
  const before = workspaceFingerprint(ROOT, dir);
  const patchFile = join(dir, "turns", `${String(nextTurnNumber(dir)).padStart(3, "0")}-controller-${taskId}.patch`);
  const sync = syncControllerWorktree(ROOT, worktree, dir, patchFile);
  let outcome;
  try {
    outcome = fn(sync);
  } finally {
    restoreControllerWorktree(worktree);
  }
  const after = workspaceFingerprint(ROOT, dir);
  if (!fingerprintsEqual(before, after)) {
    appendLedger(dir, {
      role: "controller", taskId, cycle: cycleOf(state, taskId), event: "controller must not modify the executor workspace",
      turnPath: outcome && outcome.turnPath, note: `status before:\n${before.status || "(clean)"}\nstatus after:\n${after.status || "(clean)"}`,
    });
    saveState(dir, state);
    fail("controller must not modify the executor workspace: the executor workspace changed during the controller call (see LEDGER.md).", EXIT.TAMPER);
  }
  return outcome;
}

function syncMetadata(sync) {
  return { "Checked revision": sync.commit, Patch: sync.patchFile ? displayPath(sync.patchFile) : "none", "Untracked copied": String(sync.untracked.length) };
}

// --- commands ----------------------------------------------------------------

function cmdInit(argv) {
  const dir = collaborationDir(argv);
  const topic = readRawArg("topic", argv) || dir.split(/[\\/]/).pop();
  if (existsSync(join(dir, "state.json"))) fail(`Tandem already initialised in ${displayPath(dir)}. Use another --topic or --dir.`);
  if (!isGitWorktree(ROOT)) fail(`${ROOT} is not a Git worktree; the controller needs a Git worktree of the project.`);
  if (!headCommit(ROOT)) fail("The project has no commit yet; commit once before init so the controller worktree can be created.");

  let controller;
  let executor;
  try {
    controller = parseAgentSpec(requireArg(argv, "controller"));
    executor = parseAgentSpec(requireArg(argv, "executor"));
  } catch (error) {
    fail(error.message);
  }
  const cap = positiveInteger(argv, "cap", 4);
  const phaseBudget = positiveInteger(argv, "phase-budget", null);
  const sameModel = controller.backend === executor.backend && (controller.model || "") === (executor.model || "");
  if (sameModel) console.error(`warning: ${SAME_MODEL_WARNING}`);

  const worktreeArg = readRawArg("controller-worktree", argv);
  const worktreePath = worktreeArg ? resolve(ROOT, worktreeArg) : join(dir, CONTROLLER_WORKTREE_DIRNAME);
  mkdirSync(join(dir, "turns"), { recursive: true });
  mkdirSync(join(dir, SESSIONS_DIRNAME, "pi"), { recursive: true });
  const trackTurns = hasArg("track-turns", argv);
  writeFileSync(join(dir, ".gitignore"), trackTurns ? COLLABORATION_GITIGNORE_TRACKED_TURNS : COLLABORATION_GITIGNORE);
  try {
    createControllerWorktree(ROOT, worktreePath);
  } catch (error) {
    fail(`Cannot create the controller worktree: ${error.message}`);
  }

  const state = {
    topic,
    dir: displayPath(dir),
    created: new Date().toISOString(),
    closed: null,
    cap,
    phaseBudget,
    phaseBudgetRemaining: phaseBudget,
    modelDiversity: sameModel ? "same" : "different",
    trackTurns,
    controllerWorktree: displayPath(worktreePath),
    roles: Object.fromEntries([["controller", controller], ["executor", executor]].map(([name, spec]) => [name, {
      backend: spec.backend, model: spec.model, sessionId: initialSessionId(spec.backend), sessionStarted: false, calls: 0,
    }])),
    tasks: [],
  };
  saveState(dir, state);
  writeBrief(dir, renderBrief(resolveBriefTemplate(), state).replace("| Status | open / closed |", "| Status | open |"));
  writeFileSync(join(dir, "LEDGER.md"), `# Tandem Ledger - ${topic}\n\nAppend-only. One entry per action; turns are under turns/.\n\n`);
  appendLedger(dir, {
    role: "coordinator", taskId: "-", cycle: 0,
    event: `init controller=${controller.backend}${controller.model ? `:${controller.model}` : ""} executor=${executor.backend}${executor.model ? `:${executor.model}` : ""} cap=${cap} phase-budget=${phaseBudget ?? "none"} model-diversity=${state.modelDiversity}`,
    note: `controller worktree: ${state.controllerWorktree}`,
  });
  console.log(`Tandem "${topic}" initialised in ${displayPath(dir)}`);
  console.log(`  controller: ${controller.backend}${controller.model ? `:${controller.model}` : ""} (worktree ${state.controllerWorktree})`);
  console.log(`  executor:   ${executor.backend}${executor.model ? `:${executor.model}` : ""} (project root)`);
  console.log(`  cap: ${cap} per task | phase budget: ${phaseBudget ?? "none"} | model diversity: ${state.modelDiversity} | turns: ${trackTurns ? "tracked" : "ignored by Git"}`);
}

function cmdTask(argv) {
  const sub = positionalArgs(argv, VALUE_OPTIONS)[1];
  if (sub === "list") return cmdStatus(argv);
  if (sub !== "add") fail(`Unknown task subcommand "${sub ?? ""}". Use: task add | task list.\n${USAGE}`);
  const dir = collaborationDir(argv);
  const state = loadState(dir);
  const id = requireArg(argv, "id");
  const title = requireArg(argv, "title");
  const phase = readRawArg("phase", argv) || null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) fail(`--id must be alphanumeric (with "-" or "_"); got "${id}".`);
  if (state.tasks.some((task) => task.id === id)) fail(`Task "${id}" already exists.`);
  state.tasks.push({ id, title, phase, status: "pending", cycles: 0, lastFindingsTurn: null });
  saveState(dir, state);
  writeBrief(dir, replaceSection(readBrief(dir), "Tasks", tasksTable(state)));
  appendLedger(dir, { role: "coordinator", taskId: id, cycle: 0, event: `task added: ${title}${phase ? ` (phase ${phase})` : ""}` });
  console.log(`Task ${id} added (${state.tasks.length} task(s)).`);
}

function cmdStatus(argv) {
  const dir = collaborationDir(argv);
  const state = loadState(dir);
  console.log(`Tandem "${state.topic}" (${state.closed ? "closed" : "open"}) - ${displayPath(dir)}`);
  console.log(`controller: ${state.roles.controller.backend}${state.roles.controller.model ? `:${state.roles.controller.model}` : ""} | executor: ${state.roles.executor.backend}${state.roles.executor.model ? `:${state.roles.executor.model}` : ""} | model diversity: ${state.modelDiversity}`);
  console.log("");
  console.log(tasksTable(state));
  console.log("");
  const cyclesUsed = state.tasks.reduce((sum, task) => sum + task.cycles, 0);
  const budget = state.phaseBudget === null ? "none" : `${state.phaseBudgetRemaining} remaining of ${state.phaseBudget}`;
  console.log(`Cap: ${state.cap} per task | cycles used: ${cyclesUsed} | phase budget: ${budget} | calls: controller ${state.roles.controller.calls || 0}, executor ${state.roles.executor.calls || 0}`);
  const escalated = state.tasks.filter((task) => task.status === "escalated").map((task) => task.id);
  if (escalated.length) console.log(`Escalated: ${escalated.join(", ")} (bring both positions to the user)`);
}

function readMessage(argv) {
  const file = readRawArg("message-file", argv);
  if (file) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) fail(`--message-file not found: ${file}`);
    return readFileSync(path, "utf8");
  }
  return requireArg(argv, "message");
}

function cmdSend(argv) {
  const dir = collaborationDir(argv);
  const state = loadState(dir);
  ensureTurnsPolicy(dir, state);
  const roleName = requireArg(argv, "role");
  if (!ROLES.includes(roleName)) fail(`--role must be controller or executor; got "${roleName}".`);
  const task = findTask(state, requireArg(argv, "task"));
  const message = readMessage(argv);
  const outcome = roleName === "controller"
    ? withControllerWorktree(state, dir, task.id, (sync) => callRole(state, dir, roleName, task.id, message, syncMetadata(sync)))
    : callRole(state, dir, roleName, task.id, message);
  appendLedger(dir, { role: roleName, taskId: task.id, cycle: task.cycles, event: "send", turnPath: outcome.turnPath });
  saveState(dir, state);
  printReply(roleName, task.id, outcome);
}

function cmdReview(argv) {
  const dir = collaborationDir(argv);
  const state = loadState(dir);
  ensureTurnsPolicy(dir, state);
  const task = findTask(state, requireArg(argv, "task"));
  if (task.status === "escalated" || task.status === "stalled") {
    fail(`Task ${task.id} is ${task.status}: the user decides how to continue before any new review.`, EXIT.LIMIT);
  }
  const deliverableArg = requireArg(argv, "deliverable");
  const deliverable = existsSync(resolve(ROOT, deliverableArg)) ? `file ${deliverableArg} (synchronised into your worktree)` : deliverableArg;

  const outcome = withControllerWorktree(state, dir, task.id, (sync) => callRole(
    state, dir, "controller", task.id,
    reviewMessage({ taskId: task.id, title: task.title, deliverable, checked: sync.description }),
    { Kind: "review", ...syncMetadata(sync) },
  ));
  const verdict = parseVerdict(outcome.reply);
  printReply("controller", task.id, outcome);

  if (verdict === null) {
    appendLedger(dir, { role: "controller", taskId: task.id, cycle: task.cycles, event: "indeterminate (no VERDICT line)", turnPath: outcome.turnPath });
    saveState(dir, state);
    fail("indeterminate: the controller reply has no `VERDICT: APPROVE|REVISE` line. Ask again with `send` or repeat the review.", EXIT.NONCONFORMING);
  }
  if (verdict === "APPROVE") {
    task.status = "approved";
    appendLedger(dir, { role: "controller", taskId: task.id, cycle: task.cycles, event: "VERDICT: APPROVE", turnPath: outcome.turnPath });
    saveState(dir, state);
    return;
  }
  task.cycles += 1;
  task.lastFindingsTurn = outcome.turnPath;
  appendLedger(dir, { role: "controller", taskId: task.id, cycle: task.cycles, event: "VERDICT: REVISE", turnPath: outcome.turnPath });
  if (task.cycles >= state.cap) {
    task.status = "escalated";
    appendLedger(dir, { role: "controller", taskId: task.id, cycle: task.cycles, event: `cap reached (${state.cap}): escalated` });
    saveState(dir, state);
    fail(`cap reached: escalate to the user with both positions (ask the executor's position with \`respond --task ${task.id}\`).`, EXIT.LIMIT);
  }
  if (state.phaseBudget !== null) {
    state.phaseBudgetRemaining -= 1;
    if (state.phaseBudgetRemaining <= 0) {
      task.status = "stalled";
      appendLedger(dir, { role: "controller", taskId: task.id, cycle: task.cycles, event: `phase budget exhausted (${state.phaseBudget}): stalled` });
      saveState(dir, state);
      fail(`phase budget exhausted: task ${task.id} is stalled; the user decides whether to extend the budget.`, EXIT.LIMIT);
    }
  }
  task.status = "in_progress";
  saveState(dir, state);
}

function lastFindings(dir, task) {
  if (!task.lastFindingsTurn) fail(`No findings recorded for task ${task.id}: pass --findings or run a review first.`);
  const turn = readFileSync(join(dir, task.lastFindingsTurn), "utf8");
  const reply = turn.split(/\n## Reply\n/)[1] || "";
  return extractFindings(reply);
}

function cmdRespond(argv) {
  const dir = collaborationDir(argv);
  const state = loadState(dir);
  ensureTurnsPolicy(dir, state);
  const task = findTask(state, requireArg(argv, "task"));
  const findingsArg = readRawArg("findings", argv);
  const findings = findingsArg ? readTextOrFile(findingsArg) : lastFindings(dir, task);
  const outcome = callRole(state, dir, "executor", task.id, respondMessage({ taskId: task.id, title: task.title, findings }), { Kind: "respond" });
  const replies = parseFindingReplies(outcome.reply);
  const summary = replies.length ? replies.map((item) => `${item.id}:${item.status}`).join(" ") : "no F<n> lines";
  if (task.status !== "escalated" && task.status !== "stalled") task.status = "in_progress";
  appendLedger(dir, { role: "executor", taskId: task.id, cycle: task.cycles, event: `respond (${summary})`, turnPath: outcome.turnPath });
  saveState(dir, state);
  printReply("executor", task.id, outcome);
}

function verdictLabel(task) {
  return {
    approved: "APPROVE",
    escalated: "cap reached, escalated to the user",
    stalled: "phase budget exhausted, stalled",
    in_progress: "no final verdict (in progress)",
    pending: "no verdict (never reviewed)",
  }[task.status] || task.status;
}

function cmdClose(argv) {
  const dir = collaborationDir(argv);
  const state = loadState(dir);
  const rows = state.tasks.map((task) => `| ${task.id} | ${task.title.replace(/\|/g, "\\|")} | ${verdictLabel(task)} | ${task.cycles}/${state.cap} |`);
  const open = state.tasks.filter((task) => task.status !== "approved").map((task) => `${task.id} (${task.status})`);
  const outcome = [
    "| Task | Title | Verdict | Cycles |",
    "|---|---|---|---|",
    ...(rows.length ? rows : ["| - | (no task) | - | - |"]),
    "",
    "What enters the project: to be decided by the user; the script records verdicts, it does not promote.",
    "",
    `Open points: ${open.length ? open.join(", ") : "none"}.`,
  ].join("\n");
  let brief = replaceSection(readBrief(dir), "Tasks", tasksTable(state));
  brief = replaceSection(brief, "Outcome", outcome).replace("| Status | open |", "| Status | closed |");
  writeBrief(dir, brief);

  let worktreeNote = "kept";
  if (!hasArg("keep-worktrees", argv)) {
    try {
      worktreeNote = removeControllerWorktree(ROOT, roleCwd(state).controller) ? "removed" : "already absent";
    } catch (error) {
      worktreeNote = `not removed (${error.message})`;
    }
  }
  state.closed = new Date().toISOString();
  saveState(dir, state);
  appendLedger(dir, { role: "coordinator", taskId: "-", cycle: 0, event: `closed (controller worktree ${worktreeNote})` });

  const cyclesUsed = state.tasks.reduce((sum, task) => sum + task.cycles, 0);
  console.log(`Tandem "${state.topic}" closed.`);
  console.log(outcome);
  console.log("");
  console.log(`Tasks: ${state.tasks.length} | approved: ${state.tasks.filter((task) => task.status === "approved").length} | escalated: ${state.tasks.filter((task) => task.status === "escalated").length} | cycles used: ${cyclesUsed} | controller worktree: ${worktreeNote}`);
}

// --- entry point ---------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const [command] = positionalArgs(argv, VALUE_OPTIONS);
  if (!command || hasArg("help", argv)) {
    console.log(USAGE);
    process.exit(command ? EXIT.OK : EXIT.USAGE);
  }
  const unknown = unknownOptions(argv, [...VALUE_OPTIONS, ...FLAG_OPTIONS]);
  const commands = { init: cmdInit, task: cmdTask, status: cmdStatus, send: cmdSend, review: cmdReview, respond: cmdRespond, close: cmdClose };
  const handler = commands[command];
  if (unknown.length || !handler) {
    console.error(unknown.length ? `Unknown option(s): ${unknown.join(", ")}` : `Unknown command "${command}".`);
    console.error(USAGE);
    process.exit(EXIT.USAGE);
  }
  try {
    handler(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(error instanceof TandemError ? error.code : EXIT.USAGE);
  }
}

main();
