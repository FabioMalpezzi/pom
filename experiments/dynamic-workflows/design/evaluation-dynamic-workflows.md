---
experiment: dynamic-workflows
evaluates: criteria.md (status: accepted, congelato 2026-05-30)
date: 2026-05-30
evaluator: independent-adversarial
verdict: refuted
---

# Valutazione indipendente avversariale — dynamic-workflows

Nota di indipendenza: in questo primo collaudo del metodo il valutatore NON è stato eseguito come sessione separata dal modellatore (lo stesso agente ha modellato e valutato). È una limitazione dichiarata: l'indipendenza piena (sessione fresca che legge solo gli artefatti) andrà esercitata in un giro successivo. La postura avversariale è però stata reale: ho attivamente cercato di refutare l'irriducibilità del fan-out, e ci sono riuscito per la sua *funzione* (vedi C-falsificazione).

## Evidenze esaminate

- criteria congelato: `design/criteria.md` (accepted 2026-05-30).
- fit: `design/fit.md` (4 strutture) + i 5 modelli in `workflows-candidate/`.
- runtime: esecuzioni con `runtime/run-stub.mjs` (stub deterministici, N parametrico).
- negative fixture: `broken-fixtures/state-invoke-parallel-E036.yaml` → E036.

## Verifica contro i criteri congelati

| Criterio | Atteso | Osservato | Tentativo di refutazione | Esito |
|---|---|---|---|---|
| Gate: validator PASS | 0 errori su ogni modello | tutti i 5 modelli PASS; il probe parallel FALLISCE (E036, voluto) | ho cercato un modello valido che esprimesse il parallelismo: non esiste, E036 lo blocca | tiene |
| Gate: esecuzione senza crash | runtime raggiunge il terminale | tutti raggiungono il terminale; fan-out effettivo misurato (1 vs 100) | — | tiene |
| Signal: forced lossy ↓ | scende iterando | sceso su 3/4 strutture (pipeline clean, fan-in adapted, fan-out funzione adapted); fermo sulla concorrenza | ho cercato un pattern che azzerasse anche l'ultimo forced: il counted invoke loop recupera N dinamico ma NON la concorrenza | tiene (signal mosso, non saturo) |
| Uscita | quale si è verificata | raggiunto deliverable per tutte e 4 le strutture, sotto budget | — | coerente |
| Falsificazione | forced irriducibile che sopravvive al tentativo avversariale | la **concorrenza a N** (fork dei verifier + fan-out parallelo) sopravvive | counted invoke loop + counted join recuperano la funzione (N dinamico sequenziale); E036 vieta la concorrenza e nessun pattern la esprime | **OSSERVATO → ipotesi falsa** |

## Verdetto: refuted

L'ipotesi — "il Dynamic Workflow è modellabile con fit accettabile usando solo le primitive attuali più design pattern, senza primitive nuove" — è **falsificata**, ma in modo preciso e localizzato, non globale.

Cosa ho provato a refutare e dove ho fallito a falsificare (cioè dove lo schema ha retto): tre strutture su quattro reggono con design pattern esistenti — la pipeline per-task è clean as-is, il fan-in di N si esprime col counted join, e perfino la *funzione* del fan-out (lanciare N task dinamici e raccoglierli) si esprime col counted invoke loop, dimostrato eseguendo 100 task. Su questo l'ipotesi NON è caduta: il design pattern opportuno basta, e non serve estensione.

Dove invece l'ipotesi cade, in modo irriducibile: la **concorrenza a N** — i due verifier che girano in parallelo (fork) e gli N task lanciati insieme (fan-out parallelo). Nessun design pattern sulle primitive attuali la esprime, e non per caso: lo schema la vieta *per costruzione* (E029/E036/E046, "no async" — uno dei quattro pilastri di SPEC-0006). Il counted loop la aggira solo serializzandola, cioè rinunciandovi. Restando anche alla sola rappresentazione strutturale (la concorrenza operativa è fuori scope), lo schema non ha alcun modo di *dire* "questi N rami sono simultanei".

## Deliverable: estensione necessaria e costo

