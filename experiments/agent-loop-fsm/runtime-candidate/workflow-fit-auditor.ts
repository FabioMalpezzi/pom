// workflow-fit-auditor.ts — agente che esegue automaticamente la
// classificazione fit (clean / adapted / forced lossy) per ogni
// stato e ogni transizione di un workflow POM, scrivendo il design
// note *.fit.md a fianco del workflow.
//
// È un test reale del runtime su un task agentico che POM oggi fa
// a mano: H1..H5 hanno tutti richiesto un design note scritto a mano.
// Questo agente lo automatizza, restando dentro lo stesso runtime
// Pattern A validato in H1.

import 'dotenv/config';
import { runAgent } from './agent-runtime.ts';
import { describeProvider } from './llm.ts';
import { TOOL_SCHEMAS_POM_AUDITOR } from './tools.ts';

const AUDITOR_SYSTEM = [
  'Sei un agente POM specializzato nella revisione di workflow YAML.',
  '',
  'Il tuo compito: per il workflow che ti viene indicato, produrre il file `<path>.fit.md` con la classificazione fit (clean / adapted / forced lossy) di ogni stato e di ogni transizione, secondo la metodologia POM.',
  '',
  'Strumenti a disposizione:',
  '- `read_workflow(path)`: legge il YAML del workflow.',
  '- `lint_workflow(path)`: esegue il validator POM e restituisce pass/fail + eventuali errori.',
  '- `list_pom_primitives()`: restituisce la lista canonica delle primitive POM (riferimento per la classificazione).',
  '- `write_design_note(path, content)`: scrive il `*.fit.md`. Path deve finire in `.fit.md` ed essere sotto `experiments/`.',
  '',
  'Workflow operativo che DEVI seguire:',
  '1. Leggi il workflow con `read_workflow`.',
  '2. Lancia `lint_workflow` per verificare che validi.',
  '3. Consulta `list_pom_primitives` per avere il riferimento.',
  '4. Decidi la classificazione per ogni stato e ogni transizione. Le definizioni:',
  '   - **clean fit**: mappa direttamente a una primitiva POM, senza compromessi.',
  '   - **adapted fit**: usa la primitiva con una piccola riformulazione documentata (rename, split, merge minore).',
  '   - **forced fit lossy**: la primitiva distorce il significato di dominio (mapping con perdita).',
  '5. Componi il contenuto del file `.fit.md` con questa struttura:',
  '   - front matter YAML (experiment, hypothesis se nota, artifact, iteration: 1, date, pattern)',
  '   - intestazione `# Fit classification — <workflow name> (auto)`',
  '   - sezione "## States (N)" con tabella `| State | Fit | Note |` e una nota domain-level per ogni stato.',
  '   - sezione "## Transitions (N)" con tabella `| Transition | Fit | Note |`.',
  '   - conteggio "N/N clean fit" per stati e transizioni.',
  '   - sezione "## Gate results" con esito del linter.',
  '   - sezione "## Verdict" con il giudizio complessivo.',
  '6. Scrivi il file con `write_design_note`.',
  '7. Quando hai scritto e confermato il file, rispondi in testo libero con un riepilogo di 2-3 righe (stato finale, percentuale clean fit, eventuali criticità).',
  '',
  'Vincoli importanti:',
  '- Non inventare campi o primitive POM non presenti in `list_pom_primitives`.',
  '- Se il linter restituisce FAIL, segnalalo nel design note e non dichiarare il workflow corretto.',
  '- Sii preciso: ogni riga delle tabelle deve avere una nota motivata, non un placeholder.',
  '- Una volta scritto il file, NON ri-leggere lo stesso workflow o re-eseguire il lint: hai già tutto.',
].join('\n');

function defaultNotePathFor(workflowYamlPath: string): string {
  // experiments/<topic>/workflows-candidate/foo.yaml
  //   → experiments/<topic>/design/foo.fit.md
  // Sostituisce 'workflows-candidate' con 'design' e .yaml/.yml con .fit.md
  return workflowYamlPath
    .replace('/workflows-candidate/', '/design/')
    .replace(/\.ya?ml$/, '.fit.md');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Uso: npm run audit -- <path-to-workflow.yaml> [<output.fit.md>]');
    process.exit(2);
  }
  const workflowPath = args[0];
  const notePath = args[1] ?? defaultNotePathFor(workflowPath);

  const goal = [
    `Esegui l'audit fit del workflow POM al path:`,
    `  ${workflowPath}`,
    ``,
    `Scrivi il design note risultante in:`,
    `  ${notePath}`,
    ``,
    `Segui esattamente il workflow operativo descritto nel system prompt.`,
  ].join('\n');

  console.log(`Provider: ${describeProvider()}`);
  console.log(`Auditor su: ${workflowPath}`);
  console.log(`Output:     ${notePath}\n`);

  try {
    const { finalState, context, iterations } = await runAgent({
      goal,
      tools: TOOL_SCHEMAS_POM_AUDITOR,
      systemPrompt: AUDITOR_SYSTEM,
      maxIterations: 20,
      maxDurationMs: 600_000, // 10 minuti
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
