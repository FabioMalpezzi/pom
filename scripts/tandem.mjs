#!/usr/bin/env node
// pom:tandem - two coding agents, one controller and one executor, working on
// the same deliverable through persistent non-interactive sessions.
//
// Usage (from the target project root):
//   node scripts/tandem.mjs init --topic <slug> --controller <backend>[:<model>] --executor <backend>[:<model>]
//                              [--dir <path>] [--cap 4] [--phase-budget N] [--controller-worktree <path>]
//                              [--track-turns] [--setup "<command>"] [--guard-ignore <glob>]...
//   node scripts/tandem.mjs init --reopen --topic <slug>
//   node scripts/tandem.mjs task add --topic <slug> --id T1 --title "<...>" [--phase <label>] [--done "<criteria>"]
//   node scripts/tandem.mjs task list --topic <slug>        (alias: status --topic <slug>)
//   node scripts/tandem.mjs send --topic <slug> --role controller|executor --task T1 (--message "<text>" | --message-file <path>)
//   node scripts/tandem.mjs review --topic <slug> --task T1 --deliverable <path or text>
//   node scripts/tandem.mjs respond --topic <slug> --task T1 [--findings <path or text>]
//   node scripts/tandem.mjs note --topic <slug> [--task T1] --message "<text>"
//   node scripts/tandem.mjs session reset --topic <slug> --role controller|executor
//   node scripts/tandem.mjs close --topic <slug> [--keep-worktrees]
//
// Backends: pi, codex, claude (see scripts/lib/tandem-backends.mjs). The
// executor writes in the project root; the controller runs inside its own Git
// worktree, synchronised to the executor's revision before every call and
// reset afterwards (scripts/lib/tandem-git.mjs). The contracts the two roles
// must honour live in scripts/lib/tandem-contract.mjs.
//
// Exit codes: 0 ok, 1 usage or backend error, 2 non-conforming reply (no
// valid verdict, empty reply, no F<n> lines, blocking finding disputed
// without evidence), 3 cap or phase budget reached, 4 the controller modified
// the executor workspace (checked even when the backend fails). Set
// POM_TANDEM_FAKE_BACKEND=<script> to replace the real executables (tests),
// POM_TANDEM_TIMEOUT_MS to bound a single call.
//
// Target-installed: the installer registers it as `npm run pom:tandem`.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hasArg, positionalArgs, readRawArg, unknownOptions } from "./lib/cli-args.mjs";
import {
  buildInvocation, claudeSessionError, extractReply, initialSessionId, parseAgentSpec, piSessionExists, runBackend,
} from "./lib/tandem-backends.mjs";
import {
  disputedWithoutEvidence, extractFindings, parseFindingReplies, parseVerdict, respondMessage, reviewMessage,
} from "./lib/tandem-contract.mjs";
import {
  controllerChanges, createControllerWorktree, fingerprintDifferences, git, headCommit, insideRoot, isGitWorktree,
  removeControllerWorktree, restoreControllerWorktree, syncControllerWorktree, workspaceFingerprint,
} from "./lib/tandem-git.mjs";
import {
  COLLABORATION_GITIGNORE_LINES, COLLABORATION_GITIGNORE_TRACKED_TURNS_LINES, CONTROLLER_WORKTREE_DIRNAME, SESSIONS_DIRNAME,
  appendLedger, ensureGitignoreLines, findTask, loadState, nextTurnNumber, phaseBudgetRemaining, phaseBudgetSummary, phaseKey,
  readBrief, renderBrief, replaceSection, saveState, tasksTable, writeBrief, writeTurn,
} from "./lib/tandem-state.mjs";

