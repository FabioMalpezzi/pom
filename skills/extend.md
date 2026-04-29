# Skill - extend

## When To Use

- Extend POM.
- Add a new methodological rule.
- Create a new POM skill.
- Modify POM prompts, templates, or configuration.
- Automate a check through lint or scripts.

## Canonical Prompt

`prompts/12-extend-pom.md`

## Key Rules

- Choose the smallest necessary level: config, template, prompt, skill, or lint.
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
