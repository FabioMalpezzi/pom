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

import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
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
  process.stderr.write("No project session found for the given id, creating a new one\n");
  process.stdout.write(`${reply}\n`);
} else if (backend === "codex") {
  const resumeIndex = args.indexOf("resume");
  const threadId = resumeIndex >= 0 ? args[resumeIndex + 1] : randomUUID();
  const outputIndex = args.indexOf("-o");
  if (outputIndex >= 0) writeFileSync(args[outputIndex + 1], reply);
  process.stdout.write(`${JSON.stringify({ type: "thread.started", thread_id: threadId })}\n`);
  process.stdout.write(`${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: reply } })}\n`);
} else if (backend === "claude") {
  const flag = args.includes("--resume") ? "--resume" : "--session-id";
  const sessionId = args[args.indexOf(flag) + 1];
  process.stdout.write(`${JSON.stringify({ type: "result", subtype: "success", result: reply, session_id: sessionId })}\n`);
} else {
  process.stderr.write(`fake backend: unknown backend "${backend}"\n`);
  process.exit(9);
}
