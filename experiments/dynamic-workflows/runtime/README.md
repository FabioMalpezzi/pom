# Esecutori di riferimento del contratto Dynamic Workflow

Tre file, tutti **riferimenti estensibili**, non il runtime canonico di POM (POM è metodo, non runtime). Implementano il contratto descritto in `../design/CONTRACT.md`.

| File | Cosa | Come eseguirlo |
|---|---|---|
| `run-stub.mjs` | Runner deterministico usato durante l'esperimento per validare il contratto modello per modello. | `node run-stub.mjs <wf.yaml> [--n N] [--timeout h] [--cancel-at S] [--early K]` |
| `dynamic-workflow.ts` | Esecutore di riferimento **TypeScript**, semplice ma completo. | `tsx dynamic-workflow.ts <wf.yaml> [flag…]` |
| `dynamic_workflow.py` | Esecutore di riferimento **Python**, semplice ma completo. | `python dynamic_workflow.py <wf.yaml> [flag…]` (richiede `pyyaml`) |

## Copertura (entrambe le implementazioni)

Control plane FSM sincrona + tutti i costrutti del contratto: `fan_out_launch` (lancio non bloccante), `await` (`join`: all/quorum/first, `timeout`/`on_timeout`), lifecycle esplicito degli handle (`await` risolve, `cancel_handles` propaga cancel, `detach_handles` propaga detach), `react` (on_each + early-exit), `state-invoke`, canale di controllo `cancel`+`compensation`/`suspend`/`resume`, composizione ricorsiva (nested fan-out), `snapshot`/`restore`.

## Il punto di estensione: `Executor` (il data plane)

Le implementazioni separano nettamente il **control plane** (la FSM, deterministica, sincrona — il file Engine) dal **data plane** (l'esecuzione concorrente delle istanze — l'interfaccia `Executor`).

```
interface Executor {
  launchBatch(batch, baseDir, sig)
  awaitBatch(batch, baseDir, sig): {terminal, leaves}[]
  cancelBatch(batch, baseDir, sig)
  detachBatch(batch, baseDir, sig)
  suspendBatch(batch, baseDir, sig)
  resumeBatch(batch, baseDir, sig)
}
```

Lo stub di default (`Engine.withStub` / `Engine.with_stub`) lancia le `n` istanze al `fan_out_launch`, ne conserva i risultati per handle, e li consegna solo quando la FSM esegue `await`. L'esecuzione è **sequenziale**, deterministica e riproducibile — perfetta per testare la *struttura*. Per un uso reale si sostituisce l'`Executor` con un'implementazione che:

- **parallelizza** le istanze (thread pool, async/await, processi, o una coda distribuita);
- onora il **timeout** con un timer reale e i **control signal** (`cancel`/`suspend`/`resume`) con cancellazione/persistenza effettiva;
- per attese a **giorni** (processi con attività umane) persiste lo stato su un durable store (`snapshot`/`restore`) invece di tenere il processo vivo.

La FSM (control plane) non cambia: cambiano l'`Executor` e, per attese lunghe, la `Persistence`. È la dottrina "control plane FSM + data plane esterno" del contratto.

## Persistenza

Entrambe le implementazioni espongono una `MemoryPersistence` minima. Al `suspend` l'engine coordina prima le FSM figlie attive tramite `suspendBatch`, registra negli handle la conferma di sospensione, poi salva stato corrente, context e handle attivi. Al `resume` ricarica lo snapshot e propaga il segnale agli handle ancora aperti. In un target reale lo stesso punto va sostituito con storage durabile, lock/lease e recovery dopo riavvio.

## Segnali di controllo nel CLI (simulazione)

`--timeout h1,h2` marca dei batch come non-completanti (simula il timeout); `--cancel-at S` inietta un cancel allo stato S (mostra compensazione + propagazione); `--suspend-at S` mostra snapshot/restore; `--early K` forza l'uscita anticipata reattiva al K-esimo completamento. In un host reale questi arrivano da eventi/timer, non da flag.
