#!/usr/bin/env node

/**
 * POM Bootstrap
 *
 * Downloads POM into pom/ and runs the installer.
 * Works on Node >=20 (plain JavaScript, no TypeScript flag needed).
 *
 * Usage:
 *   node bootstrap-pom.mjs
 *   node bootstrap-pom.mjs --profile minimal
 *   node bootstrap-pom.mjs --repo https://github.com/your-fork/pom.git
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const DEFAULT_REPO = "https://github.com/FabioMalpezzi/pom.git";
const POM_DIR = "pom";

function readArg(name) {
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  return undefined;
}

function run(cmd, args, options = {}) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", ...options });
}

function main() {
  const repo = readArg("repo") || DEFAULT_REPO;
  const profile = process.argv.filter((a) => a.startsWith("--profile")).join(" ");

  if (existsSync(POM_DIR)) {
    console.log(`${POM_DIR}/ already exists. Updating...`);
    try {
      // Try regular pull first (works for clones)
      execFileSync("git", ["-C", POM_DIR, "checkout", "main"], { stdio: "pipe" });
    } catch {
      // Ignore checkout errors (may already be on main)
    }
    try {
      run("git", ["-C", POM_DIR, "pull", "origin", "main", "--ff-only"]);
    } catch {
      console.log("Pull failed. Trying submodule update...");
      try {
        run("git", ["submodule", "update", "--remote", POM_DIR]);
      } catch {
        console.log(`Warning: could not update ${POM_DIR}/. Continuing with existing version.`);
      }
    }
  } else {
    console.log(`Cloning POM from ${repo}...`);
    run("git", ["clone", repo, POM_DIR]);
  }

  const installScript = `${POM_DIR}/scripts/install-pom.ts`;
  if (!existsSync(installScript)) {
    console.error(`Error: ${installScript} not found. Check that the POM repository is valid.`);
    process.exit(1);
  }

  const installArgs = ["--experimental-strip-types", installScript];
  if (profile) installArgs.push(...profile.split(" "));

  run("node", installArgs);
}

main();
