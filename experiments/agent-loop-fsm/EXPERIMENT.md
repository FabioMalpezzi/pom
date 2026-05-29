# Esperimento - Integrazione FSM × Agent Loop / Goal

| Campo | Valore |
|---|---|
| Data | 2026-05-30 |
| Tipo | research / metodo / estensione POM |
| Stato | under evaluation |
| Branch / Path | `exp/agent-loop-fsm` + `experiments/agent-loop-fsm/` |
| Isolamento | branch dedicato + cartella esperimento |
| Owner | POM maintainer |

Questo documento raccoglie il progetto e le evidenze dell'esperimento. Non è una decisione, non è una specifica e non autorizza modifiche al metodo POM principale. Gli artefatti candidati (design note, workflow YAML, eventuali snippet di codice) restano dentro questa cartella fino a una decisione esplicita di promozione.

## Obiettivo

Verificare se e come la capability "workflow modeling" introdotta in POM v0.2.0 (SPEC-0006) sia idonea a modellare in modo coerente:

1. il **control flow di un agente AI** (lifecycle dell'agente, dispatching dei sub-step, gestione dei retry);
2. il **lifecycle del goal** che l'agente sta perseguendo (proposto → accettato → in lavorazione → bloccato → completato);
3. il **ciclo di loop** caratteristico degli agenti (percezione → planning → azione → osservazione → decisione → loop) inclusi i pattern bounded-retry, loop-guard, suspend/restore tra processi.

L'esito atteso non è una nuova capability, ma una **estensione documentale** della capability esistente: pattern di modellazione, esempi canonici, sezione dedicata in `WORKFLOW_INTEGRATION_GUIDE.md`. Se durante l'esperimento emergesse un gap di schema, sarà candidato per una futura SPEC-0007 (insieme al `loop_guard` primitive già dichiarato come open point).

## Ipotesi

- **H1 — Modellazione dell'agente come FSM**: il control flow di un agente AI non banale (con planning, dispatching, attesa, consolidamento) è esprimibile come workflow POM senza forzature evidenti. Conferma attesa dall'evidenza Syntonia ai-agent già raccolta (operational-fsm, analyzer-fsm), da estendere con un esempio sintetico chiaro.
- **H2 — Loop "perception → planning → action" come transition table**: il loop tipico dell'agente si traduce in un grafo `applyTransition(state, event, context)` senza perdita di espressività, conservando la disciplina Pattern A (transition table immutabile + guard predicates + tests).
- **H3 — Bounded retry / loop-guard pattern documentabile**: il ciclo "tenta → fallisce → ritenta → al massimo N volte" è modellabile come transizione ciclica `from == to + counter in context`. La struttura è esprimibile nel YAML; il bound vive nel target code (open point già dichiarato). Da verificare se la sola documentazione del pattern è sufficiente o se conviene anticipare uno schema-extension `loop_guard:`.
- **H4 — Goal lifecycle come workflow autonomo**: il goal che l'agente persegue ha un proprio workflow standalone, persistente tra sessioni agente (snapshot + restore), con stati e transizioni indipendenti dal control flow dell'agente.
- **H5 — Suspend/restore = pause/resume del loop agente**: la sezione Suspend & Restore della `WORKFLOW_IMPLEMENTATION_GUIDE.md` è già sufficiente a coprire il caso "agente che lavora per giorni, viene interrotto, riprende esattamente dallo stesso stato". Da confermare con un'evidence runtime sintetica.

## Criteri di valore minimi

L'esperimento ha valore se, alla fine:

1. una **design note** fissa i sei livelli di integrazione (modellazione agente, state-of-the-world, loop-guard, goal lifecycle, invariants come Goal-Backward Check, suspend/restore) con citazioni puntuali agli artefatti POM v0.2.0;
2. almeno **due workflow candidati** stanno entrambi PASS pulito al validator e producono Mermaid leggibili: `agent-orchestrator.yaml` (orchestrator generico semplice) e `goal-lifecycle.yaml` (lifecycle del goal autonomo);
3. la tabella di confronto "loop agente classico vs loop guidato da FSM" esiste e cita evidence concrete (Syntonia analyzer-fsm per il bounded retry, Syntonia operational-fsm per l'orchestratore, suspend/restore evidence per la persistenza);
4. la decisione di promozione è una di tre: (a) promote come sottosezione di INTEGRATION_GUIDE + esempi canonici + cenni nelle HTML guide e wiki, (b) riformulazione e nuovo giro, (c) abbandono con sintesi in `analysis/`.

## Scope

Incluso nell'esperimento:

- design note sull'integrazione FSM × agent loop / goal;
- modellazione di workflow candidati esemplari (orchestrator, goal lifecycle, eventualmente bounded-retry agent);
- verifica con `pom:workflow:lint` e `--mermaid-dir`;
- mapping con il loop classico e con i pattern già documentati (Suspend/Restore, Pattern A/B/C, language profiles);
- eventuale evidence runtime in TypeScript se necessario per validare H2 o H5;
- decisione di promozione.

Escluso dall'esperimento:

- modifica del **core schema** SPEC-0006 (resta v0.2.0 stabile; eventuali estensioni — es. `loop_guard:` primitive — sono open point per SPEC-0007);
- modellazione di sistemi multi-agente concorrenti (violerebbe pillar 1: no async);
- coordinamento distribuito tra agenti (out of scope POM workflow);
- runtime engine per gli agenti (out of scope POM, pillar 4);
- generazione di codice automatico per agenti specifici (la skill `workflow` modo `implement` resta invariata).

## Piano di isolamento

- **Branch**: `exp/agent-loop-fsm`, partito da `main` pulito su POM v0.2.0.
- **Cartella**: `experiments/agent-loop-fsm/`, ramo esclusivo per gli artefatti candidati.
- **Niente modifica a codice stabile**: nessun file sotto `scripts/`, `skills/`, `prompts/`, `templates/`, `specs/`, `decisions/`, `docs/`, `wiki/` deve essere toccato durante l'esperimento. Le modifiche di promozione verranno fatte solo in fase di consolidamento.
- **Niente dipendenze nuove**: gli script POM v0.2.0 esistenti (`lint-workflows.mjs`, `to-mermaid.mjs`) sono sufficienti per validare i workflow candidati. Niente nuovo `package.json` locale.
- **Niente import da `experiments/` nel codice stabile**: regola POM generale, vale qui.

## Procedura

1. **Scaffolding** (questo commit).
2. **Design note** `design/AGENT-LOOP-FSM-INTEGRATION.md`: scrivere i sei livelli, la tabella di confronto, gli open point, le citazioni a Syntonia.
3. **Workflow candidati**:
   - `workflows-candidate/agent-orchestrator.yaml` — orchestrator semplice con perception/planning/execution/consolidation;
   - `workflows-candidate/goal-lifecycle.yaml` — lifecycle del goal autonomo;
   - (opzionale) `workflows-candidate/bounded-retry-agent.yaml` — agente con retry loop esplicito.
4. **Validazione**: lanciare `pom:workflow:lint --mermaid-dir` sui candidate, salvare evidence in `evidence/` sia per i report sia per i `.mmd`.
5. **Verifica contro Syntonia**: confrontare con `operational-fsm.yaml`, `analyzer-fsm.yaml`, `clean-family-repair-fsm.yaml` (già modellati nell'esperimento workflow-modeling) per verificare che i pattern siano coerenti.
6. **Eventuale evidence runtime**: se H2 o H5 richiedono prova concreta, produrre un piccolo Pattern A TypeScript di un orchestrator con suspend/restore demo.
7. **Decisione di promozione**: compilare sezione Esito + Consolidazione di questo file.

## Rischi

| Area | Rischio | Mitigazione |
|---|---|---|
| Sicurezza | nessuno | n/a |
| Privacy | nessuno | n/a |
| Licenze | nessuno | nessuna dipendenza esterna prevista |
| Costi | trascurabili | tutto in locale |
| Manutenibilità | la documentazione `WORKFLOW_INTEGRATION_GUIDE.md` cresce oltre 300 righe e diventa illeggibile | tetto soft: la sottosezione promossa resta sotto 100 righe; eccedenza va in `docs/workflow-agent-loops.md` separato |
| Coerenza filosofia POM | l'esperimento spinge POM verso "framework per agenti" | promozione vincolata ai 4 pilastri (no async / no shared state / no inheritance / no runtime) verificati voce per voce |
| Aspettative sull'apertura schema | l'esperimento fa emergere il bisogno del `loop_guard:` primitive | dichiarato esplicitamente come open point per SPEC-0007; non lo si anticipa in questo giro |

## Open point dichiarati a inizio esperimento

- **Granularità degli stati dell'agente**: meglio modellare a grana fine (`signal_extraction → ml_classification → ...`) o a grana grossa (`planning → executing → consolidating`)? Da decidere durante la modellazione del primo orchestrator candidato.
- **Sub-agent invoke vs in-line**: quando l'orchestrator chiama un sub-agente è state-invoke sincrono (Pattern del round 2)? Lo è sempre, oppure ci sono casi dove il sub-agente è eventato? Da analizzare contro l'esperienza Syntonia.
- **Goal vs lifecycle Spec POM**: il workflow del goal ha somiglianze forti col lifecycle Spec POM (`draft → accepted → complete`). Da verificare se sono lo stesso pattern o se differiscono.
- **Loop di tool calling**: il loop dell'agente che fa "decide → tool call → observe result → ripeti" è esprimibile come transizione ciclica `executing → executing` con counter, oppure richiede una semantica diversa? Caso da modellare esplicitamente.

## Evidenze

Vedi `evidence/` per output del validatore, diagrammi Mermaid generati, eventuali snippet di codice prodotti durante l'esperimento.

## Esito

Da definire alla fine. Opzioni:

- **Promozione completa**: nuova sottosezione "Modeling agent loops and goals" in `WORKFLOW_INTEGRATION_GUIDE.md` + uno o due esempi canonici sotto `templates/examples/workflow/` + cenni in `POM_GUIDE.{en,it}.html` + paragrafo in `wiki/skills-and-prompts.md` o `wiki/experiments-and-extension.md`.
- **Promozione parziale**: solo design note in `docs/workflow-agent-loops.md` come riferimento autonomo, senza tocchi alle guide principali.
- **Riformulazione**: scope troppo ampio o troppo specifico; nuovo giro.
- **Abbandono**: i sei livelli sono già impliciti negli artefatti v0.2.0; scrivere prosa esplicita non aggiunge valore. Sintesi in `analysis/workflow-agent-loops.md` per memoria futura.

## Consolidazione

| Artefatto | Destinazione | Azione |
|---|---|---|
|  |  |  |

Da compilare in fase di promozione.

## Follow-up

- [ ] Compilare `design/AGENT-LOOP-FSM-INTEGRATION.md`.
- [ ] Modellare `workflows-candidate/agent-orchestrator.yaml`.
- [ ] Modellare `workflows-candidate/goal-lifecycle.yaml`.
- [ ] Eventualmente modellare `workflows-candidate/bounded-retry-agent.yaml`.
- [ ] Validare con `pom:workflow:lint` + `--mermaid-dir`, raccogliere evidence.
- [ ] Confronto con Syntonia (operational, analyzer, clean-family-repair).
- [ ] Eventuale evidence runtime TypeScript Pattern A con suspend/restore.
- [ ] Compilare sezione Esito e Consolidazione.
