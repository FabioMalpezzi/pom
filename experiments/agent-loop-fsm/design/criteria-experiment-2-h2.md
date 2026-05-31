---
experiment: agent-loop-fsm
ambito: 1
hypothesis: H2
created: 2026-05-30
status: accepted
---

## Contesto

- **SUT**: `templates/examples/workflow/loop-goal/agent-loop-table.yaml` (loop perception → planning → action → observation espresso come transition table piatta).
- **Sperimentatore**: utente + agente di coding in sessione.
- **Iterazione**: una versione del file YAML committata + lint + mermaid.
- **Goal del SUT**: n/a (modellato, non eseguito).

## Obiettivo

Rappresentare il loop decisionale `perception → planning → action → observation` come transition table POM piatta (senza `invoke` né sub-workflow), mantenendo leggibilità del modello e verificabilità tramite validator.

## Out of scope

- esecuzione runtime;
- bound al numero di cicli (H6);
- retry bounded (H3);
- suspend/restore (H5).

## Metriche gate

| Nome | Strumento | Soglia | Baseline | Legame con obiettivo |
|---|---|---|---|---|
| Validator pass | `npm run pom:workflow:lint` | 0 errori | n/a (file da creare) | Senza pass del validator la transition table non è verificabile. |
| Mermaid generato + parsabile | `to-mermaid.mjs` + `mmdc` | file parsa | n/a | Diagramma leggibile è l'evidence richiesta dal backlog. |
| Nessuna primitiva `invoke` usata | grep `invoke:` su YAML | 0 occorrenze | 0 | "Transition table piatta" esclude composizione. |
| Stati raggiungibili | warning W001 del validator | 0 warning | 0 | Ogni stato deve essere parte del flusso (chiarezza). |

## Metriche signal

| Nome | Strumento | Direzione | Trend | Baseline | Legame con obiettivo |
|---|---|---|---|---|---|
| Stati `clean fit` nel design note | conteggio `clean` in `design/agent-loop-table.fit.md` | ↑ | `assoluto: delta >= 1` finché non clean = 0 | TBD iter 1 | Misura diretta di "assenza di forzature concettuali". |

## Condizioni di uscita del loop

- **Raggiunto**: tutti i gate verdi AND 100% degli stati `clean fit`.
- **Forfait per stallo**: 3 iter senza progresso clean fit.

      loop_guard:
        max_visits: 5
        max_duration: 1h
        on_visits_exhausted: forfait_no_progress

- **Forfait per budget**: 1h cumulata.
- **Falsificazione**: il loop `perception → planning → action → observation` non è modellabile come transition table piatta senza ricorrere a `invoke` o a un sub-workflow.

## Acceptance

- Accettato il: 2026-05-30
- Accettato da: utente in sessione con agente di coding (modalità autonoma, "procedi sino alla fine").
