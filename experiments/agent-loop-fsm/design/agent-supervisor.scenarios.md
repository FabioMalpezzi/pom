# Scenari di Test — `agent-supervisor.yaml`

**Workflow**: `agent_supervisor`  
**Sub-workflow invocato**: `agent_orchestrator_goal_lifecycle` (via `state-invoke` in `handling_goal`)  
**Terminali del supervisor**: `stopped`  
**Terminali del sub-workflow**: `done`, `failed`  

---

## Scenario 1: goal_completed_happy_path

**Descrizione**: Happy path completo. Un nuovo goal arriva, il sub-workflow goal-lifecycle lo porta a termine con successo (`done`), il supervisor acknowledge e torna in `idle`.

| Campo | Valore |
|---|---|
| **Stato iniziale** | `idle` |
| **Stato finale atteso** | `idle` (non terminale, ma punto di rientro per il prossimo goal) |
| **Context iniziale** | `{}` (nessun goal in corso) |
| **Context finale atteso** | `{}` (supervisor tornato idle, nessun contesto persistente dichiarato) |

### Sequenza eventi e transizioni

| # | Stato corrente | Evento esterno | Transizione | Side-effect / Note |
|---|---|---|---|---|
| 1 | `idle` | `new_goal` | `idle → handling_goal` | Invoca sub-workflow `agent_orchestrator_goal_lifecycle` |
| 2 | *(sub-workflow)* `receive_goal` | `goal_validated` | `receive_goal → planning` | Goal valido |
| 3 | *(sub-workflow)* `planning` | `plan_ready` | `planning → executing` | Piano generato |
| 4 | *(sub-workflow)* `executing` | `step_done` | `executing → reflecting` | Step eseguito con successo |
| 5 | *(sub-workflow)* `reflecting` | `goal_met` | `reflecting → done` | Sub-workflow termina con `done` |
| 6 | `handling_goal` | `goal_completed` | `handling_goal → acknowledging` | Dispatch su `on_completion[].terminal_state=done` |
| 7 | `acknowledging` | `ack_sent` | `acknowledging → idle` | Ack inviato, supervisor pronto |

### Assertioni

- Il sub-workflow termina nello stato `done`.
- Il supervisor raggiunge `acknowledging` dopo il dispatch.
- Il supervisor torna in `idle` dopo `ack_sent`.

---

## Scenario 2: goal_failed_goal_invalid

**Descrizione**: Il goal ricevuto è invalido; il sub-workflow termina subito con `failed`. Il supervisor escala e torna in `idle`.

| Campo | Valore |
|---|---|
| **Stato iniziale** | `idle` |
| **Stato finale atteso** | `idle` |
| **Context iniziale** | `{}` |

### Sequenza eventi e transizioni

| # | Stato corrente | Evento esterno | Transizione | Side-effect / Note |
|---|---|---|---|---|
| 1 | `idle` | `new_goal` | `idle → handling_goal` | Invoca sub-workflow |
| 2 | *(sub-workflow)* `receive_goal` | `goal_invalid` | `receive_goal → failed` | Goal malformato, sub-workflow termina con `failed` |
| 3 | `handling_goal` | `goal_failed` | `handling_goal → escalating` | Dispatch su `on_completion[].terminal_state=failed` |
| 4 | `escalating` | `escalation_sent` | `escalating → idle` | Escalation inviata, supervisor pronto |

### Assertioni

- Il sub-workflow termina nello stato `failed`.
- Il supervisor raggiunge `escalating` dopo il dispatch.
- Il supervisor torna in `idle` dopo `escalation_sent`.

---

## Scenario 3: goal_failed_plan_failed

**Descrizione**: Il goal è valido ma la pianificazione fallisce. Sub-workflow termina con `failed`, supervisor escala.

| Campo | Valore |
|---|---|
| **Stato iniziale** | `idle` |
| **Stato finale atteso** | `idle` |
| **Context iniziale** | `{}` |

### Sequenza eventi e transizioni

