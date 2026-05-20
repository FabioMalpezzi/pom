# POM Repository Instructions

This repository contains **POM - Project Operating Memory** as a reusable method.

## Language

The POM method files in this repository are written in English for portability.

When applying POM to a target project, use the project/user language for conversation and generated artifacts unless the user asks otherwise.

## Installation Safety

When a user asks to install POM in a target project, treat POM as
**Project Operating Memory** from this repository, not Maven `pom.xml`,
Page Object Model, or another expansion.

Do not clone this repository directly into the target project root.
Run the bootstrap from the target project root so the POM Source is
installed under `pom/` and project-owned files remain at the root.

When the goal is to improve POM itself, clone this repository as its
own working repository and do not run the bootstrap as an install step.

## Editing Rules

- Keep this repository generic and reusable.
- Do not add project-specific categories, paths, or examples unless they are clearly marked as examples.
- Put reusable procedures in `prompts/`.
- Put short workflow aliases in `skills/`.
- Put document shapes in `templates/`.
- Keep `README.md` as the canonical entry point and operating overview.
- Keep `WIKI_METHOD.md` as the cited LLM Wiki reference copy.

## Extending POM

Use `skills/extend.md` and `prompts/12-extend-pom.md` when changing the method.

Choose the smallest fitting level:

- project adaptation -> config template guidance;
- document shape -> `templates/`;
- agent procedure -> `prompts/`;
- recurring workflow -> `skills/`;
- automatic enforcement -> lint/script guidance.

## Agent Work Principles

- Before non-trivial edits, state the goal, assumptions, success criteria, and shortest verification loop when they are not already explicit.
- Keep execution surgical and deterministic: simple code, no speculative abstractions, goal-critical files only, tools or code for repeatable transforms, and the model for judgment calls.
- Read before adding helpers; surface conflicts instead of blending patterns; fail loudly on skipped records, hidden errors, or uncertainty; compact long work into durable memory.

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
- **Optimize for the next safe step.** When the right document is
  unclear, write the smallest useful note where the next reader or
  agent will need it before acting.

## Work From Sources, Not From Memory

Design and analysis must rely on the current state of code and
documents, never on a recollection of them.

- **Read before designing.** Open the actual file before proposing
  changes, summarizing behavior, or referencing decisions.
- **Use the domain glossary.** Read `CONTEXT.md` before design,
  refactoring, or governance changes, and use its terms in new
  prompts, templates, specs, and code comments.
- **Verify before citing.** A note or memory saying "X exists" or
  "spec Y says Z" is a claim to verify against the repository, not
  a fact.
- **Declare gaps.** If the artifact you expected cannot be found,
  say so. Do not fill the gap with assumptions.
- **No reconstruction from memory.** Describing the current content
  or behavior of a file requires reading it now.

## File Size And Static Analysis

Source files must remain readable and verifiable by automated
tooling. POM enforces structural limits on the files it ships;
the surrounding tooling is recommended, not imposed.

- **Hard cap at 1000 lines.** No code file should exceed 1000
  lines. Above that, split it along a natural seam. This is a
  POM rule and applies to the POM repository itself.
- **Aim for under 800.** Treat 800 lines as the working target.
- **Cap applies to hand-written source.** Generated code, large
  fixtures, and data dumps are exempt.
- **Recommended: configure a linter.** POM does not bundle one,
  and the POM repository does not install a linter just to satisfy
  this rule. Target projects are encouraged to add a
  language-appropriate linter and run it as part of the routine
  cycle.
- **Recommended: configure a type checker.** When the language and
  environment support it, target projects are encouraged to add a
  type checker alongside the linter.

## Complexity Standards

Code complexity should stay within the conventions of the language
and the architecture chosen for the project. POM proposes the
guardrails below; the target project owns their installation and
threshold tuning.

- **Recommended: configure a complexity checker.** Suggested tools
  include ESLint `complexity`/`sonarjs`, `gocyclo`, `radon`, `pmd`,
  `checkstyle`. When adopted, prefer binding thresholds over
  advisory ones so they actually shape merges.
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
