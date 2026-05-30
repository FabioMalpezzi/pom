---
experiment: agent-loop-fsm
ambito: 1
hypothesis: H1
created: 2026-05-30
status: accepted
---

## Contesto

- **SUT**: il workflow `experiments/agent-loop-fsm/workflows-candidate/agent-orchestrator.yaml` (modello FSM di un agente AI generico, modellato ma non eseguito).
- **Sperimentatore**: utente + agente di coding in sessione (loop manuale "modifica → lint → mermaid → revisione").
- **Iterazione**: una versione di `agent-orchestrator.yaml` committata, accompagnata da rerun di `pom:workflow:lint` e rigenerazione del diagramma Mermaid.
- **Goal del SUT**: terminare il ciclo decisionale dell'agente raggiungendo uno stato terminale (modellato come `is_final: true`; non eseguito in questo esperimento).

## Obiettivo

Modellare il control flow di un agente AI generico come workflow POM senza estensioni allo schema e senza forced-fit lossy, dimostrando che lo schema attuale copre il caso base degli agenti loop/goal.

## Out of scope

- prestazioni a runtime del workflow modellato;
- esecuzione effettiva dell'agente modellato (Pattern A/B/C: rinviato a H5);
- pattern avanzati: multi-agent, async, retry sofisticati, bounded retry combinati — sono oggetto di H2–H5;
- compatibilità con specifici framework agentici (LangGraph, AutoGen, CrewAI).

## Metriche gate (non-regressione)

| Nome | Strumento | Soglia | Baseline | Legame con obiettivo |
|---|---|---|---|---|
| Validator pass su `agent-orchestrator.yaml` | `npm run pom:workflow:lint` | 0 errori | n/a (file da creare) | Senza pass del validator il workflow non è un modello POM valido: l'obiettivo non è raggiungibile. |
| Mermaid generato e parsabile | `pom:workflow:lint --mermaid-dir` + `mmdc` su `.mmd` | file esiste e parsa | n/a (file da creare) | Diagramma leggibile è evidenza richiesta dal backlog (H1 row). |

## Metriche signal (progresso)

| Nome | Strumento | Direzione | Trend (assoluto/relativo/statistico) | Baseline | Legame con obiettivo |
|---|---|---|---|---|---|
| Estensioni schema POM richieste | diff `specs/SPEC-0006-workflow-modeling.md` corrente vs ogni iterazione | ↓ | `assoluto: delta <= 0` ogni iterazione | 0 (post workflow-modeling consolidato) | L'obiettivo è "senza estensioni schema": ogni estensione richiesta è un colpo diretto all'obiettivo. |
| Stati classificati `forced fit lossy` nel design note | conteggio tag `forced` in `design/agent-orchestrator.fit.md` | ↓ | `assoluto: delta <= 0` ogni iterazione | TBD calibrata al run 1 | Forced fit = il modello tradisce il dominio. L'obiettivo è "senza forced fit". |
| Stati classificati `clean fit` nel design note | conteggio tag `clean` in `design/agent-orchestrator.fit.md` | ↑ | `assoluto: delta >= 1` ogni iterazione finché esistono stati non-clean | TBD calibrata al run 1 | Ogni stato migrato da `adapted` a `clean` aumenta la fedeltà del modello al dominio. |

## Condizioni di uscita del loop

- **Raggiunto**: tutti i gate verdi AND signal "estensioni schema" = 0 AND signal "forced fit" = 0 AND 100% degli stati dichiarati `clean fit` nel design note.
- **Forfait per stallo**: 3 iterazioni consecutive senza progresso su "clean fit", oppure ricomparsa di uno stato `forced fit` dopo essere già stato risolto.

      loop_guard:
        max_visits: 10
        max_duration: 20min
        on_visits_exhausted: forfait_no_progress

- **Forfait per budget**: 20 minuti di sessione cumulata sull'esperimento.
- **Falsificazione**: il design note dichiara obbligatoria una **nuova primitiva strutturale** allo schema POM per modellare il caso minimo dell'agente generico — cioè un nuovo tipo di transizione, una nuova primitiva di composizione, o una nuova categoria di stato. L'aggiunta di un campo opzionale a una primitiva esistente NON falsifica H1: è considerata estensione benigna documentata nel design note.

## Acceptance

- Accettato il: 2026-05-30
- Accettato da: utente (Fabio Malpezzi) in sessione con agente di coding.
- Congelato fino a: chiusura di Esperimento 1 (H1) o supersedere esplicito tramite revisione documentata in `notes/`.
