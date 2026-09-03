import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DIRECTORY_AGENT_INSTRUCTION_TARGETS,
  EXISTING_AGENT_INSTRUCTION_FILES,
} from "./install-agent-targets.ts";
import type { LintContext } from "./lint-context.ts";
import { isPomSourceRoot } from "./pom-source.mjs";
import { PROJECT_RULES_HEADING, projectRulesBody } from "./project-rules.ts";

const START_MARKER = "<!-- POM:START -->";
const END_MARKER = "<!-- POM:END -->";

/**
 * Reports on the project-owned rules file: the one place where a target
 * declares the instructions an agent cannot derive from the code. Repository
 * context files show no measured gain in task success and cost extra steps
 * regardless; project-specific instructions are the only content with a
 * measured advantage, so POM asks for them explicitly instead of assuming the
 * generic block is enough.
 */
export function checkProjectRules(context: LintContext): void {
  if (isPomSourceRoot(context.root)) return;
  if (context.isExternalOverlay) return;

  const { path, severity, maxWords } = context.config.projectRules;
  const absolute = join(context.root, path);

  if (!existsSync(absolute)) {
    context.add(
      severity,
      "project-rules-missing",
      `${path} is missing. Run npm run pom:update to seed it, then declare the rules an agent cannot derive from the code.`,
      path,
    );
    return;
  }

  const text = readFileSync(absolute, "utf8");
  const body = projectRulesBody(text);

  if (!body) {
    context.add(
      severity,
      "project-rules-undeclared",
      `${path} still carries only the template scaffold. Declare this project's conventions, non-functional requirements, and prohibitions, or delete the file if the project has none: nothing is injected while it is empty.`,
      path,
    );
    return;
  }

  const words = countWords(body);
  if (words > maxWords) {
    context.add(
      "warning",
      "project-rules-too-long",
      `${path} holds ${words} words against a ${maxWords} word budget. It is loaded with every session: keep the instructions that change what the agent does and move explanations into docs, the wiki, or a skill.`,
      path,
    );
  }

  for (const file of instructionFilesWithPomSection(context.root)) {
    if (sectionContainsProjectRules(readFileSync(join(context.root, file), "utf8"))) continue;
    context.add(
      severity,
      "project-rules-not-injected",
      `${file} does not carry the rules declared in ${path}. Run npm run pom:update to regenerate the POM section.`,
      file,
    );
  }
}

function instructionFilesWithPomSection(root: string): string[] {
  // Root entries are matched exactly, like the installer does, so a
  // case-insensitive filesystem does not report AGENTS.md three times.
  const rootEntries = new Set(readdirSync(root));
  const candidates = [
    ...EXISTING_AGENT_INSTRUCTION_FILES.filter((file) => (file.includes("/") ? existsSync(join(root, file)) : rootEntries.has(file))),
    ...DIRECTORY_AGENT_INSTRUCTION_TARGETS.map((target) => target.file).filter((file) => existsSync(join(root, file))),
  ];

  return candidates.filter((file) => readFileSync(join(root, file), "utf8").includes(START_MARKER));
}

function sectionContainsProjectRules(text: string): boolean {
  const start = text.indexOf(START_MARKER);
  const end = text.indexOf(END_MARKER, start);
  if (start < 0 || end < 0) return false;
  // Anchored to the whole line: the block also carries a "Project Rules Source"
  // heading, which a prefix match would accept as the injected section.
  return injectedHeading().test(text.slice(start, end));
}

function injectedHeading(): RegExp {
  return new RegExp(`^${PROJECT_RULES_HEADING.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\s*$`, "m");
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}
