# Prompt — Definire obiettivo e misure di un esperimento loop/goal

Versione: v2 (2026-05-30, applica P1+P2+P3 della review v1 → vedi `notes/2026-05-30-prompt-criteria-critical-review.md`).
Stato: candidato, vive in `experiments/agent-loop-fsm/prompts-candidate/`.

Scopo: guidare la prima parte di un esperimento POM che abbia dinamica loop/goal (cioè un ciclo iterativo che cerca di raggiungere un obiettivo dichiarato). Il prompt forza a fissare per iscritto, prima di scrivere YAML, codice o evidence:

0. il contesto: cosa è il sistema sotto test, chi è lo sperimentatore, cos'è un'iterazione, qual è il goal del sistema se diverso dall'obiettivo dell'esperimento;
1. l'ambito a cui appartiene l'esperimento (1–10);
2. l'obiettivo in una frase (max 2 per esperimenti che testano composizioni);
3. le metriche di misura, divise in gate (non-regressione) e signal (progresso), ciascuna ancorata esplicitamente all'obiettivo;
4. la baseline numerica iniziale di ogni metrica (o dichiarazione calibrativa);
5. le condizioni di uscita del loop (raggiunto / forfait / falsificazione).

Senza questa prima parte il loop non sa contare le iterazioni, non distingue il sistema studiato dal metodo che lo studia, e finisce per misurare cose scollegate dall'obiettivo (rischio Goodhart).

