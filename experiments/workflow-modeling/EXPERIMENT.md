# Esperimento - Workflow Modeling Support

| Campo | Valore |
|---|---|
| Data | 2026-05-29 |
| Tipo | research / metodo / estensione POM |
| Stato | consolidated 2026-05-29 (promosso a SPEC-0006 + skill workflow + script + template + 2 guide) |
| Branch / Path | `exp/workflow-modeling` + `experiments/workflow-modeling/` |
| Isolamento | branch dedicato + cartella esperimento |
| Owner | POM maintainer |

Questo documento raccoglie il progetto e le evidenze dell'esperimento. Non è una decisione, non è una specifica e non autorizza modifiche al metodo POM principale. Gli artefatti candidati (spec, skill, template, script) restano dentro questa cartella fino a una decisione esplicita di promozione.

## Obiettivo

Valutare se è fattibile e utile aggiungere a POM un supporto al ciclo *definire → validare → guidare l'implementazione* di workflow applicativi, in modo coerente con la filosofia POM (metodo leggero, "POM consiglia non impone", nessun runtime nascosto, niente dipendenze pesanti).

Il supporto non deve eseguire workflow né mantenere istanze vive: deve aiutare l'agente di coding di un progetto target a scrivere correttamente, nel codice della propria applicazione, i workflow di dominio (ticket lifecycle, approvazione documenti, evoluzione di una specifica, ecc.).

## Ipotesi

- **H1** Un formato YAML dichiarativo (stati, transizioni, eventi, guard testuali, descrizioni di dominio) è abbastanza espressivo per modellare almeno tre workflow realistici eterogenei.
- **H2** Un validatore statico in TypeScript senza dipendenze esterne pesanti riesce a individuare gli errori strutturali ricorrenti (stati orfani, irraggiungibilità, dead-end indesiderati, transizioni ambigue) e a produrre un report leggibile.
- **H3** Una skill `workflow` con modi `design | validate | diagram | implement | scenarios` è sufficiente a guidare l'agente di coding senza che il metodo cresca di volume oltre una soglia ragionevole (skill < 100 righe, prompt < 200 righe).
- **H4** La modalità `implement` può guidare a tradurre il modello in codice TypeScript reale senza imporre una libreria FSM specifica, offrendo pattern alternativi (table-based, switch su stato, libreria FSM esistente come xstate) con criteri di scelta.
- **H5** Il pacchetto complessivo (spec + skill + template + script) sta sotto un peso accettabile per POM e non rompe il principio "POM consiglia non impone".

## Criteri di valore minimi

L'esperimento ha valore se, alla fine:

1. i tre esempi YAML (`ticket-lifecycle`, `document-approval`, `spec-evolution`) sono modellati senza forzature evidenti del formato;
2. il validatore prototipo trova errori introdotti volutamente negli esempi e non produce falsi positivi;
3. dato uno dei tre esempi, un agente di coding produce, in TypeScript, codice coerente con il modello (transizioni che combaciano con lo YAML, guard rispettate) senza che la skill imponga una libreria;
4. la modellazione di `spec-evolution` (il lifecycle delle SPEC POM stesse) esce pulita o, se non esce pulita, l'esperimento documenta in modo chiaro perché — e cosa servirebbe per renderla pulita (per esempio: stati ortogonali, sotto-macchine, sostegno a "pause" come Deferred/Blocked).

## Scope

Incluso nell'esperimento:

- formato YAML del modello di workflow;
- regole di validazione statica;
- generatore Mermaid dal modello;
- generatore di scenari di verifica lingua-agnostici;
- skill `workflow` con modi multipli;
- spec candidate (futura SPEC-0006 se promossa);
- guida all'implementazione per agente di coding TypeScript;
- tre esempi di workflow eterogenei (ticket, document approval, spec evolution).

Escluso dall'esperimento:

- runtime engine per eseguire workflow;
- istanze vive di workflow tracciate da POM;
- generazione automatica di codice nel progetto target (POM guida l'agente, non sostituisce l'agente);
- export verso TLA+ / NuSMV;
- adapter verso librerie FSM specifiche (xstate, robot3 ecc.) — al massimo menzionati nella guida implementativa;
- modellazione di workflow concorrenti, distribuiti o con timing.

## Piano di isolamento

- **Branch**: `exp/workflow-modeling`, partito da `main` pulito.
- **Cartella**: `experiments/workflow-modeling/`, ramo esclusivo per gli artefatti candidati.
- **Dipendenze**: lo script prototipo `scripts-candidate/lint-workflows.mjs` non aggiunge dipendenze al `package.json` del repo POM. Se servisse un parser YAML, useremo `node --experimental-strip-types` con un piccolo parser interno o `js-yaml` invocato via `npx` per la durata dell'esperimento.
- **Niente import da `experiments/` nel codice stabile**: regola POM generale, vale qui.
- **Niente modifica a wiki, prompt, skill, template, README di main durante l'esperimento.** Solo la cartella `experiments/workflow-modeling/` cambia.

## Procedura

1. Scaffolding (questo commit).
2. Compilare `examples/spec-evolution.yaml` come primo esempio reale, allineato agli stati canonici delle SPEC POM (`Draft`, `Accepted`, `Complete`, più transizioni di superamento/rifiuto/ritiro).
3. Compilare `examples/ticket-lifecycle.yaml` e `examples/document-approval.yaml`.
4. Iterare formato YAML e regole di validazione fino a coprire i tre esempi senza forzature.
5. Implementare `scripts-candidate/lint-workflows.mjs` come validatore + generatore Mermaid + generatore scenari.
6. Eseguire il validatore sui tre esempi, sia in versione corretta che con errori introdotti volutamente.
7. Usare la skill `skills-candidate/workflow.md` modo `implement` per far produrre a un agente di coding del codice TypeScript reale sull'esempio scelto.
8. Annotare in `notes/` ogni difficoltà di modellazione e ogni proposta di estensione del formato; raccogliere output di validazione, Mermaid e codice generato in `evidence/`.

## Rischi

| Area | Rischio | Mitigazione |
|---|---|---|
| Sicurezza | nessuno | n/a |
| Privacy | nessuno | n/a |
| Licenze | nessuno | nessuna dipendenza esterna prevista |
| Costi | trascurabili | tutto in locale |
| Manutenibilità | la skill `workflow` cresce oltre soglia e diventa un mini-framework | tetto esplicito: skill < 100 righe; se il prompt supera 200 righe, rivedere lo scope |
| Coerenza filosofia POM | l'esperimento spinge POM verso framework | promozione vincolata a "POM consiglia, non impone" verificato voce per voce in fase di consolidazione |
| Espressività formato YAML | i tre esempi non bastano e servono workflow concorrenti / sotto-macchine | dichiarato fuori scope; se l'esperimento mostra che servono, esito = riformulazione, non promozione |

## Open point dichiarati

- **Stati ortogonali / di pausa**: come modellare `Deferred`, `Blocked`, `Waiting` rispetto al lifecycle principale? Stato separato, modifier ortogonale, o esclusi dal modello FSM? Esempi a confronto: `spec-evolution.yaml` li esclude, `ticket-lifecycle.yaml` modella `waiting_customer` come stato primario. Open question derivata: il formato deve permettere a uno stato di dichiararsi "variante di pausa" di un altro stato, per tenere leggibile il percorso principale?
- ~~**Stato terminale con riapertura ammessa**~~ — **CHIUSO** 2026-05-29: aggiunto attributo `re_entry_allowed` allo schema, default `false`; quando `true` su stato `is_final: true` sopprime W003. Applicato a `complete` di spec-evolution e `closed` di ticket-lifecycle. Vedi "Decisione: re_entry_allowed" sotto.
- **Guard "non applicabili"**: in `ticket-lifecycle.yaml`, `mark_duplicate` da `new` salta volutamente la guard `has_reproduction_steps`. Il modello lo esprime omettendo la guard, ma non dichiara esplicitamente che la guard non si applica. Se i modelli crescono, può servire un marcatore `no_guard_required: true`.
- **Transizioni temporali**: ticket reali si chiudono automaticamente dopo N giorni in `waiting_customer`. Dichiarate fuori scope per v1; se l'uso le richiede, futura estensione `time_trigger` su transizione.
- **Guard testuali vs codificate**: nel modello YAML le guard sono prosa, ma l'agente di coding deve poterle trasformare in codice. Va definita una convenzione (nome simbolico + descrizione testuale).
- **Workflow-set vs singolo workflow**: un progetto può avere più workflow correlati (es. ticket e approvazione collegati). Per ora si modellano separati; la composizione resta open point.
- **Versionamento del modello**: cosa succede quando il workflow cambia e ci sono istanze "in vita" nel codice target? Da definire come raccomandazione, non come funzione POM.

## Evidenze

Vedi `evidence/` per output del validatore, diagrammi Mermaid generati e codice TypeScript prodotto dall'agente di coding durante le iterazioni.

## Esito

**Decisione: promozione completa.**

Tutte e quattro le ipotesi (H1 espressività, H2 validatore efficace, H3 skill efficace entro vincoli, H4 guida implementativa efficace) sono **confermate** con evidenze concrete e ripetibili. L'esperimento ha prodotto materiale che eccede i criteri di valore minimi originali e ha aperto direzioni che inizialmente non erano in scope (composizione sincrona, context injection Result<Terminal,Output>, mapping XState + stately.ai, multi-language TS+Python, suspend/restore, generatore Mermaid integrato, validazione su progetto reale a 3 livelli di composizione).

### Cosa H1–H4 sono diventate

