# `agent-loop-fsm` — Risultati dei test e delle risultanze

**Data chiusura**: 2026-05-30
**Branch**: `exp/agent-loop-fsm`
**Stato**: tutte e cinque le ipotesi pianificate (H1–H5) **confirmed**; H6 e H7 lasciate aperte per un esperimento separato `exp/schema-loop-guard-timeout`.
**Documento di riferimento principale**: `EXPERIMENT.md` (contesto, backlog, piano, esito formale).
**Questo documento**: racconto operativo dei test effettivamente svolti, dei loro risultati e dei pezzi di metodo emersi lungo la strada.

---

## 1. Cosa volevamo verificare

L'esperimento parte da una domanda: il framework POM così com'è (workflow schema, primitive di composizione, suspend/restore, Pattern A/B/C di implementazione) è sufficiente a modellare il control flow di un agente AI generico (loop di percezione → ragionamento → azione → osservazione, con goal, retry, sospensione), oppure servono estensioni allo schema?

La domanda è stata scomposta in sette ipotesi (H1–H7) e, per onestà di scope, si è deciso che cinque sarebbero state eseguite qui (H1–H5) e due delegate a un esperimento parallelo che tocca il core schema (H6 `loop_guard`, H7 `timeout`, candidate per SPEC-0007).

In parallelo a queste cinque ipotesi tecniche, l'esperimento ha anche un secondo livello, metodologico: validare un **prompt POM riusabile** che guidi la prima parte di qualunque esperimento loop/goal (definizione di obiettivo + metriche di misura). Questo livello si è sviluppato in due iterazioni del prompt (v1 → v2) prima che cominciassero i test tecnici, e produce un terzo deliverable autonomo.

---

## 2. Come si è lavorato

Ogni ipotesi è stata trattata come un mini-esperimento con una struttura ricorrente in cinque passi:

1. **Contratto** (`design/criteria-experiment-<N>-<HID>.md`) — applicazione del prompt `define-loop-goal-criteria` v2: fissare per iscritto SUT / sperimentatore / iterazione / obiettivo / out-of-scope / metriche gate+signal / condizioni di uscita del loop e di falsificazione, prima di scrivere qualunque YAML.
2. **Modello** (`workflows-candidate/<artifact>.yaml`) — un workflow YAML che rappresenta il pattern sotto verifica con il minimo strettamente necessario di stati, eventi, transizioni, guard, context.
3. **Gate automatici** — esecuzione di `pom:workflow:lint`, generazione Mermaid con `to-mermaid.mjs`, parse via `mmdc`, eventuali check programmatici aggiuntivi (presenza di self-transition, conteggio invoke, conformità snapshot al contratto suspend/restore).
4. **Design note** (`design/<artifact>.fit.md`) — classificazione di ogni stato e ogni transizione come `clean fit` / `adapted fit` / `forced fit lossy`, con motivazione domain-level per ognuno. Il numero di clean fit è il signal principale.
5. **Commit** — un solo commit per ipotesi (eccetto H1 che ha avuto due iterazioni, e fix-up minori), con messaggio strutturato che riporta gate, signal, verdetto, budget consumato.

Questo formato è stato applicato in modalità conversazionale-guidata per H1 (con revisione critica intermedia che ha portato a una revisione del contratto), e in modalità autonoma per H2–H5 quando l'utente ha esplicitato "procedi sino alla fine".

---

## 3. Cosa è stato testato, in ordine

### H1 — Modellazione di un agente AI come FSM POM

**Domanda**: lo schema POM accomoda il control flow agentico senza estensioni e senza forced-fit?

**Cosa è stato modellato**: due pattern di letteratura, eterogenei sul piano strutturale.

- *Iter 1* — **ReAct minimal** (Yao et al., 2022): tre stati attivi (`reasoning`, `acting`, `observing`) più `idle` e i due terminali `done`/`failed`. Sette transizioni, una delle quali è il loop edge `observing → reasoning`.
- *Iter 2* — **Goal Lifecycle** (Plan-and-Solve, Reflexion): sei stati con `reflecting` come decisione hub a tre uscite (`continue` → replan, `goal_met` → done, `impossible` → failed), e due eventi distinti che convergono sullo stesso target (`step_done` e `step_error` → `reflecting`). Nove transizioni.

**Risultanze**:
- entrambi i pattern modellabili con **100% clean fit** su stati e transizioni;
- zero estensioni allo schema POM richieste;
- zero forced-fit lossy;
- il loop edge — cuore strutturale dell'agentic paradigm — espresso da una semplice transizione event-driven, sia al livello del singolo step (ReAct) sia al livello del replan (Goal Lifecycle).

**Tempo speso**: ~12 minuti su 2h di budget.

**Verdetto**: H1 confirmed su due pattern eterogenei. Conclusione narrow nel senso che OODA non è stato testato (giudicato marginal-return, troppo simile a ReAct), e i pattern multi-agent / async sono fuori scope.

