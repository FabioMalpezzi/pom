// tools.ts — registro dei tool che l'agente può chiamare. I primi tre
// (calculator, echo, fake_search) sono mock per smoke test. Gli ultimi
// quattro (read_workflow, lint_workflow, list_pom_primitives,
// write_design_note) abilitano il Workflow Fit Auditor che gira sopra
// i workflow POM modellati.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ChatTool } from './llm.ts';

const here = dirname(fileURLToPath(import.meta.url));
// Il runtime vive in experiments/agent-loop-fsm/runtime-candidate/,
// quindi POM root è 3 livelli sopra.
const POM_ROOT = resolve(here, '../../..');

export type ToolResult = {
  ok: boolean;
  output: string;
};

export type ToolImpl = (input: Record<string, unknown>) => Promise<ToolResult>;

// Calcolatore: valuta espressioni con +, -, *, /, parentesi e numeri.
// Niente Function() / eval() — parser ricorsivo a discesa.
function evalArith(expr: string): number {
  let pos = 0;
  const src = expr.replace(/\s+/g, '');

  function parseExpr(): number {
    let value = parseTerm();
    while (pos < src.length && (src[pos] === '+' || src[pos] === '-')) {
      const op = src[pos++];
      const right = parseTerm();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (pos < src.length && (src[pos] === '*' || src[pos] === '/')) {
      const op = src[pos++];
      const right = parseFactor();
      if (op === '/' && right === 0) throw new Error('divisione per zero');
      value = op === '*' ? value * right : value / right;
    }
    return value;
  }

  function parseFactor(): number {
    if (src[pos] === '(') {
      pos++;
      const v = parseExpr();
      if (src[pos] !== ')') throw new Error('parentesi mancante');
      pos++;
      return v;
    }
    if (src[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    let n = '';
    while (pos < src.length && /[\d.]/.test(src[pos])) n += src[pos++];
    if (n === '') throw new Error(`token inatteso a ${pos}: ${src[pos]}`);
    return Number(n);
  }

  const result = parseExpr();
  if (pos !== src.length) throw new Error(`carattere imprevisto a ${pos}`);
  return result;
}

const CANNED_SEARCH: Record<string, string> = {
  'capitale italia': "Roma è la capitale d'Italia.",
  'capitale francia': 'Parigi è la capitale di Francia.',
  'capitale germania': 'Berlino è la capitale di Germania.',
};

// ─── Tool POM ────────────────────────────────────────────────────────

function toAbsPomPath(maybeRel: string): string {
  return isAbsolute(maybeRel) ? maybeRel : join(POM_ROOT, maybeRel);
}

const POM_PRIMITIVES = [
  {
    name: 'states',
    description:
      'Stati nominali del workflow (snake_case). Campi: name, description, is_final (terminale sì/no), re_entry_allowed (eccezione per terminale rientrante).',
  },
  {
    name: 'events',
    description: 'Eventi nominali che possono triggerare transizioni. Campi: name, description.',
  },
  {
    name: 'transitions',
    description: 'Archi del grafo. Campi: from, to, event, guard (opzionale, predicato nominale).',
  },
  {
    name: 'guards',
    description: 'Predicati nominali referenziati dalle transizioni. Campi: name, description.',
  },
  {
    name: 'invariants',
    description: "Regole testuali sull'intero workflow, verificate da umani o validator quando possibile.",
  },
  {
    name: 'context_schema',
    description: 'Schema documental dei campi del context del workflow.',
  },
  {
    name: 'state-invoke',
    description:
      "Invocazione sincrona di un sub-workflow da uno stato non-finale. Campi: state.invoke.workflow (path al sub-workflow), state.invoke.on_completion[] (dispatch su terminali del sub-workflow).",
  },
  {
    name: 'event-invoke',
    description:
      "Invocazione sincrona di un sub-workflow associata a un evento (sulla transizione). Campi: transition.invoke.workflow, transition.invoke.on_completion[].",
  },
  {
    name: 'pipeline',
    description:
      "Sequenza lineare di workflow autonomi (file con campo 'pipeline' invece di 'workflow'). Composizione esplicitamente linearizzata.",
  },
  {
    name: 'self-transition',
    description:
      "Transizione con from == to. Combinata con un guard, esprime retry o looping locali (es. acting → acting on retry_after_error guard has_attempts_left).",
  },
];

function readWorkflowYaml(workflowPath: string): { ok: boolean; output: string } {
  const abs = toAbsPomPath(workflowPath);
  if (!existsSync(abs)) {
    return { ok: false, output: `File non trovato: ${abs}` };
  }
  try {
    const content = readFileSync(abs, 'utf8');
    return { ok: true, output: content };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, output: `Errore lettura: ${msg}` };
  }
}

function lintWorkflowFile(workflowPath: string): { ok: boolean; output: string } {
  const abs = toAbsPomPath(workflowPath);
  if (!existsSync(abs)) {
    return { ok: false, output: `File non trovato: ${abs}` };
  }
  const lintScript = join(POM_ROOT, 'scripts/lint-workflows.mjs');
  try {
    const output = execSync(`node "${lintScript}" "${abs}"`, {
      encoding: 'utf8',
      cwd: POM_ROOT,
      maxBuffer: 4 * 1024 * 1024,
    });
    return { ok: true, output };
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    const stdout = err.stdout?.toString() ?? '';
    const stderr = err.stderr?.toString() ?? '';
    return {
      ok: false,
      output: `lint fallito: ${err.message ?? ''}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
    };
  }
}

function listPomPrimitives(): { ok: true; output: string } {
  const lines = POM_PRIMITIVES.map((p) => `- **${p.name}** — ${p.description}`);
  const intro = [
    "Primitive note del workflow schema POM (v0.2.0, SPEC-0006). Una mappatura `clean fit` non richiede primitive fuori da questa lista.",
    "Una `adapted fit` la usa con piccoli adattamenti documentati. Una `forced fit lossy` distorce il dominio.",
    "",
  ];
  return { ok: true, output: [...intro, ...lines].join('\n') };
}

function writeDesignNote(notePath: string, content: string): { ok: boolean; output: string } {
  const abs = toAbsPomPath(notePath);
  if (!abs.endsWith('.fit.md')) {
    return { ok: false, output: `write_design_note accetta solo path che finiscono in .fit.md (richiesto: ${notePath}).` };
  }
  if (!abs.includes('/experiments/')) {
    return { ok: false, output: `write_design_note accetta solo path dentro experiments/ (richiesto: ${notePath}).` };
  }
  try {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
    const size = content.length;
    return { ok: true, output: `Scritto ${abs} (${size} bytes).` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, output: `Errore scrittura: ${msg}` };
  }
}

// ─── Schema e registro ───────────────────────────────────────────────

const MOCK_SCHEMAS: ChatTool[] = [
  {
    type: 'function',
    function: {
      name: 'calculator',
      description:
        'Valuta una espressione aritmetica con + - * / e parentesi. Restituisce il numero risultante.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'L\'espressione aritmetica da valutare. Esempi: "7 * 8", "(12 + 5) * 3".',
          },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'echo',
      description: 'Restituisce esattamente il testo ricevuto. Utile per ricapitolare informazioni.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Testo da restituire.' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fake_search',
      description:
        'Ricerca finta con risposte canned per uso di test. Riconosce solo poche query (es. "capitale italia").',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'La query da cercare.' },
        },
        required: ['query'],
      },
    },
  },
];

const POM_AUDITOR_SCHEMAS: ChatTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_workflow',
      description:
        'Legge il file YAML di un workflow POM dal disco e ne restituisce il contenuto testuale. Path relativi sono risolti dalla root del repo POM.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path al file .yaml (relativo alla root POM o assoluto).',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lint_workflow',
      description:
        "Esegue il validator POM `scripts/lint-workflows.mjs` sul workflow indicato. Restituisce il report markdown (errori, warning, verdetto PASS/FAIL).",
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path al file .yaml (relativo alla root POM o assoluto).',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pom_primitives',
      description:
        "Restituisce la lista canonica delle primitive note del workflow schema POM (v0.2.0). Usala come riferimento per decidere se un mapping è clean, adapted o forced.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_design_note',
      description:
        "Scrive un file `*.fit.md` con la classificazione fit del workflow. Per sicurezza, accetta solo path che finiscono in `.fit.md` e che vivono sotto `experiments/`.",
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path destinazione (deve finire in `.fit.md`, dentro `experiments/`).',
          },
          content: {
            type: 'string',
            description: 'Contenuto markdown completo del design note.',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
];

export const TOOL_SCHEMAS: ChatTool[] = MOCK_SCHEMAS;
export const TOOL_SCHEMAS_POM_AUDITOR: ChatTool[] = POM_AUDITOR_SCHEMAS;

export const TOOL_IMPLS: Record<string, ToolImpl> = {
  calculator: async (input) => {
    const expr = String(input.expression ?? '');
    try {
      const value = evalArith(expr);
      return { ok: true, output: String(value) };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, output: `Errore calculator: ${msg}` };
    }
  },
  echo: async (input) => ({
    ok: true,
    output: String(input.text ?? ''),
  }),
  fake_search: async (input) => {
    const q = String(input.query ?? '').toLowerCase().trim();
    const hit = CANNED_SEARCH[q];
    if (hit) return { ok: true, output: hit };
    return {
      ok: false,
      output: `Nessun risultato canned per "${q}". Query supportate: ${Object.keys(CANNED_SEARCH).join(', ')}.`,
    };
  },
  read_workflow: async (input) => readWorkflowYaml(String(input.path ?? '')),
  lint_workflow: async (input) => lintWorkflowFile(String(input.path ?? '')),
  list_pom_primitives: async () => listPomPrimitives(),
  write_design_note: async (input) =>
    writeDesignNote(String(input.path ?? ''), String(input.content ?? '')),
};

export async function runTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  const impl = TOOL_IMPLS[name];
  if (!impl) {
    return { ok: false, output: `Tool sconosciuto: ${name}` };
  }
  return impl(input);
}
