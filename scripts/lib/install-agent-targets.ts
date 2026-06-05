export const FALLBACK_AGENT_INSTRUCTION_FILE = "AGENTS.md";

export const EXISTING_AGENT_INSTRUCTION_FILES = [
  "AGENTS.md",
  "AGENTS.MD",
  "agents.md",
  "CLAUDE.md",
  "GEMINI.md",
  "CONVENTIONS.md",
  ".cursorrules",
  ".clinerules",
  ".windsurfrules",
  ".github/copilot-instructions.md",
  ".junie/guidelines.md",
  ".junie/instructions.md",
  ".junie/AGENTS.md",
];

export const DIRECTORY_AGENT_INSTRUCTION_TARGETS = [
  {
    directory: ".claude/rules",
    file: ".claude/rules/pom.md",
    header: "",
  },
  {
    directory: ".github/instructions",
    file: ".github/instructions/pom.instructions.md",
    header: "---\napplyTo: \"**\"\n---\n\n",
  },
  {
    directory: ".cursor/rules",
    file: ".cursor/rules/pom.mdc",
    header: "---\ndescription: Project Operating Memory rules\nalwaysApply: true\n---\n\n",
  },
  {
    directory: ".windsurf/rules",
    file: ".windsurf/rules/pom.md",
    header: "",
  },
  {
    directory: ".kiro/steering",
    file: ".kiro/steering/pom.md",
    header: "",
  },
  {
    directory: ".continue/rules",
    file: ".continue/rules/pom.md",
    header: "",
  },
  {
    directory: ".roo/rules",
    file: ".roo/rules/pom.md",
    header: "",
  },
  {
    directory: ".clinerules",
    file: ".clinerules/pom.md",
    header: "",
  },
];

export const CLAUDE_AGENT_TEMPLATES = [
  {
    source: "agents/claude/pom-post-action-validator.md",
    target: ".claude/agents/pom-post-action-validator.md",
  },
];
