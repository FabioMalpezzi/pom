// Shared command-line argument helpers for the POM Source scripts that run
// with `--experimental-strip-types` (installer, help, lint).
//
// Two scripts deliberately keep their own copy of these helpers instead of
// importing this module: `bootstrap-pom.mjs`, which is downloaded alone
// before `pom/` exists, and `templates/POM_UPDATE_TEMPLATE.mjs`, which must
// run from a target root even when `pom/` is stale, minimal, or missing.
// Keep the three semantics aligned when changing one of them.

export type PomLanguage = "en" | "it";

/**
 * Reads `--name value` or `--name=value`. Returns `undefined` when the flag is
 * absent and an empty string when the flag is present without a usable value
 * (for example `--lang --other`), so callers can distinguish the two cases.
 */
export function readRawArg(name: string, argv: string[] = process.argv): string | undefined {
  const exactIndex = argv.findIndex((arg) => arg === `--${name}`);
  if (exactIndex >= 0) {
    const value = argv[exactIndex + 1];
    return value && !value.startsWith("--") ? value : "";
  }
  const inlinePrefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(inlinePrefix));
  return inline ? inline.slice(inlinePrefix.length) : undefined;
}

export function hasArg(name: string, argv: string[] = process.argv): boolean {
  return argv.some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
}

export function normalizeLanguage(value: string): PomLanguage | undefined {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("en")) return "en";
  return undefined;
}

/**
 * Resolves the CLI guidance language: `--lang` wins, then `POM_LANG` and the
 * POSIX locale variables, then English. An explicit but unsupported `--lang`
 * is an error, reported through `onInvalid`.
 */
export function detectLanguage(onInvalid: (message: string) => never, argv: string[] = process.argv): PomLanguage {
  const arg = readRawArg("lang", argv);
  if (arg !== undefined) {
    const normalized = arg ? normalizeLanguage(arg) : undefined;
    if (!normalized) onInvalid("Missing or unsupported --lang value. Use en or it.");
    return normalized as PomLanguage;
  }

  const envLanguage = process.env.POM_LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  return normalizeLanguage(envLanguage) || "en";
}
