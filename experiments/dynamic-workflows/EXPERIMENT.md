# Esperimento — Dynamic Workflows nel formalismo FSM di POM

| Campo | Valore |
|---|---|
| Data | 2026-05-30 |
| Tipo | research / estensione POM / continuous improvement |
| Stato | chiuso |
| Branch / Path | `exp/dynamic-workflows` + `experiments/dynamic-workflows/` |
| Owner | POM maintainer |
| Metodo | primo collaudo reale del ciclo a quattro agenti `loop-goal` in modalità confronto |

## Scopo

Verificare se il formalismo FSM di POM (SPEC-0006) è in grado di descrivere i **Dynamic Workflow** nel senso di Anthropic — un orchestratore che lancia N task (potenzialmente centinaia), ciascuno con la sua pipeline implementer → verifier → fixer, e un fan-in finale — e, dove non basta, individuare le estensioni minime necessarie e il loro costo, distinguendo i limiti che richiedono *per forza* un'estensione da quelli superabili con il **design pattern** opportuno.

Il SUT è lo **schema FSM** (capacità espressiva), non un singolo workflow. La concorrenza operativa è fuori scope; la sua *rappresentazione strutturale* è dentro. Gli Agent Teams (comunicazione peer-to-peer) sono fuori scope. Criteri congelati in `design/criteria.md`.

## Come si è lavorato

Esecuzione **autonoma** dopo la definizione dei criteri in confronto con l'utente (è il confine del metodo: l'utente nel loop alla partenza e alla decisione finale, autonomia in mezzo). Ogni struttura/variante modellata in YAML, validata (`pom:workflow:lint`, gate G1), eseguita su un runner deterministico a stub (`runtime/run-stub.mjs`, gate G2), classificata per fit (signal = forced lossy residui). Budget per giro: 32 iterazioni / 1 ora / stallo a 3 (giro 1), poi stallo a 5 (giri successivi). Mai avvicinati i tetti.

## I cinque giri

1. **Le quattro strutture base.** Pipeline per-task = clean; fork/join dei verifier = adapted (sequenzializzato); fan-in di N = adapted (counted join via context counter); fan-out di N = **forced**. Verdetto giro 1: ipotesi falsificata — il fan-out a N e il parallelismo non sono esprimibili come parallelismo nativo dentro la FSM (E036 vieta `mode: parallel`; una transizione = un solo `to`). Il caso negativo vive in `broken-fixtures/state-invoke-parallel-E036.yaml`; `04-fanout` con `--n 100` lancia 1 task reale.

2. **Refutazione e launch/await.** Il counted invoke loop (`04b`) esprime N task dinamici ma **sequenziali**: l'irriducibile non è la funzione fan-out, è il **parallelismo**. Su proposta dell'utente nasce il pattern **control plane interno / data plane esterno**: la FSM decide e delega; un `fan_out_launch` non bloccante + un `await` bloccante. Confronto fra tre varianti — A (stati dedicati), B (effetto su transizione, **scartata**), C (handle nel context). Scelta: **A**, come decomposizione naturale dello `state-invoke`.

3. **Timeout e politiche di join.** `await` con `timeout`/`on_timeout` (primitiva **H7** in contesto concreto): la macchina si risveglia, non resta sospesa. Join resilienti: `all` / `quorum(k)` / `first`(race) — il lento non blocca se la soglia è raggiunta. Riconosciuto il punto chiave: nessun coordinatore esterno, è la **macchina persistente** (suspend/restore, **H5**) a coordinare.

4. **Reattività e nesting.** Attesa reattiva (`react`/`on_each` + early-exit): il caso "a flusso" è esprimibile come counted-join con uscita anticipata guardata. Fan-out **annidato**: `launch`/`await` compone ricorsivamente (M gruppi × N task, FSM di vertice minimale).

5. **Canale di controllo della composizione.** `cancel`/`suspend`/`resume` come segnali standard del lifecycle, **propagati** dal padre alle figlie attive; unico costrutto nuovo: il blocco **`compensation`** (saga di undo su cancel); `cancelled` terminale implicito. Timeout a scala di **giorni** per i processi con attività umane → suspend/restore non opzionale. Il formalismo è lo stesso per processi software, logici e umani: cambia solo l'implementazione, che fa il target.

## Esito

**Verdetto**: l'ipotesi originale (lo schema attuale basta, senza primitive nuove) è **refuted** in modo localizzato — l'unico forced irriducibile è la concorrenza *dentro* la FSM, vietata per scelta (E036). Ma il **deliverable** è un contratto **additivo** che elude quel limite delegando la concorrenza all'esterno, non un cambio di paradigma. Il contratto completo è in `design/CONTRACT.md`.

**Costo**: basso. Tutti i campi del contratto sono additivi rispetto alla FSM: il validator implementa il lifecycle degli handle e i reference executor TypeScript/Python eseguono tutti i workflow candidate. Dà un caso d'uso concreto a suspend/restore, loop_guard/retry e timeout.

**Per il metodo `loop-goal`**: primo collaudo riuscito del ciclo a quattro agenti in modalità confronto. Il confronto ha prodotto un obiettivo migliore di quello iniziale (separazione ipotesi/deliverable, definizione di "irriducibile"); il signal si è **mosso davvero** (i forced lossy sono scesi iterando — cosa mai accaduta in H1–H5); la valutazione avversariale, co-condotta con l'utente, ha trovato il pattern launch/await e poi il contratto di controllo. Limite onesto: il valutatore non è stato eseguito come sessione separata dal modellatore.

## Artefatti

- Contratto (deliverable): `design/CONTRACT.md`
- Criteri congelati: `design/criteria.md` · traccia del confronto: `design/criteria.dialog.md`
- Decisioni: `decisions-log.md` · fit: `design/fit.md` · verdetto: `design/evaluation-dynamic-workflows.md`
- modelli eseguibili: `workflows-candidate/` · reference executor deterministici: `runtime/dynamic-workflow.ts` e `runtime/dynamic_workflow.py`
- Implementazioni di riferimento (TS, Python): `runtime/` (minimali ed estensibili)
