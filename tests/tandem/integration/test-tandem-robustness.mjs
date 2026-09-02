// Regression tests for the robustness fixes of scripts/tandem.mjs, one block
// per finding of the adversarial review. Same fake backend as test-tandem.mjs
// (tests/tandem/fixtures/fake-backend.mjs): no network, no LLM.
//
//   R1  verdict: first non-empty line only, Markdown tolerated, contradictions rejected
//   R2  claude sessions: state saved before the spawn, lost session reported (exit 1, no silent retry), `session reset`
//   R3  --dir refused at the root or outside it; existing .gitignore merged
//   R4  guard: ignored files by size+mtime, *.log/*.pid and --guard-ignore skipped, other collaboration folders excluded, checked in `finally`, paths listed
//   R5  --controller-worktree inside the repository but outside the tandem folder refused
//   R6  controller writes in its own worktree saved as .left.patch and noted
//   R7  transitions: closed tandem, repeated close, init --reopen, review after APPROVE
//   R8  codex without thread id and missing pi session file: warned and recorded
//   R9  phase budget per phase label
//   R10 respond without F<n> lines, --done in brief and review message, `note`
//   R11 finding replies in tolerated shapes; blocking DISPUTED without evidence
//   R12 state.json written atomically
//   R13 empty reply, timeout, invalid POM_TANDEM_TIMEOUT_MS, --setup

import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHarness, git, makeSandbox, runNode } from "../../lib/harness.mjs";
import { disputedWithoutEvidence, parseFindingReplies, parseFindings, parseVerdict, reviewMessage } from "../../../scripts/lib/tandem-contract.mjs";
import * as fakeGit from "../../../scripts/lib/tandem-git.mjs";

const { globMatches } = fakeGit;

const here = fileURLToPath(new URL(".", import.meta.url));
const REPO = resolve(here, "..", "..", "..");
const SCRIPT = join(REPO, "scripts", "tandem.mjs");
const FAKE = join(REPO, "tests", "tandem", "fixtures", "fake-backend.mjs");

const { assert, section, banner, summary } = createHarness({ name: "pom:tandem robustness" });
const sandbox = makeSandbox("pom-tandem-rb-");
const outside = makeSandbox("pom-tandem-rb-out-");
const root = realpathSync(sandbox.dir);
const out = realpathSync(outside.dir);
const logFile = join(out, "fake.log");

