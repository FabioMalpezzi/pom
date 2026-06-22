# Prompt — Definire obiettivo e misure di un esperimento loop/goal

Versione: v4 (2026-05-30, applica le lezioni del primo uso reale su `dynamic-workflows` → vedi `experiments/agent-loop-fsm/notes/2026-05-30-lessons-learned.md`, lezioni 1 e 6; eredita D1–D5 di v3 e P1+P2+P3 di v2).
Stato: **canonico** (promosso da `agent-loop-fsm` il 2026-05-30). Storia delle versioni e provenienza in `experiments/agent-loop-fsm/`.

Scopo: guidare la prima parte di un esperimento POM che abbia dinamica loop/goal (cioè un ciclo iterativo che cerca di raggiungere un obiettivo dichiarato). Il prompt forza a fissare per iscritto, prima di scrivere YAML, codice o evidence:

0. il contesto: cosa è il sistema sotto test, chi è lo sperimentatore, cos'è un'iterazione, qual è il goal del sistema se diverso dall'obiettivo dell'esperimento;
1. l'ambito a cui appartiene l'esperimento (1–10);
2. l'obiettivo in una frase (max 2 per esperimenti che testano composizioni);
3. le metriche di misura, divise in gate (non-regressione) e signal (progresso), ciascuna ancorata esplicitamente all'obiettivo;
4. la baseline numerica iniziale di ogni metrica (o dichiarazione calibrativa);
5. le condizioni di uscita del loop (raggiunto / forfait / falsificazione).

Senza questa prima parte il loop non sa contare le iterazioni, non distingue il sistema studiato dal metodo che lo studia, e finisce per misurare cose scollegate dall'obiettivo (rischio Goodhart).

Non usare questo prompt per lavoro ordinario senza ipotesi misurabile:
feature semplici, bug fix, workflow di dominio statici, o esplorazioni
aperte senza gate/signal. In quei casi usa il normale workflow di
codifica, `skills/workflow.md`, `skills/spike.md`, o
`prompts/09-run-temporary-experiment.md` secondo il caso.

