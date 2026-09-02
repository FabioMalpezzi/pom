// Integration tests for scripts/tandem.mjs (pom:tandem) with the fake backend
// in tests/tandem/fixtures/fake-backend.mjs: no network, no LLM.
//
// Scenarios:
//   1. usage errors
//   2. init: files, controller worktree, model diversity (different / same)
//   3. tasks and status
//   4. executor calls with claude: session id chosen at init, --resume afterwards
//   5. controller calls with codex: worktree cwd, thread id captured, resume
//   6. review: uncommitted changes synchronised into the controller worktree, worktree reset, APPROVE
//   7. executor-workspace guard: exit 4 when the controller writes into the project root
//   8. reply without VERDICT: exit 2, no counter change
//   9. cap: four REVISE verdicts escalate with exit 3; respond reuses the last findings
//  10. phase budget: stalled with exit 3
//  11. close: Outcome in BRIEF, worktree removed (or kept)
//  12. pi argument shape
//  13. contract helpers

import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHarness, git, makeSandbox, runNode } from "../../lib/harness.mjs";
import { parseFindingReplies, parseVerdict, reviewMessage, REVIEW_CONTRACT } from "../../../scripts/lib/tandem-contract.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const REPO = resolve(here, "..", "..", "..");
const SCRIPT = join(REPO, "scripts", "tandem.mjs");
const FAKE = join(REPO, "tests", "tandem", "fixtures", "fake-backend.mjs");

const { assert, section, banner, summary } = createHarness({ name: "pom:tandem" });
const sandbox = makeSandbox("pom-tandem-");
const logSandbox = makeSandbox("pom-tandem-log-");
// realpath: on macOS os.tmpdir() is a symlink and the script reports process.cwd() resolved.
const root = realpathSync(sandbox.dir);
// The log lives outside the project: an untracked file changing inside the
// root during a controller call would (correctly) trip the workspace guard.
const logFile = join(logSandbox.dir, "fake.log");

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

