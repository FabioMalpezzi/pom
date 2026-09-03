// Single definition of the project-owned rules file: where it lives, what
// counts as "still undeclared", and how its body is folded into the generated
// POM section. The installer seeds and injects it; `pom:lint` reports on it.
//
// Everything between the POM markers is rewritten on every install and refresh,
// so project-specific instructions cannot live there. They live in this one
// file and are injected into every agent instruction target, which keeps a
// single editable source and costs the agent no extra read at runtime.

export const PROJECT_RULES_FILE = "PROJECT_RULES.md";
export const PROJECT_RULES_TEMPLATE = "PROJECT_RULES_TEMPLATE.md";
export const PROJECT_RULES_HEADING = "## Project Rules";

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const HEADING = /^(#{1,6})\s/;

/**
 * The declared body of the rules file, with guidance comments removed and
 * headings demoted so they nest under the injected `## Project Rules`.
 * Returns `undefined` when the file only carries the template scaffold, so an
 * undeclared file adds nothing to the always-loaded block.
 */
export function projectRulesBody(text: string): string | undefined {
  const lines = text.replace(HTML_COMMENT, "").split("\n");
  const kept: string[] = [];
  let hasContent = false;

  for (const line of lines) {
    const heading = HEADING.exec(line);
    if (heading) {
      if (heading[1].length === 1) continue;
      kept.push(heading[1].length < 6 ? `#${line}` : line);
      continue;
    }
    kept.push(line);
    if (line.trim().length > 0) hasContent = true;
  }

  if (!hasContent) return undefined;
  return collapseBlankLines(kept.join("\n")).trim();
}

/** The section appended to the generated POM block, or `undefined` when the file declares nothing. */
export function projectRulesSection(text: string): string | undefined {
  const body = projectRulesBody(text);
  if (!body) return undefined;

  return [
    PROJECT_RULES_HEADING,
    "",
    `Rules specific to this project. Source: \`${PROJECT_RULES_FILE}\` - edit that file, never this block, which is regenerated on every POM install or update. Where these rules conflict with the POM conventions above, these win.`,
    "",
    body,
  ].join("\n");
}

function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}