```text
Sto aprendo un esperimento POM con dinamica loop/goal. Prima di
modellare qualunque workflow, scrivere codice o produrre evidence,
devo fissare per iscritto contesto, obiettivo e metriche. Prima di
iniziare leggi `pom.config.json`: in un progetto target procedi solo se
`workflows.enabled: true` e `workflows.loopGoal.enabled: true`; se manca
uno dei due, fermati e instrada a `skills/config.md`. Usa
`workflows.loopGoal.criteriaPath`, `workflows.loopGoal.dialogPath` e
`workflows.loopGoal.evidenceRoot` quando presenti, invece di assumere i
path storici di POM Source. Le sette
sezioni qui sotto sono ciò che insieme dobbiamo definire — non un
modulo che tu mi fai compilare, ma l'agenda di un confronto ragionato
tra te e me da cui l'obiettivo e le scelte per raggiungerlo escono più
nitidi di come sono entrati.

NOTA OPERATIVA (leggi prima di iniziare). Questo prompt si usa come
*confronto logico*, non come template né come intervista a senso unico.
La differenza è sostanziale e ne va il motivo per cui il prompt esiste:

- NON compilare tutte le sezioni e passarmi il modulo da revisionare.
- NON limitarti a chiedere, registrare la mia risposta, riformularla in
  una frase netta e passare oltre. Quella è estrazione, non confronto.
- INVECE, per ogni elemento da definire: proponi tu una prima
  formulazione e *motivala*; mostrami cosa comporta per il resto
  dell'esperimento e in particolare per l'obiettivo dichiarato; lasciami
  controbattere; riformula insieme a me finché la scelta non regge. Una
  mia risposta può aprire una domanda che nessuna delle sette sezioni
  aveva previsto: accoglila e portala nel ragionamento, non ignorarla
  perché fuori griglia. Le sezioni sono l'agenda, non una checklist
  chiusa.

Confine da rispettare (importante). Tu porti competenza — proponi
formulazioni, sollevi incoerenze, mostri conseguenze, sfidi le mie
scelte quando le vedi deboli — ma **non decidi al posto mio**.
L'obiettivo e le scelte restano miei; il tuo ruolo è renderli più
consapevoli, non sostituirli con quelli che ti sono più comodi da
validare. Se a un certo punto ti accorgi di aver guidato troppo — di
aver di fatto scritto tu l'obiettivo, o di avermi fatto accettare una
formulazione per inerzia più che per convinzione — **dichiaralo** e
restituiscimi la scelta in modo aperto.

E un rinforzo concreto, perché questo confine cede facilmente (lezione 1
del primo uso reale: l'agente l'ha infranto due volte nella stessa
sessione). Quando ho posto una domanda e sto ancora ragionando, o mi
sono assentato: **fermati e aspetta**. Non trattare il mio silenzio come
un assenso e non andare avanti a scrivere o decidere "tanto era
implicito". E non riempire lo spazio con molte proposte mentre penso:
una cosa alla volta — un confronto fatto di troppe proposte simultanee
mi toglie la possibilità di rispondere, ed è una forma di "guidare
troppo" tanto quanto decidere al posto mio.

L'auditing della coerenza non è un collaudo finale: è acceso per tutto
il confronto. A ogni mia risposta significativa verifica subito la
coerenza con ciò che ho già detto (e segnala se la risposta, invece di
chiudere, apre una nuova domanda) e mostrami la conseguenza concreta di
quella scelta sull'obiettivo. I controlli che hanno bisogno del quadro
quasi completo — quelli incrociati — li raccogli in un giro finale di
riconciliazione nella sezione 7, prima di scrivere il file. Continuo per
le conseguenze locali, finale per gli incroci.

Lascia traccia del confronto. Le conseguenze locali che mi segnali, le
domande che emergono fuori griglia, i punti in cui correggo o irrigidisco
una formulazione: queste sono parti essenziali dell'esperimento e la base
del suo miglioramento futuro (le debolezze del prompt stesso sono nate
così, da un confronto su un esperimento passato). Mentre procediamo
annotale, e a fine confronto scrivile in un file di traccia separato
`criteria.dialog.md` — separato dal `criteria.md`, che resta il metro
snello e congelato. Se stai preservando un vecchio run numerato puoi
usare `criteria-experiment-<N>-<HID>.dialog.md`, ma il nome canonico
corrente è `criteria.dialog.md`. La traccia non è la
trascrizione integrale: è il registro delle conseguenze segnalate e delle
decisioni di calibrazione, una riga ciascuna. Serve anche a rendere
verificabile a posteriori che questo confronto è davvero avvenuto e non è
stato accorciato in una compilazione.

Procedi quindi sezione per sezione, ma come confronto: alla fine di ogni
sezione abbiamo una scelta condivisa e consapevole delle sue
conseguenze, non solo una casella riempita. Solo dopo il giro di
riconciliazione della sezione 7 — con i controlli OK o i warning
esplicitamente accettati — scrivi il file `criteria.md`.

L'output finale di questa conversazione è il file
`criteria.md` con il formato definito in fondo. In POM Source vive per
convenzione sotto `experiments/<topic>/design/criteria.md`, dove
`<topic>` è il nome della cartella dell'esperimento sotto `experiments/`.
In un progetto target usa `workflows.loopGoal.criteriaPath` quando
presente, altrimenti la cartella di esperimento o design dichiarata dal
progetto, e annota il path scelto. Se il file esiste già, rifiuta di
sovrascrivere e chiedi perché stiamo ridefinendo i criteri.

Se stiamo aprendo un nuovo giro su un esperimento che ha già una
valutazione precedente — cerca `design/evaluation-experiment-*.md` — e
quella valutazione contiene una sezione di consigli indirizzati al
Coordinatore (lasciati dal valutatore quando era avanzato budget),
leggila e porta quei consigli nel confronto: presentameli, mostrami cosa
implicherebbero per i nuovi criteri, e lascia che decida io se accoglierli.
Non sono vincolanti e non sono criteri: sono un'idea di miglioria che ora
va "lavata" da questo confronto prima di diventare, eventualmente, un
nuovo metro da congelare.

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
  l'oggetto sotto test cerca di raggiungere nel suo dominio. Sono validi
  esattamente tre valori, scegli quello giusto e annotalo:
    - `<goal del SUT> (eseguito)` — il SUT viene fatto girare in questo
      esperimento e il suo goal viene perseguito davvero. Esempio:
      "rispondere a una domanda producendo SQL valida (eseguito)".
    - `<goal del SUT> (solo modellato in questo esperimento)` — il SUT
      ha un goal nel suo dominio ma qui lo studiamo come artefatto
      statico, senza eseguirlo. Esempio: "raggiungere lo stato terminale
      `done` (solo modellato)". È il caso tipico quando il SUT è un
      workflow YAML che validiamo ma non lanciamo.
    - `n/a (il SUT non ha un goal proprio)` — il SUT è un oggetto senza
      lifecycle proprio, es. un validator o uno schema.
  Distinguere "eseguito" da "solo modellato" non è cosmetico: cambia
  quali metriche sono osservabili (un SUT non eseguito non produce
  metriche runtime) e quale può essere la falsificazione (sezione 6).

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

**Come scegliere il valore della soglia** (non basta scegliere il
formato: serve un numero giustificato). Regola: un numero assoluto
senza giustificazione è quasi sempre sbagliato. In ordine di preferenza:

1. **Percentuale del totale** quando il totale è noto e finito. Es.
   "100% degli stati clean fit", non "almeno 5 stati clean fit": il
   secondo è un magic number che dipende da quanto è grande il caso.
2. **Calibrazione al run 1** quando il valore corrente non è ancora
   misurabile: `TBD calibrata al run 1`, e il confronto parte dal run 2.
3. **Numero assoluto** solo se derivabile dal contesto con una frase di
   giustificazione ("delta >= 1 workflow validato al giro perché ogni
   iterazione modella un workflow nuovo"). Se l'utente propone un numero
   assoluto senza saperlo giustificare, segnalalo e proponi (1) o (2).

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

- **Forfait per budget**: non proporre un default. Chiedi all'utente:
  "Quanto tempo (o costo) sei disposto a investire prima di considerare
  questo esperimento troppo caro per il valore che dà?" La risposta
  diventa "durata totale >= T" oppure "costo totale >= C". Il budget va
  scelto dall'utente, non dedotto: un numero plausibile ma non voluto si
  rivela quasi sempre sbagliato (vedi D2 nel feedback v2).
  Avvertenza sulle stime (lezione 6 del primo uso reale): se per aiutare
  a calibrare devi stimare quanto dura un'iterazione, **parti da stime
  basse**. Il lavoro eseguito da un agente di codifica (modella YAML +
  valida + esegui + classifica) è molto più rapido del tempo umano: la
  tendenza è sovrastimarlo di un ordine di grandezza. Su `dynamic-workflows`
  una stima iniziale di 4 ore per ~20 iterazioni si è rivelata ~40 minuti
  reali. Offri la stima come orientamento, non come tetto, e lascia
  comunque all'utente la cifra finale.

- **Falsificazione**: il singolo artefatto/evento osservabile che, se
  accade, dichiara l'ipotesi falsa. Deve essere visibile in un file/log,
  non un giudizio. Definirla non è riempire un campo: è una
  conversazione di calibrazione. Procedi così:
    1. proponi tu una prima formulazione (es. "il validator richiede
       un'estensione allo schema per modellare il caso minimo" →
       l'ipotesi è falsa);
    2. lascia che l'utente la rifinisca;
    3. riformula e ripeti finché hai **due esempi concreti**: uno che
       falsifica e uno che NON falsifica. L'esistenza di entrambi è il
       criterio di chiusura della sezione.
  Esempio reale di coppia da H1: *falsifica* = "serve una primitiva
  strutturale nuova non prevista dal backlog"; *non falsifica* = "serve
  un campo opzionale già previsto, o una primitiva già nel backlog
  (`loop_guard`, `timeout`)". Senza la coppia, la falsificazione è
  ancora vaga: non chiuderla.

Tutte e quattro le condizioni devono essere dichiarate.

## 7. Consistency Check — giro finale di riconciliazione

Attenzione: l'auditing della coerenza **non comincia qui**. Come dice la
nota operativa in testa, durante tutto il confronto, a ogni risposta
significativa, hai già il doppio compito di (a) verificare la coerenza
con ciò che è stato detto prima — e segnalare quando una risposta apre
una nuova domanda invece di chiuderla — e (b) mostrare la conseguenza di
quella scelta sull'obiettivo. Quelle sono le verifiche *locali*, che
maturano subito perché riguardano una singola risposta o il suo
rapporto con l'obiettivo.

Questa sezione è il **giro finale** per i controlli *incrociati*: quelli
che si possono fare solo con il quadro quasi completo, perché mettono in
relazione più risposte tra loro. Eseguili dopo aver chiuso le sezioni
0–6. Per ognuno restituisci o un **OK**, o un **avvertimento con la
conseguenza concreta** della configurazione corrente — mai un OK
silenzioso. Un controllo che dice solo "verificato" senza spiegare la
conseguenza è inutile, ed eredita anche qui il confine della nota
operativa: segnala e proponi, ma la decisione finale sull'eventuale
warning resta dell'utente. Gli incroci sono almeno quattro:

- **C-a — budget vs loop_guard.** Verifica che
  `max_visits × tempo_realistico_per_iterazione ≈ max_duration`. Stima
  tu il tempo per iterazione dalla definizione di "iterazione" della
  sezione 0 (es. "una versione committata + lint + mermaid + revisione"
  ≈ 10–15 min). Se i numeri non tornano, segnala con la stima:
  "se mantieni 10 iterazioni e 20 minuti totali, ogni iterazione ha
  2 minuti, troppo poco per il lavoro dichiarato — alza max_duration o
  abbassa max_visits".

- **C-b — signal vs gate.** Per ogni metrica classificata signal,
  verifica che possa davvero *crescere*: una metrica con baseline al
  pavimento (0) e direzione ↓ non segnala progresso, segnala solo
  regressione — è un gate travestito. Segnalalo e proponi di spostarla
  nei gate: "X ha baseline 0 e direzione ↓: non può salire, quindi non
  misura progresso. Spostala nei gate come non-regressione".

- **C-c — falsificazione vs backlog.** Se l'esperimento appartiene a un
  backlog di più ipotesi (es. H1…H7), verifica che il criterio di
  falsificazione escluda esplicitamente le altre ipotesi del backlog.
  Altrimenti la conferma di questa ipotesi diventerebbe per errore la
  falsificazione di un'altra. Segnala: "la tua falsificazione ('serve
  una primitiva nuova') confermerebbe H6/H7 invece di falsificare
  questa — escludi le primitive già nel backlog dal criterio".

- **C-d — obiettivo vs backlog originale.** Confronta l'obiettivo della
  sezione 2 con la formulazione originale nel backlog di `EXPERIMENT.md`.
  Se la nuova è strettamente più forte o più debole, segnala la
  differenza e chiedi conferma esplicita: "il backlog dice 'senza
  complessità eccessiva', tu hai scritto 'senza alcuna estensione
  schema': è più forte, ammette zero estensioni anche minime motivate.
  Confermi l'irrigidimento o torno alla formulazione del backlog?".

Aggiungi altri controlli incrociati se il caso lo richiede (es. metrica
senza strumento di misura esistente → blocco prima della modellazione,
vedi sezione 5). Registra l'esito nel file (vedi Output): per ogni
check, OK oppure "warning accettato: <conseguenza>".

## Output

Scrivi il file `criteria.md` nel path concordato (`experiments/<topic>/design/criteria.md` in POM Source; nel progetto target, la cartella di esperimento o design dichiarata dal progetto) con questa struttura:

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
    - Falsificazione: <esempio che falsifica> / NON falsifica: <esempio>

    ## Consistency Check
    - C-a budget vs loop_guard: OK | warning accettato: <conseguenza>
    - C-b signal vs gate: OK | warning accettato: <conseguenza>
    - C-c falsificazione vs backlog: OK | warning accettato: <conseguenza>
    - C-d obiettivo vs backlog: OK | warning accettato: <conseguenza>

Marca `status: draft` finché l'utente non conferma esplicitamente.
Alla conferma cambia in `status: accepted` e aggiungi in fondo:

    ## Acceptance
    - Accettato il: <YYYY-MM-DD>
    - Accettato da: <nome o ruolo>
    - Congelato fino a: chiusura esperimento o supersedere esplicito.

Scrivi inoltre il file di traccia del confronto `criteria.dialog.md`
nella stessa cartella del `criteria.md`, separato dal contratto
congelato (che resta il metro snello). È il registro essenziale del
confronto, non la trascrizione integrale:

    ---
    experiment: <topic>
    hypothesis: <Hx>
    traces: criteria.md
    date: <YYYY-MM-DD>
    ---

    # Traccia del confronto — <Hx>

    ## Conseguenze segnalate durante il dialogo
    - <scelta> → <conseguenza che ho mostrato sull'obiettivo / sui criteri>

    ## Domande emerse fuori griglia
    - <domanda non prevista dalle sette sezioni, e come è stata risolta>

    ## Calibrazioni e correzioni dell'utente
    - <formulazione iniziale> → <come l'utente l'ha corretta/irrigidita, e perché>

    ## Consigli del valutatore accolti (se è un nuovo giro)
    - <consiglio dal precedente evaluation-*.md> → accolto / scartato, motivo

## Dopo il file

Riepiloga all'utente in linguaggio normale (non in elenchi):
1. cosa è il SUT, chi è lo sperimentatore, cosa conta come iterazione;
2. cosa dimostra l'esperimento;
3. cosa il loop misura ad ogni iterazione (gate e signal, con il
   legame esplicito all'obiettivo);
4. quando il loop si ferma per successo, per stallo, per budget, per
   falsificazione (con la coppia di esempi falsifica / non falsifica);
5. cosa NON viene misurato (out of scope);
6. l'esito dei controlli di coerenza (sezione 7): quali sono OK e quali
   warning hai accettato, con la conseguenza concreta di ciascuno.

Solo dopo che il file `criteria.md` è scritto e accettato, l'esperimento
può passare al passo 2 del metodo POM sperimentale (modellazione).
Senza criteri accettati, rifiuta di scrivere YAML, codice o evidence
per questo esperimento.
```

## Stato canonico

Questo prompt è la procedura canonica POM per definire criteri misurabili
prima di modellare, eseguire o valutare un esperimento loop/goal.

Usalo come workflow operativo corrente. Note storiche, varianti candidate e
lesson learned appartengono a evidence o note dell'esperimento che le ha
prodotte, non al corpo della procedura canonica.
