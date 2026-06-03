//
// require-yaml.mjs - guarded loader for js-yaml, the only external dependency
// of the POM workflow scripts (lint-workflows, to-mermaid, to-xstate).
//
// js-yaml ships as a POM dependency but is installed on demand (workflows are
// opt-in), so a missing install must produce an actionable message instead of
// a raw ERR_MODULE_NOT_FOUND stack trace. Importing this module instead of
// 'js-yaml' directly turns that failure into a clear instruction.
//

let yaml;
try {
  yaml = (await import('js-yaml')).default;
} catch {
  console.error('[pom:workflow] Missing dependency: js-yaml.');
  console.error('The POM workflow scripts need js-yaml. It is declared as a POM');
  console.error('dependency but installed on demand (workflows are opt-in).');
  console.error('Fix: run `npm install` in your POM root (the pom/ folder) or in');
  console.error('the project root, then retry. See skills/config.md -> Enabling Workflows.');
  process.exit(2);
}

export default yaml;