**Cosa di interessante è emerso lungo la strada**: la prima versione del contratto criteria aveva quattro incoerenze interne (cortocircuito H1↔H6 nella falsificazione, budget×visits non coerente con il tempo per iterazione, due "signal" che erano in realtà gate degeneri, obiettivo silenziosamente irrigidito rispetto al backlog). La criticità è stata sollevata dall'utente con la domanda "tutto ti sembra logico?" e ha portato a una riscrittura del contratto e a una revisione del prompt stesso (v2 → input per v3) per richiedere un Consistency Check incrociato. Vedi `notes/2026-05-30-prompt-v2-first-use-feedback.md`.

### H2 — Loop agentico come transition table piatta

**Domanda**: il loop `perception → planning → action → observation` può vivere come singolo workflow piatto, senza ricorrere a `invoke` o a sub-workflow?

**Cosa è stato modellato**: `agent-loop-table.yaml` con sei stati e sette transizioni. Loop edge `observation → perception`. Due failure path indipendenti (`perception_failed`, `action_failed`).

**Risultanze**:
- 100% clean fit (6/6 stati, 7/7 transizioni);
- zero occorrenze di `invoke` nel YAML (vincolo della transition table piatta rispettato);
- zero stati irraggiungibili (warning W001 = 0).

**Tempo speso**: ~4 minuti.

**Verdetto**: H2 confirmed. Il loop classico SPAO mappa allo schema POM as-is, leggibile end-to-end come singola tabella di 8 righe.

### H3 — Bounded retry via self-transition guarded

**Domanda**: il retry bounded di un'azione fallibile è esprimibile con le primitive attuali (senza la primitiva `loop_guard` di H6)?

**Cosa è stato modellato**: `agent-retry-bounded.yaml`. Stato `acting` con tre uscite: una self-transition `acting → acting` su `retry_after_error` guardata da `has_attempts_left`; una transizione a `failed` su `retries_exhausted` guardata da `no_attempts_left`; una transizione a `observing` su `success`. Il contatore vive in `context.attempts_left`, decrementato dal runtime.

**Risultanze**:
- 100% clean fit (5/5 stati, 5/5 transizioni inclusa 1 self);
- due guard distinti e mutuamente esclusivi;
- bound espresso, anche se in modo *implicito* nel context counter.

**Tempo speso**: ~3 minuti.

**Verdetto**: H3 confirmed. La struttura del bounded retry è esprimibile oggi. La primitiva H6 `loop_guard` resta motivata come miglioramento sintattico (declarative `max_visits` + `on_exhaustion` al posto del counter manuale + evento manuale), non come necessità strutturale.

### H4 — Goal lifecycle come workflow autonomo invocato

**Domanda**: il goal lifecycle modellato in H1 iter 2 può essere usato come sub-workflow da un caller esterno, senza modifiche?

**Cosa è stato modellato**: `agent-supervisor.yaml` con cinque stati. Lo stato `handling_goal` porta un blocco `invoke:` che cita `agent-orchestrator-goal-lifecycle.yaml` come sub-workflow, con `on_completion` che dispatch i terminali `done`/`failed` su due eventi nel parent (`goal_completed`/`goal_failed`).

**Risultanze**:
- 100% clean fit (5/5 stati, 6/6 transizioni);
- 1 invoke + 2 on_completion entries dichiarati correttamente;
- il sub-workflow esiste come file sibling, già validato in H1 iter 2.