function tandem(args, env = {}) {
  return runNode([SCRIPT, ...args], { cwd: root, env: { POM_TANDEM_FAKE_BACKEND: FAKE, POM_TANDEM_FAKE_LOG: logFile, ...env } });
}
function readLog() {
  return existsSync(logFile) ? readFileSync(logFile, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
}
function lastCall() {
  const calls = readLog();
  return calls[calls.length - 1];
}
function state(topic) {
  return JSON.parse(readFileSync(join(root, "collaboration", topic, "state.json"), "utf8"));
}
function read(topic, file) {
  return readFileSync(join(root, "collaboration", topic, file), "utf8");
}
function task(topic, id) {
  return state(topic).tasks.find((entry) => entry.id === id);
}
function turnsOf(topic) {
  return readdirSync(join(root, "collaboration", topic, "turns")).sort();
}
function initTopic(topic, extra = [], env = {}) {
  const result = tandem(["init", "--topic", topic, "--controller", "codex", "--executor", "claude:sonnet", ...extra], env);
  if (result.status === 0) tandem(["task", "add", "--topic", topic, "--id", "T1", "--title", "Task one"]);
  return result;
}
const REVISE_BLOCKING = "VERDICT: REVISE\nFINDINGS:\n1. blocking | src/a.js:1 | the loop bound is off by one | a passing test for the last element";
const REVISE_MINOR = "VERDICT: REVISE\nFINDINGS:\n1. minor | README.md | wording | reads well";

banner();
try {
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "node_modules", "x"), { recursive: true });
  writeFileSync(join(root, "src", "a.js"), "export const items = [1, 2, 3];\n");
  writeFileSync(join(root, "README.md"), "# demo\n");
  writeFileSync(join(root, ".gitignore"), "ignored.txt\nnode_modules/\n");
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "initial"]);
  writeFileSync(join(root, "ignored.txt"), "ignored content\n");
  writeFileSync(join(root, "node_modules", "x", "y.js"), "module.exports = 1;\n");
  const worktreeOf = (topic) => join(root, "collaboration", topic, ".controller-worktree");

  section("R1: the verdict is the first non-empty line, Markdown tolerated, contradictions rejected");
  let result = initTopic("demo");
  assert("init exits 0", result.status === 0, result.stderr);
  result = tandem(["review", "--topic", "demo", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_REPLY: "- VERDICT: APPROVE would need a test\nVERDICT: REVISE" });
  assert("APPROVE quoted in a list item plus REVISE exits 2", result.status === 2 && result.stderr.includes("both `VERDICT: APPROVE` and `VERDICT: REVISE`"), `${result.status} ${result.stderr}`);
  assert("contradiction leaves the task untouched", task("demo", "T1").status === "pending" && task("demo", "T1").cycles === 0);
  result = tandem(["review", "--topic", "demo", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_REPLY: "Sure, here is my review.\nVERDICT: APPROVE\nFINDINGS:\n(none)" });
  assert("verdict after a preamble exits 2", result.status === 2 && result.stderr.includes("first non-empty line"), `${result.status} ${result.stderr}`);
  result = tandem(["review", "--topic", "demo", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_REPLY: "\n**VERDICT: APPROVE**\nFINDINGS:\n(none)" });
  assert("**VERDICT: APPROVE** on the first line approves", result.status === 0 && task("demo", "T1").status === "approved", `${result.status} ${result.stderr}`);
  result = tandem(["review", "--topic", "demo", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_REPLY: `VERDICT: **REVISE**\nFINDINGS:\n1. blocking | src/a.js:1 | off by one | a test` });
  assert("VERDICT: **REVISE** on an approved task re-evaluates it (R7)", result.status === 0 && task("demo", "T1").status === "in_progress" && task("demo", "T1").cycles === 1, `${result.status} ${result.stderr}`);
  result = tandem(["review", "--topic", "demo", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_REPLY: "`VERDICT: APPROVE`\nFINDINGS:\n(none)" });
  assert("`VERDICT: APPROVE` in backticks approves", result.status === 0 && task("demo", "T1").status === "approved", `${result.status} ${result.stderr}`);
  assert("parseVerdict: exact line", parseVerdict("VERDICT: REVISE\nFINDINGS:").verdict === "REVISE");
  assert("parseVerdict: `VERDICT: APPROVE would need` is not a verdict", parseVerdict("VERDICT: APPROVE would need a test").verdict === null);
  assert("parseVerdict: two different verdicts are a problem", parseVerdict("VERDICT: APPROVE\nlater\nVERDICT: REVISE").problem.includes("both"));
  assert("parseVerdict: the same verdict twice is fine", parseVerdict("VERDICT: APPROVE\n\nVERDICT: APPROVE").verdict === "APPROVE");
  assert("parseVerdict: case-insensitive on the first line", parseVerdict("Verdict: approve\nFINDINGS:").verdict === "APPROVE" && parseVerdict("verdict: Revise").verdict === "REVISE");
  assert("parseVerdict: a contradiction is detected across cases", parseVerdict("VERDICT: APPROVE\nverdict: revise").problem.includes("both"));

  section("R2: claude sessions are saved before the spawn, reported when lost (never replaced silently), and resettable");
  result = initTopic("s2");
  result = tandem(["send", "--topic", "s2", "--role", "executor", "--task", "T1", "--message", "hi"], { POM_TANDEM_FAKE_EXIT: "3" });
  assert("a failing first call still exits 1", result.status === 1 && result.stderr.includes("claude: exited with 3"), `${result.status} ${result.stderr}`);
  assert("sessionStarted was saved before the spawn", state("s2").roles.executor.sessionStarted === true);
  let s = state("s2");
  const firstId = s.roles.executor.sessionId;
  const marker = join(out, "claude-fail-once");
  const callsBeforeLost = readLog().length;
  result = tandem(["send", "--topic", "s2", "--role", "executor", "--task", "T1", "--message", "hi again"], { POM_TANDEM_FAKE_CLAUDE_FAIL_ONCE: marker, POM_TANDEM_FAKE_CLAUDE_FAIL_KIND: "not-found" });
  assert("'No conversation found' on --resume exits 1 with the session-lost message", result.status === 1 && result.stderr.includes("claude session lost: run `session reset --role executor` then re-send the assignment with the brief context (see prompt 38, Resuming)"), `${result.status} ${result.stderr}`);
  assert("no retry: exactly one backend call, the session id is unchanged", readLog().length === callsBeforeLost + 1 && lastCall().args[1] === "--resume" && state("s2").roles.executor.sessionId === firstId, JSON.stringify(lastCall().args.slice(0, 3)));
  assert("the lost session is in the ledger", read("s2", "LEDGER.md").includes(`executor | task T1 | cycle 0 | claude session lost (no conversation found for the session id: ${firstId})`));
  const marker2 = join(out, "claude-fail-twice");
  result = tandem(["send", "--topic", "s2", "--role", "executor", "--task", "T1", "--message", "x"], { POM_TANDEM_FAKE_CLAUDE_FAIL_ONCE: marker2 });
  assert("'already in use' is reported the same way", result.status === 1 && result.stderr.includes("claude session lost") && read("s2", "LEDGER.md").includes("claude session lost (session id already in use"), `${result.status} ${result.stderr}`);
  const beforeReset = state("s2").roles.executor.sessionId;
  result = tandem(["session", "reset", "--topic", "s2", "--role", "executor"]);
  s = state("s2");
  assert("session reset assigns a new uuid and clears sessionStarted", result.status === 0 && /^[0-9a-f-]{36}$/.test(s.roles.executor.sessionId) && s.roles.executor.sessionId !== beforeReset && s.roles.executor.sessionStarted === false, `${result.status} ${result.stderr}`);
  assert("session reset is recorded in the ledger", read("s2", "LEDGER.md").includes(`executor | task - | cycle 0 | session reset (claude: ${beforeReset} -> ${s.roles.executor.sessionId})`));
  result = tandem(["send", "--topic", "s2", "--role", "executor", "--task", "T1", "--message", "after reset"]);
  assert("the next call starts the new session with --session-id", result.status === 0 && lastCall().args[1] === "--session-id" && lastCall().args[2] === s.roles.executor.sessionId, JSON.stringify(lastCall().args.slice(0, 3)));
  tandem(["send", "--topic", "s2", "--role", "controller", "--task", "T1", "--message", "look"]);
  result = tandem(["session", "reset", "--topic", "s2", "--role", "controller"]);
  assert("session reset on codex clears the thread id", result.status === 0 && state("s2").roles.controller.sessionId === null, result.stderr);
  tandem(["send", "--topic", "s2", "--role", "controller", "--task", "T1", "--message", "again"]);
  assert("codex starts a new thread after the reset", !lastCall().args.includes("resume"), JSON.stringify(lastCall().args));
  result = tandem(["session", "frob", "--topic", "s2", "--role", "controller"]);
  assert("unknown session subcommand exits 1", result.status === 1 && result.stderr.includes("Unknown session subcommand"), result.stderr);

  section("R3: --dir at the project root or outside it is refused; an existing .gitignore is merged");
  result = tandem(["init", "--dir", ".", "--controller", "codex", "--executor", "claude"]);
  assert("--dir . exits 1", result.status === 1 && result.stderr.includes("not the project root itself"), `${result.status} ${result.stderr}`);
  result = tandem(["init", "--dir", "../elsewhere", "--controller", "codex", "--executor", "claude"]);
  assert("--dir outside the root exits 1", result.status === 1 && result.stderr.includes("must be inside the project root"), `${result.status} ${result.stderr}`);
  result = tandem(["init", "--dir", join(out, "abs"), "--controller", "codex", "--executor", "claude"]);
  assert("absolute --dir outside the root exits 1", result.status === 1 && result.stderr.includes("must be inside the project root") && !existsSync(join(out, "abs")), `${result.status} ${result.stderr}`);
  mkdirSync(join(root, "collaboration", "merged"), { recursive: true });
  writeFileSync(join(root, "collaboration", "merged", ".gitignore"), "custom.log\n.sessions/\n");
  result = initTopic("merged");
  const merged = read("merged", ".gitignore");
  assert("existing .gitignore keeps its lines and gains only the missing ones", result.status === 0 && merged === "custom.log\n.sessions/\n.controller-worktree/\nturns/\n", JSON.stringify(merged));
  assert("an untracked .gitignore is merged silently", !result.stderr.includes("tracked"), result.stderr);
  mkdirSync(join(root, "collaboration", "tracked"), { recursive: true });
  writeFileSync(join(root, "collaboration", "tracked", ".gitignore"), "custom.log\n");
  git(root, ["add", "collaboration/tracked/.gitignore"]);
  git(root, ["commit", "-q", "-m", "tracked ignore"]);
  result = initTopic("tracked");
  assert("a tracked .gitignore gets a warning naming the added lines", result.status === 0 && result.stderr.includes("warning: adding 3 line(s) to tracked collaboration/tracked/.gitignore"), `${result.status} ${result.stderr}`);

  section("R4: the guard covers ignored files, skips other collaboration folders, and runs even when the backend fails");
  mkdirSync(join(root, "collaboration", "other"), { recursive: true });
  writeFileSync(join(root, "collaboration", "other", "LEDGER.md"), "# other tandem\n");
  result = tandem(["review", "--topic", "merged", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_TAMPER: join(root, "ignored.txt") });
  assert("changing an ignored file in the project root exits 4", result.status === 4, `${result.status} ${result.stderr}`);
  assert("the exit 4 message lists the changed path", result.stderr.includes("1 path(s) changed") && /\n  ignored\.txt\n/.test(result.stderr), result.stderr);
  assert("the ledger names the changed path", read("merged", "LEDGER.md").includes("changed: ignored.txt"));
  writeFileSync(join(root, "ignored.txt"), "ignored content\n");
  result = tandem(["review", "--topic", "merged", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_TAMPER: join(root, "node_modules", "x", "new.js") });
  assert("a new file inside an ignored folder exits 4 and is listed", result.status === 4 && result.stderr.includes("node_modules/x/new.js"), `${result.status} ${result.stderr}`);
  rmSync(join(root, "node_modules", "x", "new.js"), { force: true });
  result = tandem(["review", "--topic", "merged", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_TAMPER: join(root, "node_modules", "x", "dev.log") });
  assert("a *.log under an ignored folder changing during the review is not a violation", result.status === 0, `${result.status} ${result.stderr}`);
  result = tandem(["review", "--topic", "merged", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_TAMPER: join(root, "node_modules", "x", "server.pid") });
  assert("a *.pid under an ignored folder is skipped too", result.status === 0, `${result.status} ${result.stderr}`);
  rmSync(join(root, "node_modules", "x", "dev.log"), { force: true });
  rmSync(join(root, "node_modules", "x", "server.pid"), { force: true });
  writeFileSync(join(root, "ignored.txt"), "ignored content\n");
  const bigStat = statSync(join(root, "ignored.txt"));
  const fp = readLog().length;
  result = tandem(["review", "--topic", "merged", "--task", "T1", "--deliverable", "x"]);
  assert("ignored files are fingerprinted by size and mtime, tracked and untracked by content", (() => {
    const { workspaceFingerprint } = fakeGit;
    const print = workspaceFingerprint(root, join(root, "collaboration", "merged"));
    return print.files["ignored.txt"] === `${bigStat.size}:${bigStat.mtimeMs}` && /^[0-9a-f]{64}$/.test(print.files["collaboration/other/LEDGER.md"] || "") === false && Object.values(print.files).every((v) => v.includes(":") || /^[0-9a-f]{64}$/.test(v));
  })() && readLog().length === fp + 1);
  result = tandem(["init", "--topic", "gi", "--controller", "codex", "--executor", "claude", "--guard-ignore", "cache/**", "--guard-ignore=*.tmp"]);
  tandem(["task", "add", "--topic", "gi", "--id", "T1", "--title", "t"]);
  assert("--guard-ignore is repeatable, saved in the state and shown in the brief", result.status === 0 && JSON.stringify(state("gi").guardIgnore) === '["cache/**","*.tmp"]' && read("gi", "BRIEF.md").includes("| Guard ignores | `*.log`, `*.pid` under ignored folders; plus `cache/**`, `*.tmp` |"), `${result.status} ${result.stderr} ${read("gi", "BRIEF.md")}`);
  mkdirSync(join(root, "cache", "deep"), { recursive: true });
  result = tandem(["review", "--topic", "gi", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_TAMPER: join(root, "cache", "deep", "entry.bin") });
  assert("an untracked path matching a --guard-ignore glob is not a violation", result.status === 0, `${result.status} ${result.stderr}`);
  result = tandem(["review", "--topic", "gi", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_TAMPER: join(root, "src", "scratch.tmp") });
  assert("a bare *.tmp glob matches by file name anywhere", result.status === 0, `${result.status} ${result.stderr}`);
  result = tandem(["review", "--topic", "gi", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_TAMPER: join(root, "src", "real.txt") });
  assert("paths outside the globs are still guarded", result.status === 4 && result.stderr.includes("src/real.txt"), `${result.status} ${result.stderr}`);
  rmSync(join(root, "cache"), { recursive: true, force: true });
  rmSync(join(root, "src", "scratch.tmp"), { force: true });
  rmSync(join(root, "src", "real.txt"), { force: true });
  assert("globMatches: ** spans folders, * stays in a segment, bare patterns match the name", globMatches("cache/**", "cache/a/b.bin") && globMatches("cache/*", "cache/x") && !globMatches("cache/*", "cache/a/x") && globMatches("*.log", "node_modules/x/dev.log") && !globMatches("*.log", "dev.logs") && globMatches("a/**/z.txt", "a/z.txt") && globMatches("a/**/z.txt", "a/b/c/z.txt"));
  result = tandem(["review", "--topic", "merged", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_TAMPER: join(root, "collaboration", "other", "LEDGER.md") });
  assert("writing into another collaboration folder is not a violation", result.status === 0, `${result.status} ${result.stderr}`);
  result = tandem(["review", "--topic", "merged", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_TAMPER: join(root, "src", "a.js"), POM_TANDEM_FAKE_EXIT: "5" });
  assert("exit 4 prevails over a backend failure", result.status === 4 && result.stderr.includes("src/a.js"), `${result.status} ${result.stderr}`);
  assert("the backend failure is still in the ledger", read("merged", "LEDGER.md").includes("backend codex failed (exited with 5)"));
  git(root, ["checkout", "--", "src/a.js"]);
  result = tandem(["review", "--topic", "merged", "--task", "T1", "--deliverable", "x"], { POM_TANDEM_FAKE_EXIT: "5" });
  assert("a backend failure without tampering exits 1", result.status === 1 && result.stderr.includes("codex: exited with 5") && result.stderr.includes("boom from backend"), `${result.status} ${result.stderr}`);
  assert("the controller worktree is reset after the failure", git(worktreeOf("merged"), ["status", "--porcelain"]) === "");

  section("R5: --controller-worktree inside the repository but outside the tandem folder is refused");
  result = tandem(["init", "--topic", "w5", "--controller", "codex", "--executor", "claude", "--controller-worktree", "ctrl-wt"]);
  assert("worktree under the project root exits 1", result.status === 1 && result.stderr.includes("--controller-worktree must be outside the project root or inside the tandem folder") && !existsSync(join(root, "ctrl-wt")), `${result.status} ${result.stderr}`);
  result = tandem(["init", "--topic", "w5", "--controller", "codex", "--executor", "claude", "--controller-worktree", "."]);
  assert("worktree at the project root exits 1", result.status === 1, `${result.status} ${result.stderr}`);
  result = tandem(["init", "--topic", "w5", "--controller", "codex", "--executor", "claude", "--controller-worktree", join(out, "external-wt")]);
  assert("worktree outside the project root is accepted", result.status === 0 && existsSync(join(out, "external-wt", ".git")), result.stderr);
  result = tandem(["init", "--topic", "w5b", "--controller", "codex", "--executor", "claude", "--controller-worktree", "collaboration/w5b/ctrl"]);
  assert("worktree inside the tandem folder is accepted", result.status === 0 && existsSync(join(root, "collaboration", "w5b", "ctrl", ".git")), result.stderr);

  section("R6: what the controller writes in its own worktree is saved and noted, not an error");
  result = tandem(["send", "--topic", "demo", "--role", "controller", "--task", "T1", "--message", "look"], { POM_TANDEM_FAKE_WRITE: "scratch.txt" });
  let turns = turnsOf("demo");
  let left = turns.find((name) => name.endsWith("-controller-T1.left.patch"));
  assert("a new file left by the controller produces a .left.patch", result.status === 0 && left !== undefined, `${result.status} ${result.stderr} ${turns}`);
  assert("the .left.patch lists the new file and carries its content", left && read("demo", `turns/${left}`).includes("#   scratch.txt") && read("demo", `turns/${left}`).includes("+++ b/scratch.txt") && read("demo", `turns/${left}`).includes("+scratch left by the controller"));
  assert("the ledger notes the discarded changes", read("demo", "LEDGER.md").includes("controller | task T1 | cycle 1 | controller left changes in its worktree (discarded)"));
  assert("the .left.patch has the turn number of the call", left && turns.includes(left.replace(".left.patch", ".md")));
  result = tandem(["send", "--topic", "demo", "--role", "controller", "--task", "T1", "--message", "edit"], { POM_TANDEM_FAKE_WRITE: "src/a.js" });
  turns = turnsOf("demo");
  left = turns.filter((name) => name.endsWith(".left.patch")).pop();
  assert("an edited tracked file produces a diff in the .left.patch", result.status === 0 && read("demo", `turns/${left}`).includes("+scratch left by the controller"), `${result.status} ${result.stderr}`);
  assert("the executor workspace is untouched", readFileSync(join(root, "src", "a.js"), "utf8") === "export const items = [1, 2, 3];\n");
  const leftCount = turns.filter((name) => name.endsWith(".left.patch")).length;
  tandem(["send", "--topic", "demo", "--role", "controller", "--task", "T1", "--message", "clean"]);
  assert("no .left.patch when the controller writes nothing", turnsOf("demo").filter((name) => name.endsWith(".left.patch")).length === leftCount);

  section("R7: closed tandems refuse every command but status; close is idempotent; init --reopen");
  result = tandem(["init", "--reopen", "--topic", "demo"]);
  assert("--reopen on an open tandem exits 1", result.status === 1 && result.stderr.includes("is open"), `${result.status} ${result.stderr}`);
  tandem(["close", "--topic", "demo"]);
  const ledgerAfterClose = read("demo", "LEDGER.md");
  for (const args of [["send", "--role", "executor", "--task", "T1", "--message", "x"], ["review", "--task", "T1", "--deliverable", "x"], ["respond", "--task", "T1", "--findings", "x"], ["task", "add", "--id", "T2", "--title", "t"], ["note", "--message", "x"], ["session", "reset", "--role", "executor"]]) {
    result = tandem([args[0], ...args.slice(1), "--topic", "demo"]);
    assert(`${args[0]} on a closed tandem exits 1`, result.status === 1 && result.stderr.startsWith("tandem is closed; use init --reopen"), `${result.status} ${result.stderr}`);
  }
  assert("status still works on a closed tandem", tandem(["status", "--topic", "demo"]).stdout.includes("(closed)"));
  result = tandem(["close", "--topic", "demo"]);
  assert("a repeated close is a no-op that says so", result.status === 0 && result.stdout.includes("already closed") && read("demo", "LEDGER.md") === ledgerAfterClose, `${result.status} ${result.stdout}`);
  const briefBefore = read("demo", "BRIEF.md");
  result = tandem(["init", "--reopen", "--topic", "demo"]);
  assert("init --reopen exits 0 and recreates the worktree", result.status === 0 && existsSync(join(worktreeOf("demo"), ".git")), `${result.status} ${result.stderr}`);
  assert("reopen clears closed and keeps the tasks", state("demo").closed === null && task("demo", "T1").status === "approved" && task("demo", "T1").cycles === 1);
  assert("reopen flips only the brief status", read("demo", "BRIEF.md") === briefBefore.replace("| Status | closed |", "| Status | open |"));
  assert("reopen is recorded in the ledger", read("demo", "LEDGER.md").includes("coordinator | task - | cycle 0 | reopened (controller worktree recreated)"));
  result = tandem(["send", "--topic", "demo", "--role", "controller", "--task", "T1", "--message", "back"]);
  assert("the reopened tandem accepts calls", result.status === 0, result.stderr);

  section("R8: codex without thread id and a missing pi session file are warned and recorded");
  result = initTopic("s8");
  result = tandem(["send", "--topic", "s8", "--role", "controller", "--task", "T1", "--message", "x"], { POM_TANDEM_FAKE_NOTHREAD: "1" });
  assert("codex without thread_id exits 0 with a warning", result.status === 0 && result.stderr.includes("warning: codex thread id not captured; next call starts a new conversation"), `${result.status} ${result.stderr}`);
  assert("the warning is in the ledger and the thread stays unknown", read("s8", "LEDGER.md").includes("controller | task T1 | cycle 0 | warning: codex thread id not captured") && state("s8").roles.controller.sessionId === null);
  tandem(["send", "--topic", "s8", "--role", "controller", "--task", "T1", "--message", "y"]);
  assert("the next codex call starts a new thread", !lastCall().args.includes("resume") && state("s8").roles.controller.sessionId !== null, JSON.stringify(lastCall().args));
  result = tandem(["init", "--topic", "pi8", "--controller", "codex", "--executor", "pi"]);
  tandem(["task", "add", "--topic", "pi8", "--id", "P1", "--title", "pi"]);
  result = tandem(["send", "--topic", "pi8", "--role", "executor", "--task", "P1", "--message", "hello"]);
  const piDir = join(root, "collaboration", "pi8", ".sessions", "pi");
  const piFile = join(piDir, `${state("pi8").roles.executor.sessionId}.jsonl`);
  assert("pi stores its session file and the second call finds it", result.status === 0 && existsSync(piFile) && !tandem(["send", "--topic", "pi8", "--role", "executor", "--task", "P1", "--message", "again"]).stderr.includes("pi session file not found"), result.stderr);
  rmSync(piFile);
  result = tandem(["send", "--topic", "pi8", "--role", "executor", "--task", "P1", "--message", "lost"]);
  assert("a missing pi session file is warned and the call still runs", result.status === 0 && result.stderr.includes("warning: pi session file not found") && result.stderr.includes("next call starts a new conversation"), `${result.status} ${result.stderr}`);
  assert("the pi warning is in the ledger", read("pi8", "LEDGER.md").includes("executor | task P1 | cycle 0 | warning: pi session file not found"));
  rmSync(piDir, { recursive: true, force: true });
  result = tandem(["send", "--topic", "pi8", "--role", "executor", "--task", "P1", "--message", "lost dir"]);
  assert("a missing pi session folder is warned too", result.status === 0 && result.stderr.includes("warning: pi session file not found"), `${result.status} ${result.stderr}`);

  section("R9: the phase budget is counted per phase label");
  result = tandem(["init", "--topic", "ph", "--controller", "codex", "--executor", "claude", "--phase-budget", "2"]);
  tandem(["task", "add", "--topic", "ph", "--id", "A1", "--title", "alpha one", "--phase", "alpha"]);
  tandem(["task", "add", "--topic", "ph", "--id", "B1", "--title", "beta one", "--phase", "beta"]);
  tandem(["task", "add", "--topic", "ph", "--id", "N1", "--title", "no phase"]);
  assert("status shows every phase at the full budget", tandem(["status", "--topic", "ph"]).stdout.includes("phase budget: 2 per phase (alpha: 2 remaining of 2, beta: 2 remaining of 2, -: 2 remaining of 2)"), tandem(["status", "--topic", "ph"]).stdout);
  tandem(["review", "--topic", "ph", "--task", "A1", "--deliverable", "[[REVISE]] x"]);
  tandem(["review", "--topic", "ph", "--task", "B1", "--deliverable", "[[REVISE]] x"]);
  tandem(["review", "--topic", "ph", "--task", "N1", "--deliverable", "[[REVISE]] x"]);
  s = state("ph");
  assert("each phase consumed one unit", s.phaseBudgetRemaining.alpha === 1 && s.phaseBudgetRemaining.beta === 1 && s.phaseBudgetRemaining["-"] === 1, JSON.stringify(s.phaseBudgetRemaining));
  result = tandem(["review", "--topic", "ph", "--task", "A1", "--deliverable", "[[REVISE]] x"]);
  assert("alpha exhausted stalls A1 with exit 3", result.status === 3 && result.stderr.includes("phase budget exhausted for phase alpha") && task("ph", "A1").status === "stalled", `${result.status} ${result.stderr}`);
  result = tandem(["review", "--topic", "ph", "--task", "B1", "--deliverable", "[[REVISE]] x"]);
  assert("beta is still counted separately", result.status === 3 && task("ph", "B1").status === "stalled" && state("ph").phaseBudgetRemaining["-"] === 1, `${result.status} ${result.stderr}`);
  assert("status shows the remaining budget per phase", tandem(["status", "--topic", "ph"]).stdout.includes("(alpha: 0 remaining of 2, beta: 0 remaining of 2, -: 1 remaining of 2)"), tandem(["status", "--topic", "ph"]).stdout);

  section("R10: respond without F<n> lines, --done in the brief and the review, note");
  result = initTopic("r10");
  tandem(["task", "add", "--topic", "r10", "--id", "T2", "--title", "With criteria", "--done", "tests pass and the README documents the flag"]);
  assert("--done is shown in the BRIEF tasks section", read("r10", "BRIEF.md").includes("Definition of done:\n\n- T2: tests pass and the README documents the flag"), read("r10", "BRIEF.md"));
  assert("--done is recorded in the ledger", read("r10", "LEDGER.md").includes("definition of done: tests pass and the README documents the flag"));
  tandem(["review", "--topic", "r10", "--task", "T2", "--deliverable", "x"], { POM_TANDEM_FAKE_REPLY: REVISE_BLOCKING });
  let message = lastCall().args[lastCall().args.length - 1];
  assert("the review message carries title and criteria as definition of done", message.includes("Definition of done: With criteria - tests pass and the README documents the flag"), message);
  assert("the review contract quotes the single finding format", message.includes("N. blocking|minor | <location> | <what is wrong> | <evidence that would satisfy you>"), message);
  result = tandem(["respond", "--topic", "r10", "--task", "T2"], { POM_TANDEM_FAKE_REPLY: "I fixed everything, trust me." });
  assert("respond without F<n> lines exits 2", result.status === 2 && result.stderr.includes("no `F<n>: FIXED|DISPUTED` line"), `${result.status} ${result.stderr}`);
  assert("the reply is still printed for the coordinator", result.stdout.includes("I fixed everything"));
  assert("the task state is unchanged", task("r10", "T2").status === "in_progress" && task("r10", "T2").cycles === 1);
  assert("the ledger records the non-conforming respond", read("r10", "LEDGER.md").includes("executor | task T2 | cycle 1 | non-conforming respond (no F<n> lines)"));
  const callsBefore = readLog().length;
  result = tandem(["note", "--topic", "r10", "--task", "T2", "--message", "user decided: keep the flag, drop the alias"]);
  assert("note exits 0 without calling a backend", result.status === 0 && readLog().length === callsBefore, result.stderr);
  assert("note is in the ledger with the task and cycle", /coordinator \| task T2 \| cycle 1 \| note\nuser decided: keep the flag, drop the alias/.test(read("r10", "LEDGER.md")));
  result = tandem(["note", "--topic", "r10", "--message", "escalation resolved"]);
  assert("note without --task uses task -", result.status === 0 && read("r10", "LEDGER.md").includes("coordinator | task - | cycle 0 | note\nescalation resolved"), result.stderr);
  result = tandem(["note", "--topic", "r10", "--task", "T9", "--message", "x"]);
  assert("note on an unknown task exits 1", result.status === 1 && result.stderr.includes('Unknown task "T9"'), result.stderr);
  result = tandem(["note", "--topic", "r10"]);
  assert("note without --message exits 1", result.status === 1 && result.stderr.includes("Missing --message"), result.stderr);

  section("R11: tolerated reply shapes; a blocking finding disputed without evidence is refused");
  const shapes = ["1. F1: FIXED a", "2) F2: FIXED b", "**F3**: FIXED c", "F4 - FIXED d", "- F5: DISPUTED e", "**F6: DISPUTED**"];
  const parsed = parseFindingReplies(shapes.join("\n"));
  assert("parseFindingReplies reads every tolerated shape", parsed.map((item) => `${item.id}:${item.status}:${item.detail}`).join(" ") === "F1:FIXED:a F2:FIXED:b F3:FIXED:c F4:FIXED:d F5:DISPUTED:e F6:DISPUTED:", JSON.stringify(parsed));
  assert("parseFindings reads number and severity", JSON.stringify(parseFindings("FINDINGS:\n1. blocking | a | b | c\n2. minor | d | e | f\n3. [blocking] old shape")) === '[{"id":"F1","severity":"blocking"},{"id":"F2","severity":"minor"},{"id":"F3","severity":"blocking"}]');
  assert("disputedWithoutEvidence names only bare blocking disputes", disputedWithoutEvidence("1. blocking | a | b | c\n2. minor | d | e | f\n3. blocking | g | h | i", parseFindingReplies("F1: DISPUTED\nF2: DISPUTED\nF3: DISPUTED the test at tests/x.mjs:12 covers it")).join(",") === "F1");
  result = tandem(["respond", "--topic", "r10", "--task", "T2"], { POM_TANDEM_FAKE_REPLY: "F1: DISPUTED" });
  assert("blocking DISPUTED without evidence exits 2", result.status === 2 && result.stderr.includes("disputed blocking finding without evidence (F1)"), `${result.status} ${result.stderr}`);
  assert("the ledger records the bare dispute", read("r10", "LEDGER.md").includes("non-conforming respond (disputed blocking finding without evidence: F1)"));
  result = tandem(["respond", "--topic", "r10", "--task", "T2"], { POM_TANDEM_FAKE_REPLY: "F1: DISPUTED -" });
  assert("blocking DISPUTED with a dash as evidence exits 2", result.status === 2 && result.stderr.includes("disputed blocking finding without evidence (F1)"), `${result.status} ${result.stderr}`);
  result = tandem(["respond", "--topic", "r10", "--task", "T2"], { POM_TANDEM_FAKE_REPLY: "F1: DISPUTED see above" });
  assert("fewer than 12 letters or digits is not evidence", result.status === 2, `${result.status} ${result.stderr}`);
  assert("disputedWithoutEvidence counts letters and digits only", disputedWithoutEvidence("1. blocking | a | b | c", parseFindingReplies("F1: DISPUTED --- !!! ---")).length === 1 && disputedWithoutEvidence("1. blocking | a | b | c", parseFindingReplies("F1: DISPUTED tests/x.mjs:12 passes")).length === 0);
  result = tandem(["respond", "--topic", "r10", "--task", "T2"], { POM_TANDEM_FAKE_REPLY: "1. **F1**: DISPUTED the bound is inclusive by design, see tests/bound.test.js" });
  assert("blocking DISPUTED with evidence in a tolerated shape exits 0", result.status === 0 && read("r10", "LEDGER.md").includes("respond (F1:DISPUTED)"), `${result.status} ${result.stderr}`);
  result = tandem(["respond", "--topic", "r10", "--task", "T2", "--findings", REVISE_MINOR], { POM_TANDEM_FAKE_REPLY: "F1: DISPUTED" });
  assert("minor DISPUTED without evidence is accepted", result.status === 0, `${result.status} ${result.stderr}`);

  section("R12: state.json is replaced atomically");
  const statePath = join(root, "collaboration", "r10", "state.json");
  const inode = statSync(statePath).ino;
  tandem(["task", "add", "--topic", "r10", "--id", "T3", "--title", "third"]);
  assert("saving state creates a new file and renames it over state.json", statSync(statePath).ino !== inode);
  assert("no temporary state file is left behind", !readdirSync(join(root, "collaboration", "r10")).some((name) => name.startsWith("state.json.")));
  writeFileSync(join(root, "collaboration", "corrupt.json"), "");
  mkdirSync(join(root, "collaboration", "broken"), { recursive: true });
  writeFileSync(join(root, "collaboration", "broken", "state.json"), "{ not json");
  result = tandem(["status", "--topic", "broken"]);
  assert("a corrupt state.json gets a clear message", result.status === 1 && result.stderr.includes("state.json is not valid JSON: ") && result.stderr.includes("restore it from Git or re-run init --reopen after fixing it"), `${result.status} ${result.stderr}`);
  assert("state.json is valid JSON after a failing command", (() => { tandem(["review", "--topic", "r10", "--task", "T3", "--deliverable", "x"], { POM_TANDEM_FAKE_EXIT: "2" }); return JSON.parse(readFileSync(statePath, "utf8")).tasks.length === 3; })());

  section("R13: empty reply, timeout, invalid timeout, --setup");
  result = tandem(["review", "--topic", "r10", "--task", "T3", "--deliverable", "x"], { POM_TANDEM_FAKE_EMPTY: "1" });
  assert("an empty reply exits 2 with a message", result.status === 2 && result.stderr.includes("codex returned an empty reply"), `${result.status} ${result.stderr}`);
  assert("the empty reply is in the ledger and the task untouched", read("r10", "LEDGER.md").includes("empty reply from codex") && task("r10", "T3").status === "pending");
  result = tandem(["send", "--topic", "r10", "--role", "executor", "--task", "T3", "--message", "slow"], { POM_TANDEM_FAKE_SLEEP_MS: "3000", POM_TANDEM_TIMEOUT_MS: "300" });
  assert("a timeout exits 1 with the elapsed bound", result.status === 1 && result.stderr.includes("backend timed out after 300 ms"), `${result.status} ${result.stderr}`);
  assert("the timeout is in the ledger", read("r10", "LEDGER.md").includes("backend claude failed (backend timed out after 300 ms)"));
  const callsBeforeBad = readLog().length;
  result = tandem(["send", "--topic", "r10", "--role", "executor", "--task", "T3", "--message", "x"], { POM_TANDEM_TIMEOUT_MS: "soon" });
  assert("a non-numeric POM_TANDEM_TIMEOUT_MS exits 1 before any call", result.status === 1 && result.stderr.includes("POM_TANDEM_TIMEOUT_MS must be a positive integer") && readLog().length === callsBeforeBad, `${result.status} ${result.stderr}`);
  const setupLog = join(out, "setup.log");
  result = tandem(["init", "--topic", "st", "--controller", "codex", "--executor", "claude", "--setup", `mkdir -p node_modules && echo installed > node_modules/marker.txt && pwd >> "${setupLog}"`]);
  assert("init --setup runs the command in the controller worktree", result.status === 0 && existsSync(join(worktreeOf("st"), "node_modules", "marker.txt")) && readFileSync(setupLog, "utf8").trim() === worktreeOf("st"), `${result.status} ${result.stderr} ${existsSync(setupLog) ? readFileSync(setupLog, "utf8") : ""}`);
  assert("the setup command is saved in the state and the brief", state("st").setup.startsWith("mkdir -p node_modules") && read("st", "BRIEF.md").includes("| Setup | `mkdir -p node_modules"));
  tandem(["task", "add", "--topic", "st", "--id", "T1", "--title", "t"]);
  tandem(["review", "--topic", "st", "--task", "T1", "--deliverable", "x"]);
  assert("the reset keeps ignored files installed by setup", existsSync(join(worktreeOf("st"), "node_modules", "marker.txt")));
  tandem(["close", "--topic", "st"]);
  result = tandem(["init", "--reopen", "--topic", "st"]);
  assert("reopen runs the setup again in the recreated worktree", result.status === 0 && readFileSync(setupLog, "utf8").trim().split("\n").length === 2 && existsSync(join(worktreeOf("st"), "node_modules", "marker.txt")), `${result.status} ${result.stderr}`);
  result = tandem(["init", "--topic", "stbad", "--controller", "codex", "--executor", "claude", "--setup", "echo nope >&2; exit 3"]);
  assert("a failing setup exits 1 with its output", result.status === 1 && result.stderr.includes("setup command failed (exit 3)") && result.stderr.includes("nope"), `${result.status} ${result.stderr}`);
  assert("a failing setup leaves no state and no worktree", !existsSync(join(root, "collaboration", "stbad", "state.json")) && !existsSync(worktreeOf("stbad")) && !git(root, ["worktree", "list"]).includes("stbad"));
  result = tandem(["init", "--topic", "stbad", "--controller", "codex", "--executor", "claude"]);
  assert("init can be repeated after a failed setup", result.status === 0, result.stderr);
  message = reviewMessage({ taskId: "T1", title: "t", done: "  criteria  ", deliverable: "d", checked: "c" });
  assert("reviewMessage trims the criteria", message.includes("Definition of done: t - criteria\n"));
} finally {
  try {
    for (const line of git(root, ["worktree", "list", "--porcelain"]).split("\n")) {
      const match = line.match(/^worktree (.+)$/);
      if (match && match[1] !== root) git(root, ["worktree", "remove", "--force", match[1]]);
    }
  } catch {
    // best effort before removing the sandbox
  }
  sandbox.cleanup();
  outside.cleanup();
}

summary();
