# Ricerca - Integrazioni open source con agenti CLI

Stato: nota di evidenza ricostruita per l'esperimento. Il file dedicato della ricerca precedente non e' stato trovato nel repository; questa nota consolida la ricerca a partire da `EXPERIMENT.md`, `SPEC-0005`, `ADR-0001` e una nuova verifica delle fonti pubbliche.

Questa nota non e' una decisione e non autorizza una nuova architettura. Dopo la correzione di scope del 2026-05-20, serve solo come ricerca di sfondo: il percorso attivo non e' piu' scegliere un adapter agente, ma validare una wiki locale con ricerca `rg`, annotazioni file-based e comandi agenti semplici.

## Domanda

Quali soluzioni open source o documentate mostrano come collegare un sito locale a coding agent gia' aperti o comunque gia' caldi, senza ricaricare ogni volta il contesto del progetto?

## Lettura Sintetica

Il pattern comune non e' "prendere il prodotto open source" e nemmeno "integrare il modello nel sito". Il pattern utile per POM e' creare un adapter tra la superficie web e una sessione agente persistente: un thread gia' esistente, un server gia' attivo, un processo figlio lungo, o una sessione ripresa da uno store locale.

La cosa da capire e' come ogni soluzione evita il ciclo freddo:

```text
sito
  -> nuovo processo agente
  -> ricarica contesto progetto
  -> risposta isolata
```

e lo sostituisce con:

```text
sito
  -> sessione/thread/processo gia' caldo
  -> evento compatto
  -> stream/stato/proposta
  -> approvazione o parcheggio
```

Le soluzioni osservate usano quattro famiglie di integrazione:

| Famiglia | Esempi | Fit per POM |
|---|---|---|
| Attach a control plane | Codex `app-server`, OpenCode server | Il sito parla con un server gia' attivo che possiede sessioni e stream. |
| Keep a child process alive | Pi RPC, Goose ACP, parte di Polpo | Il sito/controller avvia il processo una volta e gli manda prompt su stdin. |
| Resume/take over sessions | Polpo, Codex thread resume, session store locali | La UI scopre sessioni gia' esistenti e le riapre o le controlla. |
| Agent-as-tool wrapper | `claude-code-mcp`, `ai-cli-mcp` | Utile per orchestrazione, ma rischia di riaprire agenti freddi se non conserva sessione. |

## Pattern Che Contano Per Il Cockpit

### 1. Attach a un server agente gia' attivo

E' il pattern piu' vicino al nostro sito. Il coding agent ha un processo server o control plane. La UI web non esegue il modello: manda richieste a quel server.

Esempi:

- Codex `app-server`: thread, turni, eventi, WebSocket o Unix socket.
- OpenCode `serve`: server HTTP headless, OpenAPI, stream SSE.

Per POM significa:

- il cockpit deve scoprire o configurare l'endpoint locale;
- deve conservare `threadId`, `sessionId` o equivalente;
- deve inviare eventi compatti, non prompt pieni di contesto;
- deve ricevere stream e stato del turno;
- deve poter fare resume invece di creare ogni volta una nuova sessione.

### 2. Tenere vivo un processo figlio

Qui il sito o un controller locale avvia l'agente una volta e lo lascia vivo. I prompt entrano su stdin, gli eventi escono da stdout.

Esempi:

- Pi RPC con `pi --mode rpc`;
- Goose ACP;
- pattern simili usati da Polpo.

Per POM significa:

- e' un buon adapter minimo per testare il contratto comune;
- il processo caldo e' sotto il nostro controllo;
- abort, queue e stato si possono modellare in modo esplicito;
- non dipendiamo da un server HTTP gia' definito dall'agente.

Il limite e' che non sempre "aggancia" una sessione gia' aperta nel terminale. Spesso crea una sessione persistente controllata dal cockpit.

### 3. Resume o takeover di sessioni esistenti

Questo e' il punto piu' vicino alla richiesta "agente gia' aperto". Alcuni sistemi non parlano direttamente con il TUI aperto, ma leggono lo store locale delle sessioni o usano un comando di resume/takeover.

Esempi:

- Polpo mostra sessioni esistenti e supporta takeover;
- Codex `thread/resume` riapre un thread;
- Pi e Claude/Codex hanno session store leggibili o tracciabili, secondo lo strato usato;
- Goose usa uno store SQLite.