- **H1 (espressività YAML)**: confermata su tre workflow eterogenei sintetici (`spec-evolution`, `ticket-lifecycle`, `document-approval`), due workflow reali combinati (`order-processing` pipeline e `loan-application` multi-primitiva), e quattro FSM reali del progetto internal AI agent (operational, analyzer, clean-family-repair, semantic-family-master con 7 famiglie). Tutti modellabili senza modifiche allo schema, salvo l'aggiunta motivata di `re_entry_allowed` e `context_schema` durante l'esperimento.
- **H2 (validatore efficace)**: 50 regole Error + 4 Warning implementate, 30 fixture broken ciascuna che scatta la regola attesa, regressione zero sui 21+ workflow validati. Bug interno trovato e corretto grazie a un caso reale (E056 era controllato sul key invece che sul value).
- **H3 (skill sufficiente entro vincoli)**: skill `workflow` 62 righe, prompt 112 righe, entrambi sotto i tetti dichiarati. Prompt operativo con 5 modi e collegamento al validator concreto.
- **H4 (guida implementativa efficace senza imposizioni)**: confermata in TypeScript (Pattern A, 15 test passing) e in Python (Pattern A, 15 test passing) sullo stesso modello. Sezione "Suspend and Restore" con 3 evidence aggiuntive (17 test totali) che dimostra persistenza tra processi senza che POM fornisca runtime.

### Cosa il giro 2 ha aggiunto oltre lo scope iniziale

- **Quattro primitive sincrone di composizione** (pipeline lineare, invoke-da-stato, invoke-da-evento, context-injection) con quattro pilastri esplicitati (no async / no shared state / no inheritance / no runtime).
- **Mapping XState v5** + workflow operativo stately.ai per visualizzazione e simulazione interattiva.
- **Generatore Mermaid integrato nel validator** (`--mermaid-dir`): 38 diagrammi generati in una passata sweep, drift YAML↔diagramma impossibile per costruzione.
- **Guida di adozione+estensione** (`WORKFLOW_INTEGRATION_GUIDE.md`) per i team che adotteranno POM-workflow nei loro progetti.
- **Validazione su progetto reale internal AI agent**, inclusa modellazione spinta della Semantic Family (7 famiglie + master dispatcher) e composizione a 3 livelli (operational → analyzer → clean-family-repair).

### Cosa resta come open point dichiarato (non blocca promozione)

