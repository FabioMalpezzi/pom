// Shared harness for POM integration tests.
//
// Every test file under tests/<area>/integration/*.mjs used to carry its own
// copy of assert(), the passed/failed counters, the "Results:" line and a
// handful of process/sandbox helpers. This module centralises them so that
// the output contract read by scripts/run-tests.mjs is defined in one place:
//
//   "  ✓ <name>"                      one line per passing assertion
//   "  ✗ <name> - <detail>"           one line per failing assertion
//   "\nResults: X passed, Y failed"   final line, parsed by the runner
//   exit code 1 when Y > 0
//
// Zero dependencies: Node standard library only.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Git flags that give every test commit a stable identity without touching the user's config. */
export const GIT_IDENTITY = [
  "-c", "user.name=POM Test",
  "-c", "user.email=pom-test@example.invalid",
  "-c", "commit.gpgsign=false",
];

/**
 * Create a test harness.
 *
 * @param {{ name?: string }} [options] `name` is printed by `banner()` as the
 *   file title followed by an "=" underline of the same length.
 * @returns {{
 *   assert: (name: string, condition: unknown, detail?: string) => boolean,
 *   section: (title: string) => void,
 *   banner: () => void,
 *   counts: () => { passed: number, failed: number },
 *   summary: (options?: { exit?: boolean }) => { passed: number, failed: number },
 * }}
 */
export function createHarness({ name = "" } = {}) {
  let passed = 0;
  let failed = 0;

  function assert(assertionName, condition, detail = "") {
    if (condition) {
      console.log(`  ✓ ${assertionName}`);
      passed++;
      return true;
    }
    console.log(`  ✗ ${assertionName}${detail ? ` - ${detail}` : ""}`);
    failed++;
    return false;
  }

  function section(title) {
    console.log(`\n${title}`);
  }

  function banner() {
    if (!name) return;
    console.log(name);
    console.log("=".repeat(name.length));
  }

  function counts() {
    return { passed, failed };
  }

  /**
   * Print the final "Results:" line. By default the process exits with code 1
   * when any assertion failed; pass `{ exit: false }` to only set
   * `process.exitCode` and let the caller finish its own work first.
   */
  function summary({ exit = true } = {}) {
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      if (exit) process.exit(1);
      process.exitCode = 1;
    }
    return counts();
  }

  return { assert, section, banner, counts, summary };
}

/**
 * Create a throwaway directory under os.tmpdir().
 *
 * @param {string} prefix mkdtemp prefix, e.g. "pom-test-"
 * @returns {{ dir: string, cleanup: () => void }}
 */
export function makeSandbox(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return { dir, cleanup: () => removeSandbox(dir) };
}

/** Remove a sandbox directory created by makeSandbox (or any temp dir). */
export function removeSandbox(dir) {
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Run a command synchronously and capture its output.
 *
 * @param {string} command executable to run
 * @param {string[]} args arguments
 * @param {{ cwd?: string, env?: Record<string, string>, timeout?: number }} [options]
 *   `env` is merged over process.env; `cwd` defaults to process.cwd().
 * @returns {{ status: number | null, stdout: string, stderr: string, signal: string | null, error?: Error }}
 */
export function runCommand(command, args, { cwd = process.cwd(), env, timeout } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: env ? { ...process.env, ...env } : process.env,
    ...(timeout ? { timeout } : {}),
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    signal: result.signal,
    ...(result.error ? { error: result.error } : {}),
  };
}

/** Run the current Node binary with the given arguments (see runCommand). */
export function runNode(args, options = {}) {
  return runCommand(process.execPath, args, options);
}

/**
 * Run git in `dir` with the test identity. Throws on non-zero exit (like
 * execFileSync) and returns stdout as a string.
 */
export function git(dir, args) {
  return execFileSync("git", [...GIT_IDENTITY, ...args], {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
