---
experiment: agent-loop-fsm
ambito: 1
hypothesis: H3
created: 2026-05-30
status: accepted
---

## Contesto

- **SUT**: `workflows-candidate/agent-retry-bounded.yaml` — workflow che modella un retry bounded su un'azione fallibile tramite self-transition guarded.
- **Sperimentatore**: utente + agente di coding (modalità autonoma).
- **Iterazione**: una versione YAML + lint + mermaid + design note.
- **Goal del SUT**: n/a (modellato).

## Obiettivo

Modellare un retry bounded di un'azione fallibile dell'agente come self-transition POM con guard sul contatore di tentativi, dimostrando che la struttura del retry (bound, esito-su-esaurimento) è esprimibile senza una nuova primitiva strutturale, ammettendo che H6 `loop_guard` la renderà esplicita.

## Out of scope

- esecuzione runtime;
- bound temporale (è il dominio di H7);
- retry distribuito o asincrono.

## Metriche gate

| Nome | Strumento | Soglia | Baseline | Legame con obiettivo |
|---|---|---|---|---|
| Validator pass | `pom:workflow:lint` | 0 errori | n/a | Senza pass il modello non è verificabile. |
| Mermaid + mmdc | `to-mermaid.mjs` + `mmdc` | parsa | n/a | Evidence richiesta. |
| Self-transition presente | grep `from: acting` `to: acting` | ≥ 1 | n/a | È la primitiva sotto verifica. |
| Guard sul retry | grep guard | almeno 1 | n/a | Senza guard, il retry è infinito (no bound). |

## Metriche signal

| Nome | Strumento | Direzione | Trend | Baseline | Legame con obiettivo |
|---|---|---|---|---|---|
| Stati clean fit | conteggio in design note | ↑ | `assoluto: delta >= 1` finché non clean = 0 | TBD iter 1 | Misura diretta della modellabilità. |

## Condizioni di uscita

- **Raggiunto**: gate verdi + 100% clean fit + il bound del retry è espresso (anche se implicito nel context, con commento esplicito che H6 lo materializzerebbe).
- **Falsificazione**: il bound del retry richiede una primitiva schema strutturale **non già nel backlog** (cioè diversa da H6 `loop_guard` e H7 `timeout`).

      loop_guard (estensione attesa, H6):
        max_visits: 5
        max_duration: 30min

- Forfait per budget: 30 min.

## Acceptance

Accettato il 2026-05-30 in modalità autonoma.