- **Bounded retry / loop_guard primitive**: emerso da analyzer-fsm (`MAX_LLM_ATTEMPTS=3`), riemerge in clean-family-repair (`MAX_FAMILY_REPAIR_ATTEMPTS=3`), pattern ricorrente. Schema growth candidato concreto per un futuro giro 3. Il contatore stesso è già suspend-friendly perché vive in context — manca solo l'*enforcement* del bound a livello schema.
- **Rule engine multi-machine** (semantic family classification): confermato out-of-scope. Il "forced fit" + "pushed modeling" hanno dimostrato sia il costo del forzarlo sia il limite duro. Resta Pattern C territory.
- **Pipeline-level context passing**: oggi la pipeline lineare non passa context strutturato tra membri (il dataflow vive nell'orchestrator del target). Candidato per futura estensione se un caso reale lo richiede.
- **Codice TypeScript guidato per pipeline orchestrator** (`order-processing`): pianificato come task del round 2, rinviato al deploy di POM su ai-agent (memoria utente). Non blocca la promozione: H4 già confermata su `spec-evolution` in TS+Python.
- **Info rules nel validator** (cycles diagnostic, naming conventions): out-of-scope dichiarato fin dalla prima passata, candidato per giro 3.

## Consolidazione

| Artefatto sperimentale | Destinazione canonica | Azione |
|---|---|---|
| `spec-candidate/SPEC-DRAFT-workflow-modeling.md` | `specs/SPEC-0006-workflow-modeling.md` | Promote + status: Complete |
| `CONTEXT-INJECTION.md` (closed design decision) | `decisions/ADR-0002-workflow-context-injection.md` | Promote come ADR Accepted |
| `skills-candidate/workflow.md` | `skills/workflow.md` | Promote skill card |
| `prompts/workflow.md` | `prompts/27-workflow-modeling.md` | Promote prompt canonico |
| `templates-candidate/WORKFLOW_TEMPLATE.yaml` | `templates/WORKFLOW_TEMPLATE.yaml` | Promote template |
| `templates-candidate/PIPELINE_TEMPLATE.yaml` | `templates/PIPELINE_TEMPLATE.yaml` | Promote template |
| `templates-candidate/WORKFLOW_IMPLEMENTATION_GUIDE.md` | `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` | Promote guide |
| `templates-candidate/WORKFLOW_INTEGRATION_GUIDE.md` | `templates/WORKFLOW_INTEGRATION_GUIDE.md` | Promote guide |
| `scripts-candidate/lint-workflows.mjs` | `scripts/lint-workflows.mjs` | Promote validator |
| `scripts-candidate/mermaid.mjs` | `scripts/mermaid.mjs` | Promote shared renderer |
| `scripts-candidate/to-mermaid.mjs` | `scripts/to-mermaid.mjs` | Promote CLI |
| `xstate-compat/to-xstate.mjs` | `scripts/to-xstate.mjs` | Promote XState transformer |
| `xstate-compat/COMPATIBILITY.md` | `docs/workflow-xstate-compatibility.md` | Promote como doc support |
| `examples/spec-evolution.yaml`, `ticket-lifecycle.yaml`, `document-approval.yaml` | `templates/examples/workflow/` | Promote come esempi di template |
| `evidence/typescript/spec-evolution/` | (resta nell'experiment come storia) | Lasciare in experiments |
| `evidence/python/spec-evolution/` | (resta) | Lasciare in experiments |
| Tutti gli `evidence/mermaid/*.mmd` | (resta) | Lasciare in experiments come archivio dei diagrammi originali |
| `experiments/workflow-modeling/` | resta in repo come storia operativa | Marca status: `consolidated` su `EXPERIMENT.md` |

Aggiornamenti coordinati richiesti:

- `README.md`: aggiungere riga su skill `workflow` in tabella Quickstart + sezione introduttiva.
- `skills/README.md`: aggiungere voce `workflow` nella tabella delle skill.
- `package.json`: aggiungere `"pom:workflow:lint": "node scripts/lint-workflows.mjs"`.
- `scripts/pom-help.ts`: aggiungere voce `pom:workflow:lint`.
- `scripts/install-pom.ts` + `templates/POM_UPDATE_TEMPLATE.mjs`: includere i nuovi file negli installer.
- `CHANGELOG.md`: entry per SPEC-0006 + skill `workflow`.

Tutte queste azioni vengono eseguite nei commit di promozione successivi a questo.

## Esito intermedio - prima passata validator (2026-05-29)

Il validatore prototipo `scripts-candidate/lint-workflows.mjs` è stato implementato nella sola modalità Error e fatto girare sui due esempi compilati e su sei fixture minimali con errori volutamente introdotti.

**Setup**

- Parser YAML: `js-yaml` 4.x, installato come dipendenza isolata in `scripts-candidate/package.json` locale all'esperimento. `node_modules/` ignorato; `package-lock.json` committato per riproducibilità. Nessuna modifica al `package.json` di POM principale.
- Decisione differita: alla promozione si valuterà se `js-yaml` resta o si scrive un parser interno per il subset documentato. L'esperimento dimostra solo che il flusso regge.

**Regole Error implementate (17)**

E000 parse error, E001 nome workflow, E002 initial_state mancante, E003 initial_state non in states, E004 states vuoto, E005..E007 entry senza name, E008..E010 nomi duplicati, E011..E013 transizione senza from/to/event, E014..E017 transizione che riferisce stato/evento/guard non dichiarati.

**Risultati**

| File | Errors | Verdict |
|---|---|---|
| `examples/spec-evolution.yaml` | 0 | PASS |
| `examples/ticket-lifecycle.yaml` | 0 | PASS |
| `evidence/broken-fixtures/min.broken-E003-initial-state-missing.yaml` | 1 | FAIL (E003) |
| `evidence/broken-fixtures/min.broken-E008-duplicate-state.yaml` | 1 | FAIL (E008) |
| `evidence/broken-fixtures/min.broken-E014-from-undeclared.yaml` | 1 | FAIL (E014) |
| `evidence/broken-fixtures/min.broken-E015-to-undeclared.yaml` | 1 | FAIL (E015) |
| `evidence/broken-fixtures/min.broken-E016-event-undeclared.yaml` | 1 | FAIL (E016) |
| `evidence/broken-fixtures/min.broken-E017-guard-undeclared.yaml` | 1 | FAIL (E017) |

Ogni fixture broken produce *esattamente* la regola attesa, niente cascate. Gli esempi corretti passano senza falsi positivi. Il criterio di valore #2 dell'esperimento è soddisfatto per le sole regole Error; resta da estendere a Warning quando il giro sarà ampliato.

**H1 e H2: stato dopo la prima passata Error**

- **H1** (espressività YAML): regge sui due workflow eterogenei già compilati. Conferma parziale, dipendente da `document-approval.yaml`.
- **H2** (validatore statico efficace): confermata per le regole Error sui casi minimi. Da rivedere quando si introdurranno Warning (irraggiungibilità, dead-end, terminale con uscita, non-determinismo).

## Esito intermedio - seconda passata validator: regole Warning (2026-05-29)

Il validatore è stato esteso con quattro regole Warning. Le regole Error restano in vigore; il verdict ora è ternario: PASS (0 errori, 0 warning), PASS WITH WARNINGS (0 errori, ≥1 warning), FAIL (≥1 errore). Exit code: 0 anche con warning, 1 solo con errori.

**Regole Warning implementate (4)**

- W001 stato irraggiungibile dall'`initial_state`;
- W002 stato non terminale senza transizioni in uscita (dead-end silenzioso);
- W003 stato terminale (`is_final: true`) con almeno una transizione in uscita;
- W004 non-determinismo: stessa coppia `(from, event)` con copertura guard ambigua (almeno una transizione senza guard quando ce ne sono due o più).

**Risultati sui due esempi compilati**

| File | Errors | Warnings | Verdict | Warning emersi |
|---|---|---|---|---|
| `examples/spec-evolution.yaml` | 0 | 1 | PASS WITH WARNINGS | W003 su `complete` (transizione `supersede`) |
| `examples/ticket-lifecycle.yaml` | 0 | 1 | PASS WITH WARNINGS | W003 su `closed` (transizione `reopen`) |

**Risultati sulle quattro fixture Warning**

| Fixture | Warning attesi | Warning effettivi |
|---|---|---|
| `min.broken-W001-unreachable.yaml` | W001 | W001 |
| `min.broken-W002-dead-end.yaml` | W002 | W002 |
| `min.broken-W003-terminal-with-outgoing.yaml` | W003 | W003 |
| `min.broken-W004-nondeterministic.yaml` | W004 | W004 |

Le fixture W001 e W003 inizialmente producevano anche un W002 collaterale legittimo (sull'orphan e sulla destinazione del re-entry); sono state riallineate dichiarando `is_final: true` per ottenere "una regola per fixture". Le sei fixture Error pre-esistenti restano FAIL con il codice Error atteso; in due casi (E014, E015) producono Warning aggiuntivi *legittimi* perché la rottura introduce davvero irraggiungibilità/dead-end. Comportamento dichiarato come desiderato: il validatore segnala tutti i problemi indipendenti, non si ferma al primo.

**Segnale forte emerso: pattern "terminale con eccezione dichiarata"**

I due esempi compilati producono *entrambi* W003, su contesti diversi (`complete → superseded` via `supersede`; `closed → in_progress` via `reopen`). Non è una eccezione isolata: il pattern emerge naturalmente nei lifecycle reali (supersessione di una spec, riapertura di un ticket). Conseguenza: la proposta di estensione schema `re_entry_allowed: true` sullo stato non è più solo un'ipotesi su un caso, è supportata da due evidenze indipendenti raccolte sui modelli che vogliamo che POM supporti. Decisione su `re_entry_allowed` da prendere come passo successivo dell'esperimento.

**H1 e H2: aggiornamento**

- **H1**: regge. Nessun aggiustamento di formato richiesto dalle Warning rules.
- **H2**: confermata su Error + Warning per il set di regole implementate. Resta da decidere se servono Info rules (cicli, naming) per il primo giro di promozione.

## Decisione: re_entry_allowed (2026-05-29)

L'evidenza emersa dalla seconda passata Warning ha portato a chiudere l'open point sul "terminale con eccezione dichiarata". Entrambi gli esempi compilati producevano W003 su stati terminali (`spec-evolution.complete`, `ticket-lifecycle.closed`) per transizioni di superamento/riapertura semanticamente legittime; il pattern era ricorrente, non eccezionale.

**Decisione**: lo schema include un attributo opzionale `re_entry_allowed` sullo stato, con default `false`. Quando impostato a `true` su uno stato `is_final: true`, il validatore sopprime W003 su quello stato. Su uno stato non terminale l'attributo è ignorato silenziosamente nel primo giro (potenziale Info rule futura).

**Cosa cambia**

- `templates-candidate/WORKFLOW_TEMPLATE.yaml`: nuovo attributo documentato con commento.
- `spec-candidate/SPEC-DRAFT-workflow-modeling.md`: schema documentato, regola W003 aggiornata, nuova sezione "Closed Decisions".
- `examples/spec-evolution.yaml`: `re_entry_allowed: true` su `complete`; open point migrato a `closed_points`.
- `examples/ticket-lifecycle.yaml`: `re_entry_allowed: true` su `closed`; open point migrato a `closed_points`.
- `scripts-candidate/lint-workflows.mjs`: W003 sopprime su `re_entry_allowed === true`.

**Verifica della decisione**

| File | Errors | Warnings | Verdict |
|---|---|---|---|
| `examples/spec-evolution.yaml` | 0 | 0 | **PASS** (era PASS WITH WARNINGS) |
| `examples/ticket-lifecycle.yaml` | 0 | 0 | **PASS** (era PASS WITH WARNINGS) |
| `evidence/broken-fixtures/min.ok-re-entry-allowed.yaml` (nuova) | 0 | 0 | **PASS** |
| `evidence/broken-fixtures/min.broken-W003-terminal-with-outgoing.yaml` (senza l'attributo) | 0 | 1 | **PASS WITH WARNINGS** (W003 continua a scattare) |

La soppressione è chirurgica: si attiva solo se l'attributo è esplicito; non maschera altri errori. La fixture positiva di conferma esiste accanto a quella che testa la regola, così la prossima persona che legge il validatore vede entrambe le facce della stessa decisione.

## Esito intermedio - terzo esempio: document-approval (2026-05-29)

Compilato `examples/document-approval.yaml` e fatto girare il validator. Risultato: PASS pulito al primo tentativo, zero errori, zero warning. Nessuna modifica allo schema è stata richiesta dal terzo modello.

**Proprietà nuove che il terzo esempio ha messo alla prova**

| Proprietà | Modellata come | Esito |
|---|---|---|
| Guard di ruolo (chi può approvare?) | Guard `is_approver` con descrizione testuale, semantica nel codice target | Regge. Il ruolo non diventa entità prima classe; resta nel guard. |
| Publication ≠ approval | Stato `approved` separato da `published`, transizione `publish` esplicita | Regge. Il modello mostra a colpo d'occhio che l'approvazione è un permesso, non l'azione finale. |
| Archive da stati multipli | Tre transizioni `archive` distinte: da `approved`, `published`, `rejected` | Regge. Lo schema accetta più transizioni con stesso evento da stati diversi senza ambiguità. |
| Withdrawal solo da draft | Una sola transizione `withdraw` da `draft` | Regge. Stesso pattern di `spec-evolution`. |
| Revisione che torna a draft | Transizione `request_revisions` da `in_review` a `draft` | Regge. Alternativa "revisions_requested" come stato separato resta open point in spec-evolution. |
| `rejected` non-terminale ma con un solo evento in uscita | Stato non-final con una transizione `archive` | Regge senza warning, perché esce. Ma è borderline: confluisce in archived sempre. |

**Open point nuovi dichiarati dal modello**

- Parallel / multi-signoff approval (fuori scope v1; richiederebbe sotto-macchine o catena di stati);
- Role come entità prima classe nello schema (oggi vive solo nel guard `is_approver`);
- Versioning dei documenti pubblicati (supersessione non modellata; lasciata al codice target);
- Archive automatico per tempo da rejected (timer transition, già dichiarato fuori scope).

**H1: confermata**

I criteri di valore minimi richiedevano tre workflow modellati senza forzature evidenti del formato. Il terzo esempio è stato modellato senza modifiche allo schema, ha trovato proprietà nuove e le ha gestite con i meccanismi esistenti (guard nominata per ruoli, transizioni multiple sullo stesso evento per archive). H1 è confermata sul set di esempi previsto dall'esperimento.

## Esito intermedio - test implementazione TypeScript guidata (2026-05-29)

Eseguito il test di H4: la skill `workflow` in modo `implement`, applicata a `examples/spec-evolution.yaml`, deve guidare la produzione di codice nel linguaggio target senza imporre una libreria.

**Setup**

- Target language: TypeScript su Node.js 22.19 con `--experimental-strip-types`. Zero compilatore, zero `tsconfig`, zero dipendenze esterne.
- Test runner: `node:test` built-in.
- Procedura: pedissequa esecuzione dei passi del modo `implement` da `prompts/workflow.md`.

**Pattern scelto**

Pattern A (transition table) sulla base dei criteri del `WORKFLOW_IMPLEMENTATION_GUIDE.md`: modello sotto soglia (7 stati, 7 eventi, 2 guard), guard semplici, nessuna gerarchia, nessun bisogno di hook entry/exit, nessuna libreria FSM già in uso. Pattern B (switch su stato) era praticabile ma meno data-driven; Pattern C (libreria) sarebbe stato over-engineering.

**Risultati**

| Metrica | Valore |
|---|---|
| File prodotti | `spec-evolution.ts`, `guards.ts`, `spec-evolution.test.ts`, `README.md`, `test-output.txt` |
| Dipendenze aggiunte | 0 |
| Test scritti | 15 (positive transitions, guard true/false, refused per (from,event) non dichiarato, terminale, `re_entry_allowed` su `complete`) |
| Esito test | pass 15, fail 0, exit 0 |
| Posizione | `evidence/typescript/spec-evolution/` |

**Cosa la guida ha guidato (riconosciuto esplicitamente nel `README.md` accanto al codice)**

- Selezione del pattern via tabella di criteri;
- Convenzione di naming guard: predicate `guard_<nome_yaml>`;
- Docstring del predicate copiata verbatim dalla `description:` del YAML (il modello resta fonte autoritativa, il codice solo implementa);
- Categorie di test dal modo `scenarios` (positive, refused, guard true/false, terminale);
- Mapping di `re_entry_allowed: true` a livello di codice → terminale con un'eccezione di transizione dichiarata.

**Cosa la guida NON ha guidato (correttamente delegato al target)**

- Dove vivono i predicati guard nell'architettura del target;
- Storage e persistenza della stato;
- Quale test runner — qui scelto per zero-dipendenza, in un target reale verrebbe da `pom.config.json`;
- Tipo dell'entità che trasporta lo stato;
- Eventi di osservabilità sulle transizioni.

**H4: confermata per Pattern A**

La guida ha portato da YAML a codice eseguibile e testato senza imporre librerie, framework o architettura. Le cose non guidate sono correttamente di pertinenza del target, non lacune della guida. Pattern B e C restano non verificati da questa evidenza; per la promozione bastano (e gli altri pattern possono essere stressati in round successivi).

## Compatibilità XState (verifica esterna, 2026-05-29)

Verifica esterna richiesta: il formato POM YAML è compatibile come definizioni con XState (statelyai/xstate)? L'obiettivo non è adottare XState come runtime di POM, ma confermare che il modello dichiarativo non sia un formalismo privato senza precedenti, e dare ai progetti che usano XState un percorso per condividere un'unica fonte autoritativa.

**Cosa esiste in XState**

- `packages/core/src/machine.schema.json` nel repo XState (338 righe, JSON Schema draft-07): definisce il *serialized state node format* — la rappresentazione interna a runtime, non l'input di `createMachine()`. Snapshot in `xstate-compat/xstate-machine.schema.json`.
- L'input `MachineConfig` di `createMachine()` non ha JSON Schema pubblicato: è definito dai TypeScript types e dalla documentazione `stately.ai/docs/`. È questo il livello rilevante per POM (è quello che uno sviluppatore scrive a mano).

**Mappatura POM YAML → XState MachineConfig**

Dettaglio completo in `xstate-compat/COMPATIBILITY.md`. Sintesi:

| Concetto POM | Slot XState | Esito |
|---|---|---|
| `workflow`, `initial_state`, `states[].name`, `description` | `id`, `initial`, `states.<name>`, `description` | Mapping diretto. |
| `states[].is_final: true` + no `re_entry_allowed` | `type: "final"` | Mapping diretto. |
| `states[].is_final: true` + `re_entry_allowed: true` | atomic state + `on{}`, `meta.pom` per l'intento POM | Nessun equivalente XState; preservato come metadato. |
| `events[]` + descrizione | stringhe sotto `on`, descrizioni in `meta.pom.events[]` | XState non dichiara eventi globalmente. |
| `guards[]` + descrizione | nome sotto `guard:`, descrizioni in `meta.pom.guards[]` | XState non dichiara guards globalmente; predicate function in `options.guards`. |
| `transitions[]` flat | nidificati in `states[<from>].on[<event>]` | Trasformazione strutturale (array piatto → object nidificato). |
| `invariants[]` | `meta.pom.invariants[]` | Nessun equivalente XState. |
| Più transizioni stesso (from, event) | array sotto `on.<event>` | XState gestisce nativamente. |

**Cosa XState ha che POM non modella**

Stati compound/parallel/history, entry/exit/transition actions, invoke/actors, `context`, transizioni temporali (`after:`). La `WORKFLOW_IMPLEMENTATION_GUIDE.md` di POM rimanda esattamente a queste feature quando si sceglie Pattern C (library-based). POM resta un *sottoinsieme dichiarativo* del MachineConfig di XState.

**PoC del transformer**

`xstate-compat/to-xstate.mjs`: converte un workflow YAML in MachineConfig JSON XState v5. Riusa `js-yaml` locale dell'esperimento, zero dipendenze nuove. Eseguito sui tre esempi compilati; output sotto `evidence/xstate/`.

| Esempio | Output JSON | Dimensione | Verifica strutturale |
|---|---|---|---|
| `spec-evolution.yaml` | `evidence/xstate/spec-evolution.xstate.json` | 6.4 KB | `complete` → atomic + `meta.pom.re_entry_allowed`; `superseded/withdrawn/rejected` → `type: "final"` |
| `ticket-lifecycle.yaml` | `evidence/xstate/ticket-lifecycle.xstate.json` | 7.8 KB | `closed` → atomic + `meta.pom.re_entry_allowed`; `duplicate/wont_fix` → `type: "final"` |
| `document-approval.yaml` | `evidence/xstate/document-approval.xstate.json` | 8.7 KB | `archived/withdrawn` → `type: "final"`; role guards passati come nomi (predicate function in target code) |

**Cosa non è stato fatto (follow-up opzionali)**

- Validazione runtime con `createMachine()` di XState: richiede di installare `xstate` come dipendenza locale dell'esperimento. Volontariamente fuori scope: l'obiettivo è documentale, non runtime.
- Transformer inverso XState → POM: deliberatamente *non* progettato, perché un MachineConfig XState che usa compound/parallel/actions non si flatta nel formato POM senza perdita di semantica.

**Verdetto**

POM YAML è un sottoinsieme dichiarativo del MachineConfig di XState, esteso con slot documentali (descrizioni di eventi/guards, invariants, `re_entry_allowed`, open/closed points) che XState non possiede ma accetta sotto `meta`. Conversione POM → XState lossless è possibile e implementata; conversione inversa è esplicitamente fuori scope. La forma dichiarativa POM non è quindi un'invenzione privata: è coerente con una libreria FSM mainstream, e un progetto che usa XState può mantenere POM come fonte autoritativa per la porzione flat-FSM e generare il config XState on demand.

## Stato finale delle quattro ipotesi

- **H1** (espressività YAML): **confermata** su tre workflow eterogenei (spec-evolution, ticket-lifecycle, document-approval), nessuna modifica allo schema dopo il primo.
- **H2** (validatore statico efficace): **confermata** per le 17 regole Error e le 4 regole Warning implementate; Info rules restano target di promozione.
- **H3** (skill sufficiente entro vincoli dimensionali): **confermata** — skill 62 righe (sotto 100), prompt 112 righe (sotto 200), prompt operativo realmente esistente e usato in H4.
- **H4** (guida implementativa efficace senza imposizioni): **confermata** per Pattern A; B e C non testati ma non bloccanti per la promozione.

## Giro 2 — composizione sincrona (2026-05-29)

Apertura giro 2 per coprire un caso d'uso applicativo emerso durante la riflessione: macchine a stati che ne attivano altre, con il vincolo "isolate tra loro se non da stati iniziali e finali". Scope decisione:

- in scope: tre primitive sincrone (pipeline lineare, invoke da stato, invoke da evento);
- fuori scope, permanente: composizione asincrona / parallel regions, già fuori dalla spec v1.

**Primitiva 1 — pipeline lineare (completata in questo commit)**

Schema: nuovo file `<name>.pipeline.yaml` con root key `pipeline:` e `sequence:`. Ogni membro dichiara `completes_on: [{state, next}]` dove `state` è uno stato terminale del workflow membro e `next` è un altro membro o `null`.

Implementato:

- `templates-candidate/PIPELINE_TEMPLATE.yaml`: schema documentato.
- `scripts-candidate/lint-workflows.mjs`: dispatcher che riconosce file pipeline tramite root key; 10 nuove regole Error (E020–E029); cycle detection statica via DFS coloring; risoluzione path relativa al file pipeline.
- Esempio toy: `examples/pipeline-toy/{stage-a,stage-b,stage-c,toy.pipeline}.yaml` per dimostrare il pattern.
- 5 fixture broken per E023 (file mancante), E025 (stato non terminale), E026 (next non-membro), E027 (ciclo), E029 (mode async).

**Verifica**

| File | Errors | Verdict |
|---|---|---|
| `examples/pipeline-toy/stage-a.yaml` | 0 | PASS |
| `examples/pipeline-toy/stage-b.yaml` | 0 | PASS |
| `examples/pipeline-toy/stage-c.yaml` | 0 | PASS |
| `examples/pipeline-toy/toy.pipeline.yaml` | 0 | PASS |
| `pipe.broken-E023-missing-member.pipeline.yaml` | 1 (E023) | FAIL |
| `pipe.broken-E025-not-terminal.pipeline.yaml` | 1 (E025) | FAIL |
| `pipe.broken-E026-unknown-next.pipeline.yaml` | 1 (E026) | FAIL |
| `pipe.broken-E027-cycle.pipeline.yaml` | 1 (E027) | FAIL |
| `pipe.broken-E029-async.pipeline.yaml` | 1 (E029) | FAIL |

Ogni fixture produce la regola attesa, nessuna cascata. La regola "no async" (E029) entra in vigore già su questa primitiva: declarare `mode: async` produce subito Error con messaggio che rimanda a Pattern C.

**Primitiva 2 — invoke da stato sincrono (completata in questo commit)**

Schema: blocco opzionale `invoke:` su uno stato `is_final: false`. Quando il padre entra nello stato, parte un workflow figlio; il padre resta bloccato finché il figlio non raggiunge uno dei suoi terminali, e ricava da `on_completion: [{terminal_state, next_event}]` quale evento applicarsi.

Implementato:

- `templates-candidate/WORKFLOW_TEMPLATE.yaml` documenta lo slot `invoke:` sullo stato.
- `scripts-candidate/lint-workflows.mjs` aggiunge 7 regole Error (E030–E036), tra cui E035 che vieta l'invoke su stato `is_final: true` e E036 che ribadisce il divieto di async.
- Esempio toy: `examples/invoke-state-toy/{state-invoke-parent,state-invoke-child}.yaml` con padre `idle → validating → done/rejected` che invoca un figlio `start → validated/refused`.
- 5 fixture broken per E031 (child mancante), E033 (terminale non in child), E034 (next_event non dichiarato nel padre), E035 (invoke su terminale), E036 (mode async).

**Verifica**

| File | Errors | Verdict |
|---|---|---|
| `examples/invoke-state-toy/state-invoke-child.yaml` | 0 | PASS |
| `examples/invoke-state-toy/state-invoke-parent.yaml` | 0 | PASS |
| `inv-state.broken-E031-missing-child.yaml` | 1 (E031) | FAIL |
| `inv-state.broken-E033-terminal-not-in-child.yaml` | 1 (E033) | FAIL |
| `inv-state.broken-E034-event-undeclared.yaml` | 1 (E034) + W001/W002 cascata legittima | FAIL |
| `inv-state.broken-E035-invoke-on-terminal.yaml` | 1 (E035) | FAIL |
| `inv-state.broken-E036-async-invoke.yaml` | 1 (E036) | FAIL |

**Caso d'uso emerso durante questo commit: orchestratore di agenti**

Domanda dell'utente: "POM riesce a modellare un agent orchestrator che gestisce più agenti contemporaneamente?". Risposta consolidata:

- **Lifecycle dell'orchestratore stesso** (es. `idle → planning → dispatching → waiting → consolidating → returning`): SI, è una FSM standard. Modellabile come workflow POM. Lo `validating` di questo commit è esattamente il building block per "orchestratore che chiama UN sub-agente sincrono per stato".
- **Gestione parallela di N sub-agenti** (fan-out / fan-in / race tra agenti): NO, è fuori scope permanente (Pattern C territory). Equivale a parallel regions e actor model, già vietato da E029/E036.

La regola "no async" implica direttamente il limite sull'orchestrazione parallela, e la spec lo dichiarerà esplicitamente come caso d'uso di Pattern C nel commit di consolidazione del giro 2.

**Primitiva 3 — invoke da evento sincrono (completata in questo commit)**

Schema: blocco opzionale `invoke:` su una transizione. Quando l'evento si verifica nello stato `from`, parte un workflow figlio; il padre resta bloccato nello stato sorgente finché il figlio non termina, e il `target` finale del padre dipende da `on_completion: [{terminal_state, target}]`. La transizione ha esattamente uno tra `to:` diretto e `invoke:` (E045 vieta la combinazione).

Implementato:

- `templates-candidate/WORKFLOW_TEMPLATE.yaml` documenta il blocco `invoke:` su transizione.
- `scripts-candidate/lint-workflows.mjs` aggiunge 7 regole Error (E040–E046) e modifica E012/E015 per saltarle sulle transizioni con `invoke` (perché lì `to:` non c'è); `findReachableStates` ora considera anche i `target` di `invoke.on_completion` per la raggiungibilità (evita falsi positivi W001).
- Esempio toy: `examples/invoke-event-toy/{event-invoke-parent,event-invoke-child}.yaml` con padre `drafting → accepted/rejected` via transizione `submit_for_review` che invoca un figlio di validazione.
- 5 fixture broken per E041 (child mancante), E043 (terminale non in child), E044 (target non in parent), E045 (sia `to` sia `invoke` dichiarati), E046 (mode async).

**Verifica**

| File | Errors | Verdict |
|---|---|---|
| `examples/invoke-event-toy/event-invoke-child.yaml` | 0 | PASS |
| `examples/invoke-event-toy/event-invoke-parent.yaml` | 0 | PASS |
| `inv-event.broken-E041-missing-child.yaml` | 1 (E041) | FAIL |
| `inv-event.broken-E043-terminal-not-in-child.yaml` | 1 (E043) | FAIL |
| `inv-event.broken-E044-target-not-in-parent.yaml` | 1 (E044) + W001 cascata legittima | FAIL |
| `inv-event.broken-E045-both-to-and-invoke.yaml` | 1 (E045) | FAIL |
| `inv-event.broken-E046-async-invoke.yaml` | 1 (E046) | FAIL |

**Regressione zero su esempi pre-esistenti**

`spec-evolution.yaml`, `ticket-lifecycle.yaml`, `document-approval.yaml`, i tre stage della pipeline toy, e i due workflow dell'invoke-state toy continuano a PASS pulito dopo le modifiche al validator.

**Tre primitive sincrone complete**

A questo punto il giro 2 ha tutte e tre le primitive a posto: pipeline lineare (composizione esterna), invoke da stato (composizione interna sincrona durante un periodo), invoke da evento (composizione sincrona innescata da un trigger event).

**Decisione architetturale presa fuori dalle primitive: context injection**

Durante la riflessione sui prossimi due casi reali è emerso il punto: una macchina figlia che ritorna solo un terminale-tag (`validated` / `refused`) è anemica. Per fare lavoro reale serve scambiare anche un *payload* strutturato. Discussione e decisione consolidate in `CONTEXT-INJECTION.md` (closed design decision):

- modello scelto: `Result<Terminal, Output>` (iniezione + ritorno tipato), NON visibilità diretta del context del padre;
- livello di implementazione: documentale (nominal coherence) — NON strict typing;
- principio: ogni FSM ha context privato; comunicazione SOLO via boundary (`invoke.input` ingresso, `on_completion[].assign` uscita);
- quarto pilastro della disciplina di composizione: "no shared global state", aggiunto accanto a no-async, no-inheritance, no-runtime.

La spec recepisce la decisione in Closed Decisions; l'implementazione (`context_schema` su workflow, `input`/`assign` su invoke) è il commit immediatamente successivo (giro context-injection).

**Context injection — schema e validator (completata in questo commit)**

Implementazione della closed decision presa nel commit precedente (`CONTEXT-INJECTION.md`). Tre nuovi slot opzionali introdotti:

- `context_schema:` sul workflow (input + output_by_terminal con name/type/description);
- `invoke.input:` sul padre (map `child_field: parent_path`);
- `on_completion[].assign:` sul padre (map `parent_field: child_path`).

9 nuove regole Error E050–E058. Validatore in modalità *documentale*: verifica coerenza nominale (campi citati esistono nello schema dichiarato; chiavi `output_by_terminal` sono stati `is_final: true`; field di `input/assign` esistono nello schema del figlio; se padre dichiara `input/assign` ma figlio non ha `context_schema`, errore E058). NON fa type-checking; NON valuta path expressions.

**Esempio toy: payment-validation + order-flow**

`examples/context-injection-toy/payment-validation.yaml` modella un sub-workflow di validazione pagamento:

- `context_schema.input`: `amount: number`, `method: string`;
- `context_schema.output_by_terminal.validated`: `validation_token: string`, `timestamp: string`;
- `context_schema.output_by_terminal.refused`: `refusal_reason: string`.

`examples/context-injection-toy/order-flow.yaml` lo invoca da `drafting → accepted | rejected`, passando `order.total_cents` e `order.payment_method`, e raccogliendo `child.validation_token` / `child.refusal_reason` nel proprio contesto via `assign:`.

| File | Errors | Verdict |
|---|---|---|
| `examples/context-injection-toy/payment-validation.yaml` | 0 | PASS |
| `examples/context-injection-toy/order-flow.yaml` | 0 | PASS |

**Fixture broken**

| Fixture | Errore atteso | Errore effettivo |
|---|---|---|
| `ctx.broken-E052-unknown-terminal` | E052 | E052 |
| `ctx.broken-E055-input-not-in-child` | E055 | E055 |
| `ctx.broken-E056-assign-not-in-child-output` | E056 | E056 |
| `ctx.broken-E058-child-no-schema` | E058 | E058 |

**Regressione zero** su tutti gli esempi storici e i toy delle tre primitive precedenti. 13 file YAML sono stati validati nello stesso giro: PASS pulito per ognuno.

**Due casi reali combinati (completati in questo commit)**

Il commit chiude i criteri di valore quantitativi del giro 2: ogni primitiva ha un esempio toy minimo + uno o più esempi reali che la stressano in contesto vero.

**Caso reale 1 — `order-processing`: pipeline lineare pura**

Quattro workflow membri autonomi (cart, checkout, payment, shipping) con `context_schema` proprio (input atteso + output_by_terminal), composti dalla pipeline `order-processing.pipeline.yaml`. La pipeline incatena `cart_completed → checkout-flow`, `checkout_confirmed → payment-flow`, `payment_captured → shipping-flow`; ogni terminale di failure (cart_abandoned, checkout_canceled, payment_refused, lost) termina la pipeline.

| File | Verdict |
|---|---|
| `examples/order-processing/cart-flow.yaml` | PASS |
| `examples/order-processing/checkout-flow.yaml` | PASS |
| `examples/order-processing/payment-flow.yaml` | PASS |
| `examples/order-processing/shipping-flow.yaml` | PASS |
| `examples/order-processing/order-processing.pipeline.yaml` | PASS |

Open point reso esplicito nel commento del file: la pipeline POM v1 non passa context strutturato tra membri — il dataflow tra membri vive nell'orchestrator del target. Decisione consapevole, non lacuna.

**Caso reale 2 — `loan-application`: multi-primitiva con context injection**

Workflow padre `loan-application.yaml` che usa **entrambe** le primitive interne nello stesso modello:

- **state invoke** su `validating_credit` → `credit-check.yaml` (child workflow con `context_schema` che riceve `applicant_id + requested_amount` e ritorna `{score, max_credit_limit}` su `approved` o `{refusal_reason}` su `rejected`);
- **event invoke** su transizione `submit_for_underwriting` → `underwriting.yaml` (child workflow che riceve `{applicant_id, requested_amount, score, max_credit_limit, documentation_complete}` e ritorna `{offer_id, rate, terms}` su `approved` o `{refusal_reason}` su `rejected`);
- **context injection** su tutto: il parent dichiara il proprio `context_schema` con `output_by_terminal` per `rejected_at_credit`, `rejected_at_underwriting`, `disbursed`; il mapping `assign:` raccoglie `child.offer_id`, `child.rate`, `child.terms` dall'event invoke.

| File | Verdict |
|---|---|
| `examples/loan-application/credit-check.yaml` | PASS |
| `examples/loan-application/underwriting.yaml` | PASS |
| `examples/loan-application/loan-application.yaml` | PASS |

**Bug catturato dai casi reali**

Durante la compilazione del loan-application il validator ha prodotto un E056 spurio. Indagando, è emerso che il check era stato implementato sul **key** del mapping `assign:` invece che sul **value** (cioè sul `child.<field>` path che effettivamente referenzia un campo del child output). Bug corretto in questo commit: il parser ora estrae `<field>` dal value `child.<field>` e controlla che sia dichiarato nell'`output_by_terminal[terminal_state]` del child. La descrizione di E056 è stata aggiornata di conseguenza. La fixture broken esistente (`ctx.broken-E056-assign-not-in-child-output.yaml`) era già scritta correttamente sul value, quindi continua a scattare E056 come prima.

**Stato complessivo dell'esperimento**

| Metrica | Valore |
|---|---|
| Workflow YAML compilati e PASS | 21 |
| Pipeline YAML compilate e PASS | 1 |
| Fixture broken | 30 |
| Regole Error totali | 50 |
| Regole Warning totali | 4 |
| Regressione su esempi storici | 0 |
| Bug del validator scoperti e corretti grazie ai casi reali | 1 (E056) |

**Validazione su progetto reale: internal AI agent (completata in questo commit)**

L'utente ha proposto di validare il modello su un progetto reale che mantiene: `the internal AI agent source tree`. Tre FSM esplicitamente dichiarate nel codice sorgente: operational FSM (pipeline orchestrator a 7 step), analyzer FSM (sub-pipeline a 13 step con retry loop), semantic family rules (rule engine per la classificazione semantica).

Esito sintetico (dettagli in `real-project-validation/internal-agent/FINDINGS.md`):

| FSM | Sorgente | Verdetto | Validator | Schema growth necessario? |
|---|---|---|---|---|
| Operational FSM | `pipeline/family/operational-fsm.ts` | **Clean fit** | PASS | Nessuno (loop guard cosmetico) |
| Analyzer FSM | `pipeline/analyzer/analyzer-fsm.ts` | **Adapted fit** | PASS | Sì: bounded-retry primitive |
| Semantic Family rules | `pipeline-contract/family-state-rules.ts` | **Forced fit, lossy** | PASS | No: POM è strumento sbagliato (rule engine, parallel families, precedence) |

**Cosa l'esercizio ha confermato (positivo)**

POM round 2 (state-invoke + event-invoke + context-injection + pipeline) ha modellato senza adattamento l'orchestratore di produzione + il suo sub-FSM sincrono. Il pattern "state X invoca sub-FSM Y sincronicamente" è esattamente quello che serviva per la composizione operational → analyzer. Le 4 ipotesi (H1–H4) trovano riscontro su un caso non sintetico.

**Cosa l'esercizio ha proposto di aggiungere (1 candidato concreto)**

- **Bounded retry / loop guard primitive**. Motivato dall'analyzer FSM che usa `MAX_LLM_ATTEMPTS = 3` per i retry su parse/coherence error. POM oggi modella il ciclo strutturalmente ma non il budget. Schema sketch: blocco `loop_guard: { max_visits: N, on_exhaustion: { exit_target: ... } }` su uno stato. Closed decision rimandata a un giro futuro.

**Cosa l'esercizio ha confermato di NON modellare (1 conferma concreta)**

- **Rule engine per classificazione + routing** (la semantic family layer). POM workflow declina, e il declino è principled: rule engine multi-machine richiederebbe parallel regions, cross-machine precedence e parametric terminals — tutti fuori dai 4 pilastri della composizione. Il "forced fit" YAML documenta esattamente il costo del forzarlo: un artefatto che mente sul sorgente.

**Push aggiuntivo richiesto dall'utente — modellazione spinta della Semantic Family**

Dopo la conferma del limite "forced fit lossy", l'utente ha chiesto di spingere oltre per essere sicuri delle capacità del modello: 7 famiglie come workflow autonomi + un master FSM con 7 state-invoke consecutivi in ordine di precedence. Esito in `real-project-validation/internal-agent/semantic-family-pushed/` (8 file YAML, tutti PASS pulito al primo tentativo).

| Metrica | Forced fit | Pushed modeling | Delta |
|---|---|---|---|
| YAML files | 1 | 8 | +7 |
| State-invokes | 0 | 7 | +7 |
| context_schema per famiglia | 0 | 7 | +7 |
| output spec per famiglia | 0 | 7 | +7 |
| Control modes (analytical vs terminator) modellati | 0 | 2 | +2 |
| Precedence positions encoded as cascade order | 0 | 7 | +7 |
| Non-linear precedence rules expressible | 0 | 0 | 0 |
| Concurrent multi-candidate observability | no | no | unchanged |

Il push **muove ogni metrica tranne le due che l'invariante 4-pilastri vieta per design**. La linea di espressività NON si è spostata: si è spostata la fedeltà entro la linea. Conferma forte e *positiva* della capacità del modello (scala a N child workflow sincroni sotto un parent, context injection scala anche su 7 invoke distinti); conferma anche del limite duro (non-linear precedence, parallel evaluation observability) che resta esattamente dove i pilastri lo collocano.

**Conferma decisiva su H1–H4**

Lo state-invoke + context-injection + Result<Terminal, Output> introdotti nel round 2 non solo gestiscono casi sintetici e un caso di produzione singolo (operational → analyzer): scalano fino a un dispatcher di 7 macchine simultaneamente sotto un parent. Le 4 ipotesi H1–H4 hanno ora la copertura più forte che l'esperimento potesse dare prima della consolidazione.

**Tre file YAML prodotti, tutti PASS pulito** contro il validator post-round-2. Il "PASS clean" non è il criterio di successo: lo è la fedeltà al sorgente. La fedeltà è alta per i primi due, deliberatamente bassa e documentata per il terzo.

**Compatibilità con la clean-family-repair (terzo livello di composizione)**

L'utente ha fatto notare che la prima modellazione dell'analyzer FSM era *incompleta*: il sorgente invoca `runCleanFamilyRepair` (con loop bounded `MAX_FAMILY_REPAIR_ATTEMPTS = 3`) dentro lo step `family_enforcement`, e il primo YAML modellava `family_enforcement` come uno stato piatto senza la sub-FSM.

Correzione applicata in commit successivo: nuovo file `clean-family-repair-fsm.yaml` (7 stati, 7 eventi, 7 transizioni — una è il ciclo bounded `attempt_suggested_family`), e l'analyzer-fsm.yaml aggiornato perché `family_enforcement` faccia state-invoke sulla repair con context injection completo (input: question + parsed_output + semantic_hints + question_signals + ctx; on_completion: 5 terminali mappati tutti a `family_enforced` del padre).

Risultato: la **catena di composizione cresce a tre livelli** su sistema reale:

```
operational-fsm                            (livello 1: orchestratore di pipeline)
  └── invoke: analyzer-fsm                 (livello 2: sub-pipeline analyzer)
        └── invoke: clean-family-repair-fsm  (livello 3: sub-FSM con loop bounded)
```

Tutti e tre i file PASS pulito al validator. POM round 2 supporta la profondità 3 senza modifiche allo schema. Il validator risolve i path dei child relativamente alla cartella del parent a qualunque livello di annidamento.

L'open point del bounded retry riappare identico al livello 3 (il ciclo `attempt_suggested_family` ha lo stesso problema del `parse_retry`/`coherence_retry` dell'analyzer). Una sola futura primitiva `loop_guard` con `max_visits` + exit per esaurimento risolverebbe tutti e tre i casi nel sistema reale.

## Mapping XState esteso al round 2 (2026-05-29)

Esteso `to-xstate.mjs` per coprire le primitive sincrone del round 2 + context injection. L'estensione è motivata da due usi pratici dichiarati dall'utente:

1. **XState come implementazione runtime reale** del progetto target — Pattern C della guida implementativa diventa una scelta concreta, non solo un riferimento teorico.
2. **stately.ai come servizio online di validazione + visualizzazione** della macchina — il JSON prodotto dal transformer è importabile direttamente nell'editor per ottenere layout grafico, simulazione interattiva, ispezione dei meta POM, ed export a PNG/SVG/Mermaid per documentazione.

**Coperture aggiunte nel transformer**

| Costrutto POM | Output XState |
|---|---|
| `states[].invoke` (state-invoke) | `node.invoke` con `src` + `input` + `onDone[]` discriminato da guard sintetiche `_terminal_eq_<terminal>` |
| `transitions[].invoke` (event-invoke) | Stato intermedio sintetico `__invoking_<event>_from_<state>` che porta l'invoke; lo stato `from` ha solo una transizione `target: <intermediate>` |
| Pipeline file | Macchina root con uno stato `__member_<i>_<name>` per ogni membro + un `__pipeline_completed` finale |
| `context_schema` | Preservato in `meta.pom.context_schema` (per la visualizzazione) |
| `invoke.input` / `on_completion[].assign` | Mappati su `invoke.input` e `branch.actions: assign(params)` |
| `re_entry_allowed: true` | Lo stato resta atomic con `on:` invece di `type: "final"`, marcato in `meta.pom.re_entry_allowed` |

**Cosa il transformer NON fa (coerente con i 4 pilastri)**

- niente `spawn` né regioni parallele (POM non ha la primitiva);
- niente generazione TypeScript con `setup({ types: ... })` — JSON-only per restare neutrale al linguaggio del target;
- niente enforcement del retry budget — il ciclo è strutturale, il bound vive nel codice target.

**Output JSON prodotti in questo commit**

| Categoria | File | Dove |
|---|---|---|
| Round-1 historical (regressione) | 3 | `evidence/xstate/*.xstate.json` |
| Round-2 toys | 4 | `evidence/xstate/round2/*.xstate.json` |
| Casi reali combinati | 2 | `evidence/xstate/round2/*.xstate.json` |
| Validazione AI agent interno | 4 | `evidence/xstate/round2/internal-agent/*.xstate.json` |

Tre verifiche puntuali fatte sul JSON generato:
- `loan-application.yaml` event-invoke su `submit_for_underwriting` produce uno stato intermedio sintetico con `invoke.input`, `onDone` discriminato, `assign` con i path `child.offer_id`/`child.rate`/`child.terms`;
- `analyzer-fsm.yaml` state-invoke su `family_enforcement` produce `invoke` con `src: clean_family_repair_fsm`, `input` completo dal context_schema, `onDone` con 5 branch + `raise(family_enforced)`;
- `order-processing.pipeline.yaml` produce una macchina root con 4 `__member_*` + 1 `__pipeline_completed` finale.

**Workflow operativo con stately.ai** (documentato in `COMPATIBILITY.md`)

```bash
node xstate-compat/to-xstate.mjs <yaml> --out /tmp/<name>.xstate.json
# poi: stately.ai → Import JSON → paste
```

Questo trasforma POM da "documenta + valida testualmente" a "documenta + valida testualmente + visualizza + simula interattivamente". È la mossa che giustifica il prezzo del round 2: il modello dichiarativo ha ora una catena completa source-of-authority → validatore → diagramma online → simulazione → codice target.

## Estensione multi-linguaggio: TypeScript + Python (2026-05-29)

L'utente ha sollevato la domanda: la generazione del codice si può orientare anche verso altri linguaggi oltre TypeScript? Risposta: sì per design — il YAML POM è language-agnostic (tipi `string/number/boolean/object/array` universali, guard come nomi simbolici, transizioni come dati). Quello che è TypeScript-specifico oggi è la **guida implementativa** e l'**evidence H4**, non il modello.

Per verificarlo concretamente: lo stesso `spec-evolution.yaml` viene portato in Python con Pattern A (transition table), Python 3.14, `unittest` built-in, zero dipendenze. Stessi 15 test scenari del round 1 in TypeScript, tradotti uno-a-uno.

**Risultato**

| Metrica | TypeScript evidence (round 1) | Python evidence (questo commit) |
|---|---|---|
| Source YAML | `spec-evolution.yaml` | stesso |
| Pattern usato | A (transition table) | A (transition table) |
| Test count | 15 | 15 |
| Tests passati | 15 | 15 |
| Exit code | 0 | 0 |
| Dipendenze aggiunte | 0 | 0 |
| Test runner | `node:test` built-in | `unittest` built-in |
| Lines of code (3 file) | ~210 | ~180 |

**Conferma decisiva di H4 multi-linguaggio**

Lo stesso modello produce due implementazioni idiomatiche distinte (TypeScript discriminated union + node:test; Python `@dataclass(frozen=True)` + `Literal` + `match`/`case` + unittest) senza modifiche al YAML. Il `WORKFLOW_IMPLEMENTATION_GUIDE.md` è stato esteso con una sezione "Language Profiles" che documenta TypeScript e Python con scelte idiomatiche, librerie Pattern C (TS: xstate; Python: transitions / python-statemachine / statemachine), e il template per aggiungere nuovi profili (Go, Rust, Java/Kotlin, C#) col vincolo "ogni nuovo profilo richiede almeno un evidence sotto `evidence/<language>/`".

**Cosa la guida ha guidato (stesso pattern in entrambi i linguaggi)**

- Pattern selection criteria (A su modello piccolo);
- Guard naming `guard_<yaml_name>` one-to-one;
- Docstring discipline (la `description:` del YAML diventa docstring verbatim);
- Categorie di test dal modo `scenarios`;
- Mapping `re_entry_allowed: true` (terminale con eccezione documentata).

**Cosa la guida correttamente NON ha guidato (variazioni linguistiche)**

- Discriminated union TS vs `Union[Allowed, Refused]` Python;
- `as const` TS vs `tuple` Python per transition table immutabile;
- `node:test` vs `unittest` come test runner;
- `from_state` invece di `from` nel modello Python (collisione con keyword) — il YAML usa `from:` perché in YAML non è keyword.

**Anti-pattern dichiarati come universali**

Indipendentemente dal linguaggio, la guida vieta esplicitamente: encoding della logica delle guard nel YAML, hard-coding della transition table invece di derivarla, mescolanza Pattern A + Pattern C nello stesso workflow.

**Significato per il giro 2**

Il messaggio "POM è multi-linguaggio" smette di essere una promessa documentale (era così già nel round 1) e diventa **verificata da due implementazioni reali** dello stesso modello. La consolidazione del giro 2 può ora citare due evidence H4 affiancate, non una; e il path "aggiungere un terzo linguaggio" è esplicitato come sequenza ripetibile (template Language Profile + evidence con uguale copertura dei test).

## Suspend & Restore: documentazione + evidence (2026-05-29)

L'utente ha chiesto che supporto POM ha per suspend/restore di una macchina a stati — capacità decisiva per workflow di lunga durata (ordini multi-giorno, approvazioni in attesa di firma, agent orchestrator in attesa di input umano, ticket aperti per settimane). Risposta sintetica: POM non ha persistenza per design (no-runtime è uno dei 4 pilastri), ma il Pattern A è **naturalmente suspend-friendly** perché `applyTransition(state, event, context) → nextState` è una funzione pura senza thread, callback, scheduler attaccati. Tra due eventi la macchina è materializzata da due valori (`state`, `context`) che il chiamante scrive dove vuole.

**Step A — Sezione "Suspend and Restore" nel `WORKFLOW_IMPLEMENTATION_GUIDE.md`**

Documenta: il principio (Pattern A stateless = funzione pura, suspend = scrivi due valori); le tre forme di snapshot (single machine, composed stack di frame, pipeline); le opzioni di storage (DB columns, document DB, KV, JSON file, distributed log); il contratto suspend/restore con tre invarianti di validazione (workflow name, version, state in modello) e la regola "no best-effort restore"; la posizione dei retry counter (in `context`, sopravvivono al restart — risposta concreta al "bounded retry" emerso da internal AI agent analyzer); cosa POM NON fa (persistenza, scheduling, instance identification, versioning automatico); confronto con XState v5 (`actor.getSnapshot()` / `createActor(machine, { snapshot })` sono primitive native — motivo concreto per scegliere Pattern C quando la persistenza è critica).

**Step B — Tre evidence H4 estese**

| Evidence | Linguaggio | Caso | Test | Esito |
|---|---|---|---|---|
| `evidence/typescript/spec-evolution-suspend/` | TypeScript | single machine | 6 | pass, exit 0 |
| `evidence/python/spec-evolution-suspend/` | Python | single machine | 6 | pass, exit 0 |
| `evidence/typescript/composed-suspend/` | TypeScript | composed (state-invoke a 2 frame) | 5 | pass, exit 0 |

**Pattern verificato per single machine** (TS + Python identici nella forma)

Snapshot `{ workflow, version, state, context }` scritto su `tmpdir()` come simulazione di processi distinti. Tre restart consecutivi: `draft → under_review` (suspend), restart, `under_review → accepted` (suspend), restart, `accepted → complete` con guard nel context. Round-trip identity. Quattro path di rejection: workflow sbagliato, version sbagliata, stato non in modello, snapshot malformato.

**Pattern verificato per composed (state-invoke stack a 2 frame)**

Lo `StackSnapshot` è una sequenza di `MachineFrame` (uno per livello di invoke attivo). Test: parent in `validating`, child pushato a `start`, suspend con due frame sullo stack, restart, child progresso a `validated`, pop del frame, dispatch del `validation_passed` al parent via `on_completion`, parent a `done`. Caso speculare con `refused → validation_failed → rejected`. Round-trip dello stack a due frame. Reject di stack vuoto. Reject di frame con workflow sconosciuto.

**Conferma di una proprietà nascosta del round 2**

I retry counter sopravvivono automaticamente al suspend/restore perché vivono in `context`, non in variabili globali. Questo chiude implicitamente metà della preoccupazione dell'open point "bounded retry": la primitiva `loop_guard` è ancora necessaria per *enforcement* del limite, ma il *contatore stesso* è già suspend-friendly senza modifiche allo schema. Il design del round 2 era più robusto di quanto immaginato.

**Spirit POM rispettato**

Il `PROJECT_STATE.md` di POM stesso è una forma di suspend/restore per il *progetto*. POM conosceva già il pattern a livello metodologico; con questi commit il pattern è esplicitato anche per le *macchine a stati*, coerentemente, senza introdurre runtime nel metodo.

## Workflow Integration & Extension Guide (2026-05-29)

L'utente ha chiesto di scrivere una guida breve su come integrare e/o estendere la FSM nei progetti che adotteranno POM workflow. Aggiunto `templates-candidate/WORKFLOW_INTEGRATION_GUIDE.md` (275 righe), che copre l'angolo "adoption + lifecycle" complementare alla `WORKFLOW_IMPLEMENTATION_GUIDE.md` (angolo "codice").

**Cosa la guida copre**

| Sezione | Domanda a cui risponde |
|---|---|
| When to adopt | È il mio caso? (sweet spot vs out-of-scope) |
| File layout in a target project | Dove vivono i `.yaml`, dove va `generated/`, come raggruppare per dominio |
| Configuration | Cosa scrivere in `pom.config.json` (campo `workflows:` opt-in) |
| Lifecycle of a workflow | design → validate → visualize → implement → test → persist → maintain |
| Adoption on a greenfield project | 9 step concreti dal niente alla CI |
| Adoption on an existing project (migration patterns) | Tre pattern: model-first, generate side-by-side, XState dual-run |
| Extending an existing workflow | Aggiungere stato/terminale/transizione, rimuovere, rinominare, bump version |
| Versioning | Patch / minor / major; quando rompere i snapshot |
| Adding a new workflow | Da zero o derivato (no `extends:` per disciplina) |
| Composing workflows | Tabella delle 4 primitive + righe "non supportato" → Pattern C |
| Maintenance: avoiding drift | Validator in CI + regenerate-on-PR + code-from-YAML check |
| Best practices | 8 regole pratiche (guards as nouns, terminal names spell outcome, ecc.) |
| When to retire a workflow | Procedura di archiviazione + nota su snapshot storici |

**Coerenza con i 4 pilastri**

La guida non introduce nuovi concetti di schema. Riusa: pillar 3 (no inheritance) → "no `extends:` field"; pillar 1 (no async) → tabella di composizione che dichiara esplicitamente cosa NON è supportato; pillar 2 (no shared state) → "ciascuna FSM ha context privato"; pillar 4 (no runtime) → "POM non enforce niente, la disciplina è del team".

**Coerenza con i giri 1-2**

Riferimenti incrociati a tutte le sezioni stabilite: `WORKFLOW_IMPLEMENTATION_GUIDE.md` per i Pattern A/B/C e Suspend & Restore; `prompts/workflow.md` per i 5 modi; `SPEC-DRAFT-workflow-modeling.md` per le 4 invarianti; `xstate-compat/COMPATIBILITY.md` per il mapping Stately. La guida cuce insieme i pezzi del giro 2 dal punto di vista dell'adottante.

**Cosa la guida deliberatamente NON dice**

- non prescrive una libreria FSM per linguaggio (la scelta resta del team);
- non prescrive uno storage (DB, KV, file — tutti elencati come opzioni);
- non prescrive un test runner (lascia al `pom.config.json.testRunner`);
- non automatizza le migrazioni di stato per istanze in-flight (è disciplina operativa, non POM).

**Implementation Status nella spec**

La riga "Integration & extension guide for adopters" è stata aggiunta alla tabella "Implementation Status" della `SPEC-DRAFT-workflow-modeling.md` come `Implemented (draft)` con puntatore al file.

## Generatore Mermaid integrato (2026-05-29)

L'utente ha notato che il generatore Mermaid era ancora "Target for promotion" — solo intenzione. Lo chiude in questo commit, **integrato direttamente nel flusso del validator** invece che come tool separato: ogni `pom:workflow:lint` rigenera anche il diagramma.

**Implementazione**

- `scripts-candidate/mermaid.mjs` — renderer condiviso: workflow file → `stateDiagram-v2`, pipeline file → catena di membri.
- `scripts-candidate/to-mermaid.mjs` — CLI thin che riusa il renderer.
- `scripts-candidate/lint-workflows.mjs` — esteso con `--mermaid-dir <dir>`. Quando passata, ogni YAML processato produce sia il validation report sia il `.mmd`.

**Scelte di rendering** (l'utente ha posto come requisito esplicito: "più sono belli, meglio si comprendono")

- `direction LR` come default — i workflow si leggono naturalmente da sinistra a destra;
- ogni stato dichiarato con `state "Title Case" as id` per leggibilità immediata;
- guards in label di transizione su seconda riga (`event\n[guard]`);
- terminali con simbolo Unicode (`●` puro, `⤴` per `re_entry_allowed`);
- state-invoke reso come nota strutturata su due righe (`invokes child` + mappatura `terminal → next_event`);
- event-invoke reso come arrows multiple, una per terminale del child, con label `event\n↪ child: terminal`;
- pipeline membri usano nome del workflow file (Title Case), non `member_N_<id>`;
- header limitato a 100 caratteri con `…` per evitare description-verbose;
- whitespace strutturato (linee vuote tra sezioni dichiarative, transitions, note).

**38 file `.mmd` generati in una passata sweep**

| Cartella | File |
|---|---|
| `evidence/mermaid/` | 3 (round-1 storici) |
| `evidence/mermaid/pipeline-toy/` | 4 |
| `evidence/mermaid/invoke-state-toy/` | 2 |
| `evidence/mermaid/invoke-event-toy/` | 2 |
| `evidence/mermaid/context-injection-toy/` | 2 |
| `evidence/mermaid/order-processing/` | 5 |
| `evidence/mermaid/loan-application/` | 3 |
| `evidence/mermaid/internal-agent/` | 4 |
| `evidence/mermaid/semantic-family-pushed/` | 8 |
| **Totale** | **38** |

I 38 diagrammi sono GitHub-renderable senza modifiche, importabili in stately.ai, embeddabili in wiki/Notion/docs. Spot-check fatti su tre casi non banali:

- `spec-evolution.mmd`: 4 stati attivi + terminali via `[*]`, `Complete ⤴` segnala il re-entry.
- `analyzer-fsm.mmd`: 13 stati attivi, retry loop `parse_retry/coherence_retry → llm_call` visibile, nota su `Family Enforcement` che dichiara l'invoke su `clean_family_repair_fsm` con mapping dei 5 terminali.
- `order-processing.pipeline.mmd`: catena `Cart Flow → Checkout Flow → Payment Flow → Shipping Flow` con label dei terminali sui rami.

**Aggiornamenti coordinati**

- `SPEC-DRAFT-workflow-modeling.md`: riga "Mermaid diagram generator" cambia da `Target for promotion` a `Implemented` con puntatore al renderer + opzione `--mermaid-dir`.
- `WORKFLOW_INTEGRATION_GUIDE.md`: tabella "Lifecycle of a workflow" aggiornata sulla riga "Visualize", e nuova subsection "CI integration" che mostra l'invocazione raccomandata con `--mermaid-dir` come misura anti-drift più efficace.

**Significato**

Con questo commit, ogni FSM modellata in YAML ottiene automaticamente la sua documentazione visiva, generata dallo stesso YAML che il validator processa. Drift YAML↔diagramma diventa impossibile per costruzione (non per disciplina). È un completamento concreto del giro 2 più di quanto un follow-up dichiarato sarebbe.

**Prossimi passi del giro**

- Mapping XState invoke + COMPATIBILITY update (anche il caso "agent orchestrator" e l'input/output mapping).
- Codice TypeScript guidato per pipeline orchestrator (Pattern A) come evidence di H4 esteso.
- Consolidazione finale del giro 2 con le conclusioni della validazione reale.

## Follow-up

- [x] Compilare `examples/spec-evolution.yaml` con lifecycle reale delle SPEC POM.
- [x] Compilare `examples/ticket-lifecycle.yaml`. *(2026-05-29: compilato; ha generato 5 nuovi open point, inclusa la proposta di estensione schema `re_entry_allowed` su stato terminale con riapertura.)*
- [x] Compilare `examples/document-approval.yaml`. *(2026-05-29: compilato; PASS pulito al primo tentativo, nessuna modifica allo schema richiesta. Stressa role guard, publication ≠ approval, archive da stati multipli. Chiude H1 sui tre esempi.)*
- [ ] Stabilizzare `templates-candidate/WORKFLOW_TEMPLATE.yaml`.
- [x] Implementare `scripts-candidate/lint-workflows.mjs` — regole Error. *(2026-05-29: prima passata completa.)*
- [x] Estendere `lint-workflows.mjs` con regole Warning (irraggiungibilità, dead-end, terminale con uscita, non-determinismo). *(2026-05-29: seconda passata completa; ha confermato il pattern "terminale con eccezione dichiarata" su entrambi gli esempi.)*
- [x] Decidere su estensione schema `re_entry_allowed`. *(2026-05-29: chiuso. Attributo opzionale sullo stato, default false; sopprime W003 quando true e is_final true. Esempi e validator aggiornati; entrambi gli esempi ora PASS pulito.)*
- [ ] Aggiungere generatore Mermaid `stateDiagram-v2`.
- [ ] Aggiungere generatore scenari lingua-agnostici.
- [x] Stabilizzare `skills-candidate/workflow.md`. *(2026-05-29: 62 righe, sotto il tetto di 100; punta al prompt canonico `prompts/workflow.md` ora esistente.)*
- [x] Scrivere prompt canonico `prompts/workflow.md`. *(2026-05-29: 112 righe, sotto il tetto di 200; copre i cinque modi design/validate/diagram/scenarios/implement. Diagram e scenarios dichiarano "target-for-promotion, not implemented in this pass".)*
- [x] Eseguire test di implementazione TypeScript guidata su un esempio. *(2026-05-29: spec-evolution → Pattern A, 15 test node:test, zero dipendenze, exit 0. Evidenza in `evidence/typescript/spec-evolution/`.)*
- [ ] Compilare sezione Esito e Consolidazione.
