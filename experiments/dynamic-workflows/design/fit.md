---
experiment: dynamic-workflows
artifacts: workflows-candidate/0{1,2,3,4,4b}-*.yaml
date: 2026-05-30
---

# Fit classification — le quattro strutture del Dynamic Workflow

Signal = `forced lossy` residui per struttura. Tutte passano i gate (validator PASS, esecuzione senza crash sul runner stub deterministico) tranne dove indicato.

| # | Struttura | Modello | Fit | Forced residui | Evidenza eseguibile |
|---|---|---|---|---|---|
| 1 | Pipeline per-task (implementer→verifier→fixer) | `01-task-pipeline.yaml` | **clean** | 0 | run: 3 stati, terminale `task_done` |
| 2 | Fork/join dei verifier (2 verifier paralleli) | `02-verifier-forkjoin.yaml` | **adapted** | 1 (fork/join strutturale) | run: catena sequenziale `verifying_a → verifying_b`; i due rami esistono come stati, ma l'ordine è artificiale e il fork è perso |
| 3 | Fan-in di N (N fixer → aggregatore) | `03-fanin.yaml` | **adapted** | 0 | run: counted join, raccoglie 5/5 → `all_collected`. N vive nel context, non negli stati |
| 4 | Fan-out a N (orchestratore → N task) | `04-fanout.yaml` (iter 1) | **forced** | — | run `--n 100` → fan-out effettivo **1**: state-invoke singolo, N dinamico non rappresentabile |
| 4 | Fan-out a N — iter 2 | `04b-fanout-counted.yaml` | **adapted con perdita** | 1 (concorrenza) | run `--n 100` → fan-out effettivo **100**, ma SEQUENZIALE: counted invoke loop esprime N dinamico, perde il parallelismo |

## Evidenza dura del muro

- `broken-fixtures/state-invoke-parallel-E036.yaml`: `mode: parallel` su uno state-invoke → **E036** (FAIL). Il parallelismo nativo non è una modalità dichiarabile dentro la FSM.
- Una transizione ha esattamente un `to` (E012/E015): da uno stato non si dirama a due stati insieme → nessun fork nativo.

## Lettura del signal

Iterando, il forced residuo si è ridotto su tre delle quattro strutture: la pipeline è clean as-is; il fan-in si salva con il counted join; il fork e il fan-out si salvano **funzionalmente** (sequenzializzati) ma lasciano un residuo comune e irriducibile — la **concorrenza a N**. Il signal si è mosso davvero (cosa che in H1–H5 non era mai successa): da forced a adapted dove un design pattern esisteva, fermandosi sul solo parallelismo.

## Giri 2-5 — il contratto (tutte le varianti validate ed eseguite)

| Giro | Modello | Cosa dimostra | Fit |
|---|---|---|---|
| 2 | `05-fanout-launch-await` | launch non bloccante + await bloccante, 2 lanci poi attesa | additivo (PASS) |
| 2 | `06-variant-A-states` | scenario ricco: lancia→lavoro→lancia→lavoro→attendi | **A scelta** |
| 2 | `07-variant-B-transition` | lancio come effetto di transizione | scartata (rompe purezza transizioni) |
| 2 | `08-variant-C-context` | handle nel context_schema | evoluzione opzionale (costa working vars) |
| 3 | `09-timeout-escalate` | timeout → risveglio su on_timeout | contratto eseguibile |
| 3 | `10-join-quorum` | quorum k-of-n: il lento non blocca e viene chiuso esplicitamente | contratto eseguibile |
| 4 | `11-reactive-await` | react/on_each + early-exit con chiusura handle | contratto eseguibile |
| 4 | `12-nested-top/mid` | fan-out annidato, composizione ricorsiva | contratto eseguibile |
| 5 | `13-child-compensation` + `13-parent-control` | cancel+compensation propagati, suspend/resume, timeout a giorni | contratto eseguibile |

Tutti i workflow candidate sono eseguibili con i reference executor TypeScript e Python. Il contratto completo è in `design/CONTRACT.md`; le fixture negative vivono in `broken-fixtures/`.
