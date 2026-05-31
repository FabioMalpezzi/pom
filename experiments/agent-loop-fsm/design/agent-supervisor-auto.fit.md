---
experiment: agent-loop-fsm
hypothesis: H4
artifact: agent-supervisor.yaml
iteration: 1
date: 2026-05-30
pattern: Supervisor with goal-lifecycle as autonomous sub-workflow
---

# Fit classification — agent_supervisor (auto)

## States (5)

| State | Fit | Note |
|---|---|---|
| `idle` | **clean fit** | Mappa direttamente alla primitiva `states`: stato nominale non-finale in attesa di un nuovo goal. Nessuna distorsione semantica. |
| `handling_goal` | **clean fit** | Mappa direttamente alla primitiva `state-invoke`: stato non-finale con blocco `invoke.workflow` e `invoke.on_completion[]` per dispatch su terminal states del sub-workflow. Il pattern è esattamente quello previsto dalla primitiva. |
| `acknowledging` | **clean fit** | Mappa direttamente alla primitiva `states`: stato nominale non-finale per notifica di completamento. Nessuna distorsione. |
| `escalating` | **clean fit** | Mappa direttamente alla primitiva `states`: stato nominale non-finale per escalation su fallimento. Nessuna distorsione. |
| `stopped` | **clean fit** | Mappa direttamente alla primitiva `states` con `is_final: true`: stato terminale canonico. Nessuna distorsione. |

## Transitions (6)

| Transition | Fit | Note |
|---|---|---|
| `idle → handling_goal` (on `new_goal`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco semplice da stato non-finale a stato non-finale, triggerato da evento nominale. Nessuna guardia, nessuna distorsione. |
| `handling_goal → acknowledging` (on `goal_completed`) | **clean fit** | Mappa direttamente alla primitiva `state-invoke.on_completion[]`: dispatch su terminal state `done` del sub-workwork invocato. Il campo `next_event: goal_completed` è la meccanica canonica della primitiva. |
| `handling_goal → escalating` (on `goal_failed`) | **clean fit** | Mappa direttamente alla primitiva `state-invoke.on_completion[]`: dispatch su terminal state `failed` del sub-workflow invocato. Stessa meccanica canonica. |
| `acknowledging → idle` (on `ack_sent`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco semplice di ritorno allo stato iniziale. Nessuna distorsione. |
| `escalating → idle` (on `escalation_sent`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco semplice di ritorno allo stato iniziale. Nessuna distorsione. |
| `idle → stopped` (on `stop`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco semplice verso stato terminale. Nessuna distorsione. |

**Conteggio**: 5/5 stati clean fit · 6/6 transizioni clean fit

## Gate results

| Check | Esito |
|---|---|
| Linter (lint-workflows.mjs) | **PASS** — 0 errori, 0 warning |

Il workflow supera il validator senza alcuna segnalazione.

## Verdict

**Clean fit completo.** Ogni stato e ogni transizione mappa direttamente a una primitiva POM canonica senza necessità di adattamenti o distorsioni semantiche. Il pattern `state-invoke` è utilizzato esattamente come previsto dalla specifica (v0.2.0), con dispatch su due terminal states del sub-workflow. Il workflow è un esempio di supervisor autonomo che soddisfa pienamente il modello POM.
