# Workflow examples — loop/goal pattern family

Esempi canonici di workflow POM per il pattern **loop/goal** (agenti che iterano `percepire → ragionare → agire → osservare` verso un obiettivo, eventualmente con retry bounded e composizione via sub-workflow). Distinti dagli altri esempi di `templates/examples/workflow/` perché modellano **pattern strutturali agentici**, non workflow di dominio.

## Quando usarli

- Quando un agente AI (o un controllore agent-shaped) deve essere modellato come FSM in un progetto target.
- Come riferimento per la skill `loop-goal` (oggi `experiments/agent-loop-fsm/skills-candidate/loop-goal.md`, candidate alla promozione canonica).
- Come fixture per testare validator, generatore Mermaid, generatore XState, e runtime POM.

Per workflow di dominio classici (ticket lifecycle, document approval, spec evolution, ecc.), vedi gli esempi nella cartella padre `templates/examples/workflow/`.

## Catalogo

| File | Pattern | Caratteristiche strutturali | Riferimento |
|---|---|---|---|
| `agent-orchestrator.yaml` | ReAct minimal (Yao et al., 2022) | 6 stati, 7 transizioni, loop edge `observing → reasoning`, 2 terminali (`done`, `failed`). Pattern compatto con tre stati attivi `reasoning / acting / observing`. | Esperimento `agent-loop-fsm` H1 iter 1 |
| `agent-orchestrator-goal-lifecycle.yaml` | Goal Lifecycle (Plan-and-Solve, Reflexion) | 6 stati, 9 transizioni, replan loop `reflecting → planning`, due eventi convergenti sullo stesso target (`step_done`/`step_error` → `reflecting`). Più ricco di ReAct: separa pianificazione da esecuzione. | Esperimento `agent-loop-fsm` H1 iter 2 |
| `agent-loop-table.yaml` | SPAO (Perception → Planning → Action → Observation) | 6 stati, 7 transizioni, transition table piatta. Niente `invoke`, niente composizione, una sola superficie. | Esperimento `agent-loop-fsm` H2 |
| `agent-retry-bounded.yaml` | Bounded retry via self-transition guarded | 5 stati, 5 transizioni (incluso 1 self), 2 guard mutuamente esclusivi (`has_attempts_left`, `no_attempts_left`). Counter nel `context`; H6 `loop_guard` lo renderebbe dichiarativo. | Esperimento `agent-loop-fsm` H3 |
| `agent-supervisor.yaml` | Supervisor + sub-workflow autonomo | 5 stati, 6 transizioni, 1 `state-invoke` su `agent-orchestrator-goal-lifecycle.yaml` con `on_completion` per dispatch sui terminali. Composizione sincrona a due livelli. | Esperimento `agent-loop-fsm` H4 |
| `agent-iteration-record.yaml` | Iteration Record + verifica bounded | 8 stati, 9 transizioni, `loop_guard.max_visits: 50`, verifica con evidenza prima della decisione e fallimento esplicito se il record non è disponibile. | Self-test dell’estensione Iteration Record |

## Verifica

Tutti i workflow validano con `pom:workflow:lint` (0 errori, 0 warning) e generano Mermaid parsabile via `pom:workflow:mermaid` + `mmdc`. Tre di essi (`agent-orchestrator`, `agent-orchestrator-goal-lifecycle`, `agent-supervisor`) compilano correttamente in XState v5 via `pom:workflow:xstate`.

## Provenance

Modellati durante l'esperimento `agent-loop-fsm` (vedi `experiments/agent-loop-fsm/EXPERIMENT.md` per il contesto e `experiments/agent-loop-fsm/RESULTS.md` per i risultati di H1–H5, tutte confermate al 100% clean fit). Promossi a `templates/examples/workflow/loop-goal/` il 2026-05-30, in anticipo rispetto alla chiusura dell'esperimento, perché i pattern strutturali hanno valore generale separabile dalla skill candidata che li adotta.

Per ogni workflow esiste un design note di classificazione fit in `experiments/agent-loop-fsm/design/<name>.fit.md`. Per `agent-loop-table.yaml` e `agent-supervisor.yaml` esiste anche un fit.md generato automaticamente (`*-auto.fit.md`) e per `agent-supervisor.yaml` un set di scenari di test generato automaticamente (`agent-supervisor.scenarios.md`) — entrambi prodotti dal runtime esterno in `experiments/agent-loop-fsm/runtime-candidate/`.