Per POM significa:

- il cockpit deve avere un "session browser";
- ogni adapter deve dichiarare dove vive lo store sessioni;
- la UI deve distinguere "nuova sessione", "resume" e "takeover";
- la continuita' deve essere verificata con due richieste consecutive nello stesso thread/sessione.

### 4. Wrapper MCP o agent-as-tool

Qui un processo espone l'agente come tool a un altro client. E' utile per orchestrazione, ma non basta per il nostro obiettivo se ogni tool call avvia una nuova run fredda.

Esempi:

- `claude-code-mcp`;
- `ai-cli-mcp`;
- Codex `mcp-server`.

Per POM significa:

- MCP e' buono per esporre capacita' o agenti worker;
- non deve diventare il primo bus UI se non garantisce sessione persistente;
- va usato solo se l'adapter conserva sessione, stato, permessi e polling/check.

## Progetti E Soluzioni Rilevanti

### Polpo

Polpo e' il riferimento piu' utile per il confronto multi-agente. Espone un dashboard remoto per controllare Claude Code, Codex, Gemini, OpenCode, Pi e Goose.

Cose utili per POM:

- separa adapter per agenti diversi ma li normalizza in una dashboard;
- supporta spawning di sessioni e takeover di sessioni gia' esistenti;
- legge sessioni da store diversi: JSONL per Claude/Codex/Pi, SQLite per OpenCode/Goose;
- deriva stato busy/idle dagli eventi di sessione;
- gestisce approvazioni e abort da UI remota.

Pattern da copiare:

- adapter per agente, contratto UI comune;
- session browser;
- stato agente visibile;
- approvazione esplicita.

Limite per POM:

- Polpo e' orientato al controllo remoto mobile, non alla Source Authority o alla promozione di documenti governati. POM deve aggiungere il livello bozza, proposta, approvazione, promozione.

Fonte: https://github.com/pugliatechs/polpo

### Codex `app-server`

Codex `app-server` e' il candidato piu' forte per il primo adapter POM. Espone thread, turni, notifiche ed eventi su trasporti locali, incluso WebSocket.

Cose utili per POM:

- `thread/start`, `thread/resume`, `thread/fork`;
- `turn/start` per inviare richieste a una sessione;
- stream di eventi e completamento del turno;
- sandbox e profili di permesso;
- trasporto locale via WebSocket o Unix socket.

Pattern da copiare:

- la web wiki non deve lanciare un processo freddo ogni volta;
- deve collegarsi a un thread persistente;
- deve passare un evento compatto e ricevere stato/proposta;
- deve limitare scritture a una draft area.

Limite per POM:

- `app-server` e' specifico di Codex. Il contratto POM deve restare indipendente da `threadId`, `turnId`, JSON-RPC Codex e naming interno.

Fonte: https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md

### OpenCode `serve`

OpenCode offre una superficie piu' web-native: `opencode serve` avvia un server HTTP headless con endpoint OpenAPI e stream eventi SSE.

Cose utili per POM:

- server locale con hostname e porta configurabili;
- OpenAPI 3.1 per generare client;
- eventi globali via SSE;
- endpoint usati anche dai client TUI e plugin;
- basic auth opzionale per server.

Pattern da copiare:

- server locale headless separato dalla UI;
- contratto HTTP ispezionabile;
- client generabile;
- stream eventi nativo per UI.

Limite per POM:

- va valutato il modello di permessi e di modifica file rispetto a Source Authority e Artifact Policy. La comodita' HTTP non basta se non c'e' un ciclo affidabile di proposta e promozione.

Fonte: https://dev.opencode.ai/docs/server/

### Pi RPC

Pi RPC e' il modello piu' chiaro per un adapter basso livello: si avvia `pi --mode rpc`, si inviano comandi JSON su stdin e si leggono eventi JSONL su stdout.

Cose utili per POM:

- processo persistente;
- protocollo JSON su stdin/stdout;
- eventi di streaming;
- comando `abort`;
- superficie piccola e controllabile.

Pattern da copiare:

- adapter come processo figlio;
- framing JSONL semplice;
- stato agente e turni derivati dagli eventi;
- abort controllabile dalla UI.

Limite per POM:

