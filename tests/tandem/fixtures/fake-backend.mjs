// Deterministic stand-in for the pi, codex, and claude executables used by
// tests/tandem. scripts/tandem.mjs runs it as `node fake-backend.mjs <backend>
// <args...>` when POM_TANDEM_FAKE_BACKEND points here (no network, no LLM).
//
// It records every call as one JSON line in POM_TANDEM_FAKE_LOG (backend,
// args, cwd, and the content of the files named in POM_TANDEM_FAKE_READ), and
// imitates each backend's output format. The reply is chosen from markers in
// the message: "[[NOVERDICT]]" (no VERDICT line), "[[REVISE]]" (REVISE with a
// finding), a review request (APPROVE), a findings hand-off (F1: FIXED), or
// an echo. POM_TANDEM_FAKE_WRITE writes a scratch file in the cwd (to prove the
// controller worktree is reset); POM_TANDEM_FAKE_TAMPER writes to an absolute
// path (to prove the executor-workspace guard fires).
//
// Failure modes, all through the environment: POM_TANDEM_FAKE_EXIT=<n> exits
// with that status after "boom from backend" on stderr; POM_TANDEM_FAKE_EMPTY=1
// prints nothing; POM_TANDEM_FAKE_SLEEP_MS=<ms> waits before answering;
// POM_TANDEM_FAKE_NOTHREAD=1 makes codex omit the thread_id event;
// POM_TANDEM_FAKE_CLAUDE_FAIL_ONCE=<marker file> makes the first claude call
// fail with a session error ("already in use", or "No conversation found"
// when POM_TANDEM_FAKE_CLAUDE_FAIL_KIND=not-found) and later calls succeed;
// POM_TANDEM_FAKE_REPLY replaces the reply verbatim (Markdown included). The
// pi imitation stores a session file under --session-dir, like pi does.

import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [backend, ...args] = process.argv.slice(2);
const message = args[args.length - 1] ?? "";
const cwd = process.cwd();

const read = {};
for (const name of (process.env.POM_TANDEM_FAKE_READ || "").split(",").filter(Boolean)) {
  const path = join(cwd, name);
  read[name] = existsSync(path) ? readFileSync(path, "utf8") : null;
}
if (process.env.POM_TANDEM_FAKE_LOG) {
  appendFileSync(process.env.POM_TANDEM_FAKE_LOG, `${JSON.stringify({ backend, args, cwd, read })}\n`);
}
if (process.env.POM_TANDEM_FAKE_WRITE) writeFileSync(join(cwd, process.env.POM_TANDEM_FAKE_WRITE), "scratch left by the controller\n");
if (process.env.POM_TANDEM_FAKE_TAMPER) writeFileSync(process.env.POM_TANDEM_FAKE_TAMPER, "tampered by the controller\n");
if (process.env.POM_TANDEM_FAKE_SLEEP_MS) {
  const until = Date.now() + Number(process.env.POM_TANDEM_FAKE_SLEEP_MS);
  while (Date.now() < until) { /* busy wait: the script must time out */ }
}
if (process.env.POM_TANDEM_FAKE_EXIT) {
  process.stderr.write("boom from backend\n");
  process.exit(Number(process.env.POM_TANDEM_FAKE_EXIT));
}
if (process.env.POM_TANDEM_FAKE_EMPTY) process.exit(0);

function chooseReply() {
  if (process.env.POM_TANDEM_FAKE_REPLY) return process.env.POM_TANDEM_FAKE_REPLY;
  if (message.includes("[[NOVERDICT]]")) return "Looks fine to me, nothing more to say.";
  if (message.includes("[[REVISE]]")) {
    return "VERDICT: REVISE\nFINDINGS:\n1. blocking - src/a.js:1 - the loop bound is off by one - a passing test for the last element";
  }
  if (message.startsWith("Review task")) return "VERDICT: APPROVE\nFINDINGS:\n(none)";
  if (message.startsWith("Findings on task")) return "F1: FIXED adjusted the loop bound in src/a.js";
  return `echo: ${message}`;
}

const reply = chooseReply();

if (backend === "pi") {
  const sessionDir = args[args.indexOf("--session-dir") + 1];
  const sessionId = args[args.indexOf("--session-id") + 1];
  const sessionFile = join(sessionDir, `${sessionId}.jsonl`);
  if (!existsSync(sessionFile)) {
    process.stderr.write("No project session found for the given id, creating a new one\n");
    mkdirSync(sessionDir, { recursive: true });
  }
  appendFileSync(sessionFile, `${JSON.stringify({ role: "user", content: message })}\n`);
  process.stdout.write(`${reply}\n`);
} else if (backend === "codex") {
  const resumeIndex = args.indexOf("resume");
  const threadId = resumeIndex >= 0 ? args[resumeIndex + 1] : randomUUID();
  const outputIndex = args.indexOf("-o");
  if (outputIndex >= 0) writeFileSync(args[outputIndex + 1], reply);
  if (!process.env.POM_TANDEM_FAKE_NOTHREAD) process.stdout.write(`${JSON.stringify({ type: "thread.started", thread_id: threadId })}\n`);
  process.stdout.write(`${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: reply } })}\n`);
} else if (backend === "claude") {
  const flag = args.includes("--resume") ? "--resume" : "--session-id";
  const sessionId = args[args.indexOf(flag) + 1];
  const marker = process.env.POM_TANDEM_FAKE_CLAUDE_FAIL_ONCE;
  if (marker && !existsSync(marker)) {
    writeFileSync(marker, sessionId);
    const kind = process.env.POM_TANDEM_FAKE_CLAUDE_FAIL_KIND === "not-found"
      ? `No conversation found with session ID: ${sessionId}`
      : `Error: Session ID ${sessionId} is already in use.`;
    process.stderr.write(`${kind}\n`);
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify({ type: "result", subtype: "success", result: reply, session_id: sessionId })}\n`);
} else {
  process.stderr.write(`fake backend: unknown backend "${backend}"\n`);
  process.exit(9);
}
