---
experiment: agent-loop-fsm
ambito: 1
hypothesis: H4
created: 2026-05-30
status: accepted
---

## Contesto

- **SUT**: `workflows-candidate/agent-supervisor.yaml` — workflow caller che invoca il goal lifecycle modellato in H1 iter 2 come sub-workflow sincrono.
- **Sperimentatore**: utente + agente di coding.
- **Iterazione**: una versione caller + lint + mermaid + design note.
- **Goal del SUT**: n/a.

## Obiettivo

Dimostrare che il goal lifecycle (modellato in `agent-orchestrator-goal-lifecycle.yaml`) è un workflow POM **autonomo**, cioè riusabile come sub-workflow `invoke`-d da un caller, con dispatch sui suoi terminali.

## Out of scope

- esecuzione runtime;
- bound al numero di goal serviti (H6);
- timeout per goal (H7).

## Metriche gate

| Nome | Strumento | Soglia | Baseline | Legame con obiettivo |
|---|---|---|---|---|
| Validator pass del caller | `pom:workflow:lint` | 0 errori | n/a | Il caller deve essere un workflow POM valido. |
| Mermaid + mmdc | `to-mermaid.mjs` + `mmdc` | parsa | n/a | Evidence. |
| Invoke presente con terminali corretti | grep `invoke:` + `on_completion` | almeno 1 invoke + ≥2 esiti | n/a | È la primitiva sotto verifica. |
| Sub-workflow referenziato esiste ed è valido | path check + lint sub | PASS | PASS (già da H1 iter 2) | Senza, l'invoke non è materializzabile. |

## Metriche signal

| Nome | Strumento | Direzione | Trend | Baseline | Legame con obiettivo |
|---|---|---|---|---|---|
| Stati clean fit | conteggio in design note | ↑ | `assoluto: delta >= 1` finché non clean = 0 | TBD iter 1 | Misura modellabilità. |

## Condizioni di uscita

- **Raggiunto**: gate verdi + 100% clean fit + invoke + on_completion modellati come da primitiva esistente.
- **Falsificazione**: il goal lifecycle può essere invocato solo introducendo una primitiva nuova non già nel backlog.

      loop_guard:
        max_visits: 3
        max_duration: 30min

## Acceptance

Accettato il 2026-05-30 (modalità autonoma).
