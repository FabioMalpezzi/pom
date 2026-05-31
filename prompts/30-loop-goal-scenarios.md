# Prompt — Scenari di test di un workflow loop/goal

Versione: v1 (2026-05-30).
Stato: **canonico** (promosso da `agent-loop-fsm` il 2026-05-30).

Scopo: guidare un agente di codifica ad enumerare i path significativi attraverso un workflow POM di tipo loop/goal e produrre il file `<name>.scenarios.md` con uno scenario per path. È materiale che un runtime POM consuma come fixture di test (path tracciabili end-to-end con setup, sequenza di eventi, terminale atteso, assertioni di context).

Esegue lo stesso lavoro del modo `scenarios` della skill generica `workflow`, ma con due specializzazioni per il dominio loop/goal: (1) traversa le composizioni (`state-invoke`, `event-invoke`) per generare scenari end-to-end della catena; (2) collega gli scenari ai criteri se esistono, garantendo copertura di ogni condizione di uscita dichiarata nel `criteria.md`.

L'agente di codifica usa i tool nativi (Read per i workflow YAML, Write per l'output). **Niente runtime LLM esterno.**

```text
Genera gli scenari di test per il workflow POM al path <WORKFLOW_PATH>.

Prima di iniziare:
1. leggi `pom.config.json` e conferma che `workflows.enabled: true`.
2. leggi questo prompt + `experiments/agent-loop-fsm/skills-candidate/loop-goal.md`.
3. leggi il file workflow indicato (`Read`).
4. se il workflow contiene `state-invoke` o `event-invoke`, leggi ANCHE ogni sub-workflow referenziato. Questo è indispensabile: senza i terminal_state del sub-workflow non puoi enumerare i path della composizione.
5. cerca il file di criteri associato (convenzione: `design/criteria-experiment-<N>-<HID>.md`). Se esiste, leggilo: la copertura degli scenari deve includere ogni condizione di uscita dichiarata.

Procedi con l'enumerazione.

## Cosa è uno scenario

Uno scenario è un cammino tracciabile dal `initial_state` a un terminale (o a un punto di rientro in un ciclo di alto livello), con:

- nome descrittivo (es. `goal_completed_happy_path`, `goal_failed_plan_failed`, `replan_loop_then_success`);
- stato iniziale (= `initial_state` del workflow);
- context iniziale di esempio plausibile (campi del `context_schema`);
- sequenza tabellare `(stato_corrente, evento_esterno) → transizione + side-effect` per ogni transizione attraversata (incluso l'attraversamento dei sub-workflow, se presenti);
- stato finale atteso (uno dei terminali, o `initial_state` se il workflow è progettato per cicli di rientro);
- assertioni sul context al termine.

## Tipi di scenario da generare

Punta alla **copertura**, non all'esaustività combinatoria. Generare in ordine:

1. **Happy path principale** — il cammino di successo dichiarato dal workflow.
2. **Failure path per ogni failure mode** — uno scenario per ogni evento che porta a un terminale di errore (es. `goal_invalid`, `plan_failed`, `action_failed`, `impossible`, `retries_exhausted`, ecc.). Devi visitare ogni terminale `failed`-like almeno una volta.
3. **Loop path** se il workflow contiene cicli (loop edge o self-transition):
   - uno scenario che attraversa il loop almeno una volta e poi esce per successo;
   - uno scenario che attraversa il loop almeno una volta e poi esce per fallimento;
   - se H6 `loop_guard` è dichiarato (sia come primitiva schema-level sia come pattern context-counter), uno scenario di esaurimento del bound.
4. **Edge case** dichiarati nelle descrizioni degli stati o negli `invariants` (es. "an agent can be stopped while idle"): uno scenario per ognuno se non già coperto sopra.

Numero target: 4-10 scenari. Meno di 4 = copertura insufficiente. Più di 10 = stai esaurendo combinazioni invece di coprire path.

## Struttura del file `<name>.scenarios.md` da produrre

    # Scenari di test — `<workflow file name>`

    **Workflow**: `<workflow_name>` (v<version>)
    **Sub-workflow invocati** (se applicabile): `<list>`
    **Terminali del workflow**: `<list>`
    **Criteri di riferimento** (se applicabile): `<path al criteria.md>`

    ---

    ## Scenario 1: <nome>

    **Descrizione**: <una frase>

    | Campo | Valore |
    |---|---|
    | Stato iniziale | <initial_state> |
    | Stato finale atteso | <terminal o stato di rientro> |
    | Context iniziale | <oggetto JSON di esempio, può essere `{}` se non c'è context_schema> |
    | Context finale atteso | <oggetto JSON di esempio> |

    ### Sequenza eventi e transizioni

    | # | Stato corrente | Evento esterno | Transizione | Side-effect / Note |
    |---|---|---|---|---|
    | 1 | <stato> | <evento> | <stato → stato> | <cosa cambia / cosa invoca / cosa scrive nel context> |
    | 2 | ... | ... | ... | ... |

    Per i passi che entrano in un sub-workflow, prefissare lo stato con `(sub:<sub-workflow-name>)`.

    ### Assertioni

    - <invariante post-condizione>
    - <invariante post-condizione>

    ---

    ## Scenario 2: ...

    ... (idem) ...

    ---

    ## Riepilogo copertura

    | Terminale / condizione di uscita | Scenario/i | Coperto? |
    |---|---|---|
    | <terminale 1> | #N, #M | ✅ |
    | <terminale 2> | #K | ✅ |
    | <loop visitato almeno una volta> | #N, #M | ✅ |
    | <criterio del criteria.md: forfait per stallo> | #M | ✅ |
    | <criterio del criteria.md: falsificazione> | non applicabile / #X | ✅ / ❌ |

    Se la riga "Coperto?" è ❌ per qualcosa, aggiungi uno scenario per coprirla o spiega perché la copertura non è possibile/sensata.

## Vincoli

- Usa SOLO eventi, transizioni e stati effettivamente dichiarati nei workflow letti. Non inventare nulla.
- Per workflow con `state-invoke`: nella sequenza, dopo l'evento che entra nello stato che invoca il sub-workflow, espandi i passi del sub-workflow (prefisso `(sub:...)`) fino al suo terminale, poi torna al parent con l'evento di `on_completion`.
- Se il workflow ha self-transition (es. retry), assicurati che almeno uno scenario attraversi la self-transition più di una volta.
- Se il `criteria.md` cita un evento o un terminale specifico (es. condizione di falsificazione: "il design note dichiara primitiva strutturale nuova"), produci uno scenario che lo esercita.
- Per ogni terminale `is_final: true` deve esistere almeno UNO scenario che lo raggiunge.

## Path di output

Per default scrivi il file a fianco del workflow, cambiando estensione:
- input  `experiments/<topic>/workflows-candidate/foo.yaml`
- output `experiments/<topic>/design/foo.scenarios.md`

(se il workflow vive in `workflows/`, l'output va in `design/` o `workflows/generated/` allo stesso livello, secondo convenzione del progetto).

## Termine

Una volta scritto il file, rispondi all'utente con un riepilogo di 2-3 righe: numero di scenari, copertura dei terminali, eventuali path non coperti. Cita il path del file scritto.
```

## Note di consolidazione

Questo prompt è la versione *coding-agent-native* del lavoro che il runtime TypeScript in `experiments/agent-loop-fsm/runtime-candidate/workflow-scenarios-generator.ts` automatizza. Stessa differenza dell'audit: niente runtime esterno, niente chiave LLM aggiuntiva, l'agente di codifica usa i suoi tool.

Differenza intenzionale rispetto al modo `scenarios` della skill generica `workflow` (prompt 27): qui c'è il vincolo esplicito di leggere `criteria.md` (se esiste) e di garantire copertura di ogni condizione di uscita dichiarata. Quel collegamento criteria → scenari è specifico del dominio loop/goal e giustifica una skill dedicata.

Worked example committato: `experiments/agent-loop-fsm/design/agent-supervisor.scenarios.md` — 7 scenari su un workflow composto (supervisor + sub-workflow goal-lifecycle invocato via `state-invoke`), con copertura di tutti i terminali e dei due path attraverso il replan loop.
