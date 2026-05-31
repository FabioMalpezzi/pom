# Log delle decisioni — esperimento dynamic-workflows

Registro asciutto delle decisioni prese in fase di definizione (la partenza). Una voce per decisione: cosa abbiamo deciso e perché. Le discussioni da cui sono nate stanno in `design/criteria.dialog.md`; gli obiettivi e le misure in `design/criteria.md`.

| # | Decisione | Perché |
|---|---|---|
| D-01 | Fuoco sui **Dynamic Workflow** (pannello destro); Agent Teams fuori scope. | Sono due fenomeni diversi (scatter-gather gerarchico vs messaggi tra pari); mescolarli renderebbe obiettivo doppio e audit illeggibile. |
| D-02 | Il **SUT è lo schema FSM**, non un singolo workflow; il Dynamic Workflow è il caso-bersaglio. | L'obiettivo è la capacità espressiva dello schema; così la falsificazione naturale diventa "serve una primitiva nuova". |
| D-03 | **Simulazione reale**: codice eseguibile, non solo modellazione su carta. | Richiesta esplicita dell'utente; ribalta l'assunzione iniziale "solo modellato". Implementazione ed esecuzione entrano IN scope. |
| D-04 | Fedeltà: runtime reale con **agenti stub deterministici** a N parametrico, non LLM reali. | Si testa la capacità dello schema di esprimere/pilotare la struttura, non l'intelligenza degli agenti; riproducibile ed economico, scala a N arbitrario. |
| D-05 | Obiettivo = **ipotesi falsificabile** (lo schema basta con design pattern) + **deliverable condizionale** (estensioni necessarie + costo se l'ipotesi cade). | Evita un obiettivo non-falsificabile; il fallimento atteso (serve estensione) è il risultato di valore. |
| D-06 | "Estensione necessaria" = **forced lossy irriducibile** che sopravvive al tentativo avversariale del valutatore di evitarlo con un design pattern. | Rende "per forza necessaria" un verdetto verificabile, non un'impressione di chi modella. |
| D-07 | **Decomporre** in 4 strutture (fan-out dinamico, pipeline per-task, fork/join verifier, fan-in) e modellarle **tutte e quattro**. | Signal granulare e leggibile; localizza dove serve l'estensione; non abbandona alla prima struttura che si forza. |
| D-08 | Parallelismo: fuori la **semantica operativa**, dentro la **rappresentazione strutturale**. | La struttura del parallelismo è dove l'ipotesi vive o muore; lo scheduling è dominio runtime. |
| D-09 | **Esecuzione autonoma** dopo la partenza: l'agente itera senza ok per ogni passo. | Richiesta dell'utente; è anche il collaudo più severo del criterio (se i criteri sono buoni, il loop gira da solo). |
| D-10 | La **decisione finale** di promozione torna all'utente; l'autonomia copre solo l'esecuzione. | Confine del metodo: l'agente raccomanda, l'utente decide Adopt/Refine/Reject. |
| D-11 | Budget del loop: **32 iterazioni, 60 minuti, stallo a 3** (primo tetto che scatta ferma e restituisce il parziale). | Loop autonomo richiede un freno; numeri calibrati col ritmo reale dell'agente (~2 min/giro), non con tempo umano. (Prima proposta 20/40min, alzata dall'utente a 32/1h in fase di accettazione.) |
| D-12 | Le **condizioni di uscita** sono scritte come fatti osservabili in file/log. | Prezzo dell'autonomia: l'agente deve decidere raggiunto/forfait/falsificato da solo, senza interpellare l'utente. |
| D-13 | **launch/await separati**: il lancio è non bloccante, il blocco è solo all'istruzione di attesa. | Se il blocco fosse al lancio, non si potrebbero avviare più batch / altre FSM prima di attendere. |
| D-14 | Scelta della **variante A** (launch/await come campi su stato); B (effetto su transizione) scartata; C (handle nel context) evoluzione opzionale. | A è la decomposizione naturale dello `state-invoke`, additiva e leggibile; B introduce comportamento sulle transizioni (oggi pure); C costa una seconda estensione (working vars nel context). |
| D-15 | **timeout + on_timeout** sull'await (H7). | La macchina sospesa deve potersi risvegliare se i processi non tornano; vale a qualunque scala, fino a giorni. |
| D-16 | **Join policy** `all`/`quorum(k)`/`first`. | Resilienza: un batch lento non deve bloccare se la soglia è raggiunta. |
| D-17 | **Attesa reattiva** (`react`/`on_each` + early-exit). | Il caso "a flusso" è esprimibile come counted-join con uscita anticipata guardata; POM è già una FSM a eventi. |
| D-18 | **Fan-out annidato** ammesso (composizione ricorsiva di launch/await). | Compone come lo `state-invoke`; la FSM di vertice resta minimale. |
| D-19 | **Canale di controllo** `cancel`/`suspend`/`resume` propagati dal padre alle figlie attive; unico costrutto nuovo: **`compensation`**; `cancelled` terminale implicito. | suspend/resume sono H5 propagato (lifecycle, non stati di dominio); solo la saga di undo va modellata. Semplicità con completezza. |
| D-20 | Il **contratto** è un contributo al dominio **workflow** (estensione SPEC-0006), non al metodo loop/goal; `agent-loop-fsm` riceve solo il **feedback metodologico**. | Due livelli distinti: il contenuto è workflow, il rimbalzo è la prova che il metodo loop/goal funziona. |
| D-21 | Due **implementazioni di riferimento** (TypeScript, Python), semplici nella struttura ma complete in funzionalità, esecutori del contratto. | POM suggerisce l'implementazione; il target la realizza. Riferimento estensibile, non runtime canonico di POM. |