const ROOT = process.cwd();
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EXIT = { OK: 0, USAGE: 1, NONCONFORMING: 2, LIMIT: 3, TAMPER: 4 };
const ROLES = ["controller", "executor"];
const VALUE_OPTIONS = [
  "topic", "dir", "controller", "executor", "cap", "phase-budget", "controller-worktree", "setup", "guard-ignore",
  "id", "title", "phase", "done", "role", "task", "message", "message-file", "deliverable", "findings",
];
const FLAG_OPTIONS = ["keep-worktrees", "help", "track-turns", "reopen"];
const USAGE = [
  "Usage: node scripts/tandem.mjs <command> [options]",
  "  init --topic <slug> --controller <backend>[:<model>] --executor <backend>[:<model>] [--dir <path>] [--cap 4] [--phase-budget N]",
  "       [--controller-worktree <path>] [--track-turns] [--setup <command>] [--guard-ignore <glob>]...",
  "  init --reopen --topic <slug>",
  "  task add --topic <slug> --id <id> --title <title> [--phase <label>] [--done <criteria>]",
  "  task list | status --topic <slug>",
  "  send --topic <slug> --role controller|executor --task <id> (--message <text> | --message-file <path>)",
  "  review --topic <slug> --task <id> --deliverable <path or text>",
  "  respond --topic <slug> --task <id> [--findings <path or text>]",
  "  note --topic <slug> [--task <id>] --message <text>",
  "  session reset --topic <slug> --role controller|executor",
  "  close --topic <slug> [--keep-worktrees]",
  "Exit codes: 0 ok, 1 usage/backend error, 2 non-conforming reply, 3 cap or phase budget reached, 4 controller modified the executor workspace.",
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

/** Every value of a repeatable `--name value` / `--name=value` option, in order. */
function readAllArgs(argv, name) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === `--${name}` && argv[index + 1] !== undefined && !argv[index + 1].startsWith("--")) values.push(argv[index + 1]);
    else if (argv[index].startsWith(`--${name}=`)) values.push(argv[index].slice(name.length + 3));
  }
  return values;
}

function positiveInteger(argv, name, fallback) {
  const raw = readRawArg(name, argv);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) fail(`--${name} must be a positive integer (got "${raw}").`);
  return value;
}

/** POM_TANDEM_TIMEOUT_MS, validated before any backend is spawned. */
function timeoutMs() {
  const raw = process.env.POM_TANDEM_TIMEOUT_MS;
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) fail(`POM_TANDEM_TIMEOUT_MS must be a positive integer number of milliseconds (got "${raw}").`);
  return value;
}