- meno funzionalita' pronte rispetto a Codex app-server o OpenCode serve. E' ottimo come banco di prova del contratto minimo, non necessariamente come primo prodotto.

Fonti:

- https://pi.dev/docs/latest/rpc
- https://github.com/spences10/my-pi

### Claude Code SDK E MCP

Claude Code espone integrazione tramite SDK e MCP. La documentazione mostra come configurare MCP server in `query()` e come concedere tool specifici. Progetti come `claude-code-mcp` incapsulano Claude Code dietro un MCP server locale.

Cose utili per POM:

- SDK programmabile;
- MCP server locali o HTTP;
- tool allowlist;
- integrazione con GitHub, filesystem, database e altri tool;
- wrapper MCP che gestiscono sessioni, polling, permessi e costo.

Pattern da copiare:

- i permessi devono stare nel contratto dell'adapter, non nel testo libero;
- tool e risorse MCP sono visibili all'agente, README e docs no;
- un adapter puo' avviare Claude Code come processo locale e offrire una superficie MCP.

Limite per POM:

- come primo bus UI, MCP non risolve da solo la continuita' della sessione. Serve comunque un controller o processo persistente che mantenga sessione, stato, richieste e approvazioni.

Fonti:

- https://code.claude.com/docs/en/agent-sdk/mcp
- https://github.com/xihuai18/claude-code-mcp

### ai-cli-mcp

`ai-cli-mcp` e' un esempio di orchestratore MCP che avvia CLI agentiche come Claude Code e Codex in background da un client MCP.

Cose utili per POM:

- agenti CLI invocabili come tool;
- esecuzione asincrona in background;
- polling/check separato dal lancio;
- possibile bridge tra un agente host e agenti worker.

Pattern da copiare:

- start/check/manage separati;
- non bloccare il client mentre un agente lavora;
- gestire piu' processi agentici come risorse.

Limite per POM:

- e' piu' vicino a orchestrazione multi-agente che al primo cockpit. Da usare dopo aver stabilizzato il contratto POM e un adapter singolo.

Fonte: https://github.com/mkXultra/ai-cli-mcp

## Implicazioni Per POM

La direzione piu' solida resta:

1. POM definisce un contratto comune: evento, contesto, proposta, approvazione, promozione.
2. Il primo adapter resta Codex `app-server`, perche' e' gia' vicino al nostro prototipo e supporta thread/turn/eventi.
3. Il secondo adapter da confrontare dovrebbe essere OpenCode `serve`, perche' espone HTTP/OpenAPI/SSE ed e' naturale per una UI web.
4. Pi RPC va usato come test del protocollo minimo: processo lungo, JSONL, abort, streaming.
5. Claude Code va trattato come adapter via SDK/MCP/processo persistente, non come eccezione nel contratto POM.
6. MCP va tenuto come interfaccia strumenti o orchestrazione successiva, non come primo bus eventi della web wiki.

## Regole Da Portare Nel Prossimo Prototipo

- Il sito non applica modifiche governate: produce bozze e proposte.
- Ogni adapter dichiara se supporta sessione persistente, streaming, abort, permessi, scrittura controllata e ripresa sessione.
- La UI mostra sempre stato agente, sorgente dell'evento, fonti lette, destinazione proposta e requisito di approvazione.
- Le scritture agentiche sono limitate a `experiments/wiki-agent-orchestration/evidence/agent-drafts/` finche' non esiste una promozione revisionata.
- Le capacita' specifiche di un agente restano nell'adapter, non nel contratto POM.

## Matrice Di Compatibilita' Per Sessione Calda

Questa matrice valuta solo il punto utile per POM: quanto bene una soluzione permette al cockpit di parlare con un agente gia' caldo, senza ricaricare ogni volta il contesto del progetto.

