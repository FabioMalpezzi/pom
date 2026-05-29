# Critical review della spec `loop_guard` (H6)

| Campo | Valore |
|---|---|
| Data | 2026-05-30 |
| Autore | POM maintainer (review disciplinata richiesta esplicitamente) |
| Soggetto | H6 — Loop bounded come primitiva di schema |
| Commit di riferimento al momento della review | `81876f7` (spec H6 con omission-based bounds e quattro casi YAML) |
| Esito immediato | Quattro criticità materiali risolte in `82e63cd`; le criticità minori e le decisioni aperte restano per `exp/schema-loop-guard-timeout` |

Questa nota raccoglie il ragionamento dell'analisi critica condotta sulla spec di `loop_guard` al momento in cui era ferma a `81876f7`. Serve come traccia storica per chi aprirà l'esperimento parallelo `exp/schema-loop-guard-timeout` per SPEC-0007: rende esplicito *perché* certe decisioni sono state prese in un modo invece che in un altro.

## Cosa è stato analizzato

Lo stato di H6 alla revisione: cinque chiavi nel `loop_guard` (due bound opzionali combinabili `max_visits` e `max_duration`, più `on_exhaustion` obbligatorio), regola omission-based per le bound, formato compatto del tempo `<N><unit>` con `unit ∈ {s, m, h, d}` o ISO 8601, semantica del tempo cumulativa, almeno una bound obbligatoria per evitare guard inerti.

## Punti di forza confermati

**F1 — Omission-based vs sentinelle.** YAML-idiomatic, niente convenzioni speciali da imparare, niente collisione tra valori validi e marker. Estensione futura additiva (aggiungere `max_tokens` non rompe nulla). Decisione robusta, non rivedere.

**F2 — `on_exhaustion` obbligatorio.** Forza dichiarazione esplicita del comportamento all'esaurimento. Coerente con la disciplina POM "niente regole inventate dall'agente".

**F3 — Separazione H6 (loop) vs H7 (state).** Due primitive distinte per due domande diverse, con esempio combinato che dimostra la coesistenza senza overlap. Evita il pattern monolitico di XState (`after:` che fa entrambe le cose).

**F4 — Coerenza coi 4 pilastri POM.** Il bound vive in YAML, l'enforcement vive nel target code. POM resta senza runtime. I counter vivono in `context`, suspend/restore-friendly per costruzione.

## Criticità materiali (risolte in `82e63cd`)

**C1 — Ambiguità del suffisso `m`.** In molti linguaggi `m` significa millisecondi, non minuti. Il formato compatto `30m` rischia letture divergenti tra developer abituati a JavaScript (`setTimeout(30)`), Go (`time.Duration` minuti), shell (variabili). Decisione presa: vietare `m` da solo; il suffisso canonico per minuti è `min`. Set definitivo `{s, min, h, d}`. ISO 8601 accettato come alternativa non ambigua.

**C2 — Semantica del reset dopo uscita-rientro.** "Dall'ingresso iniziale" non distingueva tra "prima visita assoluta del loop" e "ingresso nell'attuale ciclo". Decisione presa: per-entry reset. I counter (`visit_count`, `cumulative_duration`) si resettano a ogni transizione che arriva nel loop *da un altro stato*; si accumulano sulle self-transition interne. Coerente con l'intuizione "budget per esecuzione del loop".

**C3 — Snapshot/restore del bound temporale.** Per `max_visits` il counter è un intero in `context`, ovvio. Per `max_duration` mancava la specifica del timestamp di partenza e della semantica wall-clock vs active-process time. Decisione presa: counter persistiti in `context` sotto nomi convenzionali con prefisso `_loop_guard_<state>__`; tempo misurato come wall-clock (un agente sospeso 7 giorni con `max_duration: 30min` ha esaurito il bound al restore). Coerente col caso d'uso "non bloccare l'utente oltre X".

**C4 — `on_exhaustion` univoco mescola due cause.** Con una sola chiave, l'agente non poteva differenziare "esauriti tentativi" da "scaduto tempo". Decisione presa: fallback condiviso + override per causa. `on_exhaustion` resta obbligatorio come fallback; `on_visits_exhausted` e `on_duration_exhausted` sono override opzionali con precedenza sul fallback per la loro causa. Combinazione "override su dimensione non dichiarata" → Warning del validator (non Error: non rompe nulla a runtime).

