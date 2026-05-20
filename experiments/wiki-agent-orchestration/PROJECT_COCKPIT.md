# Open Discussion - POM Project Cockpit

| Campo | Valore |
|---|---|
| Data | 2026-05-19 |
| Stato | open discussion |
| Area | wiki / agent UI / project navigation |
| Origine | Conversazione sperimentale sulla web wiki agente |

Questo documento raccoglie una direzione di prodotto emersa durante l'esperimento. Non è una decisione, non è una specifica e non autorizza ancora modifiche strutturali al metodo POM.

Aggiornamento del 2026-05-20: questa direzione è parcheggiata. L'idea resta utile come orizzonte, ma non rientra nello scope attivo di POM. Il percorso attivo è più leggero: web wiki locale, navigazione, ricerca `rg`, annotazioni JSON file-based e comandi semplici per i coding agent.

## Idea

La web wiki può evolvere in un cockpit leggero del progetto: una superficie locale in cui leggere memoria POM, documentazione, codice, stato Git e dialogo con l'agente senza saltare continuamente tra editor, terminale, browser e chat.

Il punto non è costruire un IDE completo nel browser. Il punto è dare all'utente una vista integrata e navigabile del progetto mentre lavora con un agente AI già operativo.

Nome provvisorio: **POM Project Cockpit**.

## Valore

L'esperienza desiderata è:

- vedere la wiki e i documenti POM in una UI leggibile;
- navigare il tree dei documenti e, più avanti, il tree del codice;
- chiedere all'agente di ragionare sul file o documento aperto;
- vedere bozze, proposte ed evidenze prodotte dall'agente;
- vedere Git status e diff senza lasciare la UI;
- promuovere una bozza in modifica reale solo dopo revisione.

Questo riduce il costo mentale di passare tra più strumenti. La web wiki non resta solo una pagina di lettura: diventa una vista operativa sul progetto.

## Forma Dell'Interfaccia

Una possibile forma minima:

```text
sinistra:  tree documenti / tree codice / ricerca
centro:    viewer Markdown, codice o diff
destra:    agente, richiesta, risposta, bozze, proposte
sotto:     stato Git, file modificati, log eventi, evidenze
```

Il layout deve restare leggero. Non serve replicare VS Code. Serve leggere bene, orientarsi in fretta e agire in modo controllato.

## Ambiti Integrati

| Ambito | Funzione |
|---|---|
| Wiki | Navigare memoria consolidata e pagine derivate dal metodo POM |
| Documenti POM | Leggere spec, decisioni, task plan, Open Discussion e Project State |
| Codice | Consultare file sorgente e collegarli a documenti e decisioni |
| Agente | Dialogare con una sessione persistente, vedere stato, bozze e proposte |
| Git | Vedere status, diff e file modificati prima della promozione |
| Promozione | Applicare una proposta solo dopo revisione esplicita |

## Confini

Il cockpit non deve diventare:

- un IDE completo;
- un issue tracker;
- una chat log permanente;
- una fonte di verità alternativa ai documenti Markdown;
- un sistema che modifica wiki, spec, decisioni o task senza promozione.

Markdown, codice e Git restano le fonti durevoli. La UI resta una superficie operativa e derivata.

## Rapporto Con L'Agente

La UI deve essere una estensione dell'agente, non un'applicazione separata che ogni tanto invia file.

L'agente deve poter:

- leggere e cercare nei file del progetto con i propri tool;
- scrivere bozze e proposte in un'area controllata;
- mostrare fonti consultate e ragionamento operativo;
- ricevere interventi dell'utente durante o tra i turni;
- non applicare modifiche durevoli senza revisione.

Questo richiede un adapter robusto. Il WebSocket manuale verso Codex `app-server` è sufficiente per prototipare, ma va confrontato con Codex SDK e con ACP prima di diventare architettura stabile.

## Git Cockpit

L'integrazione Git sembra particolarmente utile perché rende visibile la differenza tra:

- evento utente;
- bozza agente;
- proposta;
- modifica applicata;
- diff reale;
- commit candidate.

Funzioni candidate:

- `git status` leggibile;
- lista file modificati;
- diff per file;
- confronto tra bozza agente e documento di destinazione;
- preparazione di commit message;
- blocco di commit se lint o test POM falliscono.

Git non va sostituito. Va reso visibile nel momento in cui si promuove una proposta.

## Roadmap Provvisoria

### 1. Project cockpit read-only

- Tree documenti POM.
- Tree codice in sola lettura.
- Viewer Markdown e codice.
- Ricerca locale.
- Link tra wiki, spec, decisioni, task e codice.

### 2. Agent cockpit

- Chat persistente con l'agente.
- Stato turno: idle, running, waiting, failed, completed.
- Cancel e, se supportato, steer del turno attivo.
- Evidenze, bozze e proposte visibili dalla UI.

### 3. Git cockpit

- Git status.
- Diff per file.
- Evidenza delle modifiche prodotte da promozione.
- Preparazione commit.

### 4. Promotion cockpit

- Da bozza a proposta.
- Da proposta approvata a patch.
- Anteprima diff.
- Applicazione controllata.
- Verifica con lint/test.

### 5. Editing controllato

- Non editor generico all'inizio.
- Prima patch e diff.
- Editing diretto solo se i confini di permesso sono chiari.

## Punti Tecnici Da Valutare

| Tema | Domanda |
|---|---|
| Adapter agente | Codex SDK, `app-server`, ACP o altro? |
| Concorrenza | Una richiesta alla volta, coda, `turn/steer`, cancel o thread separati? |
| Stato | Dove salvare sessione, eventi, bozze, proposte e mapping con Git? |
| File tree | Quali root esporre? Come evitare file sensibili? |
| Scrittura | Dove può scrivere l'agente prima della promozione? |
| Diff | Generare patch da bozza o lasciare l'agente modificare in sandbox controllata? |
| Sicurezza | Localhost, auth, path allowlist, no rete di default |
| Performance | Come evitare richieste lente, output mischiati e ricarichi costosi di contesto? |

## Decisioni Non Prese

- Non è deciso se il prodotto debba restare mini UI sperimentale o diventare una capability POM.
- Non è deciso se usare Codex SDK, ACP o `app-server` come adapter stabile.
- Non è deciso se il tree codice debba essere parte della prima MVP.
- Non è deciso se Git diff debba essere read-only o già collegato alla promozione.
- Non è deciso se questa direzione richieda una nuova spec separata o una revisione profonda di `SPEC-0005`.

## Prossimo Passo

Il prossimo passo non è scegliere un adapter agente. Conviene validare il flusso ridotto:

1. Cercare pagine e file con `rg`, inclusa modalità regex.
2. Salvare annotazioni con pagina o file, testo selezionato, nota e stato.
3. Far leggere a un coding agent la prossima annotazione aperta con un comando locale.
4. Usare Git solo in lettura per storico del file annotato.
5. Promuovere eventuali modifiche solo dopo revisione esplicita.