function collaborationDir(argv) {
  const dir = readRawArg("dir", argv);
  if (dir) {
    const path = resolve(ROOT, dir);
    if (path === ROOT) fail("--dir must name a folder inside the project, not the project root itself.");
    if (!insideRoot(ROOT, path)) fail(`--dir must be inside the project root (${ROOT}); got "${dir}".`);
    return path;
  }
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

/** Loads the state and refuses to act on a closed tandem (every command but `status` and `close`). */
function openState(dir) {
  const state = loadState(dir);
  if (state.closed) fail(`tandem is closed; use init --reopen --topic ${state.topic} to continue it (closed at ${state.closed}).`);
  return state;
}

/** A recoverable anomaly: said on stderr and written to the ledger, never fatal. */
function warn(dir, state, roleName, taskId, text) {
  console.error(`warning: ${text}`);
  appendLedger(dir, { role: roleName, taskId, cycle: cycleOf(state, taskId), event: `warning: ${text}` });
}

// --- backend calls -----------------------------------------------------------

function roleCwd(state) {
  return { controller: resolve(ROOT, state.controllerWorktree), executor: ROOT };
}

function cycleOf(state, taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  return task ? task.cycles : 0;
}

/**
 * Runs one call for a role, records the turn, and returns the reply. Never
 * touches counters. The session is marked as started (and saved) before the
 * spawn, so an interruption cannot leave state.json behind the backend. A
 * Claude session that cannot be used any more is reported, never replaced
 * behind the coordinator's back: resending the message to a fresh session
 * would silently drop the context (see prompt 38, Resuming).
 */
function callRole(state, dir, roleName, taskId, message, extraMetadata = {}) {
  const role = state.roles[roleName];
  const cwd = roleCwd(state)[roleName];
  const sessionDir = join(dir, SESSIONS_DIRNAME, "pi");
  const outputFile = join(dir, SESSIONS_DIRNAME, `${roleName}-last-message.txt`);
  const timeout = timeoutMs();
  mkdirSync(sessionDir, { recursive: true });
  rmSync(outputFile, { force: true });
  if (role.backend === "pi" && role.sessionStarted && !piSessionExists(sessionDir, role.sessionId)) {
    warn(dir, state, roleName, taskId, `pi session file not found for ${role.sessionId} in ${displayPath(sessionDir)}; next call starts a new conversation`);
  }

  const invocation = buildInvocation({
    backend: role.backend, model: role.model, sessionId: role.sessionId, sessionStarted: role.sessionStarted,
    cwd, sessionDir, message, outputFile,
  });
  role.sessionStarted = true;
  saveState(dir, state);
  const result = runBackend(invocation, { cwd, timeout });
  const commandLine = [invocation.command, ...invocation.args.map((arg) => (arg === message ? "<message>" : arg))].join(" ");
  const metadata = { Backend: role.backend, Model: role.model || "(default)", Session: role.sessionId || "(none)", Cwd: displayPath(cwd), Command: commandLine, ...extraMetadata };
  if (result.status !== 0) {
    const sessionError = role.backend === "claude" ? claudeSessionError(result.stderr, result.stdout) : null;
    const turnPath = writeTurn(dir, {
      role: roleName, taskId, message, metadata: { ...metadata, "Exit status": String(result.status) },
      reply: `(backend failed)\n\n${result.stderr.trim()}\n${result.stdout.trim()}`,
    });
    if (sessionError) {
      appendLedger(dir, { role: roleName, taskId, cycle: cycleOf(state, taskId), event: `claude session lost (${sessionError}: ${role.sessionId})`, turnPath });
      saveState(dir, state);
      fail(`claude session lost: run \`session reset --role ${roleName}\` then re-send the assignment with the brief context (see prompt 38, Resuming)\n${result.stderr.trim()}`);
    }
    const reason = result.timedOut ? `backend timed out after ${timeout} ms` : `exited with ${result.status}`;
    appendLedger(dir, { role: roleName, taskId, cycle: cycleOf(state, taskId), event: `backend ${role.backend} failed (${reason})`, turnPath });
    saveState(dir, state);
    fail(`${role.backend}: ${reason}.\n${result.stderr.trim()}`);
  }
  const { reply, sessionId } = extractReply(role.backend, { stdout: result.stdout, outputFile });
  if (sessionId && !role.sessionId) role.sessionId = sessionId;
  role.calls = (role.calls || 0) + 1;
  metadata.Session = role.sessionId || "(none)";
  if (role.backend === "codex" && !role.sessionId) {
    warn(dir, state, roleName, taskId, "codex thread id not captured; next call starts a new conversation");
  }
  const turnPath = writeTurn(dir, { role: roleName, taskId, message, reply, metadata });
  if (!reply.trim()) {
    appendLedger(dir, { role: roleName, taskId, cycle: cycleOf(state, taskId), event: `empty reply from ${role.backend}`, turnPath });
    saveState(dir, state);
    fail(`${role.backend} returned an empty reply (${turnPath}); repeat the turn.`, EXIT.NONCONFORMING);
  }
  return { reply, turnPath };
}

/**
 * Saves what the controller wrote in its own worktree before the reset
 * (diff of the files it received plus the list of files it created) and
 * notes it in the ledger. Not an error: the worktree is scratch space.
 */
function recordControllerLeftovers(state, dir, taskId, worktree, indexFile, turnNumber) {
  const { diff, newFiles } = controllerChanges(worktree, indexFile);
  if (!diff.trim() && newFiles.length === 0) return;
  const leftPatch = join(dir, "turns", `${turnNumber}-controller-${taskId}.left.patch`);
  const parts = [];
  if (diff.trim()) parts.push(diff.trimEnd());
  if (newFiles.length) parts.push(`# new files left by the controller (their content is in the diff above):\n${newFiles.map((file) => `#   ${file}`).join("\n")}`);
  writeFileSync(leftPatch, `${parts.join("\n")}\n`);
  appendLedger(dir, {
    role: "controller", taskId, cycle: cycleOf(state, taskId), event: "controller left changes in its worktree (discarded)",
    note: `patch: ${displayPath(leftPatch)}${newFiles.length ? ` | new files: ${newFiles.join(", ")}` : ""}`,
  });
}

/**
 * Synchronises the controller worktree with the executor revision, runs `fn`,
 * resets the worktree, and proves the executor workspace is untouched. The
 * proof runs in `finally`: a backend failure never skips it, and a modified
 * executor workspace (exit 4) takes precedence over the backend error.
 */
function withControllerWorktree(state, dir, taskId, fn) {
  const worktree = roleCwd(state).controller;
  const guardIgnore = state.guardIgnore || [];
  const before = workspaceFingerprint(ROOT, dir, guardIgnore);
  const turnNumber = String(nextTurnNumber(dir)).padStart(3, "0");
  const patchFile = join(dir, "turns", `${turnNumber}-controller-${taskId}.patch`);
  const indexFile = join(dir, SESSIONS_DIRNAME, "controller-index");
  const sync = syncControllerWorktree(ROOT, worktree, dir, patchFile, indexFile);
  let outcome;
  try {
    outcome = fn(sync);
  } finally {
    recordControllerLeftovers(state, dir, taskId, worktree, indexFile, turnNumber);
    restoreControllerWorktree(worktree, indexFile);
    const after = workspaceFingerprint(ROOT, dir, guardIgnore);
    const differences = fingerprintDifferences(before, after);
    if (differences.length > 0) {
      appendLedger(dir, {
        role: "controller", taskId, cycle: cycleOf(state, taskId), event: "controller must not modify the executor workspace",
        turnPath: outcome && outcome.turnPath,
        note: `changed: ${differences.join(", ")}\nstatus before:\n${before.status || "(clean)"}\nstatus after:\n${after.status || "(clean)"}`,
      });
      saveState(dir, state);
      fail(`controller must not modify the executor workspace: ${differences.length} path(s) changed during the controller call:\n${differences.map((path) => `  ${path}`).join("\n")}\nSee LEDGER.md.`, EXIT.TAMPER);
    }
  }
  return outcome;
}

function syncMetadata(sync) {
  return { "Checked revision": sync.commit, Patch: sync.patchFile ? displayPath(sync.patchFile) : "none", "Untracked copied": String(sync.untracked.length) };
}

// --- commands ----------------------------------------------------------------

/** Runs the `--setup` command inside the controller worktree (dependencies, builds); a failure aborts the command. */
function runSetup(setup, worktree) {
  const result = spawnSync(setup, { cwd: worktree, shell: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) {
    fail(`setup command failed (exit ${result.status ?? "signal"}) in ${displayPath(worktree)}: ${setup}\n${(result.stderr || result.stdout || "").trim()}`);
  }
}

function validateControllerWorktreePath(worktreePath, dir) {
  const rel = insideRoot(ROOT, worktreePath);
  if (worktreePath === ROOT || (rel && !insideRoot(dir, worktreePath))) {
    fail(`--controller-worktree must be outside the project root or inside the tandem folder (${displayPath(dir)}); got "${displayPath(worktreePath)}".`);
  }
}

function cmdInit(argv) {
  const dir = collaborationDir(argv);
  if (hasArg("reopen", argv)) return cmdReopen(dir);
  const topic = readRawArg("topic", argv) || dir.split(/[\\/]/).pop();
  if (existsSync(join(dir, "state.json"))) fail(`Tandem already initialised in ${displayPath(dir)}. Use another --topic or --dir, or init --reopen for a closed tandem.`);
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
  const setup = readRawArg("setup", argv) || null;
  const guardIgnore = readAllArgs(argv, "guard-ignore").map((glob) => glob.trim()).filter(Boolean);
  const sameModel = controller.backend === executor.backend && (controller.model || "") === (executor.model || "");
  if (sameModel) console.error(`warning: ${SAME_MODEL_WARNING}`);

  const worktreeArg = readRawArg("controller-worktree", argv);
  const worktreePath = worktreeArg ? resolve(ROOT, worktreeArg) : join(dir, CONTROLLER_WORKTREE_DIRNAME);
  validateControllerWorktreePath(worktreePath, dir);
  mkdirSync(join(dir, "turns"), { recursive: true });
  mkdirSync(join(dir, SESSIONS_DIRNAME, "pi"), { recursive: true });
  const trackTurns = hasArg("track-turns", argv);
  const ignorePath = join(dir, ".gitignore");
  const ignoreTracked = existsSync(ignorePath) && git(ROOT, ["ls-files", "--error-unmatch", "--", ignorePath], { allowFailure: true }).trim() !== "";
  const added = ensureGitignoreLines(ignorePath, trackTurns ? COLLABORATION_GITIGNORE_TRACKED_TURNS_LINES : COLLABORATION_GITIGNORE_LINES);
  if (ignoreTracked && added.length) console.error(`warning: adding ${added.length} line(s) to tracked ${displayPath(ignorePath)} (${added.join(", ")}); review and commit the change`);
  try {
    createControllerWorktree(ROOT, worktreePath);
  } catch (error) {
    fail(`Cannot create the controller worktree: ${error.message}`);
  }
  if (setup) {
    try {
      runSetup(setup, worktreePath);
    } catch (error) {
      try { removeControllerWorktree(ROOT, worktreePath); } catch { /* the failure below is the one to report */ }
      throw error;
    }
  }

  const state = {
    topic,
    dir: displayPath(dir),
    created: new Date().toISOString(),
    closed: null,
    cap,
    phaseBudget,
    phaseBudgetRemaining: {},
    modelDiversity: sameModel ? "same" : "different",
    trackTurns,
    setup,
    guardIgnore,
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
    note: `controller worktree: ${state.controllerWorktree}${setup ? `\nsetup: ${setup}` : ""}${guardIgnore.length ? `\nguard-ignore: ${guardIgnore.join(", ")}` : ""}`,
  });
  console.log(`Tandem "${topic}" initialised in ${displayPath(dir)}`);
  console.log(`  controller: ${controller.backend}${controller.model ? `:${controller.model}` : ""} (worktree ${state.controllerWorktree})`);
  console.log(`  executor:   ${executor.backend}${executor.model ? `:${executor.model}` : ""} (project root)`);
  console.log(`  cap: ${cap} per task | phase budget: ${phaseBudget ?? "none"} | model diversity: ${state.modelDiversity} | turns: ${trackTurns ? "tracked" : "ignored by Git"}${setup ? ` | setup: ${setup}` : ""}${guardIgnore.length ? ` | guard-ignore: ${guardIgnore.join(", ")}` : ""}`);
}

/** `init --reopen`: a closed tandem gets its worktree back; brief, ledger, and task states are untouched. */
function cmdReopen(dir) {
  const state = loadState(dir);
  if (!state.closed) fail(`Tandem "${state.topic}" is open; --reopen applies to a closed tandem.`);
  const worktree = roleCwd(state).controller;
  let worktreeNote = "kept";
  if (!existsSync(worktree)) {
    try {
      createControllerWorktree(ROOT, worktree);
    } catch (error) {
      fail(`Cannot recreate the controller worktree: ${error.message}`);
    }
    worktreeNote = "recreated";
  }
  if (state.setup) runSetup(state.setup, worktree);
  state.closed = null;
  saveState(dir, state);
  writeBrief(dir, readBrief(dir).replace("| Status | closed |", "| Status | open |"));
  appendLedger(dir, { role: "coordinator", taskId: "-", cycle: 0, event: `reopened (controller worktree ${worktreeNote}${state.setup ? ", setup run" : ""})` });
  console.log(`Tandem "${state.topic}" reopened (controller worktree ${worktreeNote}).`);
}

function cmdTask(argv) {
  const sub = positionalArgs(argv, VALUE_OPTIONS)[1];
  if (sub === "list") return cmdStatus(argv);
  if (sub !== "add") fail(`Unknown task subcommand "${sub ?? ""}". Use: task add | task list.\n${USAGE}`);
  const dir = collaborationDir(argv);
  const state = openState(dir);
  const id = requireArg(argv, "id");
  const title = requireArg(argv, "title");
  const phase = readRawArg("phase", argv) || null;
  const done = readRawArg("done", argv) || null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) fail(`--id must be alphanumeric (with "-" or "_"); got "${id}".`);
  if (state.tasks.some((task) => task.id === id)) fail(`Task "${id}" already exists.`);
  state.tasks.push({ id, title, phase, done, status: "pending", cycles: 0, lastFindingsTurn: null });
  saveState(dir, state);
  writeBrief(dir, replaceSection(readBrief(dir), "Tasks", tasksTable(state)));
  appendLedger(dir, { role: "coordinator", taskId: id, cycle: 0, event: `task added: ${title}${phase ? ` (phase ${phase})` : ""}`, note: done ? `definition of done: ${done}` : undefined });
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
  console.log(`Cap: ${state.cap} per task | cycles used: ${cyclesUsed} | phase budget: ${phaseBudgetSummary(state)} | calls: controller ${state.roles.controller.calls || 0}, executor ${state.roles.executor.calls || 0}`);
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

function requireRole(argv) {
  const roleName = requireArg(argv, "role");
  if (!ROLES.includes(roleName)) fail(`--role must be controller or executor; got "${roleName}".`);
  return roleName;
}

function cmdSend(argv) {
  const dir = collaborationDir(argv);
  const state = openState(dir);
  ensureTurnsPolicy(dir, state);
  const roleName = requireRole(argv);
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
  const state = openState(dir);
  ensureTurnsPolicy(dir, state);
  const task = findTask(state, requireArg(argv, "task"));
  if (task.status === "escalated" || task.status === "stalled") {
    fail(`Task ${task.id} is ${task.status}: the user decides how to continue before any new review.`, EXIT.LIMIT);
  }
  const deliverableArg = requireArg(argv, "deliverable");
  const deliverable = existsSync(resolve(ROOT, deliverableArg)) ? `file ${deliverableArg} (synchronised into your worktree)` : deliverableArg;

  const outcome = withControllerWorktree(state, dir, task.id, (sync) => callRole(
    state, dir, "controller", task.id,
    reviewMessage({ taskId: task.id, title: task.title, done: task.done, deliverable, checked: sync.description }),
    { Kind: "review", ...syncMetadata(sync) },
  ));
  const { verdict, problem } = parseVerdict(outcome.reply);
  printReply("controller", task.id, outcome);

  if (verdict === null) {
    appendLedger(dir, { role: "controller", taskId: task.id, cycle: task.cycles, event: `indeterminate (${problem})`, turnPath: outcome.turnPath });
    saveState(dir, state);
    fail(`indeterminate: ${problem}. Ask again with \`send\` quoting the contract, or repeat the review.`, EXIT.NONCONFORMING);
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
    const remaining = phaseBudgetRemaining(state, task) - 1;
    const map = state.phaseBudgetRemaining && typeof state.phaseBudgetRemaining === "object" ? state.phaseBudgetRemaining : {};
    state.phaseBudgetRemaining = { ...map, [phaseKey(task)]: remaining };
    if (remaining <= 0) {
      task.status = "stalled";
      appendLedger(dir, { role: "controller", taskId: task.id, cycle: task.cycles, event: `phase budget exhausted for phase ${phaseKey(task)} (${state.phaseBudget}): stalled` });
      saveState(dir, state);
      fail(`phase budget exhausted for phase ${phaseKey(task)}: task ${task.id} is stalled; the user decides whether to extend the budget.`, EXIT.LIMIT);
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
  const state = openState(dir);
  ensureTurnsPolicy(dir, state);
  const task = findTask(state, requireArg(argv, "task"));
  if (task.status === "approved") fail("task already approved; run review to reopen it only if the deliverable changed");
  const findingsArg = readRawArg("findings", argv);
  const findings = findingsArg ? readTextOrFile(findingsArg) : lastFindings(dir, task);
  const outcome = callRole(state, dir, "executor", task.id, respondMessage({ taskId: task.id, title: task.title, findings }), { Kind: "respond" });
  const replies = parseFindingReplies(outcome.reply);
  printReply("executor", task.id, outcome);
  if (replies.length === 0) {
    appendLedger(dir, { role: "executor", taskId: task.id, cycle: task.cycles, event: "non-conforming respond (no F<n> lines)", turnPath: outcome.turnPath });
    saveState(dir, state);
    fail("non-conforming: the executor reply has no `F<n>: FIXED|DISPUTED` line; repeat the turn quoting the contract.", EXIT.NONCONFORMING);
  }
  const bare = disputedWithoutEvidence(findings, replies);
  if (bare.length > 0) {
    appendLedger(dir, { role: "executor", taskId: task.id, cycle: task.cycles, event: `non-conforming respond (disputed blocking finding without evidence: ${bare.join(", ")})`, turnPath: outcome.turnPath });
    saveState(dir, state);
    fail(`disputed blocking finding without evidence (${bare.join(", ")}): the cycle stays open; ask the executor for evidence or a fix.`, EXIT.NONCONFORMING);
  }
  const summary = replies.map((item) => `${item.id}:${item.status}`).join(" ");
  if (task.status !== "escalated" && task.status !== "stalled") task.status = "in_progress";
  appendLedger(dir, { role: "executor", taskId: task.id, cycle: task.cycles, event: `respond (${summary})`, turnPath: outcome.turnPath });
  saveState(dir, state);
}

/** `note`: a coordinator or user line in the ledger (decisions, escalations), with no backend call. */
function cmdNote(argv) {
  const dir = collaborationDir(argv);
  const state = openState(dir);
  const taskId = readRawArg("task", argv);
  const task = taskId ? findTask(state, taskId) : null;
  const message = requireArg(argv, "message");
  appendLedger(dir, { role: "coordinator", taskId: task ? task.id : "-", cycle: task ? task.cycles : 0, event: "note", note: message.trim() });
  console.log(`Note recorded in ${displayPath(join(dir, "LEDGER.md"))}${task ? ` (task ${task.id})` : ""}.`);
}

/** `session reset`: a role gets a fresh session id (pi, claude) or a fresh thread (codex); its history is left behind. */
function cmdSession(argv) {
  const sub = positionalArgs(argv, VALUE_OPTIONS)[1];
  if (sub !== "reset") fail(`Unknown session subcommand "${sub ?? ""}". Use: session reset.\n${USAGE}`);
  const dir = collaborationDir(argv);
  const state = openState(dir);
  const roleName = requireRole(argv);
  const role = state.roles[roleName];
  const previous = role.sessionId || "(none)";
  role.sessionId = initialSessionId(role.backend);
  role.sessionStarted = false;
  saveState(dir, state);
  const next = role.sessionId || "(new thread on the next call)";
  appendLedger(dir, { role: roleName, taskId: "-", cycle: 0, event: `session reset (${role.backend}: ${previous} -> ${next})` });
  console.log(`${roleName} session reset: ${role.backend} ${previous} -> ${next}. The next call starts a new conversation; resend the current assignment with a one-line note.`);
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
  if (state.closed) {
    console.log(`Tandem "${state.topic}" is already closed (${state.closed}); nothing to do. Use init --reopen to continue it.`);
    return;
  }
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
  const commands = {
    init: cmdInit, task: cmdTask, status: cmdStatus, send: cmdSend, review: cmdReview, respond: cmdRespond,
    note: cmdNote, session: cmdSession, close: cmdClose,
  };
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
