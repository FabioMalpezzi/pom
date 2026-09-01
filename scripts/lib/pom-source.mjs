// Single definition of "this directory is the POM Source repository".
//
// Plain JavaScript so it can be imported both by the TypeScript scripts (run
// with --experimental-strip-types) and by the Project Reader, which runs
// without that flag. `bootstrap-pom.mjs` keeps an inline copy of the same
// marker list because it is downloaded alone before `pom/` exists.

import { existsSync } from "node:fs";
import { join } from "node:path";

/** Files and folders that only the POM Source repository has at its root. */
export const POM_SOURCE_MARKERS = Object.freeze([
  "WIKI_METHOD.md",
  "bootstrap-pom.mjs",
  "scripts/install-pom.ts",
  "skills/README.md",
]);

/** True when `root` is the POM Source repository (not a target with `pom/`). */
export function isPomSourceRoot(root = process.cwd()) {
  return POM_SOURCE_MARKERS.every((marker) => existsSync(join(root, marker)));
}
