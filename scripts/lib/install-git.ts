import { execFileSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { join } from "node:path";

/**
 * Brings a Git-managed `pom/` checkout to the latest `main`.
 *
 * The sequence is the same one `templates/POM_UPDATE_TEMPLATE.mjs` uses, so
 * installer and updater agree on what "update pom/" means: switch to `main`
 * when possible, fast-forward pull, and fall back to a submodule update when
 * the checkout is a submodule. Returns `true` when `pom/` was updated, `false`
 * when every strategy failed; the caller decides whether that is fatal.
 */
export function updatePomCheckout(pomPath: string, run: (message: string) => void = console.log): boolean {
  try {
    execFileSync("git", ["-C", pomPath, "checkout", "main"], { stdio: "pipe" });
  } catch {
    // Detached submodules or vendored checkouts may not have a local main branch.
  }

  try {
    run("> git -C pom pull origin main --ff-only");
    execFileSync("git", ["-C", pomPath, "pull", "origin", "main", "--ff-only"], { stdio: "inherit" });
    return true;
  } catch {
    run("Direct pull failed. Trying submodule update...");
  }

  try {
    execFileSync("git", ["submodule", "update", "--remote", pomPath], { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

export function pullPomIfGitRepo(root: string): void {
  const pomPath = join(root, "pom");
  if (!existsSync(join(pomPath, ".git"))) return;

  // When pom/ is a symlink (integration tests, developer setups), running
  // checkout/pull would mutate the linked source repo rather than a real install.
  if (lstatSync(pomPath).isSymbolicLink()) {
    console.log("pom/ is a symbolic link; skipping git checkout/pull to avoid mutating the linked source.");
    return;
  }

  console.log("Pulling latest POM changes...");
  if (!updatePomCheckout(pomPath)) {
    console.log("Warning: could not pull pom/. Continuing with existing version.");
  }
}
