## POM Skills

If `pom/skills/` exists, use it as the operating index for POM workflows. Each skill points to a canonical prompt in `pom/prompts/` and relevant templates.

Rules:

- read the skill card first when the request matches a skill;
- explicitly state which POM skill is being used and why, so the workflow is visible in the conversation;
- read `pom.config.json` before applying conventions for docs, source, tests, wiki, analysis, or handoff;
- then read the linked canonical prompt;
- do not treat a skill as a replacement for prompts or templates;
- if no suitable skill exists, use POM prompts directly and propose a new skill only if the workflow becomes recurring.