banner();
try {
  // Project under test: a Git repository with one commit.
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "a.js"), "export const items = [1, 2, 3];\n");
  writeFileSync(join(root, "README.md"), "# demo\n");
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "initial"]);
  const head = git(root, ["rev-parse", "HEAD"]).trim();

  section("Scenario 1: usage errors");
  let result = tandem([]);
  assert("no command exits 1 with usage", result.status === 1 && result.stdout.includes("Usage:"), result.stderr);
  result = tandem(["frobnicate"]);
  assert("unknown command exits 1", result.status === 1 && result.stderr.includes('Unknown command "frobnicate"'), result.stderr);
  result = tandem(["init", "--topic", "x", "--controller", "codex"]);
  assert("init without --executor exits 1", result.status === 1 && result.stderr.includes("Missing --executor"), result.stderr);
  result = tandem(["init", "--topic", "x", "--controller", "gemini", "--executor", "codex"]);
  assert("unsupported backend exits 1 with the list", result.status === 1 && result.stderr.includes('Unsupported backend "gemini"'), result.stderr);
  result = tandem(["status", "--topic", "x"]);
  assert("status before init exits 1", result.status === 1 && result.stderr.includes("No tandem state"), result.stderr);
  result = tandem(["init", "--topic", "x", "--controller", "codex", "--executor", "claude", "--bogus"]);
  assert("unknown option exits 1", result.status === 1 && result.stderr.includes("Unknown option(s): --bogus"), result.stderr);

  section("Scenario 2: init creates the folder, the controller worktree, and records model diversity");
  result = tandem(["init", "--topic", "demo", "--controller", "codex:gpt-5", "--executor", "claude:sonnet"]);
  assert("init exits 0", result.status === 0, result.stderr);
  assert("no same-model warning for different backends", !result.stderr.includes("share the same backend"), result.stderr);
  for (const file of ["BRIEF.md", "LEDGER.md", "state.json", ".gitignore"]) {
    assert(`creates ${file}`, existsSync(join(root, "collaboration", "demo", file)));
  }
  assert("creates turns/", existsSync(join(root, "collaboration", "demo", "turns")));
  const ignore = readFileSync(join(root, "collaboration", "demo", ".gitignore"), "utf8");
  assert("turns/ is ignored by default", ignore.includes("turns/\n"), ignore);
  assert("git ignores the turns folder", git(root, ["check-ignore", "collaboration/demo/turns"]).trim() === "collaboration/demo/turns");
  assert("git does not ignore BRIEF.md and LEDGER.md", git(root, ["ls-files", "--others", "--exclude-standard", "collaboration/demo"]).includes("BRIEF.md"));
  assert("state records trackTurns=false", JSON.parse(readFileSync(join(root, "collaboration", "demo", "state.json"), "utf8")).trackTurns === false);
  const worktree = join(root, "collaboration", "demo", ".controller-worktree");
  assert("controller worktree exists", existsSync(join(worktree, ".git")));
  assert("git lists the controller worktree", git(root, ["worktree", "list"]).includes(worktree));
  assert("controller worktree is detached at HEAD", git(worktree, ["rev-parse", "HEAD"]).trim() === head);
  assert("project status ignores the nested worktree", !git(root, ["status", "--porcelain"]).includes(".controller-worktree"));
  let s = state("demo");
  assert("state records model_diversity different", s.modelDiversity === "different");
  assert("state records both roles", s.roles.controller.backend === "codex" && s.roles.controller.model === "gpt-5" && s.roles.executor.backend === "claude" && s.roles.executor.model === "sonnet");
  assert("codex session id is unknown until the first call", s.roles.controller.sessionId === null);
  assert("claude session id is chosen at init (uuid)", /^[0-9a-f-]{36}$/.test(s.roles.executor.sessionId));
  assert("state has no coordinator role", Object.keys(s.roles).join(",") === "controller,executor");
  assert("cap defaults to 4, no phase budget", s.cap === 4 && s.phaseBudget === null);
  let brief = read("demo", "BRIEF.md");
  assert("BRIEF names the topic", brief.includes("# Tandem Brief - demo"));
  assert("BRIEF records model diversity", brief.includes("| Model diversity | different |"));
  assert("BRIEF names the controller backend and worktree", brief.includes("| Controller | codex | gpt-5 |") && brief.includes(".controller-worktree"));
  assert("BRIEF status is open", brief.includes("| Status | open |"));
  assert("LEDGER has the init entry", /## \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\] coordinator \| task - \| cycle 0 \| init controller=codex:gpt-5 executor=claude:sonnet/.test(read("demo", "LEDGER.md")));
  result = tandem(["init", "--topic", "demo", "--controller", "codex", "--executor", "claude"]);
  assert("init twice on the same topic exits 1", result.status === 1 && result.stderr.includes("already initialised"), result.stderr);

  result = tandem(["init", "--topic", "same", "--controller", "pi:gpt-5", "--executor", "pi:gpt-5", "--cap", "2"]);
  assert("same backend and model is accepted", result.status === 0, result.stderr);
  assert("same backend and model prints the warning", result.stderr.includes("controller and executor share the same backend and model; independence relies on separate sessions only"), result.stderr);
  assert("state records model_diversity same", state("same").modelDiversity === "same");
  assert("BRIEF records model diversity same", read("same", "BRIEF.md").includes("| Model diversity | same |"));
  result = tandem(["init", "--topic", "nomodel", "--controller", "pi", "--executor", "pi"]);
  assert("same backend without models counts as same", result.status === 0 && result.stderr.includes("share the same backend") && state("nomodel").modelDiversity === "same", result.stderr);
  result = tandem(["init", "--topic", "twomodels", "--controller", "codex:a", "--executor", "codex:b"]);
  assert("same backend with different models counts as different", result.status === 0 && !result.stderr.includes("share the same backend") && state("twomodels").modelDiversity === "different", result.stderr);

  section("Scenario 3: tasks and status");
  result = tandem(["task", "add", "--topic", "demo", "--id", "T1", "--title", "Fix the loop bound", "--phase", "alpha"]);
  assert("task add exits 0", result.status === 0, result.stderr);
  result = tandem(["task", "add", "--topic", "demo", "--id", "T1", "--title", "dup"]);
  assert("duplicate task id exits 1", result.status === 1 && result.stderr.includes('Task "T1" already exists'), result.stderr);
  tandem(["task", "add", "--topic", "demo", "--id", "T2", "--title", "Second task"]);
  result = tandem(["status", "--topic", "demo"]);
  assert("status lists the tasks", result.status === 0 && result.stdout.includes("| T1 | Fix the loop bound | alpha | pending | 0/4 |") && result.stdout.includes("| T2 |"), result.stdout);
  assert("status shows the budget line", result.stdout.includes("Cap: 4 per task | cycles used: 0 | phase budget: none"), result.stdout);
  assert("task list is an alias of status", tandem(["task", "list", "--topic", "demo"]).stdout.includes("| T1 |"));
  assert("BRIEF Tasks table is updated", read("demo", "BRIEF.md").includes("| T1 | Fix the loop bound | alpha | pending | 0/4 |"));
  result = tandem(["send", "--topic", "demo", "--role", "executor", "--task", "T9", "--message", "hi"]);
  assert("unknown task exits 1", result.status === 1 && result.stderr.includes('Unknown task "T9"'), result.stderr);

  section("Scenario 4: executor calls with claude");
  result = tandem(["send", "--topic", "demo", "--role", "executor", "--task", "T1", "--message", "Read src/a.js and wait."]);
  assert("send exits 0 and prints the reply", result.status === 0 && result.stdout.includes("echo: Read src/a.js and wait."), result.stderr);
  let call = lastCall();
  s = state("demo");
  assert("claude first call uses -p --session-id <uuid>", call.backend === "claude" && call.args[0] === "-p" && call.args[1] === "--session-id" && call.args[2] === s.roles.executor.sessionId, JSON.stringify(call.args));
  assert("claude call passes --model, acceptEdits, json output", ["--model", "sonnet", "--permission-mode", "acceptEdits", "--output-format", "json"].every((arg) => call.args.includes(arg)), JSON.stringify(call.args));
  assert("claude call pre-allows shell, read, and edit tools", (() => { const k = call.args.indexOf("--allowedTools"); return k >= 0 && /Bash/.test(call.args[k + 1]) && /Read/.test(call.args[k + 1]); })(), call.args.join(" "));
  assert("executor runs in the project root", call.cwd === root, call.cwd);
  assert("turn 001 written for the executor", existsSync(join(root, "collaboration", "demo", "turns", "001-executor-T1.md")));
  assert("LEDGER records the send", /executor \| task T1 \| cycle 0 \| send\nturn: turns\/001-executor-T1\.md/.test(read("demo", "LEDGER.md")));
  assert("send does not touch counters or status", s.tasks[0].cycles === 0 && s.tasks[0].status === "pending");
  writeFileSync(join(root, "msg.txt"), "Message from a file.\n");
  result = tandem(["send", "--topic", "demo", "--role", "executor", "--task", "T1", "--message-file", "msg.txt"]);
  call = lastCall();
  assert("claude second call resumes the same session", result.status === 0 && call.args[1] === "--resume" && call.args[2] === s.roles.executor.sessionId, JSON.stringify(call.args));
  assert("--message-file is read", call.args[call.args.length - 1].includes("Message from a file."));
  rmSync(join(root, "msg.txt"));

  section("Scenario 5: controller calls with codex run in the worktree and resume the thread");
  result = tandem(["send", "--topic", "demo", "--role", "controller", "--task", "T1", "--message", "Look around."]);
  assert("controller send exits 0", result.status === 0, result.stderr);
  call = lastCall();
  assert("codex first call: exec -s workspace-write -C <worktree>", call.backend === "codex" && call.args.slice(0, 5).join(" ") === `exec -s workspace-write -C ${worktree}`, JSON.stringify(call.args));
  assert("codex call passes -m, --json, -o <file>", call.args.includes("-m") && call.args[call.args.indexOf("-m") + 1] === "gpt-5" && call.args.includes("--json") && call.args.includes("-o"), JSON.stringify(call.args));
  assert("controller runs in its worktree", call.cwd === worktree, call.cwd);
  s = state("demo");
  assert("codex thread id captured from the JSON events", /^[0-9a-f-]{36}$/.test(s.roles.controller.sessionId || ""), JSON.stringify(s.roles.controller));
  result = tandem(["send", "--topic", "demo", "--role", "controller", "--task", "T1", "--message", "Again."]);
  call = lastCall();
  assert("codex second call: resume <thread> after the global options", call.args[5] === "resume" && call.args[6] === s.roles.controller.sessionId, JSON.stringify(call.args));
  assert("controller turn records the checked revision", read("demo", "turns/004-controller-T1.md").includes(`| Checked revision | ${head} |`));

  section("Scenario 6: review synchronises uncommitted work into the controller worktree and resets it");
  writeFileSync(join(root, "src", "a.js"), "export const items = [1, 2, 3, 4];\n");
  writeFileSync(join(root, "notes.txt"), "untracked note\n");
  // The collaboration folder is written by the script itself, so it is left out of the comparison.
  const projectStatus = () => git(root, ["status", "--porcelain", "--untracked-files=all"]).split("\n").filter((line) => !line.includes(" collaboration/")).join("\n");
  const before = projectStatus();
  result = tandem(["review", "--topic", "demo", "--task", "T1", "--deliverable", "src/a.js"], { POM_TANDEM_FAKE_READ: "src/a.js,notes.txt", POM_TANDEM_FAKE_WRITE: "scratch.txt" });
  assert("review with APPROVE exits 0", result.status === 0, result.stderr);
  assert("review prints the verdict", result.stdout.includes("VERDICT: APPROVE"));
  call = lastCall();
  assert("controller saw the uncommitted tracked change", call.read["src/a.js"] === "export const items = [1, 2, 3, 4];\n", JSON.stringify(call.read));
  assert("controller saw the untracked file", call.read["notes.txt"] === "untracked note\n", JSON.stringify(call.read));
  assert("review message follows the contract", call.args[call.args.length - 1].startsWith("Review task T1: Fix the loop bound.") && call.args[call.args.length - 1].includes(REVIEW_CONTRACT));
  assert("controller worktree is reset afterwards (scratch removed, clean status)", !existsSync(join(worktree, "scratch.txt")) && git(worktree, ["status", "--porcelain"]) === "" && readFileSync(join(worktree, "src", "a.js"), "utf8") === "export const items = [1, 2, 3];\n");
  assert("executor workspace is untouched", projectStatus() === before && existsSync(join(root, "notes.txt")));
  s = state("demo");
  assert("task approved, cycles unchanged", s.tasks[0].status === "approved" && s.tasks[0].cycles === 0);
  const reviewTurn = read("demo", "turns/005-controller-T1.md");
  assert("review turn records commit and patch", reviewTurn.includes(`| Checked revision | ${head} |`) && reviewTurn.includes("005-controller-T1.patch") && /\| Untracked copied \| [1-9]\d* \|/.test(reviewTurn));
  assert("patch file saved next to the turn", existsSync(join(root, "collaboration", "demo", "turns", "005-controller-T1.patch")));
  assert("LEDGER records the verdict", read("demo", "LEDGER.md").includes("controller | task T1 | cycle 0 | VERDICT: APPROVE"));

  section("Scenario 7: the controller must not modify the executor workspace");
  result = tandem(["review", "--topic", "demo", "--task", "T2", "--deliverable", "anything"], { POM_TANDEM_FAKE_TAMPER: join(root, "src", "a.js") });
  assert("tampering exits 4", result.status === 4, `${result.status} ${result.stderr}`);
  assert("tampering message names the rule", result.stderr.includes("controller must not modify the executor workspace"), result.stderr);
  assert("LEDGER records the violation", read("demo", "LEDGER.md").includes("controller | task T2 | cycle 0 | controller must not modify the executor workspace"));
  assert("controller worktree still reset after the violation", git(worktree, ["status", "--porcelain"]) === "");
  writeFileSync(join(root, "src", "a.js"), "export const items = [1, 2, 3, 4];\n");
  result = tandem(["review", "--topic", "demo", "--task", "T2", "--deliverable", "anything"], { POM_TANDEM_FAKE_TAMPER: join(root, "brand-new.txt") });
  assert("a new untracked file in the project root is also a violation", result.status === 4, `${result.status} ${result.stderr}`);
  rmSync(join(root, "brand-new.txt"), { force: true });

  section("Scenario 8: a reply without VERDICT is indeterminate");
  result = tandem(["review", "--topic", "demo", "--task", "T2", "--deliverable", "[[NOVERDICT]] src/a.js"]);
  assert("no verdict exits 2", result.status === 2, `${result.status} ${result.stderr}`);
  assert("no verdict is explained", result.stderr.includes("indeterminate"), result.stderr);
  assert("LEDGER records indeterminate", read("demo", "LEDGER.md").includes("controller | task T2 | cycle 0 | indeterminate (no VERDICT line)"));
  assert("counters unchanged", state("demo").tasks[1].cycles === 0 && state("demo").tasks[1].status === "pending");

  section("Scenario 9: four REVISE verdicts reach the cap and escalate");
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    result = tandem(["review", "--topic", "demo", "--task", "T2", "--deliverable", "[[REVISE]] src/a.js"]);
    assert(`REVISE ${cycle} exits 0 with cycles=${cycle}`, result.status === 0 && state("demo").tasks[1].cycles === cycle && state("demo").tasks[1].status === "in_progress", `${result.status} ${result.stderr}`);
  }
  result = tandem(["review", "--topic", "demo", "--task", "T2", "--deliverable", "[[REVISE]] src/a.js"]);
  assert("fourth REVISE exits 3", result.status === 3, `${result.status} ${result.stderr}`);
  assert("cap message asks to escalate with both positions", result.stderr.includes("cap reached: escalate to the user with both positions"), result.stderr);
  s = state("demo");
  assert("task escalated at cycles=4", s.tasks[1].status === "escalated" && s.tasks[1].cycles === 4);
  assert("LEDGER records the cap", read("demo", "LEDGER.md").includes("controller | task T2 | cycle 4 | cap reached (4): escalated"));
  result = tandem(["review", "--topic", "demo", "--task", "T2", "--deliverable", "again"]);
  assert("review of an escalated task is refused with exit 3", result.status === 3 && result.stderr.includes("escalated"), `${result.status} ${result.stderr}`);
  assert("status reports the escalation", tandem(["status", "--topic", "demo"]).stdout.includes("Escalated: T2"));
  result = tandem(["respond", "--topic", "demo", "--task", "T2"]);
  assert("respond without --findings reuses the last review", result.status === 0 && result.stdout.includes("F1: FIXED"), result.stderr);
  call = lastCall();
  assert("respond goes to the executor with the findings and the contract", call.backend === "claude" && call.args[call.args.length - 1].includes("FINDINGS:") && call.args[call.args.length - 1].includes("For each finding reply `F<n>: FIXED"), call.args[call.args.length - 1]);
  assert("respond keeps the escalated status", state("demo").tasks[1].status === "escalated");
  assert("LEDGER records the executor answer", read("demo", "LEDGER.md").includes("executor | task T2 | cycle 4 | respond (F1:FIXED)"));
  result = tandem(["respond", "--topic", "demo", "--task", "T1", "--findings", "1. minor - README - typo - fixed wording"]);
  assert("respond with inline findings sets in_progress", result.status === 0 && state("demo").tasks[0].status === "in_progress", result.stderr);

  section("Scenario 10: phase budget");
  result = tandem(["init", "--topic", "budget", "--controller", "claude:opus", "--executor", "codex:gpt-5", "--phase-budget", "2"]);
  assert("init with --phase-budget exits 0", result.status === 0, result.stderr);
  tandem(["task", "add", "--topic", "budget", "--id", "B1", "--title", "Budgeted"]);
  result = tandem(["review", "--topic", "budget", "--task", "B1", "--deliverable", "[[REVISE]] x"]);
  assert("first REVISE consumes one unit", result.status === 0 && state("budget").phaseBudgetRemaining === 1, `${result.status} ${result.stderr}`);
  result = tandem(["review", "--topic", "budget", "--task", "B1", "--deliverable", "[[REVISE]] x"]);
  assert("budget at zero exits 3 and stalls the task", result.status === 3 && result.stderr.includes("phase budget exhausted") && state("budget").tasks[0].status === "stalled", `${result.status} ${result.stderr}`);
  assert("status shows the remaining budget", tandem(["status", "--topic", "budget"]).stdout.includes("phase budget: 0 remaining of 2"));
  call = readLog().filter((entry) => entry.backend === "claude").pop();
  assert("claude controller runs in its own worktree with acceptEdits", call.cwd === join(root, "collaboration", "budget", ".controller-worktree") && call.args.includes("acceptEdits"), call.cwd);

  section("Scenario 11: close writes the outcome and removes the worktree");
  result = tandem(["close", "--topic", "demo"]);
  assert("close exits 0", result.status === 0, result.stderr);
  assert("close prints the summary", result.stdout.includes("Tasks: 2 | approved: 0 | escalated: 1 | cycles used: 4"), result.stdout);
  brief = read("demo", "BRIEF.md");
  assert("BRIEF Outcome lists the verdict per task", brief.includes("| T1 | Fix the loop bound | no final verdict (in progress) | 0/4 |") && brief.includes("| T2 | Second task | cap reached, escalated to the user | 4/4 |"));
  assert("BRIEF Outcome leaves promotion to the user", brief.includes("to be decided by the user"));
  assert("BRIEF status is closed", brief.includes("| Status | closed |"));
  assert("controller worktree removed", !existsSync(worktree) && !git(root, ["worktree", "list"]).includes(worktree));
  assert("state records the closing time", typeof state("demo").closed === "string");
  result = tandem(["close", "--topic", "budget", "--keep-worktrees"]);
  assert("--keep-worktrees keeps the worktree", result.status === 0 && existsSync(join(root, "collaboration", "budget", ".controller-worktree")), result.stderr);

  section("Scenario 12: pi argument shape");
  tandem(["task", "add", "--topic", "same", "--id", "P1", "--title", "Pi task"]);
  result = tandem(["send", "--topic", "same", "--role", "executor", "--task", "P1", "--message", "hello"]);
  call = lastCall();
  const piSession = state("same").roles.executor.sessionId;
  assert("pi call: -p --session-dir <dir> --session-id <id> --model <m> <msg>", result.status === 0 && call.args.join(" ") === `-p --session-dir ${join(root, "collaboration", "same", ".sessions", "pi")} --session-id ${piSession} --model gpt-5 hello`, JSON.stringify(call.args));
  tandem(["send", "--topic", "same", "--role", "executor", "--task", "P1", "--message", "again"]);
  assert("pi second call reuses the same session id", lastCall().args.includes(piSession));
  tandem(["task", "add", "--topic", "nomodel", "--id", "N1", "--title", "No model"]);
  tandem(["send", "--topic", "nomodel", "--role", "controller", "--task", "N1", "--message", "look"]);
  call = lastCall();
  assert("pi without a model omits --model and runs in the controller worktree", !call.args.includes("--model") && call.cwd === join(root, "collaboration", "nomodel", ".controller-worktree"), JSON.stringify(call));

  section("Scenario 13: contract helpers");
  assert("parseVerdict reads APPROVE", parseVerdict("VERDICT: APPROVE\nFINDINGS:\n(none)") === "APPROVE");
  assert("parseVerdict reads REVISE after a preamble and markdown", parseVerdict("Sure.\n**VERDICT: REVISE**\nFINDINGS:") === "REVISE");
  assert("parseVerdict returns null without a verdict", parseVerdict("All good I think") === null);
  assert("parseFindingReplies splits FIXED and DISPUTED", JSON.stringify(parseFindingReplies("F1: FIXED bound\nF2: DISPUTED tests pass").map((item) => item.status)) === '["FIXED","DISPUTED"]');
  const message = reviewMessage({ taskId: "T1", title: "t", deliverable: "d", checked: "commit abc" });
  assert("reviewMessage carries the fixed contract", message.includes("Reply with exactly: a first line `VERDICT: APPROVE` or `VERDICT: REVISE`") && message.includes("Checked revision: commit abc."));
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
  logSandbox.cleanup();
}

summary();
