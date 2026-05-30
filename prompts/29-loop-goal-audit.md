# Prompt — Audit fit di un workflow loop/goal

Versione: v1 (2026-05-30).
Stato: **canonico** (promosso da `agent-loop-fsm` il 2026-05-30).

Scopo: guidare un agente di codifica (Claude Code, Cursor, qualunque altro) ad eseguire l'audit fit di un workflow POM di tipo loop/goal. L'output è un file `<name>.fit.md` che classifica ogni stato e ogni transizione come `clean fit`, `adapted fit` o `forced lossy`, con motivazione domain-level.

L'agente di codifica usa **i propri tool nativi** (Read, Bash, Write) — non serve runtime LLM esterno né chiave API aggiuntiva. È esattamente lo stesso lavoro che il runtime esterno (`runtime-candidate/workflow-fit-auditor.ts`) automatizza con un LLM separato, ma fatto con la connessione dell'agente di codifica già attiva.

```text
Esegui l'audit fit del workflow POM al path <WORKFLOW_PATH>.

Prima di iniziare:
1. leggi `pom.config.json` e conferma che `workflows.enabled: true`. Se non lo è, ferma e instrada a `skills/config.md`.
2. leggi questo prompt + `experiments/agent-loop-fsm/skills-candidate/loop-goal.md`.
3. leggi il file workflow indicato (`Read` tool).
4. esegui il validator con `Bash`: `node scripts/lint-workflows.mjs <WORKFLOW_PATH>` — registra il verdetto (PASS/FAIL) e le eventuali entry Error/Warning.
5. se il workflow contiene `state-invoke` o `event-invoke`, leggi ANCHE ogni sub-workflow referenziato (il path nell'`invoke.workflow` è relativo al file caller). Questo è il passo che distingue un audit di forma da un audit di integrità della composizione.
6. **cerca il file di criteri** associato. Per convenzione vive in `design/criteria-experiment-<N>-<HID>.md` nella stessa cartella dell'esperimento; in alternativa cerca con `Bash`: `find <experiment-dir>/design -name "criteria-*.md"`. Se esiste un solo file di criteri o uno che cita esplicitamente questo workflow, leggilo. Se ne esistono più, chiedi all'utente quale è quello rilevante per questo workflow. Se non esiste alcun file di criteri, segnala chiaramente nell'output che l'audit di conformità non può essere eseguito e procedi solo con la classificazione fit.

Procedi con la classificazione:

## Primitive POM note (riferimento per classificare)

- **states**: stati nominali, opzionalmente `is_final` o `re_entry_allowed`.
- **events**: nomi degli eventi che triggrano transizioni.
- **transitions**: archi `{from, to, event, guard?}`.
- **guards**: predicati nominali referenziati dalle transizioni.
- **invariants**: regole testuali.
- **context_schema**: schema documental del context.
- **state-invoke**: invocazione sincrona di sub-workflow da uno stato (`state.invoke: {workflow, on_completion[]}`).
- **event-invoke**: invocazione sincrona da una transizione (`transition.invoke`).
- **pipeline**: sequenza lineare di workflow autonomi.
- **self-transition**: `from == to`, tipicamente con un guard (retry, loop locale).

Backlog primitive dell'esperimento `agent-loop-fsm` (ammesse come **estensioni attese**, NON falsificazioni):
- **H6 `loop_guard`**: bound a un loop per numero di visite (`max_visits`) e/o durata (`max_duration`).
- **H7 `timeout`**: bound di permanenza in uno stato non-loop.

Un workflow che richiede H6 o H7 NON è "outside POM" — è in attesa che la primitiva sia promossa. Va classificato come `adapted fit` (con context counter + guard) e annotato che H6/H7 lo renderebbero dichiarativo.

Una primitiva strutturale **non in backlog** (es. parallel-states, async transitions, fork/join) richiesta dal workflow rende il fit `forced lossy` o `adapted con grossa nota` — segnala chiaramente.

## Definizioni di fit

- **clean fit**: mappa direttamente a una primitiva POM, senza riformulazione.
- **adapted fit**: usa la primitiva con una piccola riformulazione documentata (split, merge, rename, context counter al posto di una primitiva attesa nel backlog).
- **forced lossy**: la primitiva distorce il significato di dominio. Il modello tradisce il workflow.

## Struttura del file `<name>.fit.md` da produrre

    ---
    experiment: <topic>
    hypothesis: <Hx, se applicabile>
    artifact: <relative path al .yaml>
    iteration: 1
    date: <YYYY-MM-DD>
    pattern: <breve descrizione del pattern modellato>
    ---

    # Fit classification — <workflow name>

    ## States (N)

    | State | Fit | Note |
    |---|---|---|
    | ... | clean fit / adapted / forced | motivazione domain-level (1 frase) |

    ## Transitions (N)

    | Transition | Fit | Note |
    |---|---|---|
    | <from> → <to> (event: <e>, guard: <g>?) | ... | ... |

    **Conteggio**: N1/N stati clean fit · N2/N transizioni clean fit

    ## Gate results

    | Check | Result |
    |---|---|
    | Validator (`pom:workflow:lint`) | PASS / FAIL — <count> errors, <count> warnings |
    | Sub-workflow valido (se composizione) | PASS / FAIL — uno per ogni sub |
    | Estensioni backlog dichiarate | lista (H6 loop_guard, H7 timeout, ...) o "nessuna" |

    ## Conformity check (vs criteria)

    Se hai trovato un file di criteri associato al workflow, qui devi verificare punto per punto la conformità.

    | Criterio (dal `criteria.md`) | Atteso | Verificato nel workflow? | Note |
    |---|---|---|---|
    | Obiettivo | <una frase dal criteria> | sì / parziale / no | come il workflow lo realizza, o cosa manca |
    | Gate: <nome> | <soglia> | sì / parziale / no | quale elemento del workflow lo supporta |
    | Signal: <nome> | <trend, baseline> | sì / parziale / no | idem |
    | Out of scope: <voce> | non modellato | conferma / violazione | il workflow rispetta lo scope o lo eccede? |
    | Condizione di uscita: raggiunto | <criterio> | sì / no | quale terminale del workflow corrisponde |
    | Condizione di uscita: forfait per stallo | <es. loop_guard max_visits=N> | sì / parziale / no | come il workflow esprime il bound |
    | Condizione di uscita: forfait per budget | <es. max_duration=T> | sì / parziale / no | idem |
    | Falsificazione | <evento osservabile> | il workflow espone quell'osservabile? | sì / no |

    Se il file di criteri non esiste o non è applicabile, scrivi qui: "Conformity check non eseguito: nessun `criteria.md` trovato per questo workflow." e ferma.

    Se la conformità è "no" o "parziale" su uno qualunque dei gate o delle condizioni di uscita, **il verdetto complessivo NON può essere "clean fit"** — anche se ogni stato/transizione mappa pulito alle primitive. Distinguere fit (forma) da conformità (corrispondenza ai criteri) è il punto di questo audit.

    ## Verdict

    Due dimensioni distinte:

    - **Fit (forma)**: clean / adapted / forced, con motivazione (cosa nel workflow forza la classificazione).
    - **Conformità (rispetto ai criteri)**: conforme / non conforme su gate / signal / condizioni di uscita / scope / falsificazione, con elenco esplicito delle non-conformità.

    Verdetto complessivo solo se BOTH sono accettabili. Una di esse "no" rende il verdetto "non promovibile" — il workflow va rivisto o i criteri vanno aggiornati per via documentata (supersedere esplicito del criteria.md).

## Vincoli

- Una riga per ogni stato e per ogni transizione. Niente placeholder, ogni nota deve essere motivata.
- Per ogni terminale (`is_final: true`) presente nel workflow, deve esserci almeno una riga in States.
- Per ogni transizione presente nel YAML, deve esserci almeno una riga in Transitions.
- Per i workflow composti: il fit di uno stato con `invoke` mappa a `state-invoke` (clean fit se l'on_completion copre tutti i terminali del sub-workflow; adapted se ne copre solo alcuni con motivazione).
- Se il validator fallisce, non dichiarare il workflow "clean": riporta il fallimento e ferma la classificazione.
- Sii preciso ma sintetico. Target totale: 40-80 righe per `<name>.fit.md`.

## Path di output

Per default scrivi il file a fianco del workflow, cambiando estensione:
- input  `experiments/<topic>/workflows-candidate/foo.yaml`
- output `experiments/<topic>/design/foo.fit.md`

(se il workflow vive in `workflows/`, l'output va in `design/` allo stesso livello).

## Termine

Una volta scritto il file, rispondi all'utente con un riepilogo di 2-3 righe: percentuale clean fit, eventuali estensioni backlog dichiarate, eventuali criticità. Cita il path del file scritto.
```

## Note di consolidazione

Questo prompt è la versione *coding-agent-native* del lavoro che il runtime TypeScript in `experiments/agent-loop-fsm/runtime-candidate/workflow-fit-auditor.ts` automatizza. Differenze pratiche:

- **Niente runtime LLM esterno**, niente chiave API aggiuntiva, niente `npm install`. L'agente di codifica usa la sua connessione e i suoi tool nativi.
- **Più allineato alla filosofia POM** ("no runtime in POM"): la skill istruisce, l'agente esegue. POM non porta una dipendenza LLM nei target.
- **Migliore meta-osservazione del runtime esterno** già integrata: il prompt include esplicitamente l'istruzione di seguire `state-invoke`/`event-invoke` (la limitazione diagnostica vista al primo test del runtime esterno su `agent-supervisor.yaml`).
- **Worked example a confronto**: gli output committati `design/agent-supervisor-auto.fit.md` e `design/agent-loop-table-auto.fit.md` (prodotti dal runtime esterno) servono da riferimento di "ecco come dovrebbe venire". Sono affiancati ai `.fit.md` scritti a mano da confrontare per validare il pattern.