**Tempo speso**: ~6 minuti, di cui ~2 minuti sprecati per un fix del path (il path di `invoke.workflow` è caller-relative, non project-relative — dettaglio piccolo ma che costa un'iterazione se dimenticato).

**Verdetto**: H4 confirmed. Il goal lifecycle è autonomo nel senso POM: standalone, riusabile, dispatchabile sui suoi terminali. Essenzialmente una riconferma specifica del lavoro di `experiments/workflow-modeling/` round 2 sulle composizioni sincrone.

### H5 — Suspend e restore del loop agentico

**Domanda**: il pattern snapshot+restore documentato in `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` regge sul workflow di un agente?

**Cosa è stato modellato**: nessun nuovo workflow. Riuso di `agent-orchestrator.yaml` (ReAct minimal di H1 iter 1) e produzione di uno snapshot JSON realistico (`evidence/snapshot/agent-orchestrator.suspended.json`): un agente sospeso in stato `reasoning` dopo due cicli reason/act/observe, con `goal` (ricerca di un volo), `history` (due cicli completi), `last_observation` popolata.

**Risultanze**: tutti e quattro gli invarianti del contratto restore verificati programmaticamente da uno script Node inline (≈20 righe):
- snapshot JSON con le quattro chiavi canoniche `{workflow, version, state, context}`;
- `state = "reasoning"` è uno stato dichiarato in `agent-orchestrator.yaml.states[].name`;
- `workflow` + `version` corrispondono all'header del file (`agent_orchestrator` / 1);
- `context` ha tutte e tre le chiavi previste dal `context_schema` (`goal`, `history`, `last_observation`).

**Tempo speso**: ~5 minuti.

**Verdetto**: H5 confirmed. POM fornisce lo schema che rende lo snapshot interpretabile (named states, named events, context_schema); il runtime che ne consuma il contenuto resta responsabilità del progetto target, coerentemente con il principio POM-as-method. Composed-stack snapshots (catene di invoke) non rivalidati qui — coperti dalla round 2 di workflow-modeling.

---

## 4. Pezzi di metodo emersi (anche se non erano l'obiettivo)

Lungo la strada sono emerse cose che non riguardano le cinque ipotesi tecniche ma il metodo stesso. Le elenco perché sono ciò che resterà utile alla prossima volta che si apre un esperimento POM.

### Il prompt `define-loop-goal-criteria` v1 → v2 → v3

Prima ancora di toccare i workflow, è stato consolidato un prompt riusabile per la prima parte di qualunque esperimento POM con dinamica loop/goal. Il prompt è in `experiments/agent-loop-fsm/prompts-candidate/define-loop-goal-criteria.md`.

- *v1*: prima bozza con cinque sezioni rigide.
- Revisione critica dopo la v1 → individuate sette criticità materiali (C1–C7).
- *v2*: chiude C1–C7 con tre fix maggiori (P1: sezione 0 "Contesto" che distingue SUT, sperimentatore, iterazione, goal-del-SUT; P2: colonna obbligatoria "Legame con obiettivo" per ogni metrica, deterrente concreto contro Goodhart; P3: formato forzato per il "trend atteso", a scelta tra assoluto / relativo / statistico). Nota di review archiviata in `notes/2026-05-30-prompt-criteria-critical-review.md`.
- Primo uso reale del prompt su H1 → emerse altre due debolezze (D4: il prompt v2 non verifica la coerenza incrociata fra le scelte e non restituisce un feedback sulle conseguenze; D5: il prompt è stato applicato in template-mode invece che in dialog-mode). Nota di first-use in `notes/2026-05-30-prompt-v2-first-use-feedback.md`.
- *v3*: **scritta** (2026-05-30, task #66). Chiude tutte e cinque le debolezze del primo uso: D1 (Goal del SUT ammette il terzo valore "solo modellato in questo esperimento"); D2 (guida alla calibrazione delle soglie — percentuale del totale > calibrazione al run 1 > assoluto giustificato — e budget riformulato come domanda all'utente invece che default dedotto); D3 (falsificazione chiusa solo quando esistono due esempi concreti, uno che falsifica e uno che no); D4 (nuova sezione 7 *Consistency Check* con i quattro controlli incrociati — budget×visite≈durata; signal degeneri→gate; falsificazione esclude il backlog; obiettivo confrontato col backlog originale — ciascuno con feedback sulla conseguenza concreta, esito registrato nel file); D5 (nota operativa "guida di dialogo, non template" in testa). La v3 aggiunge un quarto criterio di promozione: almeno un Consistency Check che produca un warning reale e cambi il `criteria.md`. Resta da fare il primo uso reale di v3 in dialog-mode su un nuovo esperimento (il test su H1 valeva solo per il template-mode, vedi D5).

### La distinzione gate / signal regge anche su pattern molto diversi

Tutti e cinque gli esperimenti hanno usato la stessa struttura "almeno un gate (binario, fermati se rompe) + almeno un signal (continuo, fermati se non cresce)". Funziona. I gate hanno catturato sia errori grossolani (path relativo sbagliato in H4, YAML quoting in H1 iter 1) sia invarianti contrattuali (snapshot keys, state in workflow.states); i signal (clean fit count su stati e transizioni) hanno dato una misura comparabile di "quanto bene mappa il modello", utile anche se in tutti e cinque i casi è saturato al 100% rapidamente.

### Il signal "clean fit count" satura presto: forse troppo presto

In tutti i cinque esperimenti il signal è arrivato al 100% alla prima iterazione. Questo significa due cose, una positiva e una preoccupante. Positiva: lo schema POM è effettivamente molto adatto a questi pattern, non c'era niente da rifinire. Preoccupante: un signal che non si muove non è un buon signal — la sua direzionalità non è stata mai messa alla prova. Per esperimenti futuri su pattern più ostili (multi-agent, async) potrebbe essere utile un signal più granulare, ad esempio "stati con commenti di motivazione" oppure "domande sollevate e risolte nella design note" — qualcosa che possa effettivamente salire iterazione dopo iterazione.

### Il pattern "primitive del backlog ammesse come estensioni attese" funziona

In H3 il rischio era che il bisogno di `loop_guard` (H6) facesse dichiarare H3 falsa per circolarità. La revisione del contratto H1 (poi propagata implicitamente agli altri) ha introdotto la regola: una primitiva strutturale è considerata falsificazione solo se è **non già nel backlog**. Le primitive previste come estensione futura (`loop_guard`, `timeout`) sono ammesse come "estensioni attese". Questa è una regola metodologica generale che vale ogni volta che un esperimento ha un backlog interno di ipotesi multiple.

### Tempo consumato vs budget: troppi margini significa che il budget era inutile

I cinque esperimenti hanno consumato in totale ~30 minuti contro un budget cumulato di ~4 ore. Il loop guard del prompt non si è mai avvicinato a scattare. Significa che i budget sono stati calibrati troppo larghi. Per esperimenti analoghi futuri, si può scendere a 30 min per ipotesi semplice, 60 min per ipotesi complessa.

---

## 4-bis. Esecuzione runtime end-to-end (aggiunta a fine sessione)

Dopo la chiusura formale dell'esperimento, è stato scritto un runtime TypeScript provider-agnostic sopra `agent-orchestrator.yaml` (ReAct minimal) e fatto girare con un LLM reale. Il runtime vive in `experiments/agent-loop-fsm/runtime-candidate/`.

Caratteristiche:
- **Pattern A** (transition table) come da `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`.
- **Provider-agnostic**: client `openai` ufficiale con `baseURL` configurabile, funziona su OpenAI, DeepSeek, Groq, Mistral, Together, Ollama locale.
- **Function calling nativo** per tool — niente parsing fragile di JSON in testo libero.
- **Bound del loop a mano** (`MAX_ITERATIONS`, `MAX_DURATION_MS` da env) in attesa che H6 `loop_guard` diventi primitiva schema.

Primo run reale (DeepSeek, `deepseek-chat`, goal "Calcola (12 + 5) * 3 e dimmi il risultato"):

```
[FSM] idle --goal_received--> reasoning  (iter 0)
[FSM] reasoning --plan_ready--> acting   (iter 1)
[FSM] acting --action_done--> observing  (iter 2)
[FSM] observing --goal_met--> done       (iter 3)
```

Il modello ha generato la tool call `calculator({expression: "(12 + 5) * 3"})`, il tool ha restituito `51`, il modello al turno successivo ha riconosciuto il goal raggiunto e ha concluso. **Loop chiuso al primo tentativo**, con un solo fix di sintassi (chiavi oggetto con spazi non quotate) durante lo sviluppo.

Cosa dimostra in più rispetto a H1–H5:
- H1 aveva confermato che lo schema POM **modella** l'agente. L'esecuzione runtime dimostra che la transition table modellata è anche **eseguibile** senza adattamenti: la stessa tabella che il validator usa per dichiarare 100% clean fit è quella che il runtime applica passo-passo.
- H5 aveva validato il contratto `{workflow, version, state, context}` come **snapshot statico**. Il runtime mostra che lo stato e il context sono effettivamente mantenuti vivi durante l'esecuzione e potrebbero essere serializzati a qualunque istante (lo snapshot/restore reale è rinviato a una iterazione successiva del runtime, ma il dato è disponibile).
- H6 (`loop_guard`) era stata motivata come miglioramento sintattico. Il runtime conferma che è anche un miglioramento di portabilità: oggi i bound vivono in env var del singolo target; con `loop_guard` come primitiva schema vivrebbero dentro il YAML, e il runtime li leggerebbe da lì.

Il runtime non è promosso ai path canonici di POM — resta come `runtime-candidate/` accanto a `workflows-candidate/` finché non si decide se costruire un runtime di riferimento POM (decisione fuori scope per questo esperimento).

## 4-ter. Workflow Fit Auditor — agente POM eseguibile sopra il runtime

Subito dopo il primo test runtime (calcolo aritmetico), è stato scritto un secondo agente sopra lo stesso Pattern A: il **Workflow Fit Auditor**. Vive in `experiments/agent-loop-fsm/runtime-candidate/workflow-fit-auditor.ts` ed estende il registro di tool con quattro primitive POM (`read_workflow`, `lint_workflow`, `list_pom_primitives`, `write_design_note`).

Compito dell'agente: dato il path di un workflow YAML modellato, produrre automaticamente il design note `*.fit.md` con la classificazione `clean / adapted / forced lossy` di ogni stato e di ogni transizione — esattamente il lavoro che gli esperimenti H1–H5 hanno fatto a mano cinque volte.

Test reale eseguito il 2026-05-30 su `agent-loop-table.yaml` (H2). Output dell'agente: `experiments/agent-loop-fsm/design/agent-loop-table-auto.fit.md`, da confrontare con `agent-loop-table.fit.md` scritto a mano.

Confronto:

| Metrica | A mano (umano) | Agente automatico |
|---|---|---|
| Stati clean fit | 6/6 | 6/6 |
| Transizioni clean fit | 7/7 | 7/7 |
| Verdetto complessivo | 100% clean fit, CONFIRMED | 100% clean fit |
| Lunghezza file | 49 righe | 50 righe |
| Tempo | ~10 minuti | ~30 secondi, 10 iterazioni FSM |

L'agente è arrivato agli stessi giudizi sostanziali (stesso fit per ogni elemento, stesso verdetto). Lo stile delle note differisce — il file scritto a mano ha più dettaglio domain-level ("ReAct pattern's thought stage"), quello dell'agente è più sintetico ma rigoroso e ha aggiunto un'osservazione corretta che il mio non aveva ("scelta deliberata di non usare primitive compositive, coerente con l'ipotesi H2"). Il modello DeepSeek ha anche usato spontaneamente parallel tool calls al primo turno (`read_workflow + list_pom_primitives` in parallelo), confermando un'ottimizzazione che il runtime ora supporta.

Cosa questo dimostra al di là del calcolo aritmetico di 4-bis:

- Il runtime Pattern A regge anche su task **multi-iter strutturato**: 10 transizioni FSM (4 cicli completi reasoning → acting → observing), tre tool diversi chiamati in sequenza, output strutturato in markdown scritto su disco.
- Lo stesso runtime serve sia per task generici (calcolo) sia per task POM-specifici (audit). La distinzione vive solo nel **tool registry** e nel **system prompt**, non nel runtime — esattamente la promessa del Pattern A "transition table generica".
- POM ora ha un'automazione concreta dei propri stessi workflow di validazione: il design note che era prodotto a mano può essere generato automaticamente, con qualità comparabile, e usato come baseline per la revisione umana.

Bug runtime scoperti e corretti durante questo test:

1. Quando `observing` produce una nuova tool call (loop_continue), lo step `reasoning` successivo non doveva ri-chiamare l'LLM: doveva applicare direttamente la tool call pendente. Senza il fix, la API rifiutava la conversazione perché l'assistant message con `tool_calls` non aveva la corrispondente `tool` response.
2. Il runtime gestiva solo una tool call per turno; i provider OpenAI-compatible (DeepSeek, OpenAI, Groq...) emettono `tool_calls` come array (parallel tool calls). Senza gestire l'intero array, l'API rifiutava la conversazione successiva come incoerente. Il runtime ora esegue tutte le call del turno in ordine, generando una `tool` response per ogni `tool_call_id`.

Entrambi i fix migliorano anche `agent-runtime.ts` (calcolo aritmetico ancora funziona).

## 4-quater. Auditor su composizione + Scenarios Generator (secondo giro)

Subito dopo il primo audit, è stato eseguito un secondo test su un workflow con composizione (`agent-supervisor.yaml` di H4, che invoca `agent-orchestrator-goal-lifecycle.yaml` via `state-invoke`) per misurare due cose: la robustezza dell'auditor su un caso non triviale, e l'autonomia dell'agente nel seguire le composizioni senza istruzioni esplicite.

### Auditor naked su composizione

Stessa invocazione del primo audit, ma sul supervisor: `npm run audit -- agent-supervisor.yaml agent-supervisor-auto.fit.md`. Risultato in 10 iterazioni.

L'agente ha classificato correttamente: 5/5 stati clean fit, 6/6 transizioni clean fit, ha riconosciuto `state-invoke` come primitiva POM, ha citato esplicitamente `state-invoke.on_completion[]` per i dispatch sui terminal del sub-workflow. Verdetto: 100% clean fit, coerente con il `agent-supervisor.fit.md` scritto a mano.

Ma — finding diagnostico — l'agente **NON ha letto il sub-workflow** `agent-orchestrator-goal-lifecycle.yaml`. Ha trattato `agent-supervisor.yaml` come standalone, ignorando la composizione. Per un audit di forma è sufficiente; per un audit di integrità della composizione (verificare che il sub-workflow esista, validi, e abbia davvero i terminal citati nell'invoke) no. Una riga aggiuntiva nel system prompt risolverebbe: "se vedi state-invoke o event-invoke, leggi anche il sub-workflow referenziato e includilo nell'analisi". Lasciato come miglioramento per una v2 dell'auditor.

### Workflow Scenarios Generator (nuovo agente)

Sopra lo stesso runtime Pattern A, è stato scritto un terzo agente: `workflow-scenarios-generator.ts`. Dato un workflow POM, enumera i path significativi attraverso la FSM e produce un file `<name>.scenarios.md` con uno scenario per ogni path interessante (happy path, failure path per ogni failure mode dichiarato, loop path, edge case).

Nuovo tool nel registro: `write_scenarios(path, content)` (gated su path che finiscono in `.scenarios.md` sotto `experiments/`). Niente lint (non serve per la generazione di scenari). Il registro POM scenarios è quindi più piccolo dell'auditor (3 tool invece di 4).

Il system prompt include esplicitamente: "se il workflow contiene state-invoke o event-invoke, leggi ANCHE il sub-workflow referenziato per capire i suoi terminal_state, così puoi enumerare i path della composizione". Test: applicato a `agent-supervisor.yaml`, lo stesso workflow su cui l'auditor naked aveva ignorato il sub-workflow.

Risultato in 10 iterazioni:

- L'agente ha letto `agent-supervisor.yaml`, poi (questa volta) `agent-orchestrator-goal-lifecycle.yaml`, ha analizzato la composizione, e ha scritto un file di ~10 KB con **7 scenari** che coprono:
  - happy path completo (supervisor + sub-workflow `done`)
  - tre failure path distinti (goal_invalid, plan_failed, impossible)
  - due varianti con replan loop (success dopo replan, failure dopo replan)
  - terminal `stopped` del supervisor
- Ogni scenario ha: descrizione, stato iniziale, stato finale atteso, context iniziale, sequenza tabellare di `(stato, evento) → transizione + side-effect` per ogni transizione attraversata (compreso l'attraversamento del sub-workflow), assertioni finali.
- Una **tabella di copertura** finale mappa ogni terminale al suo scenario, dimostrando che la copertura è completa.
- L'agente ha usato solo eventi dichiarati nei due workflow (verificato), ha riconosciuto che `handling_goal` rimane attivo per tutta la durata del sub-workflow (semantica corretta dell'invoke sincrono), e ha distinto correttamente i terminali (`stopped`) dai cicli di rientro (`idle` via `acknowledging`/`escalating`).

Quello che dimostra: con l'istruzione esplicita nel prompt, l'agente segue la composizione e produce materiale che POM oggi **non automatizza affatto** — gli scenari di test sono fixture utili a un runtime per validare l'implementazione, e oggi vanno scritti a mano. Tre agenti diversi (calculator, auditor, scenarios), tre system prompt, tre tool registry diversi, **stesso runtime Pattern A invariato**.

### Cosa ha capito POM da questo secondo giro

Sul runtime: il Pattern A regge sia su task semplici (4 iter del calcolo) sia su task agentici strutturati (10 iter dell'auditor o dello scenarios generator) senza modifiche al loop principale. Il punto di estensione è il **tool registry + system prompt**, non il runtime.

Sul prompt design: l'agente è bravo a usare i tool che ha, ma non a *cercarli* spontaneamente se la guida non li nomina. Pattern netto: per ogni capability extra (es. "leggi anche il sub-workflow"), serve una riga esplicita nel system prompt. Questo è materiale per il prompt v3 di `define-loop-goal-criteria` (`task #66`) — il principio "le opzioni di configurazione siano logicamente correlate e ci sia un feedback sulle conseguenze" che hai chiesto si applica anche qui: l'agente vede `state-invoke` ma non collega "primitiva composita → devo seguirne l'estensione".

Sul valore POM: dopo questo giro POM ha due automazioni concrete sopra workflow modellati (fit.md e scenarios.md), entrambe con qualità sufficiente per essere riviste da un umano invece che scritte da zero. Sono il primo esempio di "agenti POM eseguibili sopra POM stesso", e mostrano una via concreta per integrare LLM nel workflow di documentazione POM in progetti target.

---

## 4-quinquies. Promozione del pattern a skill-candidate e degli esempi a templates

Riconosciuto durante la sessione che il pattern di lavoro emerso è una **skill POM specifica** (loop-goal) — non un'estensione della skill generica `workflow`, ma un sotto-tipo per i workflow agentici che richiedono criteri misurabili, fit clean/adapted/forced, scenari di test con copertura dei terminali, e supporto a primitive in backlog (`H6 loop_guard`, `H7 timeout`) come "estensioni attese" anziché falsificazioni.

Atti di promozione eseguiti il 2026-05-30:

1. **Skill candidata** `experiments/agent-loop-fsm/skills-candidate/loop-goal.md` — descrive l'intero pattern, cinque modi (`define-criteria`, `model`, `audit`, `scenarios`, `runtime-guide`), la regola d'ordine non negoziabile criteri → modello → audit, e la distinzione fit / conformità.
2. **Prompt candidati** `experiments/agent-loop-fsm/prompts-candidate/audit-loop-goal-workflow.md` e `scenarios-loop-goal-workflow.md` — istruzioni operative *coding-agent-native*: usano i tool nativi del coding agent (Read / Bash / Write), niente runtime LLM esterno, niente chiave API aggiuntiva. Sono la versione "POM in produzione" di quello che il runtime esterno automatizza.
3. **Esempi workflow promossi** a `templates/examples/workflow/loop-goal/` — i cinque YAML modellati durante H1–H4 (ReAct minimal, Goal Lifecycle, SPAO, bounded retry, supervisor + invoke) escono dal candidate dell'esperimento e diventano esempi canonici del pattern. Sono affiancati agli esempi di dominio esistenti (`spec-evolution.yaml`, `ticket-lifecycle.yaml`, `document-approval.yaml`), in una sotto-cartella `loop-goal/` per separare pattern strutturali da pattern di dominio. README della cartella documenta provenance, catalogo e verifica.
4. **Conformity check nell'audit**: il prompt `audit-loop-goal-workflow.md` include una sezione dedicata "Conformity check vs criteria" che confronta ogni gate/signal/condizione di uscita del criteria.md con il workflow modellato. Un workflow può essere `clean fit` sul piano della forma ed essere comunque non conforme ai criteri (es. manca un terminale di forfait, signal non misurabile). Verdetto "promovibile" solo se entrambe le dimensioni sono accettabili.

Caveat di disciplina POM: la promozione degli esempi workflow a `templates/examples/workflow/loop-goal/` precede la chiusura dell'esperimento `agent-loop-fsm` (H6/H7 e prompt v3 ancora aperti). La scelta è motivata dal fatto che i cinque pattern strutturali (ReAct, Goal Lifecycle, SPAO, retry, supervisor) hanno valore generale separabile dalla skill candidata che li adotta, e sono già stati validati al 100% clean fit dai cinque mini-esperimenti H1–H5. La skill `loop-goal` resta candidate (non promossa) come da disciplina, finché l'esperimento non chiude.

Il **runtime esterno** in `runtime-candidate/` e i suoi output di esempio (`design/*-auto.fit.md`, `design/agent-supervisor.scenarios.md`) restano in repo come **evidence dell'eseguibilità** del pattern con LLM esterno. Non sono il pattern operativo: il pattern operativo è la skill candidata, che usa la connessione del coding agent.

Path aggiornati nel runtime e nei design note per riflettere la nuova location:

- Runtime `agent-runtime.ts`: default workflow path ora `../../../templates/examples/workflow/loop-goal/agent-orchestrator.yaml`.
- `workflow-fit-auditor.ts` e `workflow-scenarios-generator.ts`: gestione duale del `defaultNotePathFor` (vecchio `workflows-candidate/` e nuovo `templates/examples/`).
- Design notes (`*.fit.md`, `criteria-*.md`) e `EXPERIMENT.md`: riferimenti aggiornati con il path canonico.
- Sanity check post-promozione: validator PASS su tutti e cinque i workflow al path nuovo; runtime base gira correttamente; auditor con path duale funziona.

## 4-sexies. Il quarto agente e il ciclo di vita completo dell'esperimento (sessione 2026-05-30)

In una sessione di confronto con l'utente il metodo loop-goal è passato da tre agenti a quattro, e da una somma di prompt a un vero ciclo di vita dell'esperimento. Tre cambiamenti, tutti nati dal dialogo e non da una riscrittura a tavolino.

**Il prompt `define-criteria` da intervista a confronto.** La v3 aveva già la nota "dialogo, non template" (D5), ma descriveva comunque un processo estrattivo: chiedi, riformula, conferma, prossima sezione. L'utente ha posto il principio che la definizione di un esperimento deve nascere da un *confronto ragionato* — l'agente propone formulazioni motivate, mostra le conseguenze sull'obiettivo, sfida le scelte deboli, accoglie le domande che emergono fuori griglia — non da un imbuto a senso unico. Con un confine esplicito: l'agente propone e sfida ma non decide al posto dell'utente, e quando si accorge di aver guidato troppo lo dichiara. L'auditing di coerenza, di conseguenza, non è più un collaudo finale: è continuo durante il confronto (conseguenze locali a ogni risposta) più un giro finale di riconciliazione per gli incroci. Nota onesta: il principio è stato violato due volte nella sessione stessa — una dall'agente che aveva compilato in template-mode su H1 (D5), una dall'agente di questa sessione che è andato avanti da solo invece di attendere il confronto. Conferma che il taglio del confronto è la modalità di fallimento ricorrente quando lo stesso agente cambia "cappello".

**La traccia del confronto come artefatto.** Poiché l'auditing continuo è conversazionale e non lascia traccia nel `criteria.md` finale, è la parte più facile da saltare. `define-criteria` ora scrive un file separato `criteria-experiment-<N>-<HID>.dialog.md` con le parti essenziali del confronto (conseguenze segnalate, domande fuori griglia, calibrazioni e correzioni dell'utente). Separato dal `criteria.md`, che resta il metro snello e congelato. Doppio scopo, posto dall'utente: rendere verificabile a posteriori che il confronto è avvenuto, e costituire materia prima per il miglioramento futuro — esattamente come le debolezze D1–D5 del prompt sono nate dal confronto su H1.

**Il quarto agente: valutatore indipendente avversariale** (`conclude-loop-goal-experiment.md`). Trae le conclusioni dell'esperimento confrontando le evidenze (i `.fit.md`, gli scenari, gli output del runtime) con i criteri *congelati* all'apertura. Due principi lo distinguono dal Coordinatore+Auditor che apre l'esperimento: **indipendenza** (gira come sessione fresca, legge solo gli artefatti, mai il dialogo che ha generato i criteri) e **avversarialità** (prova a falsificare, non a confermare; la cella "tentativo di refutazione" è obbligatoria). La sicurezza di far valutare a un agente della stessa famiglia che ha aperto sta nella pre-registrazione: il metro è congelato prima di vedere i risultati. L'utente ha scelto un agente *separato* (non lo stesso Coordinatore con un cappello in più) per neutralità piena. Se a fine valutazione resta budget e l'obiettivo è stato raggiunto con margine (signal saturo presto), il valutatore non propone migliorie all'utente né apre lui un nuovo giro: lascia **consigli per il Coordinatore** nel file di valutazione, non retroattivi. Su un nuovo giro `define-criteria` li legge e li porta nel confronto con l'utente — così l'idea di miglioria parte dal giudice ma viene "lavata" dal confronto utente↔Coordinatore prima di diventare un criterio congelato, e il valutatore non ha mai mano diretta sul metro. Il ciclo si chiude in un anello: Coordinatore apre → Fit Auditor + Scenarios Generator lavorano nel mezzo → Valutatore chiude → consigli al Coordinatore → nuovo giro.

**Intuizione registrata (non ancora aperta).** L'utente ha osservato che lo strato generico di questo metodo (confronto, auditor di coerenza, traccia, valutatore avversariale, anello dei consigli) è separabile dallo strato loop/goal-specifico (FSM, fit, primitive di backlog, scenari sui terminali, runtime) e potrebbe essere portato a modello generico su tutti gli esperimenti POM. Direzione concordata: prima sperimentare e portare a regime il criterio loop/goal, poi valutare se e come estenderlo — generalizzare un metodo non ancora provato violerebbe la disciplina POM. Dettaglio in `PROJECT_STATE.md` (Open Decisions).

Stato di disciplina: nessuno di questi quattro agenti è ancora stato esercitato in un giro reale in dialog-mode. La skill `loop-goal` resta candidate.

---

## 5. Cosa resta aperto

- **H6 `loop_guard`** e **H7 `timeout`**: già definite in dettaglio nel backlog (vedi sezioni dedicate di `EXPERIMENT.md`), pronte per essere prese in carico da un esperimento parallelo `exp/schema-loop-guard-timeout` su SPEC-0007. Quando promosse, permetteranno di riscrivere H3 in modo più dichiarativo.
- **Prompt v3** con Consistency Check + dialog-mode hint: **scritto** (task #66), poi esteso nella stessa sessione a confronto ragionato + traccia (vedi 4-sexies).
- **Pattern non testati**: OODA (deferito come marginal-return), multi-agent, async, distributed. Restano open question, non urgenti per il messaggio centrale di questo esperimento.
- **Primo giro reale del ciclo a quattro agenti in dialog-mode**: nessuno dei quattro agenti (Coordinatore+Auditor in confronto, Fit Auditor, Scenarios Generator, Valutatore indipendente avversariale) è ancora stato esercitato in un giro vero condotto come confronto. È il passo che "porta a regime" il criterio prima di qualunque estensione, e andrà fatto sul primo esperimento di un altro `exp/`.
- **Codice TypeScript guidato per pipeline orchestrator** (task #45 ereditato da workflow-modeling): ancora deferito al momento del deploy POM su un progetto target.

---

## 6. Cosa proporrei di consolidare verso `main`

Il branch `exp/agent-loop-fsm` come è oggi è autoconsistente. Le proposte di consolidazione:

- **Non promuovere ai path canonici di POM** nessun workflow di questo esperimento — sono esempi di applicazione, non parti del metodo. Restano in `experiments/agent-loop-fsm/` come traccia storica e materiale didattico.
- **Promuovere il prompt** `define-loop-goal-criteria` da v3 (quando scritto) verso `prompts/` canonico, una volta che i tre criteri di promozione del prompt stesso siano stati verificati su almeno un secondo esperimento. Oggi i criteri sono 1/3 verificati (file output sotto soglia su tutti e cinque).
- **Aggiungere nel CHANGELOG** una nota su POM `Next` (o `0.3.x` quando arriverà) che riassuma in tre righe l'esito di `agent-loop-fsm`, senza promuovere artefatti.
- **Tenere `exp/agent-loop-fsm` come branch consolidato** (non mergiare automaticamente in `main`); il contenuto vale come riferimento, non come metodo.

Se H6 e H7 verranno completate nell'esperimento parallelo, allora avrà senso un giro di "rinfresco" di H3 e H5 con le nuove primitive — ma è una conversazione per dopo.
