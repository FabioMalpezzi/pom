---
name: extend
description: Use this skill to extend POM by adding or modifying a config rule, template, prompt, skill, or lint check — choosing the smallest necessary level.
---

# Skill - extend

## When To Use

- Extend POM.
- Add a new methodological rule.
- Create a new POM skill.
- Modify POM prompts, templates, or configuration.
- Automate a check through lint or scripts.
- Apply a POM framework improvement to both the source POM repository and a target project's `pom/`.

## Canonical Prompt

`prompts/12-extend-pom.md`

## Key Rules

- Choose the smallest necessary level: config, template, prompt, skill, or lint.
- Use `skills/sync.md` after a framework-level change when a target project must be aligned to the new POM commit.
- Do not turn local adaptations into general rules without a reason.
- A skill must stay short and point to a canonical prompt.
- After methodological extensions, update `PROJECT_STATE.md` if the operating context changes.
- Run `npm run pom:lint` when available.

## Output

- proposed or applied extension;
- modified POM level;
- updated files;
- lint/tests run;
- any remaining open decisions.
