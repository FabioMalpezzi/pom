// Shared command-line argument helpers for the POM Source scripts that run
// with `--experimental-strip-types` (installer, help, lint).
//
// The implementation lives in `cli-args.mjs` so that the plain `.mjs` scripts
// can share it; this module only re-exports it with TypeScript types.
//
// Two scripts deliberately keep their own copy of these helpers instead of
// importing this module: `bootstrap-pom.mjs`, which is downloaded alone
// before `pom/` exists, and `templates/POM_UPDATE_TEMPLATE.mjs`, which must
// run from a target root even when `pom/` is stale, minimal, or missing.
// Keep the three semantics aligned when changing one of them.

import * as shared from "./cli-args.mjs";

export type PomLanguage = "en" | "it";

/**
 * Reads `--name value` or `--name=value`. Returns `undefined` when the flag is
 * absent and an empty string when the flag is present without a usable value
 * (for example `--lang --other`), so callers can distinguish the two cases.
 */
export function readRawArg(name: string, argv: string[] = process.argv): string | undefined {
  return shared.readRawArg(name, argv);
}

export function hasArg(name: string, argv: string[] = process.argv): boolean {
  return shared.hasArg(name, argv);
}

export function positionalArgs(argv: string[], valueOptions: string[] = []): string[] {
  return shared.positionalArgs(argv, valueOptions);
}

export function unknownOptions(argv: string[], known: string[]): string[] {
  return shared.unknownOptions(argv, known);
}

export function normalizeLanguage(value: string): PomLanguage | undefined {
  return shared.normalizeLanguage(value);
}

/**
 * Resolves the CLI guidance language: `--lang` wins, then `POM_LANG` and the
 * POSIX locale variables, then English. An explicit but unsupported `--lang`
 * is an error, reported through `onInvalid`.
 */
export function detectLanguage(onInvalid: (message: string) => never, argv: string[] = process.argv): PomLanguage {
  return shared.detectLanguage(onInvalid, argv);
}