```text
Sto aprendo un esperimento POM con dinamica loop/goal. Prima di
modellare qualunque workflow, scrivere codice o produrre evidence,
devo fissare per iscritto contesto, obiettivo e metriche. Guidami con
le sei sezioni qui sotto, in ordine. Non lasciarmi saltare passi e
non accettare risposte vaghe: riformula sempre in una claim binaria
o numerica e fammi confermare.

L'output finale di questa conversazione è il file
`experiments/<topic>/design/criteria.md` con il formato definito in
fondo, dove `<topic>` è il nome della cartella dell'esperimento sotto
`experiments/`. Se il file esiste già, rifiuta di sovrascrivere e
chiedi perché stiamo ridefinendo i criteri.

## 0. Definizioni del contesto (quattro righe)

Prima di tutto, fissa quattro definizioni operative. Senza queste,
tutto il resto è ambiguo.

Chiedi all'utente di scrivere una riga per ciascuno:

- **Sistema sotto test (SUT)**: cosa stiamo studiando. Esempi:
  "agente loop/goal modellato come FSM POM", "una primitiva di
  workflow `loop_guard`", "una nuova versione del validator".
  Vincolo: deve essere un artefatto, non un'aspirazione.

- **Sperimentatore**: chi/cosa esegue il loop dell'esperimento.
  Esempi: "utente + agente di coding in sessione", "agente
  autonomo notturno con CronCreate", "pipeline CI". Va dichiarato
  perché determina cosa il loop può fare automaticamente e cosa
  richiede intervento.

- **Iterazione**: l'unità di tempo del loop dell'esperimento (non del
  SUT). Esempi: "una versione del workflow YAML committata",
  "un giro di lint + diff dopo modifica", "un confronto fra due
  modelli LLM su batch fisso". È critica: tutte le metriche e i
  trend qui sotto si misurano *per iterazione*. Distingui sempre
  dall'iterazione interna del SUT (es. retry dell'agente), che è
  una metrica osservata, non l'unità di conteggio.

- **Goal del SUT** (se diverso dall'obiettivo dell'esperimento): cosa
  l'oggetto sotto test cerca di raggiungere nel suo dominio. Esempi:
  "rispondere a una domanda producendo SQL valida", "raggiungere uno
  stato terminale `done`". Se l'esperimento studia un sistema che
  non ha un goal proprio (es. un validator), scrivi "n/a".

Rifiuta di proseguire alla sezione 1 finché queste quattro righe non
sono scritte e accettate.

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
     NOTA: l'ambito 10 spesso non è un esperimento ma un'esplorazione.
     Se è il caso, instrada a `prompts/09-run-temporary-experiment.md`
     e chiudi qui.

Se l'esperimento non rientra in nessuno dei dieci, non inventare un
nuovo ambito al volo: chiedi all'utente di aggiungerlo prima al
backlog di `EXPERIMENT.md` con la sua famiglia di metriche tipiche.

## 2. Obiettivo

Chiedi: "In una frase, cosa deve dimostrare questo esperimento?"

Vincoli da imporre:
- una sola frase (massimo due se l'esperimento testa una composizione
  di primitive che non si comprime onestamente in una);
- voce attiva, presente;
- nomina l'artefatto sotto verifica (uno schema, una primitiva, un
  pattern runtime, una decisione architetturale, un workflow, ...);
- nomina la classe di casi cui il risultato deve generalizzare;
- vietate parole esplorative come "indagare", "vedere", "capire",
  "esplorare", "provare a giocare con". Se l'utente le usa, instrada
  a `prompts/09-run-temporary-experiment.md`.

## 3. Out of scope (prima delle metriche, non dopo)

Chiedi: "Cosa NON viene testato in questo esperimento, anche se è
correlato?"

Almeno tre voci. Tipiche: "prestazioni sotto carico", "compatibilità
con linguaggio X", "ergonomia per l'utente finale", "scalabilità oltre
N input". Definire lo scope qui evita che nella sezione 4 si scelgano
metriche per cose fuori scope.

## 4. Metriche del loop (gate + signal)

Spiega all'utente la distinzione prima di chiedere le metriche.

- **Gate (non-regressione)**: condizioni che il loop deve preservare
  ad ogni iterazione. Tipicamente binarie pass/fail o entro soglia.
  Esempio: "tutti i test del validator passano", "0 secret in repo",
  "p95 latency <= 200 ms". Se un gate fallisce, il loop si ferma
  subito.

- **Signal (progresso)**: misure che devono migliorare nel tempo per
  giustificare il proseguimento del loop. Tipicamente continue o
  conteggi. Esempio: "workflow modellabili senza estensione schema",
  "use case coperti dalla feature". Se il signal non cresce per N
  iterazioni, il loop esce per `loop_guard` (H6).

Per ogni metrica chiedi:
- **Nome** (es. "validator pass rate");
- **Strumento di misura** (comando POM o del target: `pom:workflow:lint`,
  `npm test`, `npm audit`, `git diff --shortstat`, script di benchmark);
- **Direzione attesa**: ↑ ↓ =;
- **Soglia** (per i gate) oppure **Trend atteso per iterazione**
  (per i signal) — vedi sotto il formato obbligatorio;
- **Baseline** (valore corrente, ora; oppure `TBD calibrata al run 1`
  se è un esperimento veramente nuovo e la baseline non esiste);
- **Legame con obiettivo** (obbligatorio, una frase): perché questa
  metrica testimonia il progresso verso l'obiettivo dichiarato in
  sezione 2. Se l'utente non sa scriverlo, la metrica è da scartare:
  è ottimizzare un numero scollegato dal vero scopo (Goodhart).

**Formato obbligatorio per "Trend atteso per iterazione"** (signal):
uno tra i tre seguenti, mai testo libero.

- `assoluto: delta >= X` — la metrica deve guadagnare almeno X unità
  per iterazione. Usare per metriche stabili e a bassa varianza
  (es. "delta >= 1 workflow validato al giro").
- `relativo: delta >= X%` — la metrica deve guadagnare almeno X% del
  valore precedente. Usare per metriche con range ampio
  (es. "delta >= 10% sulla copertura").
- `statistico: z-score >= k su finestra di N` — la metrica deve
  superare una soglia statistica calcolata su una finestra mobile.
  Usare per metriche rumorose come output LLM o benchmark variabili
  (es. "z-score >= 2 su finestra di 5 run").

Default raccomandato: `assoluto` se la metrica è ripetibile e
deterministica; `statistico` se la metrica è rumorosa (LLM, perf con
varianza, conteggi umani). `relativo` è il default peggiore: usalo
solo se l'utente sa giustificare perché.

Rifiuta metriche soggettive ("è elegante", "leggibile"): chiedi di
sostituirle con qualcosa che il loop possa misurare da solo. Se
proprio non esiste una misura oggettiva, etichetta la metrica come
"soggettiva, valutata in retrospettiva" e segnalala fuori dal loop di
confronto automatico — comparirà solo nella consolidazione finale.

Numero minimo: 1 gate + 1 signal. Numero massimo consigliato: 3 gate
+ 3 signal. Oltre, il loop diventa difficile da interpretare.

## 5. Baseline registrata

Per ogni metrica con baseline numerica, chiedi all'utente di eseguire
ora lo strumento di misura e di registrare il valore nel file
`criteria.md`. Senza baseline il loop non ha riferimento.

Eccezione legittima: metriche con baseline `TBD calibrata al run 1`.
In questo caso il primo run del loop fissa la baseline e il confronto
parte dal secondo run. Va dichiarato esplicitamente nella tabella.

Se uno strumento di misura non esiste ancora (es. lo script di lint
non copre la metrica scelta), questo è esso stesso un blocco da
risolvere prima del passo 2 della modellazione: dichiararlo nel file
e fermarsi.

## 6. Condizioni di uscita del loop

Chiedi: "Quando il loop dichiara l'obiettivo raggiunto, quando dichiara
forfait, e quale singolo evento osservabile dichiara l'ipotesi falsa?"

Forma attesa, almeno una per riga:

- **Raggiunto**: "tutti i gate verdi AND signal X >= soglia Y".
- **Forfait per stallo**: "iterazioni >= N senza progresso del signal X"
  — è la motivazione concreta dell'ipotesi H6 `loop_guard`. Esempio
  di mapping reale su YAML:

      loop_guard:
        max_visits: 10
        max_duration: 30min
        on_exhaustion: forfait_no_progress

- **Forfait per budget**: "durata totale >= T" oppure "costo totale
  >= C".
- **Falsificazione**: il singolo artefatto/evento osservabile che, se
  accade, dichiara l'ipotesi falsa. Esempio: "il validator richiede
  un'estensione allo schema per modellare il caso minimo" → l'ipotesi
  H1 è falsa. Deve essere visibile in un file/log, non un giudizio.

Tutte e quattro le condizioni devono essere dichiarate.

## Output

Scrivi `experiments/<topic>/design/criteria.md` con questa struttura:

    ---
    experiment: <topic>
    ambito: <numero 1-10>
    created: <YYYY-MM-DD>
    status: draft
    ---

    ## Contesto
    - SUT: ...
    - Sperimentatore: ...
    - Iterazione: ...
    - Goal del SUT: ...

    ## Obiettivo
    <una frase, max due>

    ## Out of scope
    - ...
    - ...
    - ...

    ## Metriche gate (non-regressione)
    | Nome | Strumento | Soglia | Baseline | Legame con obiettivo |
    |---|---|---|---|---|
    | ... | ... | ... | ... | ... |

    ## Metriche signal (progresso)
    | Nome | Strumento | Direzione | Trend (assoluto/relativo/statistico) | Baseline | Legame con obiettivo |
    |---|---|---|---|---|---|
    | ... | ... | ... | ... | ... | ... |

    ## Condizioni di uscita del loop
    - Raggiunto: ...
    - Forfait per stallo: ... (loop_guard: max_visits=..., max_duration=...)
    - Forfait per budget: ...
    - Falsificazione: ...

Marca `status: draft` finché l'utente non conferma esplicitamente.
Alla conferma cambia in `status: accepted` e aggiungi in fondo:

    ## Acceptance
    - Accettato il: <YYYY-MM-DD>
    - Accettato da: <nome o ruolo>
    - Congelato fino a: chiusura esperimento o supersedere esplicito.

## Dopo il file

Riepiloga all'utente in linguaggio normale (non in elenchi):
1. cosa è il SUT, chi è lo sperimentatore, cosa conta come iterazione;
2. cosa dimostra l'esperimento;
3. cosa il loop misura ad ogni iterazione (gate e signal, con il
   legame esplicito all'obiettivo);
4. quando il loop si ferma per successo, per stallo, per budget, per
   falsificazione;
5. cosa NON viene misurato (out of scope).

Solo dopo che il file `criteria.md` è scritto e accettato, l'esperimento
può passare al passo 2 del metodo POM sperimentale (modellazione).
Senza criteri accettati, rifiuta di scrivere YAML, codice o evidence
per questo esperimento.
```

