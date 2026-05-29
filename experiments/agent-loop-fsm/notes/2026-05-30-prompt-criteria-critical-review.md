# Critical review — prompt `define-loop-goal-criteria` v1 → v2

Data: 2026-05-30.
Oggetto: prompt-candidato `experiments/agent-loop-fsm/prompts-candidate/define-loop-goal-criteria.md`.
Trigger: dopo aver consolidato la v1 (commit `1206e7e`), revisione critica per individuare debolezze prima dell'uso reale su H1.

## Criterio di giudizio

Il prompt è valutato in base al suo scopo dichiarato: configurare correttamente la prima parte di un esperimento *loop/goal*. Domande guida: distingue loop e goal? Permette al loop di sapere se sta migliorando? È robusto ai casi limite? Evita che l'utente riempia un modulo formalmente valido ma metodologicamente vuoto?

## Punti di forza (preservati in v2)

- **F1**. Distinzione gate / signal come spina dorsale: separa "non rompere" da "progredire" e lega quest'ultimo al `loop_guard`.
- **F2**. Lista dei dieci ambiti come ancora: evita il foglio bianco.
- **F3**. Vincolo "una frase + niente verbi esplorativi": separa esperimento da esplorazione.
- **F4**. Output a tabella: denso, confrontabile, leggibile.
- **F5**. Gate "rifiuta di scrivere YAML senza criteri accettati": pressione strutturale a non saltare il passo 1.
- **F6**. Stato candidato con criteri di promozione espliciti: il prompt è esso stesso un'ipotesi in osservazione.

## Criticità materiali (C1–C7)

### C1 — Manca la definizione di "iterazione" [risolta in v2]

