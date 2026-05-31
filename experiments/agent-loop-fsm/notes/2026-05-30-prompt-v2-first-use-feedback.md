# Prompt v2 — feedback dal primo uso reale (H1)

Data: 2026-05-30.
Oggetto: `experiments/agent-loop-fsm/prompts-candidate/define-loop-goal-criteria.md` v2 applicato per produrre `experiments/agent-loop-fsm/design/criteria-experiment-1-h1.md`.

## Esito quantitativo (primo controllo di promozione)

- File `criteria.md` generato: **53 righe iniziali**, 60 dopo l'aggiunta di Acceptance e i fix delle quattro scelte arbitrarie. Soglia v2 = 80. Margine ampio.
- Le sei sezioni del prompt si sono compilate in ordine senza rilavorazioni di struttura: P1 (sezione 0) ha fissato subito SUT/sperimentatore/iterazione/goal-SUT, P2 (legame con obiettivo) ha forzato il "perché" su ogni metrica, P3 (formato trend) ha eliminato l'ambiguità.

## Cosa ha funzionato

- **Distinzione gate / signal** chiara fin dalla prima passata. Tre signal e due gate scelti senza fatica.
- **Colonna `Legame con obiettivo`** ha effettivamente impedito di scivolare in metriche scollegate: scrivere il legame ha costretto a verificare che la metrica fosse strumentale all'obiettivo dichiarato. Goodhart bloccato.
- **Formato trend obbligatorio** (`assoluto: delta >= 0`): nessuna esitazione sul "come confronto le iterazioni", la scelta era forzata.
- **Output a tabella** legge bene a colpo d'occhio: il file finale è scannerizzabile in 30 secondi.
- **Falsificazione esplicita** come singolo evento osservabile (M3 risolta in v2): ha generato una conversazione importante con l'utente sulla soglia (campo opzionale ≠ falsificazione, primitiva strutturale = falsificazione).

## Debolezze emerse al primo uso (input per v3)

### D1 — "Goal del SUT" ambiguo per un SUT non eseguito

Per H1 il SUT è un workflow YAML modellato ma non eseguito. La riga "Goal del SUT" è scomoda: l'agente modellato ha un goal nel suo dominio, ma quel goal non viene perseguito in questo esperimento. Ho dovuto scrivere "modellato, non eseguito" come escape.

**Proposta per v3**: ammettere esplicitamente il caso "SUT solo modellato" come terzo valore valido oltre al goal vero e a `n/a`. Esempi: `n/a (SUT non ha goal proprio)`, `<goal del SUT> (eseguito)`, `<goal del SUT> (solo modellato in questo esperimento)`.

### D2 — Soglie numeriche scelte alla cieca

Il prompt v2 forza il formato del trend (`delta >= 1`) ma non aiuta a scegliere il numero. Per H1 le soglie iniziali erano arbitrarie:
- "almeno 5 stati clean fit" → l'utente l'ha corretta a "100% degli stati clean fit" (più rigoroso, niente magic number);
- "4h budget cumulato" → l'utente l'ha corretta a "20 minuti" (molto più stretto);
- "3 iterazioni di stallo" → confermata.

Su tre soglie, due erano sbagliate. Il prompt non ha dato strumenti per calibrarle.

**Proposta per v3**: aggiungere alla sezione 4 una linea guida tipo "se il valore assoluto non è derivabile dal contesto, preferisci percentuali del totale (es. 100% degli stati) o calibrazione al run 1; evita numeri assoluti senza giustificazione". E per il budget: chiedere esplicitamente "tempo che sei disposto a investire prima di considerare l'esperimento troppo costoso?" — riformulato come ask, non come default.

### D3 — Falsificazione richiede una conversazione, non un campo

L'utente ha rifinito la falsificazione iniziale ("anche un campo nuovo conta") in una versione più precisa ("solo se nuova primitiva strutturale; campo opzionale non falsifica"). Questo tipo di rifinitura non è un singolo riempimento di campo: è una conversazione di calibrazione.

**Proposta per v3**: nella sezione 6, aggiungere come istruzione esplicita "proponi una formulazione, lascia che l'utente la rifinisca, riformula finché non hai due esempi: uno che falsifica e uno che NON falsifica". L'esistenza dei due esempi è il criterio di chiusura.

### D4 — Manca controllo di coerenza incrociata fra le scelte (richiesto dall'utente)

Una rilettura critica del `criteria.md` v1 ha rivelato quattro incoerenze interne che il prompt non aveva aiutato a individuare:

