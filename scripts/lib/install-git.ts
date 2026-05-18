import { execFileSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { join } from "node:path";

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
  try {
    execFileSync("git", ["-C", pomPath, "checkout", "main"], { stdio: "pipe" });
  } catch {
    // may already be on main
  }
  try {
    execFileSync("git", ["-C", pomPath, "pull", "origin", "main", "--ff-only"], { stdio: "inherit" });
  } catch {
    console.log("Warning: could not pull pom/. Continuing with existing version.");
  }
}
