---
experiment: dynamic-workflows
traces: criteria.md
date: 2026-05-30
---

# Traccia del confronto — definizione dei criteri

Registro essenziale del confronto da cui sono nati gli obiettivi e le decisioni, non la trascrizione integrale. È anche il primo uso reale del prompt `define-loop-goal-criteria` (v3) in modalità confronto, non template — vedi `experiments/agent-loop-fsm/`.

## Conseguenze segnalate durante il dialogo

- Se il SUT è lo schema (non un workflow), allora la falsificazione naturale diventa "serve una primitiva strutturale nuova fuori backlog" → l'utente l'ha accolta, ha definito l'obiettivo di conseguenza.
- Un obiettivo formulato come "capire se basta, e se no elencare le estensioni" non è falsificabile (riesce in ogni caso) → separato in ipotesi falsificabile + deliverable condizionale.
- Questo esperimento, a differenza di H1–H5, ha un **signal che si muove** (i forced lossy scendono iterando) → primo banco di prova reale della direzionalità del signal.
- 40 minuti con 20 iterazioni implica ~2 min/giro: sollevato come possibile incoerenza (C-a). L'utente ha corretto la stima (sovrastimavo il tempo, ragionando in tempo umano); con ~2 min/giro reali i due tetti tornano coerenti.
- Tensione tra "tutte e quattro le strutture" e "40 minuti": può cedere la copertura. Risolta accettando che il loop si fermi sul parziale e il valutatore lavori su ciò che c'è, con lo stallo a 3 a chiudere ogni struttura al suo meglio.

## Domande emerse fuori griglia

- Quale fedeltà per la "simulazione reale": stub deterministici vs LLM reali? → stub deterministici a N parametrico (D-04).
- Il parallelismo è in scope o no? → distinzione struttura (dentro) vs semantica operativa (fuori) (D-08).
- L'autonomia copre anche la decisione finale? → no, la decisione di promozione torna all'utente (D-10).

## Calibrazioni e correzioni dell'utente

- "solo modellato" (assunzione iniziale dell'agente) → **simulazione reale con codice ed esperimenti** (correzione D-03).
- "esecuzione runtime / generazione codice fuori scope" (proposta dell'agente) → **ritirata**: l'esecuzione è il cuore (D-03).
- budget 4 ore (suggerito dall'agente) → **40 minuti** in confronto (l'agente sovrastimava i tempi; feedback ricorrente dell'utente) → **32 iterazioni / 1 ora** in accettazione (rialzo dell'utente alla lettura finale).
- modalità di lavoro: l'agente tendeva a riempire lo spazio con molte proposte mentre l'utente ragionava → richiamo a rallentare, una cosa alla volta.

## Consigli del valutatore accolti (se è un nuovo giro)

- n/a — primo giro, nessuna valutazione precedente.
