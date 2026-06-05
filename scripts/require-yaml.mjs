//
// require-yaml.mjs - guarded loader for js-yaml, the only external dependency
// of the POM workflow scripts.
//
// Workflow modeling is opt-in, so a missing install should produce an
// actionable message instead of a raw ERR_MODULE_NOT_FOUND stack trace.
//

let yaml;
try {
  yaml = (await import('js-yaml')).default;
} catch {
  console.error('[pom:workflow] Missing dependency: js-yaml.');
  console.error('The POM workflow scripts need js-yaml.');
  console.error('Fix: run `npm install` in your POM root or in the project root, then retry.');
  console.error('See skills/config.md -> Enabling Workflows.');
  process.exit(2);
}

export default yaml;
