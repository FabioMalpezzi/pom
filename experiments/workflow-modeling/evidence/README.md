# Evidence

Output prodotti durante l'esperimento e usati come evidenza degli ipotesi in `EXPERIMENT.md`:

- report di validazione sui tre esempi (versione corretta e versione con errori introdotti volutamente);
- diagrammi Mermaid generati;
- file di scenari generati;
- frammenti di codice TypeScript prodotti dall'agente di coding durante i test di implementazione guidata.

Convenzione minima:

- nome file `<esempio>.<tipo>.<estensione>` (es. `spec-evolution.validation.md`, `spec-evolution.mmd`);
- ogni file porta in cima il commit di provenienza e il comando che lo ha prodotto;
- gli artefatti vengono rigenerati quando cambia il modello — non sono autoritativi.
