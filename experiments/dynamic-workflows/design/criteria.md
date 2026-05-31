---
experiment: dynamic-workflows
ambito: 1
created: 2026-05-30
status: accepted
---

## Contesto

- **SUT**: lo schema FSM di POM (SPEC-0006) — stati, eventi, transizioni, guard, invarianti, `context_schema`, e le primitive di composizione `state-invoke` / `event-invoke` / `pipeline`. Studiamo la *capacità espressiva dello schema*, non un singolo workflow.
- **Sperimentatore**: alla partenza, utente + agente di coding in confronto (definizione dei criteri). Durante l'esecuzione, **agente di coding autonomo** che modella, implementa, esegue, classifica il fit e itera senza un ok per ogni passo. Al termine il valutatore indipendente avversariale riconsegna il verdetto; la decisione di promozione torna all'utente.
- **Iterazione**: un giro = una versione di un (sotto-)modello YAML del pattern, implementata nel runtime, eseguita su agenti stub deterministici a N parametrico, e classificata per fit.
- **Goal del SUT**: `n/a` (lo schema non ha un goal proprio). Il pattern Dynamic Workflow ha un goal — completare N task — ma è del workflow-bersaglio, ed è modellato ed eseguito in simulazione, non perseguito come fine dell'esperimento.

## Obiettivo

Il pattern Dynamic Workflow (fan-out dinamico a N task, pipeline per-task implementer → verifier → fixer, fork/join dei verifier, fan-in finale) è modellabile ed eseguibile come workflow POM con fit accettabile — clean o adapted — usando **solo le primitive attuali dello schema più design pattern appropriati, senza introdurre primitive strutturali nuove**.

L'esperimento cerca iterativamente, per ciascuna delle quattro strutture, la modellazione di fit migliore eseguendola in un runtime reale; per ogni `forced lossy` residuo stabilisce, tramite verifica avversariale, se è eliminabile con un design pattern sulle primitive attuali o se è **irriducibile** e richiede un'estensione, di cui stima il costo.

## Out of scope

- Gli **Agent Teams** (comunicazione peer-to-peer del pannello sinistro).
- La **semantica operativa del parallelismo** (scheduling, risorse, backpressure, gestione fallimenti a runtime) — dominio del runtime target. Resta DENTRO la sua *rappresentazione strutturale* (lo schema sa dire che due rami sono paralleli e convergono?).
- **Performance e scalabilità reali** alle centinaia di istanze: simuliamo a N parametrico piccolo e verifichiamo che la struttura regga a N arbitrario; non misuriamo throughput né latenza.

## Metriche gate (non-regressione)

| Nome | Strumento | Soglia | Baseline | Legame con obiettivo |
|---|---|---|---|---|
| Validator PASS | `node scripts/lint-workflows.mjs <model>` | 0 errori su ogni modello prodotto | n/a (binario) | un modello non valido non è una modellazione: senza questo il fit non è misurabile |
| Esecuzione senza crash | runtime su agenti stub a N parametrico | il runtime raggiunge il terminale producendo la struttura attesa (fan-out/join/fan-in osservati nel log) | n/a (binario) | "eseguibile" è metà dell'ipotesi: un modello che valida ma non gira non prova che lo schema pilota la struttura |

## Metriche signal (progresso)

| Nome | Strumento | Direzione | Trend | Baseline | Legame con obiettivo |
|---|---|---|---|---|---|
| Forced lossy residui (per struttura) | conteggio nel `.fit.md` dell'iterazione (Fit Auditor) | ↓ | assoluto: delta ≤ −1 per iterazione su una struttura, fino allo stallo | TBD calibrata al run 1 (prima modellazione di ciascuna struttura) | misura quanto la modellazione si avvicina al fit accettabile man mano che si cerca il design pattern: è il progresso verso l'ipotesi |

## Condizioni di uscita del loop

- **Raggiunto**: tutte e quattro le strutture in stallo (miglior fit raggiunto) E ogni `forced lossy` residuo ha un verdetto del valutatore (design pattern X che lo risolve, oppure estensione Y necessaria con costo). Deliverable completo.
- **Forfait per stallo**: una struttura non riduce i forced lossy per 3 iterazioni → chiusa come "miglior fit raggiunto", i forced residui passano al valutatore. (loop_guard manuale: stallo = 3 iterazioni per struttura)
- **Forfait per budget**: 32 iterazioni del loop OPPURE 60 minuti wall-clock, il primo che scatta → si restituisce il parziale al valutatore. (loop_guard manuale: max_visits = 32, max_duration = 60min)
- **Falsificazione**: l'ipotesi è falsa se almeno una delle quattro strutture ha un `forced lossy` che il valutatore avversariale dichiara **irriducibile** — nessun design pattern sulle primitive attuali lo evita senza tradire il dominio.
  - *Falsifica*: il fan-out dinamico a N runtime non è esprimibile con stati nominali statici + `state-invoke` + `pipeline`, e nessun pattern lo evita → serve una primitiva di fan-out dinamico.
  - *NON falsifica*: il fork/join dei due verifier è esprimibile con due `state-invoke` adattati che convergono su un fixer, senza primitiva nuova → `adapted`.

## Consistency Check

- **C-a budget vs loop_guard**: 32 iterazioni × ~2 min per giro (stima rivista con l'utente, ritmo agente non umano) ≈ 64 min ≈ 60 min (un'ora) → coerente; i due tetti sono allineati, lo stallo a 3 fa da rete.
- **C-b signal vs gate**: il signal (forced lossy residui) parte alto e scende; la baseline NON è al pavimento → misura progresso reale, non è un gate travestito.
- **C-c falsificazione vs backlog**: le primitive che potrebbero emergere (fan-out dinamico, fork/join, parallel-states) **non** sono nel backlog POM esistente (che contiene solo `loop_guard` H6 e `timeout` H7) → la loro necessità è una falsificazione legittima e il deliverable atteso, non un cortocircuito. Se invece emergesse il bisogno di `loop_guard`/`timeout` (già in backlog), quello sarebbe `adapted`, non falsificazione.
- **C-d obiettivo vs backlog originale**: esperimento nuovo, nessuna formulazione precedente da confrontare → niente irrigidimento silenzioso da segnalare.

## Acceptance

- Accettato il: 2026-05-30
- Accettato da: Fabio (POM maintainer)
- Budget congelato: max 32 iterazioni del loop, max 60 minuti wall-clock, stallo per-struttura a 3 iterazioni.
- Congelato fino a: chiusura esperimento o supersedere esplicito. Da qui l'esecuzione è autonoma; la decisione finale di promozione torna all'utente.
