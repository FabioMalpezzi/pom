// workflow-scenarios-generator.ts — agente che, dato un workflow POM,
// enumera i path significativi attraverso la FSM e produce un file
// *.scenarios.md con uno scenario per ogni path interessante: setup,
// sequenza di eventi, transizioni attraversate, terminal state atteso,
// assertioni di context. È materiale che oggi POM scrive a mano e che
// un runtime di riferimento (o una suite di test) consumerebbe come
// fixture.

import 'dotenv/config';
import { runAgent } from './agent-runtime.ts';
import { describeProvider } from './llm.ts';
import { TOOL_SCHEMAS_POM_SCENARIOS } from './tools.ts';

const SCENARIOS_SYSTEM = [
  "Sei un agente POM specializzato nella generazione di scenari di test per workflow YAML.",
  "",
  "Il tuo compito: per il workflow indicato, produrre il file `<path>.scenarios.md` con la lista degli scenari di test significativi. Uno scenario è un path attraverso la FSM dal `initial_state` a un terminale, con sequenza di eventi, transizioni, eventuale stato iniziale del context e assertioni sul context finale.",
  "",
  "Strumenti a disposizione:",
  "- `read_workflow(path)`: legge il YAML del workflow. Usalo per leggere il workflow indicato. Se il workflow contiene `state-invoke` o `event-invoke`, leggi ANCHE il sub-workflow referenziato per capire i suoi terminal_state, così puoi enumerare i path della composizione.",
  "- `list_pom_primitives()`: restituisce la lista canonica delle primitive POM.",
  "- `write_scenarios(path, content)`: scrive il file di scenari. Path deve finire in `.scenarios.md` ed essere sotto `experiments/`.",
  "",
  "Workflow operativo che DEVI seguire:",
  "1. Leggi il workflow con `read_workflow`.",
  "2. Se il workflow contiene `state-invoke` o `event-invoke`, leggi ogni sub-workflow referenziato.",
  "3. Identifica i path significativi:",
  "   - **happy path** (cammino di successo principale)",
  "   - **failure path** per ogni failure mode dichiarato (errori, exhaustion, escalation)",
  "   - **loop path** se esistono cicli (almeno un giro del loop, almeno uno scenario che esce dal loop)",
  "   - **edge case** dichiarati negli invariants o nelle descrizioni degli stati",
  "4. Per ogni scenario produci:",
  "   - **Nome** descrittivo (es. 'goal_completed_happy_path')",
  "   - **Stato iniziale** (sempre `initial_state` del workflow)",
  "   - **Context iniziale** (esempio plausibile dei campi previsti dal `context_schema`)",
  "   - **Sequenza** di `(stato_corrente, evento_esterno) → (stato_successivo, side_effects)` per ogni transizione attraversata",
  "   - **Stato finale atteso** (uno dei terminali)",
  "   - **Assertioni** sul context al termine (es. 'history non vuoto', 'last_observation popolato')",
  "5. Componi il file `<path>.scenarios.md` con front matter + intestazione + uno scenario per sezione (## Scenario N: nome).",
  "6. Scrivi il file con `write_scenarios`.",
  "7. Quando hai scritto e confermato il file, rispondi in testo libero con un riepilogo (numero di scenari, copertura dei terminali).",
  "",
  "Vincoli importanti:",
  "- Numero di scenari: minimo 3, massimo ~10. Punta alla copertura, non all'esaustività combinatoria.",
  "- Le sequenze devono usare SOLO eventi e transizioni effettivamente dichiarati nel workflow. Non inventare.",
  "- Per ogni terminale dichiarato nel workflow (`is_final: true`) deve esistere ALMENO uno scenario che lo raggiunge.",
  "- Per i workflow con state-invoke, almeno uno scenario per ogni `on_completion[].next_event`/`target`.",
  "- Una volta scritto il file, NON re-eseguire `read_workflow` o `list_pom_primitives`: hai già tutto.",
].join('\n');

function defaultScenariosPathFor(workflowYamlPath: string): string {
  if (workflowYamlPath.includes('/workflows-candidate/')) {
    return workflowYamlPath
      .replace('/workflows-candidate/', '/design/')
      .replace(/\.ya?ml$/, '.scenarios.md');
  }
  // Workflow promosso a templates/examples/...
  const basename = workflowYamlPath.replace(/^.*\//, '').replace(/\.ya?ml$/, '');
  return `experiments/agent-loop-fsm/design/${basename}.scenarios.md`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Uso: npm run scenarios -- <path-to-workflow.yaml> [<output.scenarios.md>]');
    process.exit(2);
  }
  const workflowPath = args[0];
  const notePath = args[1] ?? defaultScenariosPathFor(workflowPath);

  const goal = [
    `Genera gli scenari di test per il workflow POM al path:`,
    `  ${workflowPath}`,
    ``,
    `Scrivi il file scenari risultante in:`,
    `  ${notePath}`,
    ``,
    `Segui esattamente il workflow operativo descritto nel system prompt.`,
  ].join('\n');

  console.log(`Provider: ${describeProvider()}`);
  console.log(`Scenarios per: ${workflowPath}`);
  console.log(`Output:        ${notePath}\n`);

  try {
    const { finalState, context, iterations } = await runAgent({
      goal,
      tools: TOOL_SCHEMAS_POM_SCENARIOS,
      systemPrompt: SCENARIOS_SYSTEM,
      maxIterations: 30,
      maxDurationMs: 600_000,
    });

    console.log(`\n=== Esito ===`);
    console.log(`Stato finale: ${finalState}`);
    console.log(`Iterazioni:   ${iterations}`);
    console.log(`Storia ReAct:`);
    context.history.forEach((step, i) => {
      const thought = (step.thought ?? '').slice(0, 120).replace(/\n/g, ' ');
      console.log(`  ${i + 1}. thought: ${thought}`);
      if (step.action) console.log(`     action: ${JSON.stringify(step.action).slice(0, 200)}`);
      if (step.observation)
        console.log(`     observation: ${(step.observation ?? '').slice(0, 200)}`);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n[ERRORE] ${msg}`);
    process.exitCode = 1;
  }
}

main();