| # | Stato corrente | Evento esterno | Transizione | Side-effect / Note |
|---|---|---|---|---|
| 1 | `idle` | `new_goal` | `idle → handling_goal` | Invoca sub-workflow |
| 2 | *(sub-workflow)* `receive_goal` | `goal_validated` | `receive_goal → planning` | Goal valido |
| 3 | *(sub-workflow)* `planning` | `plan_failed` | `planning → failed` | Pianificazione impossibile, sub-workflow termina con `failed` |
| 4 | `handling_goal` | `goal_failed` | `handling_goal → escalating` | Dispatch su `failed` |
| 5 | `escalating` | `escalation_sent` | `escalating → idle` | Supervisor torna idle |

### Assertioni

- Il sub-workflow termina in `failed` dopo `plan_failed`.
- Il supervisor escala e torna in `idle`.

---

## Scenario 4: goal_failed_impossible_after_execution

**Descrizione**: Il goal viene pianificato ed eseguito, ma la reflection conclude che è impossibile. Sub-workflow termina con `failed`.

| Campo | Valore |
|---|---|
| **Stato iniziale** | `idle` |
| **Stato finale atteso** | `idle` |
| **Context iniziale** | `{}` |

### Sequenza eventi e transizioni

| # | Stato corrente | Evento esterno | Transizione | Side-effect / Note |
|---|---|---|---|---|
| 1 | `idle` | `new_goal` | `idle → handling_goal` | Invoca sub-workflow |
| 2 | *(sub-workflow)* `receive_goal` | `goal_validated` | `receive_goal → planning` | |
| 3 | *(sub-workflow)* `planning` | `plan_ready` | `planning → executing` | |
| 4 | *(sub-workflow)* `executing` | `step_done` | `executing → reflecting` | Step eseguito |
| 5 | *(sub-workflow)* `reflecting` | `impossible` | `reflecting → failed` | Reflection: goal irraggiungibile, sub-workflow termina con `failed` |
| 6 | `handling_goal` | `goal_failed` | `handling_goal → escalating` | |
| 7 | `escalating` | `escalation_sent` | `escalating → idle` | |

### Assertioni

- Il sub-workflow termina in `failed` dopo `impossible`.
- Il supervisor escala e torna in `idle`.

---

## Scenario 5: goal_completed_with_replan_loop

**Descrizione**: Il sub-workflow esegue un ciclo di replan (reflection → continue → planning) prima di concludere con successo. Verifica che il loop sia gestito correttamente dal supervisor (che rimane in `handling_goal` per tutta la durata).

| Campo | Valore |
|---|---|
| **Stato iniziale** | `idle` |
| **Stato finale atteso** | `idle` |
| **Context iniziale** | `{}` |

### Sequenza eventi e transizioni

| # | Stato corrente | Evento esterno | Transizione | Side-effect / Note |
|---|---|---|---|---|
| 1 | `idle` | `new_goal` | `idle → handling_goal` | Invoca sub-workflow |
| 2 | *(sub-workflow)* `receive_goal` | `goal_validated` | `receive_goal → planning` | |
| 3 | *(sub-workflow)* `planning` | `plan_ready` | `planning → executing` | |
| 4 | *(sub-workflow)* `executing` | `step_error` | `executing → reflecting` | Step con errore |
| 5 | *(sub-workflow)* `reflecting` | `continue` | `reflecting → planning` | **Replan**: reflection decide di riprovare |
| 6 | *(sub-workflow)* `planning` | `plan_ready` | `planning → executing` | Nuovo piano generato |
| 7 | *(sub-workflow)* `executing` | `step_done` | `executing → reflecting` | Step eseguito con successo |
| 8 | *(sub-workflow)* `reflecting` | `goal_met` | `reflecting → done` | Goal raggiunto, sub-workflow termina con `done` |
| 9 | `handling_goal` | `goal_completed` | `handling_goal → acknowledging` | |
| 10 | `acknowledging` | `ack_sent` | `acknowledging → idle` | |

