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
