# `agent-loop-fsm` — Runtime TypeScript (Pattern A)

Prima esecuzione runtime di uno dei workflow modellati nell'esperimento `agent-loop-fsm`. Implementa il **Pattern A** (transition table) descritto in `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` sopra `agent-orchestrator.yaml` (ReAct minimal, H1 iter 1).

Provider-agnostic: funziona con qualsiasi endpoint **OpenAI-compatible** (OpenAI, DeepSeek, Groq, Mistral, Together, Ollama locale, vLLM). La scelta del provider si fa via `.env` senza toccare il codice.

## Stack

- TypeScript + Node 22+
- `openai` (npm) — client OpenAI-compatible
- `js-yaml` — parser per leggere il workflow
- `dotenv` — carica `.env`
- `tsx` — esegue TypeScript senza build step

## Setup

```sh
cd experiments/agent-loop-fsm/runtime-candidate
npm install
cp .env.example .env
# poi modifica .env con la chiave del provider scelto
```

`.env` è in `.gitignore`. **Non committarlo mai.**

## Esecuzione

```sh
npm start                                    # goal di default (calcolo aritmetico)
npm start "Qual è la capitale della Francia?"   # custom goal
```

Output tipico (DeepSeek):

```
Provider: deepseek-chat via https://api.deepseek.com
Goal: Calcola (12 + 5) * 3 e dimmi il risultato finale.

[FSM] idle --goal_received--> reasoning  (iter 0)
[FSM] reasoning --plan_ready--> acting  (iter 1)
[FSM] acting --action_done--> observing  (iter 2)
[FSM] observing --goal_met--> done  (iter 3)
[FSM] terminato in stato finale: done
```

## Architettura

| File | Responsabilità |
|---|---|
| `workflow-loader.ts` | Legge `agent-orchestrator.yaml`, costruisce la transition table `{from, event} → to` |
| `llm.ts` | Client OpenAI-compatible, una funzione `chat(messages, tools)` |
| `tools.ts` | Registro dei tool (`calculator`, `echo`, `fake_search`) con schemi function-calling e implementazioni in-process |
| `agent-runtime.ts` | Loop principale Pattern A. Esegue lo step appropriato per ogni stato (`reasoning` / `acting` / `observing`) e applica la transizione successiva |

## Mapping FSM → codice

| Stato POM | Cosa fa il runtime in quello stato | Eventi possibili in uscita |
|---|---|---|
| `idle` | (transitorio) | `goal_received` |
| `reasoning` | LLM call con tool schemas. Se torna tool_calls → `plan_ready`; se torna solo testo → `goal_already_met` | `plan_ready`, `goal_already_met` |
| `acting` | Esegue la tool call pendente, salva il risultato | `action_done`, `action_error` |
| `observing` | LLM call con history aggiornata. Se torna tool_calls → `loop_continue`; se torna solo testo → `goal_met` | `loop_continue`, `goal_met` |
| `done` / `failed` | terminale | — |

## Bound del loop

Il runtime applica due bound a mano, in attesa di H6 `loop_guard`:

- `MAX_ITERATIONS` (default 10) — taglio per numero di transizioni
- `MAX_DURATION_MS` (default 300_000 = 5 min) — taglio per tempo wall-clock

Quando H6 diventerà primitiva schema, questi due valori migreranno dentro al YAML del workflow e il runtime li leggerà dalla `loop_guard` invece che dall'environment.

## Limiti noti

- **Un solo tool per turno.** Il runtime esegue solo `tool_calls[0]`. Parallel tool calls non supportate (volutamente — coerente con il pattern POM "no async").
- **Niente retry esplicito.** Su `action_error` la FSM va in `failed` (come da modellazione di H1). Per il retry bounded vedi H3 (`agent-retry-bounded.yaml`) — andrà implementato come variante del runtime.
- **Snapshot/restore non implementato qui.** Il runtime non scrive automaticamente lo snapshot a 4-tupla `{workflow, version, state, context}` (validato in H5). Aggiungerlo costa ~20 righe in `agent-runtime.ts`; sarà un'iterazione successiva.
- **Tool mock.** I tool inclusi (`calculator`, `echo`, `fake_search`) sono volutamente piccoli. Per usi reali, aggiungi tool nel registro `TOOL_SCHEMAS` + `TOOL_IMPLS` di `tools.ts`.

## Workflow Fit Auditor — agente POM eseguibile

Sopra lo stesso runtime gira un agente specializzato (`workflow-fit-auditor.ts`) che automatizza la classificazione `clean / adapted / forced fit` di un workflow modellato — il lavoro che gli esperimenti H1–H5 hanno fatto a mano cinque volte.

### Uso

```sh
npm run audit -- <path-to-workflow.yaml> [<output.fit.md>]
```

Esempio (richiede una chiave LLM in `.env`):

```sh
npm run audit -- \
  templates/examples/workflow/loop-goal/agent-loop-table.yaml \
  experiments/agent-loop-fsm/design/agent-loop-table-auto.fit.md
```

### Tool POM aggiuntivi (in `tools.ts`)

- `read_workflow(path)` — legge il YAML
- `lint_workflow(path)` — esegue `scripts/lint-workflows.mjs`
- `list_pom_primitives()` — restituisce la lista canonica delle primitive POM (riferimento per classificare)
- `write_design_note(path, content)` — scrive il `*.fit.md` (gated: path deve finire in `.fit.md` ed essere sotto `experiments/`)

### Validazione (test reale 2026-05-30)

Applicato a `agent-loop-table.yaml` (H2 modellato a mano). Confronto con il `agent-loop-table.fit.md` scritto a mano oggi: stesso giudizio su 6/6 stati e 7/7 transizioni (tutti clean fit), verdetto identico ("100% clean fit"), lunghezza simile (~50 righe), note più sintetiche ma sostanzialmente accurate. Tempo: ~30 secondi reali, 10 iterazioni FSM. Il modello DeepSeek ha usato spontaneamente parallel tool calls al primo turno (read_workflow + list_pom_primitives) — il runtime li gestisce.

### Costo del fix scoperto durante questo test

Due bug del runtime base sono stati corretti per supportare l'auditor:

1. `reasoning` dopo `observing` con tool pendente non doveva ri-chiamare l'LLM — saltava direttamente all'esecuzione.
2. `pendingToolCall` singola non bastava: i provider OpenAI-compatible emettono `tool_calls[]` come array (parallel tool calls). Ora il runtime esegue tutte le call del turno in ordine e produce un `tool` message per ogni `tool_call_id`. Senza questo fix l'API rifiuta la conversazione successiva come incoerente.

Entrambi i fix migliorano anche `agent-runtime.ts` (il runtime base resta retro-compatibile).

## Stato

Candidato. Vive in `experiments/agent-loop-fsm/runtime-candidate/` per la durata della validazione. Esecuzione end-to-end confermata su DeepSeek (`deepseek-chat`) il 2026-05-30 sia per il calcolo aritmetico base sia per l'audit di un workflow POM reale.
