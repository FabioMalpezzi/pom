// agent-runtime.ts — esecuzione Pattern A del workflow ReAct minimal
// (`experiments/agent-loop-fsm/workflows-candidate/agent-orchestrator.yaml`,
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
import { chat, describeProvider, type ChatMessage, type ChatToolCall } from './llm.ts';
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
  // tool_call_id corrente, materializzato nello step `acting`.
  pendingToolCall: ChatToolCall | null;
}

function makeSystemPrompt(workflow: Workflow): string {
  return [
    `Sei un agente AI che opera secondo il pattern ReAct (Reason → Act → Observe).`,
    `Hai accesso ai seguenti strumenti: ${TOOL_SCHEMAS.map((t) => t.function.name).join(', ')}.`,
    `Workflow: ${workflow.workflow} (v${workflow.version}).`,
    ``,
    `Regole:`,
    `1. Quando ricevi un obiettivo, ragiona brevemente e chiama uno strumento se serve.`,
    `2. Dopo ogni osservazione, decidi se l'obiettivo è raggiunto o se serve un altro passo.`,
    `3. Quando l'obiettivo è raggiunto, rispondi in testo libero senza chiamare altri strumenti.`,
    `4. Sii conciso. Non spiegare il pattern, eseguilo.`,
  ].join('\n');
}

async function runReasoningStep(ctx: AgentContext): Promise<{ event: string }> {
  const { rawAssistant } = await chat(ctx.messages, TOOL_SCHEMAS);
  ctx.messages.push(rawAssistant);

  const toolCalls = rawAssistant.tool_calls ?? [];
  if (toolCalls.length === 0) {
    // Niente tool call → l'LLM ha già concluso. Stato → done.
    const final = rawAssistant.content?.toString() ?? '(nessun testo)';
    ctx.history.push({ thought: final });
    return { event: 'goal_already_met' };
  }
  // Prendiamo la prima tool call. Multi-tool-per-turno è fuori scope per Pattern A semplice.
  ctx.pendingToolCall = toolCalls[0];
  ctx.history.push({
    thought: rawAssistant.content?.toString() ?? '',
    action: { name: toolCalls[0].function.name, args: toolCalls[0].function.arguments },
  });
  return { event: 'plan_ready' };
}

async function runActingStep(ctx: AgentContext): Promise<{ event: string }> {
  if (!ctx.pendingToolCall) {
    throw new Error('acting senza pendingToolCall — bug di transizione');
  }
  const call = ctx.pendingToolCall;
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.function.arguments || '{}');
  } catch {
    args = {};
  }
  const result = await runTool(call.function.name, args);
  ctx.last_observation = result.output;

  // Messaggio tool_result da consegnare all'LLM al prossimo turno.
  ctx.messages.push({
    role: 'tool',
    tool_call_id: call.id,
    content: result.output,
  });

  ctx.history[ctx.history.length - 1].observation = result.output;
  ctx.pendingToolCall = null;
  return { event: result.ok ? 'action_done' : 'action_error' };
}

async function runObservingStep(ctx: AgentContext): Promise<{ event: string }> {
  // Riusiamo la stessa primitiva del reasoning: chiediamo all'LLM
  // se continuare (tool call) o concludere (testo libero).
  const { rawAssistant } = await chat(ctx.messages, TOOL_SCHEMAS);
  ctx.messages.push(rawAssistant);

  const toolCalls = rawAssistant.tool_calls ?? [];
  if (toolCalls.length === 0) {
    const final = rawAssistant.content?.toString() ?? '(nessun testo)';
    ctx.history.push({ thought: final });
    return { event: 'goal_met' };
  }
  ctx.pendingToolCall = toolCalls[0];
  ctx.history.push({
    thought: rawAssistant.content?.toString() ?? '',
    action: { name: toolCalls[0].function.name, args: toolCalls[0].function.arguments },
  });
  // observing → reasoning richiede 'loop_continue'. Manteniamo la tool
  // call nel context per quando reasoning la rivedrà nello step acting.
  return { event: 'loop_continue' };
}

export async function runAgent(goal: string): Promise<{
  finalState: StateName;
  context: AgentContext;
  iterations: number;
}> {
  const workflow = loadWorkflow(
    '../workflows-candidate/agent-orchestrator.yaml'
  );
  const table = buildTransitionTable(workflow);

  const ctx: AgentContext = {
    goal,
    history: [],
    last_observation: null,
    messages: [
      { role: 'system', content: makeSystemPrompt(workflow) },
      { role: 'user', content: `Obiettivo: ${goal}` },
    ],
    pendingToolCall: null,
  };

  let state: StateName = workflow.initial_state;
  let event: string = 'goal_received';
  let iter = 0;
  const startedAt = Date.now();

  // Bound del loop (analoghi a H6 loop_guard, qui implementati a mano).
  const checkBounds = (): boolean => {
    if (iter >= MAX_ITERATIONS) {
      console.log(`\n[BOUND] Raggiunto MAX_ITERATIONS=${MAX_ITERATIONS}, esco.`);
      return false;
    }
    if (Date.now() - startedAt >= MAX_DURATION_MS) {
      console.log(`\n[BOUND] Raggiunto MAX_DURATION_MS=${MAX_DURATION_MS}, esco.`);
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
        outcome = await runReasoningStep(ctx);
        break;
      case 'acting':
        outcome = await runActingStep(ctx);
        break;
      case 'observing':
        outcome = await runObservingStep(ctx);
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
    const { finalState, context, iterations } = await runAgent(goal);
    console.log(`\n=== Esito ===`);
    console.log(`Stato finale: ${finalState}`);
    console.log(`Iterazioni: ${iterations}`);
    console.log(`Storia ReAct:`);
    context.history.forEach((step, i) => {
      console.log(`  ${i + 1}. thought: ${(step.thought ?? '').slice(0, 140)}`);
      if (step.action) console.log(`     action: ${JSON.stringify(step.action)}`);
      if (step.observation) console.log(`     observation: ${step.observation}`);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n[ERRORE] ${msg}`);
    process.exitCode = 1;
  }
}

main();