Il prompt parla di "iterazioni del loop", "trend per iterazione", "N iterazioni senza progresso", ma non dice cos'è un'iterazione. In `agent-loop-fsm` ci sono due significati possibili (giro dell'agente sotto test vs giro dello sperimentatore). Senza fissare l'unità, baseline e signal sono incomparabili.

**Risolta in v2** dalla nuova Sezione 0 ("Iterazione: l'unità di tempo del loop dell'esperimento, non del SUT").

### C2 — Confusione tra loop dello sperimentatore e loop del SUT [risolta in v2]

Per esperimenti su loop di agenti, coesistono il loop oggetto-di-studio e il loop metodologico del 7-step POM. Il prompt v1 li mischiava. Conseguenza: l'utente non sa se la metrica appartiene al SUT o allo sperimentatore.

**Risolta in v2** dalla Sezione 0 che chiede di scrivere SUT e Sperimentatore separati.

### C3 — Obiettivo vs goal del SUT non distinti [risolta in v2]

L'obiettivo dell'esperimento ("verificare che POM regge la modellazione") è cosa diversa dal goal del SUT ("rispondere a una domanda con SQL valida"). Il prompt v1 parlava solo di "obiettivo".

**Risolta in v2** dalla riga "Goal del SUT" in Sezione 0, con escape `n/a` per SUT senza goal proprio.

### C4 — Ambito 10 contraddice il vincolo "no esplorare" [risolta in v2]

Il prompt vieta verbi esplorativi e instrada le esplorazioni al prompt 09, ma poi mantiene "lavori open-ended" come ambito 10. Contraddizione interna.

**Risolta in v2** con nota esplicita: ambito 10 → spesso esplorazione → redirect a prompt 09.

### C5 — Rischio Goodhart: nessun legame metrica ↔ obiettivo [risolta in v2]

Il prompt v1 chiede metriche + tool + baseline + soglia, ma non chiede *perché* quella metrica testimonia il progresso verso l'obiettivo. Conseguenza prevedibile: metriche misurabili ma scollegate dall'obiettivo, ottimizzazione del numero scollegato, vittoria dichiarata su qualcosa che non è l'obiettivo.

**Risolta in v2** dalla nuova colonna obbligatoria `Legame con obiettivo` su entrambe le tabelle. Se l'utente non sa scrivere il legame, la metrica è da scartare.

### C6 — Manca il formato di confronto numerico [risolta in v2]

"Trend atteso per iterazione" in v1 era testo libero. Per metriche rumorose (LLM, perf con varianza) la differenza tra confronto assoluto, relativo e statistico è sostanziale.

**Risolta in v2** dal formato obbligatorio a scelta tra `assoluto`, `relativo`, `statistico`, con linee guida su quando usare quale e default consigliato.

### C7 — Baseline obbligatoria a t=0, ma per esperimenti nuovi può non esistere [risolta in v2]

Esempio: testare un modello LLM mai usato. La baseline è il primo run dello stesso loop. Il prompt v1 imponeva "esegui adesso" senza scappatoia.

**Risolta in v2** ammettendo esplicitamente la baseline `TBD calibrata al run 1`, con confronto a partire dal run 2.

## Punti minori (M1–M5)

- **M1** — Nessun esempio worked end-to-end. **Aperto.** Da affrontare in v3 dopo il primo uso reale (avremo materiale da convertire in esempio).
- **M2** — `<topic>` non definito. **Risolta in v2** ("nome della cartella dell'esperimento sotto `experiments/`").
- **M3** — Falsificabilità implicita, mai chiesta. **Risolta in v2** dalla quarta voce in Sezione 6: "Falsificazione: il singolo artefatto/evento osservabile che, se accade, dichiara l'ipotesi falsa".
- **M4** — Out of scope arrivava ultimo. **Risolta in v2** spostandolo a Sezione 3, prima delle metriche.
- **M5** — "Una frase" artificiale per composizioni. **Risolta in v2** ammettendo "max due frasi se l'esperimento testa una composizione".

## Aspetti aperti (A1–A4)

- **A1** — Mapping concreto stallo → `loop_guard`. **Risolta in v2** con mini-esempio YAML in Sezione 6.
- **A2** — Cosa fa il loop con metriche soggettive escluse. **Risolta in v2** parzialmente: "comparirà solo nella consolidazione finale, fuori dal loop di confronto automatico". Da rivedere in v3 se emergono casi reali.
- **A3** — Catalogo dei dieci ambiti vive nel prompt, non in file dedicato. **Aperto.** Estrazione in `design/scopes.md` rinviata al momento della promozione o quando un secondo prompt-candidato avrà bisogno della stessa lista.
- **A4** — Sezione "rischi metodologici" del singolo esperimento (es. confirmation bias). **Aperto.** Da valutare dopo H1: se emerge come problema reale, aggiungere; altrimenti non gonfiare il prompt.

## Verdetto

La v2 chiude tutte le C (C1–C7) e quattro M su cinque. Restano aperti M1, A3, A4. La spina dorsale del prompt — distinzione gate/signal, lista ambiti, output a tabella, vincolo "criteri prima del modellare" — è invariata e resta valida.

Il rischio residuo principale è che la v2 sia diventata leggermente più pesante (sei sezioni invece di cinque). La soglia di "file output sotto ~50 righe" della v1 è stata rivista a ~80 righe in v2 per tenere conto delle nuove colonne. Se al primo uso reale (H1) il file `criteria.md` sfora le 80 righe, si dovrà rivedere il formato — non riaggiungere informazione.

## Prossimi giri

Quando si applicherà v2 a H1:

1. Misurare il numero di righe del `criteria.md` prodotto e confrontarlo con la soglia di 80.
2. Annotare quali sezioni l'utente ha riempito facilmente e quali ha richiesto chiarimento — segnali per v3.
3. Verificare che la colonna `Legame con obiettivo` non sia stata riempita con frasi tautologiche ("misura il progresso") che svuotano il deterrente Goodhart. Se sì, irrigidire ulteriormente il vincolo.
4. Verificare se la baseline calibrativa al run 1 è stata necessaria; se nessun esperimento la usa, valutare di rimuoverla per snellezza.
