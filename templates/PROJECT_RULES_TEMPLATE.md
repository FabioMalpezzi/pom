# Project Rules

<!--
This file holds the instructions an agent needs for THIS project and cannot
derive from the code, the tests, or the README. POM injects its content into the
generated POM section of every agent instruction file, so write the rules here
and never inside the POM markers.

Research context: repository-level context files show no measured gain in task
success, and every one of them costs roughly 20% more steps. The only content
with a measured advantage is the project-specific instruction a developer writes
because nothing else in the repository states it. Keep this file short, concrete,
and free of anything an agent could read from the sources.

Write:
- conventions a reader cannot infer from the code (naming rules, ownership
  boundaries, "always use X here even though Y also works");
- non-functional requirements: security, privacy, performance, availability,
  cost, compliance - the constraints the produced code must respect;
- what must never happen without an explicit decision.

Do not write:
- a repository overview, a directory map, or an architecture summary: the
  measured result is that these do not help and still cost;
- anything the README, the code, or the tests already state;
- POM method explanations: those live in pom/skills/ and pom/prompts/.

Delete the sections you do not need. A section left with no content is not
injected, and `pom:lint` reports the file as still undeclared.
-->

## Conventions

<!-- One rule per line. Example: "HTTP handlers return the shared Result type; do not throw across the boundary." -->

## Non-Functional Requirements

<!-- Security, privacy, performance, availability, cost, compliance. Example: "No user identifier may reach a log line." -->

## Prohibited Without A Decision

<!-- Example: "Do not add a runtime dependency; open an ADR first." -->
