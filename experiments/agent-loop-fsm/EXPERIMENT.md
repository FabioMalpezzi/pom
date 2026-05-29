# Esperimento - Miglioramento della Modellazione Agent Loop e Goal Lifecycle

| Campo | Valore |
|---|---|
| Data | 2026-05-30 |
| Tipo | research / continuous improvement / estensione POM |
| Stato | running |
| Branch / Path | `exp/agent-loop-fsm` + `experiments/agent-loop-fsm/` |
| Isolamento | branch dedicato + cartella esperimento |
| Owner | POM maintainer |

## Scopo

Questo documento descrive un percorso di miglioramento guidato da esperimenti.

L'obiettivo non è dimostrare la validità di una specifica soluzione tecnica, ma individuare il miglior approccio disponibile per rappresentare all'interno di POM:

- il lifecycle di un agente;
- il lifecycle di un goal;
- i loop decisionali;
- i meccanismi di retry;
- la persistenza dello stato tramite suspend/restore.

Ogni ipotesi verrà verificata tramite uno o più esperimenti. Le soluzioni che dimostreranno valore saranno candidate alla promozione nel metodo POM. Le soluzioni che non produrranno benefici sufficienti saranno archiviate insieme alle evidenze raccolte.

## Architettura concettuale

Questo lavoro mette deliberatamente in relazione tre concetti POM distinti che, presi insieme, formano il quadro operativo dell'esperimento.

### Concetto 1 — Esperimento POM

Il pattern POM degli esperimenti come strumento di continuous improvement: isolamento (`experiments/<topic>/`), iterazioni piccole guidate da ipotesi, decisione esplicita di Adopt / Refine / Reject ad ogni iterazione, promozione canonica solo dopo verifica. Definito in `skills/spike.md` + `prompts/09-run-temporary-experiment.md`. Il metodo sperimentale a sette step descritto sotto è l'applicazione disciplinata di questo pattern al dominio agentico.

### Concetto 2 — Loop / Goal degli agenti

Il dominio applicativo: gli agenti AI lavorano in cicli (perception → planning → action → observation), perseguono goal con un proprio lifecycle (proposto → accettato → in lavorazione → bloccato → completato), gestiscono retry con bound, sopravvivono a interruzioni e riprese. È il problema da modellare, non lo strumento per farlo.

### Concetto 3 — FSM / Workflow POM

Lo strumento di modellazione introdotto in POM v0.2.0 (SPEC-0006): YAML dichiarativo, validatore strutturale, generatore Mermaid integrato, composizione sincrona (pipeline, state-invoke, event-invoke), context injection, suspend/restore. È il candidato per gestire correttamente il Concetto 2 con la disciplina che il Concetto 1 impone.

### Come i tre concetti convergono

L'esperimento è un'**istanza concreta** del pattern documentato in `templates/WORKFLOW_INTEGRATION_GUIDE.md` sezione "As a temporary experiment before promotion": usa il pattern POM degli esperimenti (Concetto 1) per verificare se e come la capability FSM (Concetto 3) gestisce in modo corretto il dominio agent loop / goal (Concetto 2). Ogni iterazione produce o un workflow candidato sotto `workflows-candidate/` che esemplifica la triplice intersezione, oppure una decisione documentata che riduce l'incertezza su un percorso non praticabile.

