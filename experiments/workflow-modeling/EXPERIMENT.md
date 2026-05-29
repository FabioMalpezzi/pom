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
- **Stato terminale con riapertura ammessa**: `closed` in `ticket-lifecycle.yaml` è `is_final: true` ma ha una transizione `reopen` in uscita. Il validatore deve warnare. Proposta di estensione schema: attributo opzionale `re_entry_allowed: true` sullo stato, che il validatore tratta come eccezione dichiarata. Alternativa: rimuovere `is_final` e affidarsi solo alla struttura delle transizioni — al costo di perdere l'indicazione visiva in Mermaid.
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

## Follow-up

- [ ] Compilare `examples/spec-evolution.yaml` con lifecycle reale delle SPEC POM.
- [x] Compilare `examples/ticket-lifecycle.yaml`. *(2026-05-29: compilato; ha generato 5 nuovi open point, inclusa la proposta di estensione schema `re_entry_allowed` su stato terminale con riapertura.)*
- [ ] Compilare `examples/document-approval.yaml`.
- [ ] Stabilizzare `templates-candidate/WORKFLOW_TEMPLATE.yaml`.
- [ ] Implementare `scripts-candidate/lint-workflows.mjs`.
- [ ] Stabilizzare `skills-candidate/workflow.md`.
- [ ] Eseguire test di implementazione TypeScript guidata su un esempio.
- [ ] Compilare sezione Esito e Consolidazione.
