// agent-runtime.ts — esecuzione Pattern A del workflow ReAct minimal
// (`templates/examples/workflow/loop-goal/agent-orchestrator.yaml`,
// validato in H1 iter 1). Esegue il loop reasoning → acting → observing
// chiamando l'LLM ai turni di reasoning/observing e i tool locali al
// turno di acting. La transition table è generata dal YAML, così la
// stessa logica funziona su qualsiasi workflow POM strutturalmente
// analogo.

import 'dotenv/config';
import {
  loadWorkflow,
  buildTransitionTable,
  isFinal,
  next,
  type Workflow,
  type TransitionTable,
  type StateName,
} from './workflow-loader.ts';
import { chat, describeProvider, type ChatMessage, type ChatTool, type ChatToolCall } from './llm.ts';
import { runTool, TOOL_SCHEMAS } from './tools.ts';

const MAX_ITERATIONS = Number(process.env.MAX_ITERATIONS ?? 10);
const MAX_DURATION_MS = Number(process.env.MAX_DURATION_MS ?? 300_000);

interface AgentContext {
  goal: string;
  history: Array<{ thought?: string; action?: unknown; observation?: string }>;
  last_observation: string | null;
  // messaggi accumulati per il dialogo con l'LLM (separato dalla history
  // ReAct concettuale: la history serve all'umano, i messages al modello).
  messages: ChatMessage[];
  // Tool call pendenti del turno corrente. Possono essere più di una
  // (parallel tool calls): vanno tutte risolte prima del prossimo turno
  // LLM, altrimenti l'API rifiuta la conversazione come incoerente.
  pendingToolCalls: ChatToolCall[];
}

function makeDefaultSystemPrompt(workflow: Workflow, tools: ChatTool[]): string {
  return [
    `Sei un agente AI che opera secondo il pattern ReAct (Reason → Act → Observe).`,
    `Hai accesso ai seguenti strumenti: ${tools.map((t) => t.function.name).join(', ')}.`,
    `Workflow: ${workflow.workflow} (v${workflow.version}).`,
    ``,
    `Regole:`,
    `1. Quando ricevi un obiettivo, ragiona brevemente e chiama uno strumento se serve.`,
    `2. Dopo ogni osservazione, decidi se l'obiettivo è raggiunto o se serve un altro passo.`,
    `3. Quando l'obiettivo è raggiunto, rispondi in testo libero senza chiamare altri strumenti.`,
    `4. Sii conciso. Non spiegare il pattern, eseguilo.`,
  ].join('\n');
}

async function runReasoningStep(ctx: AgentContext, tools: ChatTool[]): Promise<{ event: string }> {
  // Se l'observing precedente ha già emesso tool call (loop_continue),
  // non ri-chiamare l'LLM: la decisione è già stata presa lì. Salta
  // direttamente all'esecuzione.
  if (ctx.pendingToolCalls.length > 0) {
    return { event: 'plan_ready' };
  }

  const { rawAssistant } = await chat(ctx.messages, tools);
  ctx.messages.push(rawAssistant);

  const toolCalls = rawAssistant.tool_calls ?? [];
  if (toolCalls.length === 0) {
    // Niente tool call → l'LLM ha già concluso. Stato → done.
    const final = rawAssistant.content?.toString() ?? '(nessun testo)';
    ctx.history.push({ thought: final });
    return { event: 'goal_already_met' };
  }
  ctx.pendingToolCalls = [...toolCalls];
  ctx.history.push({
    thought: rawAssistant.content?.toString() ?? '',
    action: toolCalls.map((c) => ({ name: c.function.name, args: c.function.arguments })),
  });
  return { event: 'plan_ready' };
}

async function runActingStep(ctx: AgentContext): Promise<{ event: string }> {
  if (ctx.pendingToolCalls.length === 0) {
    throw new Error('acting senza pendingToolCalls — bug di transizione');
  }
  const calls = ctx.pendingToolCalls;
  ctx.pendingToolCalls = [];
  let allOk = true;
  const observations: string[] = [];

  for (const call of calls) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments || '{}');
    } catch {
      args = {};
    }
    const result = await runTool(call.function.name, args);
    if (!result.ok) allOk = false;
    observations.push(`${call.function.name}: ${result.output}`);

    // Una tool message per ogni tool_call_id, in ordine.
    ctx.messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: result.output,
    });
  }

  ctx.last_observation = observations.join('\n---\n');
  ctx.history[ctx.history.length - 1].observation = ctx.last_observation;
  return { event: allOk ? 'action_done' : 'action_error' };
}