## Note di consolidazione

Differenze rispetto a v1 (consolidate in v2):

- **P1 (sezione 0)**: aggiunta esplicita di SUT / Sperimentatore / Iterazione / Goal del SUT. Risolve la confusione tra loop del sistema studiato e loop dello sperimentatore, e fissa l'unità di conteggio del loop.
- **P2 (colonna `legame_con_obiettivo`)**: ogni metrica deve dichiarare per iscritto perché testimonia il progresso verso l'obiettivo. Deterrente concreto contro Goodhart: ottimizzare la metrica giusta, non un numero qualsiasi.
- **P3 (formato del trend obbligatorio)**: assoluto / relativo / statistico, con linee guida su quando usare quale. Risolve l'ambiguità del confronto numerico, soprattutto per metriche rumorose.
- **Sotto-miglioramenti raccolti gratis**: out-of-scope spostato prima delle metriche (M4); ammissione esplicita di baseline calibrativa al run 1 (C7); falsificazione richiesta esplicitamente come evento osservabile (M3); mini-esempio di mapping `loop_guard` reale (A1); definizione di `<topic>` (M2); ambito 10 spostato a esplorazione con redirect a prompt 09 (C4); vincolo "una frase" rilassato a due per composizioni (M5).

Restano aperti per giri futuri (rimando alla nota di review): catalogo dei dieci ambiti come file dedicato (A3), esempio worked end-to-end completo (M1), sezione "rischi metodologici" del singolo esperimento (A4).

## Stato

Candidato v2. Vive in `experiments/agent-loop-fsm/prompts-candidate/` durante l'esperimento. La promozione a `prompts/` canonico è subordinata a:

1. usabilità senza customizzazione sui cinque esperimenti pianificati di `agent-loop-fsm` (H1–H5);
2. almeno un esperimento rigettato per condizione di forfait, gate fallito o evento di falsificazione — il prompt deve dimostrare che può chiudere un'ipotesi sbagliata, non solo accompagnare quelle giuste;
3. il file `criteria.md` prodotto resta sotto ~80 righe per esperimento (soglia rivista in v2 per tenere conto delle nuove colonne); oltre, il formato è troppo pesante per l'adozione su altri progetti POM-managed.
