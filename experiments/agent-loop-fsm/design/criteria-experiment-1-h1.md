---
experiment: agent-loop-fsm
ambito: 1
hypothesis: H1
created: 2026-05-30
revised: 2026-05-30 (coerenza interna, vedi notes/2026-05-30-prompt-v2-first-use-feedback.md D4)
status: accepted
---

## Contesto

- **SUT**: il workflow `templates/examples/workflow/loop-goal/agent-orchestrator.yaml` (modello FSM di un agente AI generico, modellato ma non eseguito).
- **Sperimentatore**: utente + agente di coding in sessione (loop manuale "modifica → lint → mermaid → revisione").
- **Iterazione**: una versione di `agent-orchestrator.yaml` committata, accompagnata da rerun di `pom:workflow:lint` e rigenerazione del diagramma Mermaid. Costo stimato ≈ 10–15 minuti per iterazione.
- **Goal del SUT**: terminare il ciclo decisionale dell'agente raggiungendo uno stato terminale (modellato come `is_final: true`; non eseguito in questo esperimento).

## Obiettivo

Modellare il control flow di un agente AI generico come workflow POM senza introdurre complessità eccessiva, ammettendo come estensioni di schema solo le primitive già previste nel backlog di `agent-loop-fsm` (H6 `loop_guard`, H7 `timeout`) quando dichiarate esplicitamente nel design note.

## Out of scope

- prestazioni a runtime del workflow modellato;
- esecuzione effettiva dell'agente modellato (Pattern A/B/C: rinviato a H5);
- pattern avanzati: multi-agent, async, retry sofisticati, bounded retry combinati — sono oggetto di H2–H5;
- compatibilità con specifici framework agentici (LangGraph, AutoGen, CrewAI).

## Metriche gate (non-regressione)

| Nome | Strumento | Soglia | Baseline | Legame con obiettivo |
|---|---|---|---|---|
| Validator pass su `agent-orchestrator.yaml` | `npm run pom:workflow:lint` | 0 errori | n/a (file da creare) | Senza pass del validator il workflow non è un modello POM valido: l'obiettivo non è raggiungibile. |
| Mermaid generato e parsabile | `pom:workflow:lint --mermaid-dir` + `mmdc` su `.mmd` | file esiste e parsa | n/a (file da creare); precondizione: `mmdc` installato | Diagramma leggibile è evidenza richiesta dal backlog (H1 row). |
| Estensioni schema fuori dal backlog | diff `specs/SPEC-0006-workflow-modeling.md` corrente vs ogni iterazione, escludendo H6/H7 | 0 | 0 (post workflow-modeling consolidato) | L'obiettivo ammette solo estensioni già nel backlog. Una nuova primitiva non-backlog è regressione strutturale. |
| Stati `forced fit lossy` nel design note | conteggio tag `forced` in `design/agent-orchestrator.fit.md` | 0 | 0 alla creazione del file | Forced fit = il modello tradisce il dominio. Va azzerato e mantenuto a zero. |

> **Nota di coerenza**: questi due ultimi gate erano signal nella v1 del file. Sono stati spostati nei gate perché hanno baseline al pavimento (0) e direzione ↓ — non possono segnalare progresso, solo regressione. Comportamento = gate, non signal. (Vedi feedback D3 per il prompt v3.)

## Metriche signal (progresso)

| Nome | Strumento | Direzione | Trend (assoluto/relativo/statistico) | Baseline | Legame con obiettivo |
|---|---|---|---|---|---|
| Stati classificati `clean fit` nel design note | conteggio tag `clean` in `design/agent-orchestrator.fit.md` | ↑ | `assoluto: delta >= 1` ogni iterazione finché esistono stati non-clean | TBD calibrata al run 1 | Ogni stato migrato da `adapted` a `clean` aumenta la fedeltà del modello al dominio. È l'unico vero signal di progresso di questo esperimento. |

## Condizioni di uscita del loop

- **Raggiunto**: tutti i gate verdi AND 100% degli stati dichiarati `clean fit` nel design note (con eventuali estensioni da backlog dichiarate esplicitamente).
- **Forfait per stallo**: 3 iterazioni consecutive senza progresso su `clean fit`, oppure ricomparsa di uno stato `forced fit` dopo essere già stato risolto.

      loop_guard:
        max_visits: 10
        max_duration: 2h
        on_visits_exhausted: forfait_no_progress

- **Forfait per budget**: 2 ore di sessione cumulata sull'esperimento.
- **Falsificazione**: il design note dichiara obbligatoria una **nuova primitiva strutturale non già prevista nel backlog di `agent-loop-fsm`** (cioè diversa da `loop_guard` H6 e `timeout` H7). L'aggiunta di una primitiva del backlog è considerata estensione attesa e non falsifica H1. L'aggiunta di un campo opzionale a una primitiva esistente non falsifica H1.

> **Nota di coerenza budget ↔ loop_guard**: una iterazione costa ≈ 10–15 minuti (vedi Contesto). Quindi `max_visits=10` × ≈12 min ≈ 2 ore, allineato a `max_duration=2h`. La v1 del file aveva `max_visits=10` con `max_duration=20min`: irrealistico (avrebbe richiesto 2 min per iterazione). Corretto in v2 del file.

## Acceptance

- Accettato il: 2026-05-30
- Accettato da: utente (Fabio Malpezzi) in sessione con agente di coding.
- Congelato fino a: chiusura di Esperimento 1 (H1) o supersedere esplicito tramite revisione documentata in `notes/`.
