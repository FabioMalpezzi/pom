---
experiment: agent-loop-fsm
hypothesis: H2
artifact: agent-loop-table.yaml
iteration: 1
date: 2026-05-30
pattern: "Perception-Planning-Action-Observation (flat transition table)"
---

# Fit classification — agent_loop_table (auto)

## States (6)

| State | Fit | Note |
|---|---|---|
| `perception` | **clean fit** | Mappa direttamente alla primitiva `states`: stato nominale non-finale con descrizione di sensing. Nessun compromesso. |
| `planning` | **clean fit** | Mappa direttamente alla primitiva `states`: stato nominale non-finale per ragionamento. Nessun compromesso. |
| `action` | **clean fit** | Mappa direttamente alla primitiva `states`: stato nominale non-finale per esecuzione. Nessun compromesso. |
| `observation` | **clean fit** | Mappa direttamente alla primitiva `states`: stato nominale non-finale per ispezione del risultato. Nessun compromesso. |
| `done` | **clean fit** | Mappa direttamente alla primitiva `states` con `is_final: true`. Stato terminale di successo. Nessun compromesso. |
| `failed` | **clean fit** | Mappa direttamente alla primitiva `states` con `is_final: true`. Stato terminale di fallimento. Nessun compromesso. |

## Transitions (7)

| Transition | Fit | Note |
|---|---|---|
| `perception → planning` (event: `sensed`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco nominale da uno stato non-finale a un altro su evento `sensed`. Nessun compromesso. |
| `perception → failed` (event: `perception_failed`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco nominale verso stato terminale su evento di errore. Nessun compromesso. |
| `planning → action` (event: `plan_ready`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco nominale da planning ad action. Nessun compromesso. |
| `action → observation` (event: `action_done`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco nominale da action a observation. Nessun compromesso. |
| `action → failed` (event: `action_failed`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco nominale verso stato terminale su errore di azione. Nessun compromesso. |
| `observation → perception` (event: `observed`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco di loop back. Nessun compromesso. Nota: è l'unico arco ciclico, come da invariante. |
| `observation → done` (event: `goal_met`) | **clean fit** | Mappa direttamente alla primitiva `transitions`: arco nominale verso stato terminale di successo. Nessun compromesso. |

**Conteggio:** 6/6 stati clean fit · 7/7 transizioni clean fit

## Gate results

| Check | Result |
|---|---|
| Linter errors | 0 |
| Linter warnings | 0 |
| Verdict | **PASS** |

Il workflow supera il validator POM senza errori né warning.

## Verdict

**Clean fit.** L'intero workflow — 6 stati, 7 transizioni, 7 eventi, 3 invarianti — mappa direttamente e senza distorsioni alle primitive POM `states`, `events`, `transitions` e `invariants`. Non viene utilizzata alcuna primitiva compositiva (`state-invoke`, `event-invoke`, `pipeline`, `self-transition`, `guards`), e la scelta è deliberata: l'ipotesi H2 del test è che il loop agente sia esprimibile su una singola superficie tabellare senza forzare decomposizione. Il risultato conferma che il workflow schema POM supporta nativamente questo pattern con fit pulito al 100%.
