// Shared command-line argument helpers for the POM Source scripts.
//
// This is the single implementation: `cli-args.ts` re-exports it for the
// scripts that run with `--experimental-strip-types`, and the plain `.mjs`
// scripts (render-wiki, the workflow transformers, the Project Reader, the
// evidence cleaner) import it directly.
//
// Two scripts deliberately keep their own copy of these helpers instead of
// importing this module: `bootstrap-pom.mjs`, which is downloaded alone
// before `pom/` exists, and `templates/POM_UPDATE_TEMPLATE.mjs`, which must
// run from a target root even when `pom/` is stale, minimal, or missing.
// Keep the three semantics aligned when changing one of them.

/**
 * Reads `--name value` or `--name=value`. Returns `undefined` when the flag is
 * absent and an empty string when the flag is present without a usable value
 * (for example `--lang --other`), so callers can distinguish the two cases.
 * @param {string} name
 * @param {string[]} [argv]
 * @returns {string | undefined}
 */
export function readRawArg(name, argv = process.argv) {
  const exactIndex = argv.findIndex((arg) => arg === `--${name}`);
  if (exactIndex >= 0) {
    const value = argv[exactIndex + 1];
    return value && !value.startsWith("--") ? value : "";
  }
  const inlinePrefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(inlinePrefix));
  return inline ? inline.slice(inlinePrefix.length) : undefined;
}

/**
 * @param {string} name
 * @param {string[]} [argv]
 * @returns {boolean}
 */
export function hasArg(name, argv = process.argv) {
  return argv.some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
}

/**
 * Returns the arguments that are neither `--flags` nor the value consumed by a
 * `--name value` option listed in `valueOptions`. `--name=value` never consumes
 * the next argument.
 * @param {string[]} argv
 * @param {string[]} [valueOptions]
 * @returns {string[]}
 */
export function positionalArgs(argv, valueOptions = []) {
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const next = argv[index + 1];
    if (!arg.includes("=") && valueOptions.includes(arg.slice(2)) && next !== undefined && !next.startsWith("--")) {
      index += 1;
    }
  }
  return positional;
}

/**
 * Returns the `--flags` whose name (before any `=value`) is not in `known`.
 * @param {string[]} argv
 * @param {string[]} known
 * @returns {string[]}
 */
export function unknownOptions(argv, known) {
  return argv.filter((arg) => arg.startsWith("--") && !known.includes(arg.slice(2).split("=")[0]));
}

/**
 * @param {string} value
 * @returns {"en" | "it" | undefined}
 */
export function normalizeLanguage(value) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("en")) return "en";
  return undefined;
}

/**
 * Resolves the CLI guidance language: `--lang` wins, then `POM_LANG` and the
 * POSIX locale variables, then English. An explicit but unsupported `--lang`
 * is an error, reported through `onInvalid`.
 * @param {(message: string) => never} onInvalid
 * @param {string[]} [argv]
 * @returns {"en" | "it"}
 */
export function detectLanguage(onInvalid, argv = process.argv) {
  const arg = readRawArg("lang", argv);
  if (arg !== undefined) {
    const normalized = arg ? normalizeLanguage(arg) : undefined;
    if (!normalized) onInvalid("Missing or unsupported --lang value. Use en or it.");
    return /** @type {"en" | "it"} */ (normalized);
  }

  const envLanguage = process.env.POM_LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  return normalizeLanguage(envLanguage) || "en";
}
