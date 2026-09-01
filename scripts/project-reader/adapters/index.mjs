import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createGenericSourceContext, hasProjectReaderConfig } from "./generic-adapter.mjs";
import { createPomSourceContext } from "./pom-adapter.mjs";
import { isPomSourceRoot } from "../../lib/pom-source.mjs";

export function createSourceContext({ root, profile = "auto" } = {}) {
  const projectRoot = resolve(String(root || "."));
  const selectedProfile = String(profile || "auto");
  if (selectedProfile === "pom") return createPomSourceContext(projectRoot);
  if (selectedProfile === "generic") return createGenericSourceContext(projectRoot);
  if (selectedProfile !== "auto") throw new Error(`Unknown Project Reader profile: ${selectedProfile}`);
  if (hasProjectReaderConfig(projectRoot)) return createGenericSourceContext(projectRoot);
  if (looksLikePomProject(projectRoot)) return createPomSourceContext(projectRoot);
  return createGenericSourceContext(projectRoot);
}

function looksLikePomProject(root) {
  return existsSync(join(root, "pom.config.json")) || isPomSourceRoot(root);
}
