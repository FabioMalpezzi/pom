# ADR-0003 — `workflow` generico vs `loop-goal` come skill separata

| Field | Value |
|---|---|
| Date | 2026-05-30 |
| Status | Accepted |
| Area | workflow modeling / method |
| Supersedes | n/a |

## Decision

`loop-goal` è una **skill canonica separata** da `workflow`, non un modo della skill `workflow` generica.

- **`workflow`** (skill esistente): modella workflow di *dominio* a struttura nota — ticket lifecycle, document approval, spec evolution. Modi: `design` / `validate` / `diagram` / `implement`.
- **`loop-goal`** (nuova skill canonica): modella il sotto-tipo *agentico* loop/goal — un agente (o controller a forma di agente) che itera verso un goal (percezione → decisione → azione → osservazione), con bounded retry, replan, stato sospendibile, goal lifecycle separabile. Modi aggiuntivi che `workflow` non ha: `define-criteria`, `audit` (fit clean/adapted/forced + conformità ai criteri), `scenarios` (copertura dei terminali), `conclude` (valutazione indipendente avversariale).

I due **compongono**: un workflow loop/goal è pur sempre un workflow POM, validato dallo stesso `pom:workflow:lint`; `loop-goal` riusa `design`/`validate`/`diagram`/`implement` di `workflow` e vi aggiunge la propria disciplina.

## Quando usare quale

| Usa `workflow` se… | Usa `loop-goal` se… |
|---|---|
| la struttura è nota e di dominio (stati di business) | l'agente prende decisioni e può iterare verso un goal |
| non c'è un ciclo decisionale né retry/replan | c'è bounded retry, replan, suspend/restore, o un goal lifecycle |
| non è oggetto di un esperimento con ipotesi misurabile | il workflow è oggetto di un esperimento POM con criteri gate/signal congelati e valutazione avversariale |

In dubbio: `workflow`. La disciplina di `loop-goal` (criteri → model → audit → scenarios → conclude, fit vs conformità, primitive di backlog come "estensioni attese", ciclo a quattro agenti con valutatore indipendente) è preziosa per gli esperimenti agentici ma **troppo pesante** per un workflow di dominio semplice: imporla ovunque appesantirebbe `workflow` senza guadagno.

## Rationale

Separare evita due errori opposti: gonfiare `workflow` con un apparato che la maggior parte dei workflow di dominio non usa, e diluire la disciplina di `loop-goal` rendendola un modo opzionale facile da ignorare. La distinzione **fit (forma) vs conformità (rispetto ai criteri)** e l'ordine non negoziabile **criteri prima del modello** vivono solo in `loop-goal` e ne giustificano l'esistenza autonoma.

## Provenance

Decisione emersa e validata nell'esperimento `experiments/agent-loop-fsm/` (chiuso 2026-05-30) e collaudata sul campo in `experiments/dynamic-workflows/`. Prerequisito dichiarato alla promozione della skill `loop-goal` a canonica.