### Assertioni

- Il sub-workflow attraversa il ciclo `reflecting → continue → planning` almeno una volta.
- Il supervisor rimane in `handling_goal` per tutta la durata del sub-workflow (invoke sincrono).
- Il supervisor raggiunge `acknowledging` solo dopo che il sub-workflow termina con `done`.

---

## Scenario 6: goal_failed_with_replan_loop_then_impossible

**Descrizione**: Il sub-workflow esegue un replan dopo un errore, ma al secondo tentativo la reflection conclude che il goal è impossibile. Verifica che il loop possa terminare anche in fallimento.

| Campo | Valore |
|---|---|
| **Stato iniziale** | `idle` |
| **Stato finale atteso** | `idle` |
| **Context iniziale** | `{}` |

### Sequenza eventi e transizioni

| # | Stato corrente | Evento esterno | Transizione | Side-effect / Note |
|---|---|---|---|---|
| 1 | `idle` | `new_goal` | `idle → handling_goal` | Invoca sub-workflow |
| 2 | *(sub-workflow)* `receive_goal` | `goal_validated` | `receive_goal → planning` | |
| 3 | *(sub-workflow)* `planning` | `plan_ready` | `planning → executing` | |
| 4 | *(sub-workflow)* `executing` | `step_error` | `executing → reflecting` | Errore |
| 5 | *(sub-workflow)* `reflecting` | `continue` | `reflecting → planning` | Replan |
| 6 | *(sub-workflow)* `planning` | `plan_ready` | `planning → executing` | |
| 7 | *(sub-workflow)* `executing` | `step_done` | `executing → reflecting` | Step ok ma... |
| 8 | *(sub-workflow)* `reflecting` | `impossible` | `reflecting → failed` | ...reflection conclude impossibile, sub-workflow termina con `failed` |
| 9 | `handling_goal` | `goal_failed` | `handling_goal → escalating` | |
| 10 | `escalating` | `escalation_sent` | `escalating → idle` | |

### Assertioni

- Il sub-workflow attraversa il ciclo `continue → planning` almeno una volta.
- Il sub-workflow termina in `failed` dopo `impossible`.
- Il supervisor escala e torna in `idle`.

---

## Scenario 7: supervisor_stopped

**Descrizione**: Il supervisor riceve il segnale `stop` mentre è in `idle` e raggiunge il terminale `stopped`. Copre l'unico terminale dichiarato del supervisor.

| Campo | Valore |
|---|---|
| **Stato iniziale** | `idle` |
| **Stato finale atteso** | `stopped` (terminale) |
| **Context iniziale** | `{}` |
| **Context finale atteso** | `{}` |

### Sequenza eventi e transizioni

| # | Stato corrente | Evento esterno | Transizione | Side-effect / Note |
|---|---|---|---|---|
| 1 | `idle` | `stop` | `idle → stopped` | Supervisor fermato, nessun ulteriore evento gestibile |

### Assertioni

- Il supervisor si trova nello stato terminale `stopped`.
- L'invariante "The supervisor cannot transition out of stopped" è rispettato (nessuna transizione uscente da `stopped`).

---

## Riepilogo copertura

| Terminale / Stato di rientro | Scenario/i | Coperto |
|---|---|---|
| `stopped` (supervisor terminale) | #7 | ✅ |
| `idle` via `acknowledging` (sub-workflow `done`) | #1, #5 | ✅ |
| `idle` via `escalating` (sub-workflow `failed`) | #2, #3, #4, #6 | ✅ |
| Sub-workflow `done` | #1, #5 | ✅ |
| Sub-workflow `failed` (da `goal_invalid`) | #2 | ✅ |
| Sub-workflow `failed` (da `plan_failed`) | #3 | ✅ |
| Sub-workflow `failed` (da `impossible`) | #4, #6 | ✅ |
| Loop `continue → planning` nel sub-workflow | #5, #6 | ✅ |
