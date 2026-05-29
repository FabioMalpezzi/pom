# Esperimento - Workflow Modeling Support

| Campo | Valore |
|---|---|
| Data | 2026-05-29 |
| Tipo | research / metodo / estensione POM |
| Stato | under evaluation |
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

Da definire alla fine. Opzioni:

- **Promozione completa**: SPEC-0006 + skill `workflow` + template + script + voce in `pom:help`. Mossa via `skills/extend.md`.
- **Promozione parziale**: solo skill + template descrittivo, senza validatore (se H2 fallisce ma H1/H3/H4 reggono).
- **Riformulazione**: lo scope va ripensato, nuovo giro di esperimento o nuova spec di indagine.
- **Abbandono**: niente promozione, sintesi in `analysis/workflow-modeling.md` per memoria futura.

## Consolidazione

| Artefatto | Destinazione | Azione |
|---|---|---|
|  |  |  |

Da compilare in fase di promozione.

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

**Prossimi passi del giro**

- Due casi reali combinati: `order-processing` (pipeline pura) + `loan-application` (combinazione di invoke da stato e da evento, control flow di tipo orchestratore).
- Mapping XState invoke + COMPATIBILITY update (anche il caso "agent orchestrator").
- Codice TypeScript guidato per pipeline orchestrator (Pattern A) come evidence di H4 esteso.
- Consolidazione finale del giro 2.

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
