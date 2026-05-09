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

## Communication Style With The User

Rules for chat messages to the user.

- **Use the user's language naturally.** No hybrid forms when an
  idiomatic phrase exists.
- **Project labels are codes, not words.** Administrative labels
  (spec numbers, ADR identifiers, decision IDs, phase numbers) are
  archive codes. On first occurrence in the turn, state in plain
  words what the label refers to. Do not chain more than two such
  labels in a single sentence. Do not let the label replace the noun
  ("decide what to do with the finalizers", not "close D10.4").
- **No abstract placeholders.** Forbidden in chat: "I created file
  X that does Y", "apply rule Z to field W". Real names go in full.
  Placeholders only in code or formal templates.
- **Summaries in full sentences.** End-of-task recaps describe what
  was done and what is still open in normal sentences, not in stacks
  of acronyms.

## Documentation Discipline

Project documentation must stay lean and load-bearing. Its history
lives in Git, not in the document text.

- **Update before creating.** If an existing document covers the
  topic, rewrite it instead of adding a new parallel one. Version
  history is in Git.
- **No project log inside the docs.** Specs, ADRs, task plans and
  wikis describe current state and live decisions, not the chronicle
  of edits. The chronicle lives in Git.
- **If a project log is needed, create it explicitly.** Dedicated
  file, short entries "date + document + one-line change". Adopting
  it is an explicit choice taken with the user.
- **Fewer documents, more consistency.** Before creating a new
  document, check whether the content fits in an existing one.

## Work From Sources, Not From Memory

Design and analysis must rely on the current state of code and
documents, never on a recollection of them.

- **Read before designing.** Open the actual file before proposing
  changes, summarizing behavior, or referencing decisions.
- **Verify before citing.** A note or memory saying "X exists" or
  "spec Y says Z" is a claim to verify against the repository, not
  a fact.
- **Declare gaps.** If the artifact you expected cannot be found,
  say so. Do not fill the gap with assumptions.
- **No reconstruction from memory.** Describing the current content
  or behavior of a file requires reading it now.

## File Size And Static Analysis

Source files must remain readable and verifiable by automated
tooling.

- **Hard cap at 1000 lines.** No code file should exceed 1000
  lines. Above that, split it along a natural seam.
- **Aim for under 800.** Treat 800 lines as the working target.
- **Cap applies to hand-written source.** Generated code, large
  fixtures, and data dumps are exempt.
- **Use a linter.** Configure a language-appropriate linter and
  run it as part of the routine cycle.
- **Use a type checker.** When the language and environment
  support it, configure a type checker alongside the linter.

## Complexity Standards

Code complexity must stay within the conventions of the language
and the architecture chosen for the project.

- **Configure a complexity checker.** Use a language-appropriate
  tool (e.g. ESLint `complexity`/`sonarjs`, `gocyclo`, `radon`,
  `pmd`, `checkstyle`) with binding thresholds, not advisory ones.
- **Architectural boundaries are limits too.** When the project
  adopts a style (layered, hexagonal, clean, MVC), respect its
  layer boundaries, allowed dependencies, and module sizes.
- **Refactor before exception.** When a unit crosses the threshold,
  split it before merging. Bypassing the limit requires an explicit
  decision recorded in an ADR.
- **Tests are not exempt.** Excessive complexity in tests indicates
  a design problem in the code; address the cause.

## Publication

Before publishing:

- check for project-specific references;
- check attribution;
- choose and add a repository license;
- create an initial Git commit;
- then create/push the public remote.
