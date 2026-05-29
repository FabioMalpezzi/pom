# Prompt — Definire obiettivo e misure di un esperimento loop/goal

Versione: v1 (draft, scritta insieme all'utente il 2026-05-30).
Stato: candidato, vive in `experiments/agent-loop-fsm/prompts-candidate/`.

Scopo: guidare la prima parte di un esperimento POM che abbia dinamica loop/goal (cioè un ciclo iterativo che cerca di raggiungere un obiettivo dichiarato). Il prompt forza a fissare per iscritto, prima di scrivere YAML, codice o evidence:

1. l'ambito a cui appartiene l'esperimento;
2. l'obiettivo in una frase;
3. le metriche di misura, divise in gate (non-regressione) e signal (progresso);
4. la baseline numerica iniziale di ogni metrica;
5. le condizioni di uscita del loop (raggiunto / forfait).

Senza questa prima parte il loop non ha modo di sapere se sta migliorando, e il consolidamento finale dell'esperimento diventa una valutazione soggettiva.

```text
Sto aprendo un esperimento POM con dinamica loop/goal. Prima di
modellare qualunque workflow, scrivere codice o produrre evidence,
devo fissare per iscritto obiettivo e metriche. Guidami con le cinque
sezioni qui sotto, in ordine. Non lasciarmi saltare passi e non
accettare risposte vaghe: riformula sempre in una claim binaria o
numerica e fammi confermare.

L'output finale di questa conversazione è il file
`experiments/<topic>/design/criteria.md` con il formato definito in
fondo. Se il file esiste già, rifiuta di sovrascrivere e chiedi
perché stiamo ridefinendo i criteri.

## 1. Ambito

Chiedi: "A quale dei dieci ambiti POM appartiene questo esperimento?"

Presenta la lista (ogni ambito ha già un set di metriche tipiche di
riferimento, vedi `experiments/agent-loop-fsm/notes/`):

  1. Esperimenti POM (validator pass, estensioni schema, fixture coperte).
  2. Spike e PoC tecnici (use case coperti, costo, workaround, latency).
  3. Decisioni architetturali e migrazioni (test passati, p95, blast radius).
  4. Lavori di miglioramento misurabili (latency, copertura test, complessità).
  5. Sicurezza e compliance (CVE, secret, endpoint verificati).
  6. Bug investigation e RCA (test riproduzione, hop causali, regressione).
  7. MVP e nuove feature (use case coperti, errori smoke, conversion).
  8. Onboarding e setup (tempo a prima PR, comandi, errori setup).
  9. Documentazione e knowledge management (domande coperte, pagine stale).
 10. Lavori open-ended (decisioni registrate, domande aperte, tempo morto).

Se l'esperimento non rientra in nessuno dei dieci, non inventare un
nuovo ambito al volo: chiedi all'utente di aggiungerlo prima al
backlog di `EXPERIMENT.md` con la sua famiglia di metriche tipiche.

## 2. Obiettivo (una frase)

Chiedi: "In una frase, cosa deve dimostrare questo esperimento?"

Vincoli da imporre:
- una sola frase, voce attiva, presente;
- nomina l'artefatto sotto verifica (uno schema, una primitiva, un
  pattern runtime, una decisione architetturale, un workflow, ...);
- nomina la classe di casi cui il risultato deve generalizzare;
- vietate parole esplorative come "indagare", "vedere", "capire",
  "esplorare", "provare a giocare con". Se l'utente le usa, instrada
  a `prompts/09-run-temporary-experiment.md`: quello è un'esplorazione,
  non un esperimento, e non ha bisogno di questo prompt.

## 3. Metriche del loop (gate + signal)

Spiega all'utente la distinzione prima di chiedere le metriche.

- **Gate (non-regressione)**: condizioni che il loop deve preservare
  ad ogni iterazione. Tipicamente binarie pass/fail o entro soglia.
  Esempio: "tutti i test del validator passano", "0 secret in repo",
  "p95 latency <= 200 ms". Se un gate fallisce, il loop si ferma.

- **Signal (progresso)**: misure che devono migliorare nel tempo per
  giustificare il proseguimento del loop. Tipicamente continue o
  conteggi. Esempio: "workflow modellabili senza estensione schema",
  "use case coperti dalla feature". Se il signal non cresce per N
  iterazioni, il loop esce per `loop_guard` (H6).

Per ogni metrica chiedi:
- nome (es. "validator pass rate", "use case coperti");
- direzione attesa: ↑ ↓ =;
- strumento di misura (comando POM o del target, es. `pom:workflow:lint`,
  `npm test`, `npm audit`, `git diff --shortstat`, script di benchmark);
- baseline (valore corrente, ora, prima di iniziare l'esperimento);
- soglia (per i gate) o trend atteso per iterazione (per i signal).

Rifiuta metriche soggettive ("è elegante", "leggibile", "ci piace di
più"): chiedi di sostituirle con qualcosa che il loop possa misurare
da solo. Se proprio non esiste una misura oggettiva, etichetta la
metrica come "soggettiva, valutata in retrospettiva" e segnalala come
fuori dal loop di confronto automatico.

Numero minimo: 1 gate + 1 signal. Numero massimo consigliato: 3 gate
+ 3 signal. Oltre, il loop diventa difficile da interpretare e il
prossimo umano che lo legge non saprà quale metrica conta di più.

## 4. Baseline registrata

Chiedi all'utente di eseguire ora, prima di toccare qualunque file
dell'esperimento, lo strumento di misura di ogni metrica e di
registrare il valore di partenza nel file `criteria.md` (colonna
`baseline`). Senza baseline il loop non ha riferimento per dire "sto
migliorando".

Se uno strumento di misura non esiste ancora (es. lo script di lint
non copre la metrica scelta), questo è esso stesso un'attività da
fare prima del passo 2 della modellazione: dichiararla come blocco e
fermarsi.

## 5. Condizioni di uscita del loop

Chiedi: "Quando il loop dichiara l'obiettivo raggiunto e quando
dichiara forfait?"

Forma attesa:
- raggiunto: "tutti i gate verdi AND signal X >= soglia Y";
- forfait per stallo: "iterazioni >= N senza progresso del signal X"
  (questa è la motivazione concreta dell'ipotesi H6 `loop_guard`);
- forfait per budget: "durata totale >= T" oppure "costo totale >= C".

Almeno un gate, un signal, una condizione di stallo e una condizione
di budget devono essere dichiarati.

## Output

Scrivi `experiments/<topic>/design/criteria.md` con questa struttura
minima:

    ---
    experiment: <topic>
    ambito: <numero 1-10>
    created: <YYYY-MM-DD>
    status: draft
    ---

    ## Obiettivo
    <una frase>

    ## Metriche gate (non-regressione)
    | Nome | Strumento | Soglia | Baseline |
    |---|---|---|---|
    | ... | ... | ... | ... |

    ## Metriche signal (progresso)
    | Nome | Strumento | Direzione | Baseline | Trend atteso per iterazione |
    |---|---|---|---|---|
    | ... | ... | ... | ... | ... |

    ## Condizioni di uscita del loop
    - Raggiunto: ...
    - Forfait per stallo: ...
    - Forfait per budget: ...

    ## Out of scope
    - ...
    - ...

Marca `status: draft` finché l'utente non conferma esplicitamente.
Alla conferma cambia in `status: accepted` e aggiungi in fondo:

    ## Acceptance
    - Accettato il: <YYYY-MM-DD>
    - Accettato da: <nome o ruolo>
    - Congelato fino a: chiusura esperimento o supersedere esplicito.

## Dopo il file

Riepiloga all'utente in linguaggio normale (non in elenchi):
1. cosa dimostra l'esperimento;
2. cosa il loop misura ad ogni iterazione (gate e signal);
3. quando il loop si ferma per successo e quando per forfait;
4. cosa NON viene misurato (out of scope), per evitare claim eccessivi
   nella consolidazione finale.

Solo dopo che il file `criteria.md` è scritto e accettato, l'esperimento
può passare al passo 2 del metodo POM sperimentale (modellazione).
Senza criteri accettati, rifiuta di scrivere YAML, codice o evidence
per questo esperimento.
```

## Note di consolidazione

Differenze rispetto alla bozza iniziale unilaterale:

- entra dal "lato ambito": il primo gesto è scegliere uno dei dieci ambiti POM, non riempire un modulo astratto. Ogni ambito porta con sé una famiglia di metriche tipiche, quindi l'utente non parte dal nulla;
- introduce esplicitamente la distinzione gate / signal, che è il punto di contatto fra il concetto di obiettivo e il concetto di loop. Senza questa distinzione "metrica" è ambiguo;
- lega `loop_guard` (H6) alla condizione di stallo, dando una motivazione concreta per esistere a quella primitiva;
- output snello (cinque sezioni di tabelle/bullet, non otto sezioni di prosa), per non far prevalere la cerimonia sulla sostanza.

## Stato

Candidato. Vive in `experiments/agent-loop-fsm/prompts-candidate/` durante l'esperimento. La promozione a `prompts/` canonico è subordinata a:

1. usabilità senza customizzazione sui cinque esperimenti pianificati di `agent-loop-fsm` (H1–H5);
2. almeno un esperimento rigettato per condizione di forfait o per gate fallito — il prompt deve dimostrare che può chiudere un'ipotesi sbagliata, non solo accompagnare quelle giuste;
3. il file `criteria.md` prodotto resta sotto ~50 righe per esperimento, altrimenti il formato è troppo pesante e l'adozione su altri progetti POM-managed non terrà.
