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
- [ ] Eseguire test di implementazione TypeScript guidata su un esempio.
- [ ] Compilare sezione Esito e Consolidazione.
