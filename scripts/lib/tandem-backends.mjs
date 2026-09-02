// Backend adapters for `pom:tandem`: how a persistent, non-interactive session
// is created and resumed with each supported coding agent CLI, and how the
// final reply and the session id are read back from its output.
//
//   pi     pi -p --session-dir <dir> --session-id <id> [--model <m>] "<msg>"
//          The session is created on the first call and resumed by id.
//   codex  codex exec -s workspace-write -C <cwd> [-m <m>] --json -o <file> "<msg>"
//          codex exec -s workspace-write -C <cwd> resume <thread> [-m <m>] --json -o <file> "<msg>"
//          The thread id is captured from the JSONL events of the first call;
//          the final message is read from the --output-last-message file.
//   claude claude -p --session-id <uuid> [--model <m>] --permission-mode acceptEdits --allowedTools <shell,read,edit> --output-format json "<msg>"
//          claude -p --resume <uuid> [--model <m>] --permission-mode acceptEdits --allowedTools <shell,read,edit> --output-format json "<msg>"
//          The reply is the `result` field of the JSON envelope.
//
// Both roles run with write permissions: the executor in the project root,
// the controller in its own Git worktree (see tandem-git.mjs), which is what
// keeps the controller away from the executor workspace by construction.
//
// Tests never reach the network: when POM_TANDEM_FAKE_BACKEND names a script,
// it is run with Node as `node <script> <backend> <args...>` in place of the
// real executable and must imitate that backend's output format.

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const BACKENDS = ["pi", "codex", "claude"];
/** Tools Claude Code may use without prompting in a tandem role (shell, read, edit). */
export const CLAUDE_ALLOWED_TOOLS = "Bash,Read,Edit,Write,MultiEdit,Glob,Grep";

/**
 * Parses `<backend>[:<model>]`.
 * @param {string} spec
 * @returns {{ backend: string, model: string | null }}
 */
export function parseAgentSpec(spec) {
  const separator = spec.indexOf(":");
  const backend = (separator >= 0 ? spec.slice(0, separator) : spec).trim();
  const model = separator >= 0 ? spec.slice(separator + 1).trim() : "";
  if (!BACKENDS.includes(backend)) {
    throw new Error(`Unsupported backend "${backend}". Use one of: ${BACKENDS.join(", ")} (optionally as <backend>:<model>).`);
  }
  return { backend, model: model || null };
}

/** Session ids that are chosen up front (pi, claude) rather than returned by the backend (codex). */
export function initialSessionId(backend) {
  return backend === "codex" ? null : randomUUID();
}

/**
 * Recognises the two Claude Code errors that mean the session id cannot be
 * used any more: the id is held by another process, or `--resume` names a
 * conversation that no longer exists. The caller then starts a new session.
 * @returns {string | null} a short reason, or null
 */
export function claudeSessionError(stderr, stdout) {
  const text = `${stderr}\n${stdout}`;
  if (/already in use/i.test(text)) return "session id already in use";
  if (/No conversation found/i.test(text)) return "no conversation found for the session id";
  return null;
}

/**
 * Whether pi still has the session on disk: the session folder exists and
 * holds a file that names the id (in its name or its content).
 */
export function piSessionExists(sessionDir, sessionId) {
  if (!sessionId || !existsSync(sessionDir)) return false;
  const stack = [sessionDir];
  while (stack.length) {
    const folder = stack.pop();
    for (const entry of readdirSync(folder)) {
      const path = join(folder, entry);
      if (statSync(path).isDirectory()) {
        stack.push(path);
        continue;
      }
      if (entry.includes(sessionId)) return true;
      try {
        if (readFileSync(path, "utf8").includes(sessionId)) return true;
      } catch {
        // unreadable file: not a session record
      }
    }
  }
  return false;
}

/**
 * Builds the command line for one call. `sessionStarted` says whether the
 * session already ran once: pi resumes by id transparently, codex needs
 * `resume <thread>` once it has a thread id, claude switches from
 * `--session-id` to `--resume`.
 * @param {{ backend: string, model: string | null, sessionId: string | null, sessionStarted: boolean,
 *   cwd: string, sessionDir: string, message: string, outputFile: string }} input
 * @returns {{ command: string, args: string[] }}
 */
