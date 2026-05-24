import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { isPresetName, isProfileName, presets, profiles, type AdoptionConfig, type OwnershipMode, type PresetName, type ProfileName } from "./install-model.ts";

const ROOT = process.cwd();

function pathExists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

function readRawArg(name: string): string | undefined {
  const exactIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  if (exactIndex >= 0) {
    const value = process.argv[exactIndex + 1];
    return value && !value.startsWith("--") ? value : "";
  }
  const inlinePrefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(inlinePrefix));
  return inline ? inline.slice(inlinePrefix.length) : undefined;
}

function normalizeLanguage(value: string): "en" | "it" | undefined {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("en")) return "en";
  return undefined;
}

function detectLanguage(): "en" | "it" {
  const arg = readRawArg("lang");
  if (arg !== undefined) {
    const normalized = arg ? normalizeLanguage(arg) : undefined;
    if (!normalized) {
      throw new Error("Missing or unsupported --lang value. Use en or it.");
    }
    return normalized;
  }

  const envLanguage = process.env.POM_LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  return normalizeLanguage(envLanguage) || "en";
}

function printLogo(): void {
  console.log("");
  console.log("POM - Project Operating Memory");
  console.log("================================");
  console.log("");
}

function printProfiles(): void {
  const ordered: ProfileName[] = ["minimal", "wiki", "decisions", "full", "adopt", "refresh", "custom"];
  ordered.forEach((name, index) => {
    const profile = profiles[name];
    console.log(`${index + 1}. ${profile.label}`);
    console.log(`   ${profile.description}`);
  });
  console.log("");
}

function printPresetGuide(): void {
  if (detectLanguage() === "it") {
    console.log("");
    console.log("POM richiede una modalita di adozione esplicita quando il setup non e interattivo.");
    console.log("");
    console.log("Usa uno di questi preset:");
    console.log("  npm run pom:init -- --preset owned     # progetto tuo");
    console.log("  npm run pom:init -- --preset team      # progetto condiviso/team");
    console.log("  npm run pom:init -- --preset overlay   # repository clonato di terzi");
    console.log("  npm run pom:init -- --preset minimal   # setup POM locale minimale");
    console.log("");
    console.log("Forma esplicita avanzata:");
    console.log("  npm run pom:init -- --profile adopt --ownership external_overlay");
    console.log("");
    return;
  }

  console.log("");
  console.log("POM needs an explicit adoption mode in non-interactive setup.");
  console.log("");
  console.log("Use one of these presets:");
  console.log("  npm run pom:init -- --preset owned     # project is yours");
  console.log("  npm run pom:init -- --preset team      # shared/team project");
  console.log("  npm run pom:init -- --preset overlay   # third-party cloned repo");
  console.log("  npm run pom:init -- --preset minimal   # minimal local POM setup");
  console.log("");
  console.log("Advanced explicit form:");
  console.log("  npm run pom:init -- --profile adopt --ownership external_overlay");
  console.log("");
}

function readNamedArg(name: string, allowedValues: string[]): string | undefined {
  const exactIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  if (exactIndex >= 0) {
    const value = process.argv[exactIndex + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing --${name} value. Use one of: ${allowedValues.join(", ")}.`);
    }
    if (!allowedValues.includes(value)) {
      throw new Error(`Unknown --${name} value: ${value}. Use one of: ${allowedValues.join(", ")}.`);
    }
    return value;
  }

  const inlinePrefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(inlinePrefix));
  if (!inline) return undefined;

  const value = inline.slice(inlinePrefix.length);
  if (!value) {
    throw new Error(`Missing --${name} value. Use one of: ${allowedValues.join(", ")}.`);
  }
  if (!allowedValues.includes(value)) {
    throw new Error(`Unknown --${name} value: ${value}. Use one of: ${allowedValues.join(", ")}.`);
  }
  return value;
}

export function readProfileArg(): ProfileName | undefined {
  return readNamedArg("profile", Object.keys(profiles)) as ProfileName | undefined;
}

export function readOwnershipArg(): OwnershipMode | undefined {
  return readNamedArg("ownership", ["owned", "team", "external_overlay", "unknown"]) as OwnershipMode | undefined;
}

export function readPresetArg(): PresetName | undefined {
  return readNamedArg("preset", Object.keys(presets)) as PresetName | undefined;
}

export async function chooseProfile(argProfile: ProfileName | undefined): Promise<{ profile: ProfileName; ownership?: OwnershipMode }> {
  if (argProfile) return { profile: argProfile };

  if (!process.stdin.isTTY) {
    if (pathExists("pom.config.json")) return { profile: "refresh" };
    printPresetGuide();
    process.exit(1);
  }

  printLogo();
  console.log("Common presets:");
  for (const [name, preset] of Object.entries(presets)) {
    console.log(`- ${name}: ${preset.description}`);
  }
  console.log("");
  printProfiles();

  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question("Choose preset/profile [owned/team/overlay/minimal/wiki/decisions/full/adopt/refresh/custom]: ")).trim().toLowerCase();
    if (isPresetName(answer)) return { profile: presets[answer].profile, ownership: presets[answer].ownership };
    if (isProfileName(answer)) return { profile: answer };
    if (answer === "1") return { profile: "minimal" };
    if (answer === "2") return { profile: "wiki" };
    if (answer === "3") return { profile: "decisions" };
    if (answer === "4") return { profile: "full" };
    if (answer === "5") return { profile: "adopt" };
    if (answer === "6") return { profile: "refresh" };
    if (answer === "7") return { profile: "custom" };
    console.log("Unknown profile. Using refresh.");
    return { profile: "refresh" };
  } finally {
    rl.close();
  }
}

export async function customizeAdoption(base: AdoptionConfig): Promise<AdoptionConfig> {
  if (base.profile !== "custom" || !process.stdin.isTTY) return base;

  const rl = createInterface({ input, output });
  try {
    const wiki = await askYesNo(rl, "Enable persistent wiki memory?", false);
    const decisions = await askYesNo(rl, "Enable ADR decisions governance?", true);
    const handoff = await askYesNo(rl, "Enable handoff memory and current planning files?", false);
    const mockups = await askYesNo(rl, "Enable mockup governance?", false);
    const tests = await askChoice(rl, "Tests governance [disabled/existing/pom]", ["disabled", "existing", "pom"], "disabled");
    const planning = handoff ? "structured" : "light";

    return {
      profile: "custom",
      wiki: wiki ? "enabled" : "disabled",
      decisions: decisions ? "enabled" : "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: mockups ? "enabled" : "disabled",
      planning,
      tasks: planning,
      tests,
    };
  } finally {
    rl.close();
  }
}

async function askYesNo(rl: ReturnType<typeof createInterface>, question: string, defaultValue: boolean): Promise<boolean> {
  const suffix = defaultValue ? " [Y/n]: " : " [y/N]: ";
  const answer = (await rl.question(`${question}${suffix}`)).trim().toLowerCase();
  if (!answer) return defaultValue;
  return ["y", "yes"].includes(answer);
}

async function askChoice<T extends string>(
  rl: ReturnType<typeof createInterface>,
  question: string,
  allowed: T[],
  defaultValue: T,
): Promise<T> {
  const answer = (await rl.question(`${question} (${defaultValue}): `)).trim().toLowerCase();
  if (!answer) return defaultValue;
  return allowed.includes(answer as T) ? (answer as T) : defaultValue;
}

