# Evidence

Output prodotti durante l'esperimento `agent-loop-fsm` e usati come evidenza delle ipotesi in `EXPERIMENT.md`:

- report di validazione (`pom:workflow:lint`) sui workflow candidati;
- diagrammi Mermaid generati con `--mermaid-dir`;
- eventuali file di confronto con i workflow di riferimento già modellati in `experiments/workflow-modeling/real-project-validation/internal-agent/`;
- eventuali snippet TypeScript per evidence runtime (Pattern A + suspend/restore);
- screenshot di rendering stately.ai se rilevanti.

Convenzione minima:

- nome file `<workflow-or-topic>.<tipo>.<estensione>` (es. `agent-orchestrator.validation.md`, `agent-orchestrator.mmd`);
- ogni file porta in cima il commit di provenienza e il comando che lo ha prodotto;
- gli artefatti vengono rigenerati quando cambia il modello — non sono autoritativi.
