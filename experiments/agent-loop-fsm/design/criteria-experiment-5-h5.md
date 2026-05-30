---
experiment: agent-loop-fsm
ambito: 1
hypothesis: H5
created: 2026-05-30
status: accepted
---

## Contesto

- **SUT**: `agent-orchestrator.yaml` (ReAct minimal di H1 iter 1) sospeso e ripreso tramite snapshot JSON, secondo il contratto suspend/restore documentato in `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`.
- **Sperimentatore**: utente + agente di coding (modalità autonoma).
- **Iterazione**: produzione di uno snapshot + verifica del contratto (workflow name, version, state-in-modello, context shape).
- **Goal del SUT**: n/a.

## Obiettivo

Dimostrare che un loop agente modellato come workflow POM può essere sospeso e ripreso tramite il pattern snapshot+restore documentato, senza che il modello richieda estensioni allo schema per supportare la sospensione.

## Out of scope

- esecuzione runtime di un agente reale;
- snapshot di pipeline composte di più frame (già coperto in `experiments/workflow-modeling/` round 2);
- distributed checkpointing.

## Metriche gate

| Nome | Strumento | Soglia | Baseline | Legame con obiettivo |
|---|---|---|---|---|
| Snapshot JSON valido | `node -e` parse + struttura `{workflow, version, state, context}` | parse OK + 4 chiavi | n/a | Senza la 4-tupla canonica, il restore non è verificabile. |
| State dello snapshot esiste nel workflow | check su `agent-orchestrator.yaml.states[].name` | state valido | n/a | Invariante del contratto restore. |
| Workflow + version match | confronto con header YAML | match esatto | n/a | Invariante del contratto restore. |
| Context conforme a `context_schema` | check chiavi vs schema | tutte le chiavi presenti | n/a | Invariante del contratto restore. |

## Metriche signal

Non applicabile (esperimento dimostrativo, una sola iterazione attesa).

## Condizioni di uscita

- **Raggiunto**: 4 gate verdi + snapshot completo committato + un esempio di "ripresa" descritto (cosa fa il workflow se ricaricato da quello snapshot).
- **Falsificazione**: il pattern snapshot+restore richiede una primitiva schema non documentata in `WORKFLOW_IMPLEMENTATION_GUIDE.md`.

      loop_guard:
        max_visits: 2
        max_duration: 15min

## Acceptance

Accettato il 2026-05-30 (modalità autonoma).
