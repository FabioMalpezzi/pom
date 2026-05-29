# Scripts (candidate)

Prototipo del validatore di workflow.

Vincoli per l'esperimento:

- nessuna nuova dipendenza aggiunta a `package.json` del repo POM principale;
- il prototipo gira con `node` puro o, se serve un parser YAML, usato come dipendenza locale di esperimento (eventuale `package.json` locale dentro questa cartella) oppure invocato via `npx`;
- output sotto `experiments/workflow-modeling/evidence/`, non sotto `workflows/generated/` del repo POM.

In fase di promozione, il file scelto diventa `scripts/lint-workflows.ts` e viene esposto come `npm run pom:workflow:lint`.

TODO:

- scegliere strategia parser YAML (parser interno per il subset documentato, oppure `js-yaml` locale all'esperimento);
- implementare le regole di validazione elencate nella spec candidate (sezione "Validation Rules");
- generare Mermaid `stateDiagram-v2`;
- generare scenari lingua-agnostici.