Serve una primitiva di **parallelismo / fan-out concorrente** (un `parallel` su uno stato, o un `fan-out`/`spawn` di K rami con un join di sincronizzazione). È l'unica estensione realmente necessaria; tutto il resto del Dynamic Workflow è già esprimibile.

Costo: **alto, non incrementale.** Non è un'aggiunta sintattica come `loop_guard`/`timeout`. Tocca:
- il **validator**: ribaltare E029/E036/E046, che oggi vietano `parallel` esplicitamente;
- lo **schema/SPEC-0006**: rimuovere "no async" dai pilastri, o introdurre un costrutto parallelo con semantica di join definita;
- il **runtime**: serve uno scheduler concorrente con sincronizzazione, cioè una responsabilità del data plane target.

In altre parole: il parallelismo non è un'estensione interna di POM-as-FSM. La via meno invasiva è il contratto Dynamic Workflow: POM governa launch, await, timeout, lifecycle e compensation come control plane; il progetto target realizza il data plane concorrente.

## Budget

- Allocato: 32 iterazioni, 60 minuti, stallo 3.
- Consumato: ~6 iterazioni del loop (4 strutture + 1 probe + 1 iterazione di refutazione sul fan-out). Ben sotto i tetti.
- Residuo: ampio, ma non si converte in consigli: il verdetto è `refuted`, non `confirmed con margine`. L'esperimento ha già prodotto il suo deliverable (l'estensione necessaria e il costo).

## Consigli per il Coordinatore (prossimo giro)

Nessun consiglio da budget residuo (verdetto refuted, vedi sopra). Però due note utili a un eventuale giro futuro, da vagliare col Coordinatore se l'utente vorrà aprirlo:
- mantenere il confine control-plane/data-plane: POM modella la struttura e il target realizza l'orchestrazione concorrente.
- il counted invoke loop e il counted join sono due **design pattern riusabili** emersi qui: candidabili a esempi canonici se promossi.

## Confine

Questa è una raccomandazione tecnica. Dove ho dovuto interpretare: ho pesato la concorrenza come *essenziale* all'oggetto "Dynamic Workflow" (il diagramma Anthropic dice "N in the 100s" lanciati insieme); se la si considerasse accessoria, il verdetto si attenuerebbe a "adapted con serializzazione" invece che refuted. L'ho dichiarato perché è il punto su cui la mia lettura ha pesato di più sul verdetto.

## Verdetto integrato (dopo i giri 2-5)

Il giro 1 ha falsificato l'ipotesi "lo schema basta senza primitive nuove". I giri 2-5 hanno trasformato quel "no" in un deliverable preciso: il **contratto Dynamic Workflow** (`design/CONTRACT.md`), un'estensione **additiva** che elude il forced irriducibile (la concorrenza) **delegandola all'esterno** invece di portarla dentro la FSM. Il verdetto resta `refuted` per l'ipotesi originale congelata — serve comunque un'estensione — ma il costo è basso e in spirito POM, non il cambio di paradigma stimato nel giro 1.

Cosa ho continuato a provare a refutare, e dove ho fallito a falsificare (cioè dove il contratto ha retto, eseguendo): launch/await (A) esprime lancio + lavoro + attesa; il join `quorum`/`first` regge un batch lento; il `timeout` risveglia la macchina; `react` cattura il caso a flusso; il nesting compone ricorsivamente; `cancel`+`compensation`/`suspend`/`resume` coprono il canale di controllo, propagati, con un solo costrutto nuovo. Tutti additivi (13/13 modelli passano il validator).

**Confine di responsabilità**: questo deliverable appartiene al dominio **workflow** (estensione SPEC-0006), non al metodo loop/goal. La dottrina control-plane/data-plane è registrata in ADR-0004 e SPEC-0006. Ciò che l'esperimento restituisce al metodo `loop-goal` è solo il **feedback** sul ciclo a quattro agenti in dialog-mode.

**Stato corrente**: il contratto è adottato come dottrina workflow control-plane. Il validator copre il lifecycle degli handle; le due implementazioni di riferimento TypeScript e Python restano come evidenza di eseguibilità e guida per i target, non come runtime canonico di POM.
