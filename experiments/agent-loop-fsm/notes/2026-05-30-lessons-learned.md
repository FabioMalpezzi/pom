# Lesson learned — 2026-05-30, primo uso reale del metodo loop-goal

Contesto: il ciclo a quattro agenti `loop-goal` (define-criteria in confronto → fit auditor → scenarios → valutatore avversariale) è stato usato per la prima volta sul campo, in modalità confronto, per condurre l'esperimento `dynamic-workflows`. Queste sono le lezioni sul **metodo**, non sul contratto workflow che l'esperimento ha prodotto (quello vive in `experiments/dynamic-workflows/`).

## 1. Confronto non è estrazione — e il confine è fragile

La nota "dialog-mode, non template" della v2 non bastava: l'agente faceva comunque chiedi → registra → riformula → prossima sezione, che è estrazione. La v3 ha dovuto ridefinire il prompt come *confronto logico* (proponi una formulazione e motivala, mostra le conseguenze, sfida le scelte deboli, accogli le domande fuori griglia) con un confine esplicito: **proponi e sfida, ma non decidere al posto dell'utente**.

La prova che il confine è fragile l'ho data io stesso, due volte nella stessa sessione: sono andato avanti a scrivere file dopo aver detto "dimmi se la vedi diversamente" (trattando il silenzio come assenso), e ho riempito lo spazio con troppe proposte mentre l'utente stava ancora ragionando ("se vai avanti da solo mentre penso è difficile risponderti"). È la modalità di fallimento ricorrente quando lo stesso agente cambia cappello: la pendenza naturale è comprimere e procedere.

**Cosa cambia**: il confine va presidiato attivamente, non dato per acquisito; quando l'utente "si assenta" o sta pensando, fermarsi è il default, non andare avanti. Candidato a rinforzo esplicito nella v4 del prompt.

## 2. Un esperimento che PUÒ fallire è il vero collaudo del metodo

H1–H5 confermavano tutto al 100% al primo colpo: il signal saturava subito e non veniva mai messo alla prova, e il valutatore non aveva niente da falsificare. `dynamic-workflows` invece nasceva aspettandosi un "no" (tocca i pilastri esclusi da SPEC-0006). Risultato: il **signal si è mosso davvero** per la prima volta (i forced lossy sono scesi iterando), e la valutazione avversariale ha avuto un lavoro reale da fare.

**Cosa cambia**: per collaudare il metodo servono esperimenti ostili, non conferme facili. Un signal che non si muove e un valutatore che non rischia di falsificare non dicono se il metodo funziona.

## 3. Gli agenti del metodo emergono dall'uso, non a tavolino

Il quarto agente — il valutatore indipendente avversariale — non era pianificato: è nato dalla domanda dell'utente "chi trae le conclusioni?". E la sua forma migliore (indipendente dal Coordinatore; i consigli sul budget residuo vanno *al Coordinatore*, non all'utente, per non erodere la neutralità) è stata trovata in confronto, contro la mia prima proposta che li dava all'utente.

**Cosa cambia**: trattare il metodo come work-in-progress che si raffina nell'uso; le domande dell'utente durante un esperimento sono spesso estensioni del metodo, non digressioni.

## 4. L'avversarialità co-condotta con l'utente trova ciò che l'agente da solo non trova

Il valore dell'esperimento è uscito dal botta e risposta: io avevo dato un verdetto "serve un cambio di paradigma, costo alto"; l'utente ha proposto launch/await delegato; insieme abbiamo refutato l'irriducibilità (il counted loop) e localizzato il vero limite sul solo parallelismo, riducendo il costo a un'estensione additiva. Da solo avrei chiuso con il verdetto sbagliato.

**Cosa cambia**: il valutatore avversariale dà il meglio con l'utente nel loop a sfidarlo; vale la pena progettarlo per *invitare* la refutazione, non per difendere il proprio verdetto.

## 5. Distinguere il contributo-al-dominio dal feedback-al-metodo

Ho mescolato due livelli: il contratto Dynamic Workflow (contributo al dominio *workflow*, estensione SPEC-0006) e il collaudo del *metodo* loop-goal. L'utente ha corretto: il contratto va promosso nel filone workflow; ciò che torna a `agent-loop-fsm` è solo il feedback metodologico.

**Cosa cambia**: un esperimento può produrre insieme un contributo a un dominio e una lezione sul metodo; vanno tenuti distinti per destinazione, o si promuove la cosa sbagliata nel posto sbagliato.

## 6. I parametri del loop si calibrano sul ritmo reale; l'agente sovrastima

Stallo alzato da 3 a 5 in corsa (le esplorazioni comparative servono più giri prima dello stallo); budget di tempo ricalibrato dall'utente perché le mie stime erano gonfiate (ragionavo in tempo umano: 4h → 40min → 1h per ~20 iterazioni che costavano ~2 minuti l'una).

**Cosa cambia**: chiedere all'utente i parametri del loop (budget, stallo) invece di dedurli, e partire da stime di tempo molto più basse per il lavoro d'agente. Salvato come feedback persistente.

## 7. L'indipendenza del valutatore va garantita strutturalmente

In questo collaudo il valutatore NON è stato eseguito come sessione separata dal modellatore: ero lo stesso agente con due cappelli. La postura avversariale c'era, ma l'indipendenza piena (cecità rispetto al dialogo che ha generato i criteri) no.

**Cosa cambia**: il prompt `conclude-loop-goal-experiment` dovrebbe richiedere esplicitamente l'esecuzione come sessione fresca; e un prossimo esperimento dovrebbe esercitarla davvero.

## 8. "Logico non fisico" e "semplice con completezza" sono leve di conduzione

Due principi che l'utente ha imposto durante l'esperimento si sono rivelati decisivi anche come modo di condurre: distinguere ciò che il formalismo descrive (logico) da ciò che il target implementa (fisico) ha sbloccato il contratto additivo; e l'obiettivo esplicito "il più semplice che dia il supporto completo" ha portato a cercare il nucleo minimo (cosa è già lì via H5, cosa è davvero nuovo) invece di aggiungere un costrutto per ogni caso.

**Cosa cambia**: vale la pena, all'inizio di un esperimento di design, dichiarare esplicitamente questi due vincoli — separazione logico/fisico e minimalità — perché orientano tutte le scelte successive.

---

Sintesi: il metodo loop-goal ha superato il suo primo collaudo reale — ha prodotto un obiettivo migliore di quello iniziale, un signal che si muove, e un deliverable raffinato dalla valutazione avversariale. I limiti emersi (1, 6, 7) sono input concreti per la v4 del prompt e per la promozione della skill `loop-goal`.
