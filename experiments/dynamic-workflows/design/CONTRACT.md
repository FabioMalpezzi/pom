# Il contratto Dynamic Workflow per POM (deliverable)

Estensione **additiva** del formalismo FSM di POM (SPEC-0006) per descrivere i Dynamic Workflow. Tutti i campi qui sotto sono già accettati dal validator attuale (li ignora); "promuovere" significa formalizzarli (farli validare) più un esecutore di riferimento. La concorrenza resta **fuori** dalla FSM, per scelta.

## Principio

La FSM POM è il **control plane**: decide, resta sincrona e deterministica, tiene vivo il proprio stato (suspend/restore, H5). L'esecuzione concorrente di N istanze è **delegata** a un esecutore esterno (data plane). La FSM non esegue il parallelo: lo comanda, si sospende all'attesa, riprende quando i risultati o un timeout la risvegliano. Niente coordinatore esterno: la persistenza dello stato è il coordinamento. Lo stesso contratto vale se i "processi" sono software, logici o umani — cambia solo l'implementazione, che fa il target.

## Canale di esecuzione

Campi sullo **stato**.

### `fan_out_launch` — lancio non bloccante
```yaml
states:
  - name: launching
    fan_out_launch:
      workflow: <leaf.yaml>   # workflow-foglia da istanziare
      over: <context-field>   # collezione su cui istanziare (N = len)
      handle: <nome>          # riferimento al batch in volo
```
La FSM affida N istanze del leaf all'esecutore e **prosegue subito** (può lanciare altri batch / fare lavoro prima di attendere).

### `await` — attesa bloccante (l'unico punto di blocco)
```yaml
  - name: awaiting
    await:
      handles: [<h1>, <h2>]   # batch attesi
      join: all | quorum | first   # politica
      k: <int>                # solo quorum: basta k di N
      timeout: <durata>       # 30s … giorni (H7)
      on_timeout: <evento>    # transizione di risveglio se scade
```
`all` = tutti; `quorum(k)` = basta k (il lento non blocca); `first` = race. Allo scadere del timeout la FSM **si risveglia** via `on_timeout` invece di restare sospesa.

### `react` — attesa reattiva (a flusso)
```yaml
  - name: collecting
    react:
      on_each: <evento>    # reagisce a ogni completamento (self)
      on_early: <evento>   # uscita anticipata (es. trovato il risultato)
      on_done: <evento>    # raccolta esaurita
```
Counted-join con uscita anticipata guardata: la FSM decide a ogni completamento.

## Canale di controllo (propagato dal padre alle figlie attive)

`cancel`, `suspend`, `resume` sono **segnali standard del lifecycle**, non stati di dominio: si appoggiano a suspend/restore (H5) e si propagano lungo `fan_out_launch`/`invoke` alle figlie attive.

- **cancel** (irreversibile): la FSM esegue la `compensation` (se dichiarata), propaga il cancel alle figlie (che compensano a loro volta), termina in `cancelled` (terminale standard implicito).
- **suspend / resume** (reversibile): snapshot/restore propagati; la macchina si congela e riprende esatta, niente lavoro perso.

### `compensation` — unico costrutto nuovo
```yaml
compensation:          # a livello di workflow; saga di undo, ordine inverso
  - undo: <azione di annullamento>
  - undo: <azione di annullamento>
```

## Si appoggia a (primitive di backlog motivate)

- **H5** suspend/restore — il coordinamento senza orchestratore esterno; obbligatorio per le attese a giorni.
- **H6** loop_guard — il retry: `timeout → re-launch` contato.
- **H7** timeout — il risveglio dell'attesa.

## Cosa resta al target (non a POM)

L'esecuzione concorrente reale, la cancellazione fisica dei thread, la persistenza durevole per le attese lunghe, e l'esecuzione dei passi (codice o attività umane). POM dà il formalismo logico e l'implementazione di riferimento; il target la realizza.

## Stato di dimostrazione

Tutti i costrutti sono stati modellati ed **eseguiti** su `runtime/run-stub.mjs` (stub deterministici, N parametrico): vedi `workflows-candidate/01..13` e `design/fit.md`. Il verdetto avversariale è in `design/evaluation-dynamic-workflows.md`.
