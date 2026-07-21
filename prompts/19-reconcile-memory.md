# Prompt - Reconcile Memory

Use this prompt when a divergence between a source and project memory has been identified and must be resolved — not just detected.

```text
I want to reconcile a divergence between a source and project memory.

Before modifying files:
1. read `pom.config.json` if present;
2. read the source that changed or diverges;
3. read the memory that cites it (wiki page, ADR, spec, or analysis);
4. classify the divergence type:
   - Obsolescence: source updated, memory cites the old version;
   - Contradiction: two authoritative sources disagree on the same fact;
   - Expiry: fact was true but is no longer relevant;
   - Gap: expected knowledge is missing from memory;
5. propose the resolution path for the classified type:
   - Obsolescence → update the wiki page to reflect the current source (only if `adoption.wiki` is enabled and `wiki/` exists; otherwise update the relevant spec or analysis document);
   - Contradiction → if `adoption.decisions` is enabled, propose an ADR in the configured decisions root; if it is disabled, do not create an ADR—report the unresolved authority conflict and ask whether to enable Decision Records or use the project's existing approved decision mechanism; update wiki only after the decision and only if wiki is enabled and exists;
   - Expiry → archive or remove the memory; note the reason;
   - Gap → create a new wiki page or section (only if wiki is enabled and exists); flag as open question if source is unclear;
6. wait for approval before modifying any file.

Rules:
- classify before resolving — do not propose a resolution without a classification;
- contradictions require an explicit authoritative decision, not just a wiki update; use an ADR only when `adoption.decisions` is enabled, otherwise request approval for the project's existing decision mechanism or for enabling Decision Records;
- do not modify memory without explicit approval;
- if the divergence type is unclear, state the ambiguity and propose the most likely type;
- do not run broad semantic analysis; work from the identified divergence.

After approval:
1. execute the approved resolution;
2. update `wiki/index.md` if wiki pages are added or changed;
3. update `wiki/log.md` only if wiki is enabled and the configured wiki uses that log;
4. if a contradiction decision was recorded, link it from affected wiki pages only if wiki is enabled;
5. loop closure: scan the configured memory roots for other artifacts that cite the same source with the same divergence type; report any additional candidates;
6. run `npm run pom:lint`, if available.

Final output:
- divergence type and classification rationale;
- resolution applied;
- loop closure scan result;
- lint run;
- open follow-up.
```

