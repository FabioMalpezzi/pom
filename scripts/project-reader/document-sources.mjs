import { createPomSourceContext, generatedIgnoreGlobs, isGeneratedPath, skippedDocumentGlobs } from "./adapters/pom-adapter.mjs";
import { kindRank } from "./adapters/shared.mjs";

export { generatedIgnoreGlobs, isGeneratedPath, kindRank, skippedDocumentGlobs };

export function buildDocumentSourceContext(root) {
  const context = createPomSourceContext(root);
  return {
    docSources: context.docSources,
    pomConfig: context.config,
  };
}
