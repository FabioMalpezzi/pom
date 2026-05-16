#!/usr/bin/env node

/**
 * POM Bootstrap
 *
 * Downloads POM into pom/ and runs the installer.
 * Works on Node >=20 (plain JavaScript, no TypeScript flag needed).
 *
 * Usage:
 *   node bootstrap-pom.mjs --preset owned
 *   node bootstrap-pom.mjs --preset team
 *   node bootstrap-pom.mjs --preset overlay
 *   node bootstrap-pom.mjs --preset minimal
 *   node bootstrap-pom.mjs --repo https://github.com/your-fork/pom.git --preset owned
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

const DEFAULT_REPO = "https://github.com/FabioMalpezzi/pom.git";
const POM_DIR = "pom";
const PROFILE_NAMES = new Set(["minimal", "wiki", "decisions", "full", "adopt", "refresh", "custom"]);
const OWNERSHIP_MODES = new Set(["owned", "team", "external_overlay", "unknown"]);
const PRESET_NAMES = new Set(["owned", "team", "overlay", "minimal"]);
const LANG_NAMES = new Set(["en", "it"]);

// Detect if running from inside pom/ and move to the parent directory
const cwd = process.cwd();
if (
  basename(cwd) === "pom" &&
  existsSync("WIKI_METHOD.md") &&
  existsSync("templates") &&
  existsSync("prompts") &&
  existsSync("skills")
) {
  const parent = resolve(cwd, "..");
  console.log(`Detected: running from inside pom/. Moving to parent directory: ${parent}`);
  process.chdir(parent);
}

function readArg(name) {
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0) {
    const value = process.argv[index + 1];
    return value && !value.startsWith("--") ? value : "";
  }
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  return undefined;
}

function hasArg(name) {
  return process.argv.some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
}

function normalizeLanguage(value) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("en")) return "en";
  return undefined;
}

function detectLanguage() {
  const arg = readArg("lang");
  if (hasArg("lang")) {
    const normalized = arg ? normalizeLanguage(arg) : undefined;
    if (!normalized) {
      console.error("Missing or unsupported --lang value. Use en or it.");
      process.exit(1);
    }
    return normalized;
  }

  const envLanguage =
    process.env.POM_LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  return normalizeLanguage(envLanguage) || "en";
}

function run(cmd, args, options = {}) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", ...options });
}

function validateValue(name, value, allowed) {
  if (!hasArg(name)) return;
  if (!value) {
    console.error(`Missing --${name} value.`);
    process.exit(1);
  }
  if (!allowed.has(value)) {
    console.error(`Unknown --${name} value: ${value}`);
    console.error(`Allowed values: ${[...allowed].join(", ")}`);
    process.exit(1);
  }
}

function printExplicitModeGuide(lang) {
  if (lang === "it") {
    console.log("");
    console.log("POM richiede una modalita di adozione esplicita.");
    console.log("");
    console.log("Preset comuni per la prima installazione:");
    console.log("  node bootstrap-pom.mjs --preset owned     # progetto tuo");
    console.log("  node bootstrap-pom.mjs --preset team      # progetto condiviso/team");
    console.log("  node bootstrap-pom.mjs --preset overlay   # repository clonato di terzi");
    console.log("  node bootstrap-pom.mjs --preset minimal   # setup POM locale minimale");
    console.log("");
    console.log("Forma esplicita avanzata:");
    console.log("  node bootstrap-pom.mjs --profile adopt --ownership external_overlay");
    console.log("");
    if (existsSync(POM_DIR)) {
      console.log("POM esiste gia in questo progetto. Per gli aggiornamenti normali usa:");
      console.log("  npm run pom:update");
      console.log("");
    }
    return;
  }

  console.log("");
  console.log("POM needs an explicit adoption mode.");
  console.log("");
  console.log("Common first-install presets:");
  console.log("  node bootstrap-pom.mjs --preset owned     # project is yours");
  console.log("  node bootstrap-pom.mjs --preset team      # shared/team project");
  console.log("  node bootstrap-pom.mjs --preset overlay   # third-party cloned repo");
  console.log("  node bootstrap-pom.mjs --preset minimal   # minimal local POM setup");
  console.log("");
  console.log("Advanced explicit form:");
  console.log("  node bootstrap-pom.mjs --profile adopt --ownership external_overlay");
  console.log("");
  if (existsSync(POM_DIR)) {
    console.log("POM already exists in this project. For normal updates, run:");
    console.log("  npm run pom:update");
    console.log("");
  }
}

function main() {
  const repo = readArg("repo") || DEFAULT_REPO;
  const profile = readArg("profile");
  const ownership = readArg("ownership");
  const preset = readArg("preset");
  const lang = detectLanguage();
  const hasAdoptionArg = hasArg("profile") || hasArg("ownership") || hasArg("preset");

  validateValue("profile", profile, PROFILE_NAMES);
  validateValue("ownership", ownership, OWNERSHIP_MODES);
  validateValue("preset", preset, PRESET_NAMES);
  validateValue("lang", lang, LANG_NAMES);

  if (preset && (profile || ownership)) {
    console.error("Do not combine --preset with --profile or --ownership.");
    console.error("Use either a preset or the explicit advanced form.");
    process.exit(1);
  }

  if (!hasAdoptionArg) {
    printExplicitModeGuide(lang);
    process.exit(1);
  }

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
  if (preset) installArgs.push("--preset", preset);
  if (profile) installArgs.push("--profile", profile);
  if (ownership) installArgs.push("--ownership", ownership);

  run("node", installArgs);
}

main();