La triplice intersezione è anche il motivo per cui il limite di scope è chiaro: niente runtime per agenti (escluderebbe il Concetto 1 a favore del Concetto 2), niente concorrenza (forzerebbe il Concetto 3 oltre i suoi pilastri), nessuna modifica al core schema (preserva l'integrità del Concetto 3 stabilita in v0.2.0). I tre concetti restano in equilibrio.

## Obiettivo

Raggiungere una modalità chiara, verificabile e manutenibile per modellare sistemi agentici utilizzando le capability Workflow/FSM introdotte in POM v0.2.0.

Il risultato atteso è una documentazione sufficientemente robusta da permettere:

- la modellazione del control flow degli agenti;
- la modellazione del lifecycle dei goal;
- la rappresentazione dei loop decisionali;
- la gestione controllata dei retry;
- la persistenza dello stato attraverso interruzioni e riprese.

Il successo non viene misurato sulla correttezza teorica del modello ma sulla sua efficacia pratica.

## Criteri di successo

L'esperimento è considerato riuscito se produce:

- una guida di integrazione chiara e riutilizzabile;
- almeno due workflow validati e leggibili;
- evidenze che dimostrino la capacità di modellare agent loop e goal lifecycle;
- una raccomandazione esplicita di adozione o non adozione.

## Metodo sperimentale

Ogni iterazione segue il seguente ciclo.

### 1. Selezione dell'ipotesi

Si identifica l'ipotesi ritenuta più promettente.

### 2. Definizione dei criteri di successo

Prima di eseguire l'esperimento vengono definite:

- metriche;
- evidenze attese;
- condizioni di accettazione.

### 3. Implementazione minima

Si realizza la minima implementazione necessaria per verificare l'ipotesi.

### 4. Raccolta evidenze

Si raccolgono:

- workflow;
- diagrammi;
- output del validator;
- esempi runtime;
- note progettuali.

### 5. Valutazione

L'ipotesi viene confrontata con i criteri di successo.

### 6. Decisione

Possibili esiti:

- **Adopt** — l'ipotesi produce un miglioramento dimostrabile.
- **Refine** — l'ipotesi è promettente ma richiede ulteriori iterazioni.
- **Reject** — l'ipotesi non produce valore sufficiente.

### 7. Apprendimento

Ogni iterazione deve lasciare traccia di:

- cosa è stato provato;
- cosa si è osservato;
- cosa si è imparato;
- quale decisione è stata presa.

## Backlog delle ipotesi

### H1 — Modellazione dell'agente come FSM

| Campo | Valore |
|---|---|
| Descrizione | Il control flow di un agente AI può essere modellato tramite workflow POM senza introdurre complessità eccessiva. |
| Stato | Proposed |
| Priorità | Alta |

### H2 — Loop agente come transition table

| Campo | Valore |
|---|---|
| Descrizione | Il ciclo `perception → planning → action → observation` può essere rappresentato tramite transition table mantenendo chiarezza e verificabilità. |
| Stato | Proposed |
| Priorità | Alta |

### H3 — Retry tramite self-transition

| Campo | Valore |
|---|---|
| Descrizione | I meccanismi di retry possono essere rappresentati mediante transizioni cicliche e contatori di contesto. |
| Stato | Proposed |
| Priorità | Media |

### H4 — Goal lifecycle indipendente

| Campo | Valore |
|---|---|
| Descrizione | Il lifecycle del goal può essere modellato come workflow autonomo e persistente. |
| Stato | Proposed |
| Priorità | Alta |

### H5 — Suspend/restore del loop agente

| Campo | Valore |
|---|---|
| Descrizione | Le capability esistenti sono sufficienti per sospendere e riprendere un agente preservandone lo stato. |
| Stato | Proposed |
| Priorità | Media |

### H6 — Loop bounded come primitiva di schema (per numero di iterazioni e/o per durata totale)

| Campo | Valore |
|---|---|
| Stato | Proposed (schema-level) |
| Priorità | Alta |
| Scope | Fuori scope per questo esperimento. Richiede modifica al core schema SPEC-0006. Candidata per SPEC-0007 in un esperimento separato `exp/schema-loop-guard-timeout`. |

**Descrizione**

Il concetto di ciclo bounded deve diventare una primitiva esplicita del workflow YAML lungo **due dimensioni indipendenti e combinabili**:

- numero massimo di iterazioni (`max_visits`);
- durata massima cumulativa del ciclo (`max_duration`).

Esempi motivanti reali: l'analyzer-fsm Syntonia ha `MAX_LLM_ATTEMPTS = 3` (count) ma in produzione vorrebbe anche un secondo bound del tipo "non oltre 30 minuti totali di retry per non bloccare l'utente" (duration); un agente di planning può avere un budget combinato "5 step oppure 10 minuti, qualunque arrivi prima".

**Definizione**

Un blocco `loop_guard:` su uno stato con self-transition dichiara fino a due bound indipendenti sul ciclo. **Una chiave bound è attiva se e solo se è presente nel YAML.** Per disattivare un bound, si omette la chiave; non esistono valori sentinella. Almeno una delle due chiavi `max_visits` o `max_duration` deve essere presente; un `loop_guard` privo di entrambe è un errore di validazione.

**Forma generale**

```yaml
loop_guard:
  max_visits: N                  # opzionale: bound sul conteggio (intero >= 1)
  max_duration: <duration>       # opzionale: bound sul tempo cumulativo
  on_exhaustion: <target>        # obbligatorio: fallback comune a entrambe le cause
  on_visits_exhausted: <target>  # opzionale: override quando esaurisce max_visits
  on_duration_exhausted: <target> # opzionale: override quando scade max_duration
```

**Esempi (la presenza/assenza di chiave attiva/disattiva la dimensione)**

Solo conteggio (tempo unbounded):

```yaml
loop_guard:
  max_visits: 5
  on_exhaustion: planning_failed
```

Solo tempo (conteggio unbounded):

```yaml
loop_guard:
  max_duration: 30min
  on_exhaustion: planning_failed
```

Entrambi (il loop termina alla prima soglia raggiunta, stesso target per entrambe le cause):

```yaml
loop_guard:
  max_visits: 5
  max_duration: 30min
  on_exhaustion: planning_failed
```

Entrambi con routing differenziato per causa (override opzionali):

```yaml
loop_guard:
  max_visits: 5
  max_duration: 30min
  on_exhaustion: planning_failed              # fallback
  on_visits_exhausted: escalate_to_human      # override per "esauriti tentativi"
  on_duration_exhausted: schedule_resume      # override per "scaduto il tempo"
```

Errore (validator emette Error: il guard non vincolerebbe nulla):

```yaml
loop_guard:
  on_exhaustion: planning_failed   # né max_visits né max_duration → invalid
```

**Tipi e formati fissati (C1)**

- `max_visits`: intero ≥ 1.
- `max_duration`: stringa con suffisso esplicito non ambiguo, formato `<N><suffix>` con `suffix ∈ {s, min, h, d}` (esempi: `30s`, `15min`, `2h`, `7d`). **Decisione netta su C1**: il suffisso `m` da solo è **vietato** perché ambiguo (potrebbe significare "minuti" o "millisecondi" a seconda della convenzione del linguaggio target — `m` in Go è minuti, `ms` in JavaScript è millisecondi, `m` in alcuni shell è minuti). Si usa sempre `min` per minuti. Accettato in alternativa il formato ISO 8601 duration (`PT30S`, `PT15M`, `PT2H`, `P7D`) come input non ambiguo.
- `on_exhaustion`, `on_visits_exhausted`, `on_duration_exhausted`: nomi di stato dichiarati in `states[]` del workflow.

**Routing della causa di esaurimento (C4)**

- `on_exhaustion` è **obbligatorio** e serve da fallback comune.
- `on_visits_exhausted` e `on_duration_exhausted` sono **opzionali override per causa**.
- Quando un override è presente, prende precedenza sul fallback per la sua causa specifica.
- Quando un override è assente, l'esaurimento di quella causa va a `on_exhaustion`.
- Se nel `loop_guard` è presente una sola delle due dimensioni (es. solo `max_visits`), l'override corrispondente all'altra dimensione è inutile e la sua presenza è un Warning del validator (non un Error, perché non rompe nulla a runtime).

**Semantica del tempo (C2 + C3)**

- **Misurazione**: `max_duration` è il tempo cumulativo speso nel loop calcolato come somma degli intervalli ` (uscita_visita_i − ingresso_visita_i)` per le visite consecutive del loop corrente.
- **Reset per-entry (C2)**: i counter (`visit_count` e `cumulative_duration`) **si resettano** ogni volta che il loop riceve un ingresso "da fuori" — cioè una transizione che arriva nello stato di loop da uno stato diverso. Si **accumulano** invece sulle self-transition interne. In pratica: un loop riavviato da un evento esterno parte con budget pieno; lo stesso loop che cicla su sé stesso consuma il budget. Questo è coerente con l'intuizione "budget per esecuzione del loop".
- **Persistenza in context (C3)**: i due counter sono materializzati esplicitamente in `context` con nomi convenzionali fissati:
  - `_loop_guard_<state_name>__visit_count`: intero, incrementato a ogni self-transition.
  - `_loop_guard_<state_name>__started_at`: timestamp UTC ISO 8601 dell'ingresso iniziale nel loop corrente.
  - Il prefisso `_loop_guard_` segnala convenzione interna (per evitare collisioni con i campi del context utente). Il target code legge/scrive questi due campi durante l'enforcement del bound.
- **Misurazione del tempo durante suspend/restore (C3)**: il tempo conta come **wall-clock**, non come "tempo attivo del processo". Un agente sospeso 7 giorni con `max_duration: 30min` al restore ha **esaurito** il bound: la differenza `now() − started_at` è ben oltre 30 minuti. Questa decisione è coerente con il caso d'uso "budget per non bloccare l'utente". Per workflow che richiedono "tempo attivo soltanto" (esclude le pause di sospensione), serve una primitiva diversa che resta open point per un futuro round.

### H7 — Timeout su stato non-loop come primitiva di schema

| Campo | Valore |
|---|---|
| Descrizione | Il concetto di tempo massimo di permanenza in un singolo stato non-loop deve diventare una primitiva esplicita, distinta dal `loop_guard` di H6. Questo è il caso di stati di attesa o di lavorazione la cui scadenza è naturale (non un ciclo da bounding). Esempi motivanti: ticket-lifecycle (autoclose dopo N giorni in `waiting_customer`); payment-flow (`pending → expired` dopo 15 min senza azione utente); agent loop (singolo step LLM con timeout di 60 secondi). Forma candidata: |
| Forma YAML | `timeout: { duration: <ISO8601-duration>, on_timeout: <target> }` su uno stato non-loop. |
| Stato | Proposed (schema-level) |
| Priorità | Alta |
| Nota | Richiede modifica al core schema SPEC-0006. Fuori scope per questo esperimento. Candidata per SPEC-0007 in un esperimento separato `exp/schema-loop-guard-timeout`. Open point già citato in `examples/ticket-lifecycle.yaml` (timer-based transitions). |

### Perché H6 e H7 sono separate

Sono due concetti che coabitano spesso ma rispondono a domande diverse:

- **H6 (`loop_guard`)** risponde a "questo ciclo non deve protrarsi all'infinito": bound del ciclo nel suo complesso (count e/o tempo totale).
- **H7 (`timeout`)** risponde a "questo stato non deve restare attivo all'infinito": bound della permanenza in uno specifico stato non-iterativo.

Esempio combinato realistico (per fissare i due concetti):

```yaml
states:
  - name: llm_planning_loop
    is_final: false
    loop_guard:
      max_visits: 5            # H6: massimo 5 iterazioni di planning
      max_duration: 10min      # H6: e comunque non oltre 10 minuti totali
      on_exhaustion: planning_failed
  - name: waiting_human_review
    is_final: false
    timeout:
      duration: 24h            # H7: lo stato attende un umano per max 24 ore
      on_timeout: review_auto_escalated
```

## Piano degli esperimenti

### Esperimento 1

| Campo | Valore |
|---|---|
| Ipotesi | H1 |
| Obiettivo | Verificare la modellazione FSM dell'agente. |
| Artefatti | design note; `agent-orchestrator.yaml` |
| Evidenze richieste | workflow valido; diagramma Mermaid leggibile |
| Decisione | Da compilare |

### Esperimento 2

| Campo | Valore |
|---|---|
| Ipotesi | H2 |
| Obiettivo | Verificare la rappresentazione del loop decisionale. |
| Artefatti | workflow dedicato; mapping con transition table |
| Evidenze richieste | leggibilità; assenza di forzature concettuali |
| Decisione | Da compilare |

### Esperimento 3

| Campo | Valore |
|---|---|
| Ipotesi | H3 |
| Obiettivo | Verificare bounded retry e loop guard. |
| Artefatti | `bounded-retry-agent.yaml` |
| Evidenze richieste | validazione schema; comprensibilità del diagramma |
| Decisione | Da compilare |

### Esperimento 4

| Campo | Valore |
|---|---|
| Ipotesi | H4 |
| Obiettivo | Verificare il workflow autonomo del goal. |
| Artefatti | `goal-lifecycle.yaml` |
| Evidenze richieste | persistenza; indipendenza dal control flow agente |
| Decisione | Da compilare |

### Esperimento 5

| Campo | Valore |
|---|---|
| Ipotesi | H5 |
| Obiettivo | Verificare suspend/restore. |
| Artefatti | esempio runtime; snapshot; restore |
| Evidenze richieste | ripresa corretta dello stato |
| Decisione | Da compilare |

## Scope

### Incluso

- modellazione workflow;
- design note;
- validazione tramite strumenti POM;
- generazione Mermaid;
- raccolta evidenze;
- confronto con esperienza Syntonia;
- decisione finale.

### Escluso

- modifiche al core schema;
- runtime engine per agenti;
- sistemi multi-agente concorrenti;
- coordinamento distribuito;
- generazione automatica di agenti.

Nota: le ipotesi **H6 (loop_guard per numero di iterazioni)** e **H7 (timeout per tempo di esecuzione)** richiedono entrambe modifica al core schema SPEC-0006 e quindi *non vengono eseguite in questo esperimento*. Sono tracciate qui nel backlog per visibilità e priorità, ma il loro luogo di lavoro corretto è un esperimento parallelo dedicato (proposto: `exp/schema-loop-guard-timeout`) che apre SPEC-0007. Quando quell'esperimento conclude, le primitive risultanti diventeranno disponibili a questo esperimento per riformulare H3 e H5 con strumenti di schema più forti.

## Limiti dell'esperimento

L'esperimento termina quando si verifica una delle seguenti condizioni:

- obiettivo raggiunto;
- 10 ipotesi valutate;
- 20 giorni/uomo consumati;
- tre iterazioni consecutive senza miglioramenti significativi;
- decisione esplicita di interruzione.

## Rischi

| Area | Rischio | Mitigazione |
|---|---|---|
| Manutenibilità | eccessiva crescita documentale | promuovere solo il materiale realmente utile |
| Filosofia POM | deriva verso framework agentico | verifica continua dei quattro pilastri (no async / no shared state / no inheritance / no runtime) |
| Complessità | workflow troppo dettagliati | favorire modelli semplici e leggibili |
| Schema | emergere di primitive mancanti | rinviare a future SPEC |

## Registro delle evidenze

Tutte le evidenze prodotte durante l'esperimento vengono archiviate nella cartella `evidence/`.

Ogni evidenza deve essere collegata a:

- ipotesi;
- esperimento;
- decisione.

## Esito finale

Da compilare al termine dell'esperimento.

Possibili esiti:

- **Promote** — adozione completa nel metodo POM.
- **Promote with revisions** — adozione condizionata a modifiche o riformulazioni.
- **Refine and continue** — risultati promettenti ma non ancora sufficienti; proseguire con altre iterazioni.
- **Reject** — la direzione non produce valore; archiviare con le lezioni apprese.

## Conoscenza prodotta

Ogni esperimento, indipendentemente dall'esito, deve produrre:

- evidenze;
- lezioni apprese;
- decisioni motivate.

Un esperimento fallito è considerato utile se riduce l'incertezza e consente di evitare investimenti futuri su una soluzione non efficace.

## Consolidazione

| Artefatto | Destinazione | Azione |
|---|---|---|
|  |  |  |

Da compilare in fase di promozione.

## Follow-up

- Aggiornare il backlog delle ipotesi.
- Eseguire il prossimo esperimento prioritario.
- Registrare evidenze e lezioni apprese.
- Rivalutare il backlog.
- Compilare l'esito finale.
