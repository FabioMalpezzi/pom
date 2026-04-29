# POM Repository Instructions

This repository contains **POM - Project Operating Memory** as a reusable method.

## Language

The POM method files in this repository are written in English for portability.

When applying POM to a target project, use the project/user language for conversation and generated artifacts unless the user asks otherwise.

## Editing Rules

- Keep this repository generic and reusable.
- Do not add project-specific categories, paths, or examples unless they are clearly marked as examples.
- Put reusable procedures in `prompts/`.
- Put short workflow aliases in `skills/`.
- Put document shapes in `templates/`.
- Keep `README.md` as the method overview and navigation entry point.
- Keep `WIKI_METHOD.md` as the cited LLM Wiki reference copy.

## Extending POM

Use `skills/extend.md` and `prompts/12-extend-pom.md` when changing the method.

Choose the smallest fitting level:

- project adaptation -> config template guidance;
- document shape -> `templates/`;
- agent procedure -> `prompts/`;
- recurring workflow -> `skills/`;
- automatic enforcement -> lint/script guidance.

## Publication

Before publishing:

- check for project-specific references;
- check attribution;
- choose and add a repository license;
- create an initial Git commit;
- then create/push the public remote.
