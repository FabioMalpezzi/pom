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
   - Obsolescence → update the wiki page to reflect the current source;
   - Contradiction → create an ADR that resolves the contradiction; update wiki after decision;
   - Expiry → archive or remove the memory; note the reason;
   - Gap → create a new wiki page or section; flag as open question if source is unclear;
6. wait for approval before modifying any file.

Rules:
- classify before resolving — do not propose a resolution without a classification;
- contradictions require an ADR, not just a wiki update;
- do not modify memory without explicit approval;
- if the divergence type is unclear, state the ambiguity and propose the most likely type;
- do not run broad semantic analysis; work from the identified divergence.

After approval:
1. execute the approved resolution;
2. update `wiki/index.md` if wiki pages are added or changed;
3. update `wiki/log.md`;
4. if a contradiction ADR was created, link it from the affected wiki pages;
5. loop closure: scan `wiki/` for other pages that cite the same source with the same divergence type; report any additional candidates;
6. run `npm run pom:lint`, if available.

Final output:
- divergence type and classification rationale;
- resolution applied;
- loop closure scan result;
- lint run;
- open follow-up.
```

