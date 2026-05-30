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

## Verdetto sul primo uso

Il prompt v2 ha prodotto un `criteria.md` accettabile **in una sola passata di proposta + quattro fix dell'utente**, in meno di 15 minuti di conversazione. Le tre criticità alte (C1/C2/C3) risolte in v2 hanno effettivamente cambiato la conversazione: senza la sezione 0 avremmo passato tempo a discutere "cosa misuriamo, l'agente o il modello?".

Le debolezze D1, D2, D3 non bloccano l'uso ma generano attrito ripetitivo. Conviene raccoglierle e produrre v3 dopo aver applicato v2 a H2 (così avremo due usi reali su cui basare il prossimo giro, invece di iterare il prompt su un solo caso).

## Stato dei tre criteri di promozione (dopo H1)

1. **Usabilità su H1–H5 senza customizzazione**: 1/5 verificato (H1 ok). Restano H2–H5.
2. **Almeno un esperimento rigettato dal prompt**: 0/1. H1 non è ancora rigettato (è solo aperto). Sarà testato al primo esperimento che il prompt forza a chiudere per stallo, gate fallito o falsificazione.
3. **File output sotto soglia (80 righe)**: 1/5 verificato (H1 a 60 righe, margine 25%).
