export type ProfileName = "minimal" | "wiki" | "decisions" | "full" | "adopt" | "refresh" | "custom";
export type OwnershipMode = "owned" | "team" | "external_overlay" | "unknown";
export type PresetName = "owned" | "team" | "overlay" | "minimal";

export type AdoptionConfig = {
  profile: ProfileName;
  wiki: "enabled" | "disabled";
  decisions: "enabled" | "disabled";
  analysis: "enabled" | "optional" | "disabled";
  docs: "enabled" | "optional" | "disabled";
  mockups: "enabled" | "disabled";
  planning: "light" | "structured";
  tasks: "light" | "structured";
  tests: "disabled" | "existing" | "pom";
};

export type OwnershipConfig = {
  mode: OwnershipMode;
  localOnly?: boolean;
  preserveExistingConventions?: boolean;
  note?: string;
};

export type ProjectConfig = Record<string, unknown>;

export type PackageJson = {
  scripts?: Record<string, string>;
  [key: string]: unknown;
};

export type GitContext = {
  insideWorkTree: boolean;
  topLevel?: string;
  isProjectRoot: boolean;
};

export const profiles: Record<ProfileName, { label: string; description: string; adoption: AdoptionConfig }> = {
  minimal: {
    label: "Minimal",
    description: "Installs only agent instruction file sections, package scripts, and pom.config.json. No wiki, docs, analysis, mockups, or tests.",
    adoption: {
      profile: "minimal",
      wiki: "disabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
  wiki: {
    label: "Wiki",
    description: "Minimal + persistent wiki memory. Creates wiki/index.md and wiki/log.md.",
    adoption: {
      profile: "wiki",
      wiki: "enabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
  decisions: {
    label: "Decisions",
    description: "Minimal + ADR governance. Enables the configured decisions root and generated ADR index.",
    adoption: {
      profile: "decisions",
      wiki: "disabled",
      decisions: "enabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
  full: {
    label: "Full",
    description: "Wiki + decisions + PROJECT_STATE.md + CURRENT_PLAN.md. Use for long-running projects.",
    adoption: {
      profile: "full",
      wiki: "enabled",
      decisions: "enabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "structured",
      tasks: "structured",
      tests: "existing",
    },
  },
  adopt: {
    label: "Adopt Existing Project",
    description: "Preserves existing structure and maps POM to it. Does not impose folders.",
    adoption: {
      profile: "adopt",
      wiki: "disabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "existing",
    },
  },
  refresh: {
    label: "Refresh Existing POM",
    description: "Updates only agent instruction file sections and package scripts. Does not change pom.config.json or create governance folders.",
    adoption: {
      profile: "refresh",
      wiki: "disabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
  custom: {
    label: "Custom",
    description: "Starts from Minimal and asks which POM modules to enable.",
    adoption: {
      profile: "custom",
      wiki: "disabled",
      decisions: "disabled",
      analysis: "optional",
      docs: "optional",
      mockups: "disabled",
      planning: "light",
      tasks: "light",
      tests: "disabled",
    },
  },
};

export const presets: Record<PresetName, { profile: ProfileName; ownership: OwnershipMode; description: string }> = {
  owned: {
    profile: "adopt",
    ownership: "owned",
    description: "Project is yours; POM may become project governance when useful.",
  },
  team: {
    profile: "adopt",
    ownership: "team",
    description: "Shared/team project; preserve existing conventions unless explicitly changed.",
  },
  overlay: {
    profile: "adopt",
    ownership: "external_overlay",
    description: "Third-party cloned repository; POM is local understanding memory only.",
  },
  minimal: {
    profile: "minimal",
    ownership: "unknown",
    description: "Minimal local POM setup with no ownership assumption.",
  },
};

export function isProfileName(value: string): value is ProfileName {
  return Object.prototype.hasOwnProperty.call(profiles, value);
}

export function isPresetName(value: string): value is PresetName {
  return Object.prototype.hasOwnProperty.call(presets, value);
}

export function isOwnershipMode(value: string): value is OwnershipMode {
  return ["owned", "team", "external_overlay", "unknown"].includes(value);
}