async function runObservingStep(ctx: AgentContext, tools: ChatTool[]): Promise<{ event: string }> {
  // Riusiamo la stessa primitiva del reasoning: chiediamo all'LLM
  // se continuare (tool call) o concludere (testo libero).
  const { rawAssistant } = await chat(ctx.messages, tools);
  ctx.messages.push(rawAssistant);

  const toolCalls = rawAssistant.tool_calls ?? [];
  if (toolCalls.length === 0) {
    const final = rawAssistant.content?.toString() ?? '(nessun testo)';
    ctx.history.push({ thought: final });
    return { event: 'goal_met' };
  }
  ctx.pendingToolCalls = [...toolCalls];
  ctx.history.push({
    thought: rawAssistant.content?.toString() ?? '',
    action: toolCalls.map((c) => ({ name: c.function.name, args: c.function.arguments })),
  });
  // observing → reasoning richiede 'loop_continue'. Manteniamo le tool
  // call nel context per quando reasoning le rivedrà nello step acting.
  return { event: 'loop_continue' };
}

export interface RunAgentOptions {
  goal: string;
  tools?: ChatTool[];
  systemPrompt?: string;
  workflowPath?: string;
  maxIterations?: number;
  maxDurationMs?: number;
}

export async function runAgent(opts: RunAgentOptions): Promise<{
  finalState: StateName;
  context: AgentContext;
  iterations: number;
}> {
  const tools = opts.tools ?? TOOL_SCHEMAS;
  // Path canonico dalla POM root (risolto da workflow-loader.findPomRoot).
  // Indipendente dalla profondità di questo file nel repo.
  const workflow = loadWorkflow(
    opts.workflowPath ?? 'templates/examples/workflow/loop-goal/agent-orchestrator.yaml'
  );
  const table = buildTransitionTable(workflow);
  const maxIter = opts.maxIterations ?? MAX_ITERATIONS;
  const maxDur = opts.maxDurationMs ?? MAX_DURATION_MS;

  const ctx: AgentContext = {
    goal: opts.goal,
    history: [],
    last_observation: null,
    messages: [
      { role: 'system', content: opts.systemPrompt ?? makeDefaultSystemPrompt(workflow, tools) },
      { role: 'user', content: `Obiettivo: ${opts.goal}` },
    ],
    pendingToolCalls: [],
  };

  let state: StateName = workflow.initial_state;
  let event: string = 'goal_received';
  let iter = 0;
  const startedAt = Date.now();

  // Bound del loop (analoghi a H6 loop_guard, qui implementati a mano).
  const checkBounds = (): boolean => {
    if (iter >= maxIter) {
      console.log(`\n[BOUND] Raggiunto MAX_ITERATIONS=${maxIter}, esco.`);
      return false;
    }
    if (Date.now() - startedAt >= maxDur) {
      console.log(`\n[BOUND] Raggiunto MAX_DURATION_MS=${maxDur}, esco.`);
      return false;
    }
    return true;
  };

  while (!isFinal(workflow, state) && checkBounds()) {
    // Applico la transizione dall'evento corrente.
    const target = next(table, state, event);
    if (!target) {
      throw new Error(`Nessuna transizione da ${state} su evento ${event}`);
    }
    console.log(`[FSM] ${state} --${event}--> ${target}  (iter ${iter})`);
    state = target;
    iter++;

    if (isFinal(workflow, state)) break;

    // Eseguo l'azione dello stato corrente.
    let outcome: { event: string };
    switch (state) {
      case 'reasoning':
        outcome = await runReasoningStep(ctx, tools);
        break;
      case 'acting':
        outcome = await runActingStep(ctx);
        break;
      case 'observing':
        outcome = await runObservingStep(ctx, tools);
        break;
      default:
        throw new Error(`Stato non gestito dal runtime: ${state}`);
    }
    event = outcome.event;
  }

  console.log(`[FSM] terminato in stato finale: ${state}`);
  return { finalState: state, context: ctx, iterations: iter };
}

async function main() {
  const args = process.argv.slice(2);
  const goal = args.length > 0 ? args.join(' ') : 'Calcola (12 + 5) * 3 e dimmi il risultato finale.';

  console.log(`Provider: ${describeProvider()}`);
  console.log(`Goal: ${goal}\n`);

  try {
    const { finalState, context, iterations } = await runAgent({ goal });
    console.log(`\n=== Esito ===`);
    console.log(`Stato finale: ${finalState}`);
    console.log(`Iterazioni: ${iterations}`);
    console.log(`Storia ReAct:`);
    context.history.forEach((step, i) => {
      console.log(`  ${i + 1}. thought: ${(step.thought ?? '').slice(0, 140)}`);
      if (step.action) console.log(`     action: ${JSON.stringify(step.action)}`);
      if (step.observation) console.log(`     observation: ${(step.observation ?? '').slice(0, 200)}`);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n[ERRORE] ${msg}`);
    process.exitCode = 1;
  }
}

// Esegui main solo se questo file è l'entry point diretto.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