export function buildInvocation({ backend, model, sessionId, sessionStarted, cwd, sessionDir, message, outputFile }) {
  const modelArgs = (flag) => (model ? [flag, model] : []);
  if (backend === "pi") {
    if (!sessionId) throw new Error("pi sessions need a session id chosen at init.");
    return { command: "pi", args: ["-p", "--session-dir", sessionDir, "--session-id", sessionId, ...modelArgs("--model"), message] };
  }
  if (backend === "codex") {
    const head = ["exec", "-s", "workspace-write", "-C", cwd];
    const tail = [...modelArgs("-m"), "--json", "-o", outputFile, message];
    if (sessionStarted && sessionId) return { command: "codex", args: [...head, "resume", sessionId, ...tail] };
    return { command: "codex", args: [...head, ...tail] };
  }
  if (backend === "claude") {
    if (!sessionId) throw new Error("claude sessions need a session id chosen at init.");
    const sessionFlag = sessionStarted ? "--resume" : "--session-id";
    // In print mode Claude denies any tool that is not pre-allowed, so both
    // roles get shell, read, and edit tools explicitly: the executor needs
    // them to implement, the controller to run tests in its own worktree.
    return {
      command: "claude",
      args: ["-p", sessionFlag, sessionId, ...modelArgs("--model"), "--permission-mode", "acceptEdits", "--allowedTools", CLAUDE_ALLOWED_TOOLS, "--output-format", "json", message],
    };
  }
  throw new Error(`Unsupported backend "${backend}".`);
}

/**
 * Extracts the reply text and, when the backend assigns it, the session id.
 * @param {string} backend
 * @param {{ stdout: string, outputFile: string }} result
 * @returns {{ reply: string, sessionId: string | null }}
 */
export function extractReply(backend, { stdout, outputFile }) {
  if (backend === "codex") {
    const thread = stdout.match(/"thread_id"\s*:\s*"([^"]+)"/);
    let reply = existsSync(outputFile) ? readFileSync(outputFile, "utf8").trim() : "";
    if (!reply) reply = lastAgentMessage(stdout);
    return { reply, sessionId: thread ? thread[1] : null };
  }
  if (backend === "claude") {
    const envelope = parseJsonLoose(stdout);
    if (envelope && typeof envelope.result === "string") {
      return { reply: envelope.result.trim(), sessionId: typeof envelope.session_id === "string" ? envelope.session_id : null };
    }
    return { reply: stdout.trim(), sessionId: null };
  }
  return { reply: stdout.trim(), sessionId: null };
}

function lastAgentMessage(stdout) {
  let text = "";
  for (const line of stdout.split(/\r?\n/)) {
    const event = parseJsonLoose(line);
    const item = event && event.item;
    if (item && item.type === "agent_message" && typeof item.text === "string") text = item.text;
  }
  return text.trim() || stdout.trim();
}

function parseJsonLoose(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Runs one backend call synchronously.
 * @param {{ command: string, args: string[] }} invocation
 * @param {{ cwd: string, timeout?: number, env?: Record<string, string> }} options
 * @returns {{ status: number | null, stdout: string, stderr: string, command: string, args: string[], timedOut: boolean }}
 */
export function runBackend(invocation, { cwd, timeout, env }) {
  const fake = process.env.POM_TANDEM_FAKE_BACKEND;
  const command = fake ? process.execPath : invocation.command;
  const args = fake ? [fake, invocation.command, ...invocation.args] : invocation.args;
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(env ?? {}) },
    maxBuffer: 64 * 1024 * 1024,
    ...(timeout ? { timeout } : {}),
  });
  if (result.error) {
    const timedOut = result.error.code === "ETIMEDOUT";
    const reason = result.error.code === "ENOENT"
      ? `executable "${invocation.command}" not found in PATH`
      : timedOut ? `backend timed out after ${timeout} ms` : result.error.message;
    return { status: null, stdout: result.stdout ?? "", stderr: `${result.stderr ?? ""}\n${reason}`.trim(), command, args, timedOut };
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", command, args, timedOut: false };
}