## Criticità minori (non risolte qui, da affrontare in `exp/schema-loop-guard-timeout`)

**M1 — `max_visits: 1` semanticamente degenere.** Un loop che gira al massimo una volta è un non-loop. Ammettere ma con Warning del validator, oppure imporre `≥ 2`. Da decidere all'apertura dell'esperimento parallelo.

**M2 — Definizione di "visit" ambigua per stati con ingressi multipli.** Una visit comincia ad ogni transizione che porta nello stato, oppure solo all'ingresso "da fuori" se ci sono self-transition? Risolto implicitamente dalla decisione C2 (per-entry reset distingue i due casi), ma va scritto in modo netto nella SPEC-0007.

**M3 — Mapping XState non banale per la combinazione count + time.** XState ha `after:` per il tempo e i guard sui counter per il count. Combinarli su una self-transition richiede `after: { Xms: { target, guard: 'visitsBelowMax' } }` + counter assignment. Il transformer `to-xstate.mjs` dovrà essere esteso e testato. Fattibile ma non immediato.

**M4 — Interazione con `re_entry_allowed`.** Uno stato terminale con `re_entry_allowed: true` può avere `loop_guard`? Concettualmente no (terminale ≠ loop), ma il validator non lo proibisce esplicitamente. Da fissare come regola E-level nella SPEC-0007.

**M5 — Side effect all'esaurimento.** Quando `on_exhaustion` (o un override) scatta, ci sono notifiche, log, metriche da emettere? Vivono come entry-action del target o come transition action. Coerente con il modello, ma da menzionare nella guida implementativa.

## Decisioni aperte / dimensioni non considerate

**A1 — Bound LLM-specific.** Per workflow agentici reali, le dimensioni di interesse spesso includono `max_tokens`, `max_cost_usd`, `max_tool_calls`. Lo schema attuale è chiuso a 2 dimensioni core. Soluzione possibile: meccanismo di estensione `loop_guard.custom: { metric_name: limit }` per metriche target-specific, valutate dal target code. Da valutare in `exp/schema-loop-guard-timeout`.

**A2 — Idle time vs cumulative time.** `max_duration` cumula. Ma il caso "se non c'è progresso per N minuti, esci" è diverso ed è frequente nei loop di planning. Sarebbe un'altra dimensione (`max_idle_duration`). Per ora fuori scope.

**A3 — Naming "exhaustion" parziale per il tempo.** Per il count "esaurimento" è naturale; per il tempo "scadenza" sarebbe più preciso. Decisione attuale: tenere il termine `exhaustion` unico per coerenza, ma rivedere se gli utenti lo trovano confuso.

## Verdetto e impatto

La spec di `loop_guard` era **strutturalmente solida** (F1–F4) ma **incompleta sui dettagli runtime-rilevanti** (C1–C4). Senza decisione esplicita su C1–C4, due implementazioni indipendenti del target code avrebbero interpretato la stessa YAML in modi divergenti — esattamente il drift che POM vuole prevenire.

Le quattro criticità materiali sono state chiuse in `82e63cd` direttamente nell'H6 dell'EXPERIMENT.md. Le criticità minori M1–M5 e le decisioni aperte A1–A3 restano da affrontare al momento di redigere la SPEC-0007 nell'esperimento parallelo `exp/schema-loop-guard-timeout` (task #63).

## Cosa portare in `exp/schema-loop-guard-timeout`

Quando si aprirà quell'esperimento:

1. Importare la spec di H6 come è oggi (post `82e63cd`) come baseline.
2. Aprire ipotesi separate per M1–M5 e A1–A3 nel backlog di quell'esperimento.
3. Estendere `lint-workflows.mjs` con le regole Error/Warning per `loop_guard` (riferimenti: prefisso convenzionale `_loop_guard_`, override su dimensione assente come Warning, almeno una bound presente come Error).
4. Estendere `to-xstate.mjs` per mappare il `loop_guard` su XState v5 (`after:` + guard sul counter).
5. Modellare almeno due esempi reali (analyzer-fsm Syntonia con bound combinato, agent planning loop) come evidenza della primitiva.