| Adapter / benchmark | Sessione calda | Attach / resume | Stream UI | Input esterno | Abort / cancel | Permessi e sandbox | Scrittura controllata | Store sessioni | Fit cockpit | Rischio principale |
|---|---|---|---|---|---|---|---|---|---|---|
| Codex `app-server` | Alta: thread e turni persistenti | `thread/start`, `thread/resume`, `thread/fork`; il prototipo usa un thread persistente | Alta: eventi WebSocket e completamento turno | Alta: `turn/start` riceve eventi compatti dalla UI | Da verificare nel cockpit; il protocollo espone controllo del turno, ma va testato sul flusso UI | Buona: approval policy e sandbox policy per turno | Buona: il prototipo limita le scritture a `agent-drafts/` | Thread/sessione gestiti da Codex; il cockpit deve salvare id e stato | Primo adapter migliore | Le assunzioni Codex possono contaminare il contratto POM |
| OpenCode `serve` | Probabile alta: server headless con sessioni proprie | Da verificare: API e session model del server | Alta: eventi SSE | Alta: HTTP/OpenAPI sono naturali per la UI | Da verificare nel modello server | Da verificare rispetto a Source Authority e Artifact Policy | Da progettare: non basta avere API HTTP | Store interno OpenCode, da mappare | Secondo confronto migliore | Permessi/scritture potrebbero essere meno adatti al ciclo proposta-promozione |
| Pi RPC | Alta se il cockpit possiede il processo lungo | Non e' takeover del TUI; e' processo persistente controllato dal cockpit | Media/alta: eventi JSONL su stdout | Alta: JSON su stdin | Buona: protocollo espone abort | Da progettare nel wrapper POM | Buona se il wrapper impone draft root | Stato nel processo o nei file scelti dal wrapper | Ottimo laboratorio minimo | Potrebbe non agganciare una sessione gia' aperta dall'utente |
| Claude Code SDK/MCP | Media: dipende da SDK, processo o wrapper scelto | Da verificare: serve un ponte che mantenga sessione, non singole query fredde | Da verificare sullo SDK/wrapper | Buona tramite SDK/MCP, se il controller resta persistente | Da verificare | Buona se tool allowlist e permessi sono configurati nel controller | Da progettare nel controller POM | Dipende da wrapper/session store Claude | Importante per compatibilita' | MCP/SDK possono sembrare soluzione, ma non garantiscono sessione calda da soli |
| `claude-code-mcp` | Media: wrapper MCP locale intorno a Claude Code | Da verificare nella sua gestione sessioni | Da verificare | Buona per agent-as-tool | Da verificare | Espone modello tool/permessi del wrapper | Da progettare fuori dal wrapper | Store del wrapper/Claude | Benchmark per Claude adapter | Rischia di essere orchestrazione fredda se ogni chiamata e' isolata |
| `ai-cli-mcp` | Media: avvia agenti CLI in background | Possibile gestione start/check; resume da verificare | Bassa/media: polling piu' che stream UI diretto | Buona come tool MCP | Probabile gestione separata, da verificare | Dipende dai CLI invocati | Da progettare | Stato dei job/processi MCP | Utile per multi-agente dopo MVP | Piu' orchestratore worker che cockpit interattivo |
| Polpo | Alta come benchmark: sessioni esistenti e controllo remoto | Alta: session browser, spawn e takeover | Alta per dashboard remota | Alta: UI remota invia input alle sessioni | Alta: gestisce abort/approvazioni | Dipende dagli agenti controllati | Non orientato a POM; va aggiunto ciclo proposta-promozione | JSONL per Claude/Codex/Pi, SQLite per OpenCode/Goose | Miglior benchmark architetturale | Ottimizzato per controllo remoto, non per memoria governata POM |

## Criteri Di Scelta Del Prossimo Adapter

Il prossimo adapter non va scelto per ricchezza generale, ma per quante risposte positive offre a queste domande:

1. Puo' riusare una sessione gia' aperta o gia' inizializzata?
2. Il cockpit puo' scoprire, selezionare o riprendere quella sessione?
3. Due richieste consecutive restano nello stesso thread/sessione senza reiniettare tutto il contesto?
4. La UI riceve stato e stream abbastanza granulari da mostrare lavoro in corso, errore o completamento?
5. L'adapter espone abort/cancel o almeno uno stato recuperabile?
6. Permessi e scritture possono essere limitati a una draft area?
7. La parte specifica dell'agente resta fuori dal contratto POM comune?

## Prossimo Passo Proposto

Prototipare una vista "sessioni" nel mini cockpit:

- mostrare adapter disponibili;
- mostrare sessione corrente;
- distinguere nuova sessione, resume e takeover;
- inviare due eventi consecutivi alla stessa sessione;
- salvare evidenza con `adapter`, `sessionId`, `threadId`, stato, fonti e output;
- fallire in modo visibile quando l'adapter non garantisce sessione calda.