1. **Cortocircuito H1 ↔ H6/H7**: la falsificazione di H1 era "nuova primitiva strutturale" senza escludere le primitive già nel backlog dell'esperimento stesso (H6 `loop_guard`, H7 `timeout`). Se H1 avesse scoperto che serve `loop_guard`, sarebbe stata dichiarata falsa per errore — confermando di fatto H6.
2. **Budget ↔ loop_guard incoerenti**: `max_visits=10` con `max_duration=20min` avrebbe richiesto 2 minuti per iterazione; ma "una versione committata + lint + mermaid + revisione" costa realisticamente ≈ 10–15 minuti. Numeri internamente incompatibili.
3. **Signal degeneri = gate**: due "signal" avevano baseline al pavimento (0) e direzione ↓; non possono segnalare progresso, solo regressione. Comportamento = gate. Erano stati classificati signal per inerzia.
4. **Obiettivo irrigidito silenziosamente**: l'obiettivo riscritto come "senza estensioni schema E senza forced fit" era strettamente più forte del backlog ("senza complessità eccessiva"). La differenza non è cosmetica: il backlog ammette un'estensione minima motivata.

L'utente ha esplicitato il principio: "il prompt deve dare un supporto per far sì che le diverse opzioni di configurazione siano logicamente correlate e che ci sia un feedback sulle possibili conseguenze".

**Proposta per v3**: aggiungere una **sezione di Consistency Check** prima dell'acceptance. La sezione esegue almeno quattro controlli incrociati e restituisce all'utente il feedback sulle conseguenze:

- *budget vs loop_guard*: `max_visits × tempo_per_iterazione ≈ max_duration`. Se non torna, segnala con stima quantitativa.
- *signal vs gate*: ogni metrica con baseline al pavimento e direzione ↓ non è un signal. Suggerisci di spostarla nei gate.
- *falsificazione vs backlog*: se l'esperimento appartiene a un backlog di ipotesi multiple, escludi esplicitamente le altre ipotesi dal criterio di falsificazione (altrimenti la prima ipotesi confermerebbe le altre come falsificazioni della prima).
- *obiettivo vs backlog originale*: confronta l'obiettivo proposto con la formulazione originale del backlog; se la nuova formulazione è strettamente più forte o più debole, segnala la differenza e chiedi conferma esplicita.

Ogni check deve produrre o un OK, o un avvertimento con la conseguenza concreta della scelta corrente ("se mantieni 20min totali e 10 iterazioni, ogni iterazione ha 2 min, troppo poco per il lavoro dichiarato"). Senza il feedback sulle conseguenze, il controllo è solo un altro modulo da riempire.

### D5 — Il primo test del prompt è stato fatto in modalità sbagliata (template-mode invece di dialog-mode)

Il prompt v2 dice esplicitamente: "guidami con le sei sezioni in ordine, non lasciarmi saltare passi, riformula sempre". L'utilizzo corretto è una conversazione guidata sezione per sezione. L'agente invece ha compilato tutte le sei sezioni in un colpo solo e ha passato il modulo all'utente per revisione. Questo è un uso difforme: testa il prompt come *template di output*, non come *guida di dialogo*.

Conseguenza: il test di usabilità di H1 vale solo per il primo dei tre criteri di promozione (file output sotto soglia). Non sappiamo se il prompt funziona come dialogo guidato — è proprio quel ruolo che giustifica la sua esistenza vs un semplice template Markdown vuoto.

**Proposta per v3**: aggiungere all'inizio del prompt una nota operativa per l'agente: "Questo prompt è una guida di dialogo, non un template. Non compilare tutte le sezioni in un colpo. Procedi sezione per sezione, chiedi conferma alla fine di ognuna, e applica i Consistency Check di D4 dopo aver raccolto tutte le risposte e prima di scrivere il file finale". Il test reale del prompt va fatto su H2 in modalità dialogo.

## Verdetto sul primo uso

Il prompt v2 ha prodotto un `criteria.md` formalmente valido in meno di 15 minuti, ma la prima passata aveva quattro incongruenze interne (D4) che ne minavano la coerenza logica. Le tre criticità alte (C1/C2/C3) risolte in v2 hanno cambiato la conversazione (la sezione 0 è stata utile), ma il prompt non si è accorto delle incoerenze: è stato l'utente a farlo emergere chiedendo "tutto ti sembra logico?".

Le debolezze D1, D2, D3 generano attrito ripetitivo ma non incoerenza. D4 e D5 invece sono più gravi: D4 dice che il prompt v2 non aiuta a validare l'output che produce, D5 dice che è stato testato male. Conviene affrontare D4 in v3 senza aspettare H2, perché senza Consistency Check ogni applicazione del prompt rischia di produrre risultati superficialmente validi e sostanzialmente incoerenti.

## Stato dei tre criteri di promozione (dopo H1)

1. **Usabilità su H1–H5 senza customizzazione**: 1/5 verificato (H1 ok). Restano H2–H5.
2. **Almeno un esperimento rigettato dal prompt**: 0/1. H1 non è ancora rigettato (è solo aperto). Sarà testato al primo esperimento che il prompt forza a chiudere per stallo, gate fallito o falsificazione.
3. **File output sotto soglia (80 righe)**: 1/5 verificato (H1 a 60 righe, margine 25%).
