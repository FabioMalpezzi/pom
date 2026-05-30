// tools.ts — registro dei tool che l'agente può chiamare. Volutamente
// piccoli e self-contained: il calcolatore valuta solo aritmetica sicura,
// echo restituisce il testo, fake_search ha risposte canned. Servono a
// dimostrare il loop del Pattern A senza dipendenze esterne.

import type { ChatTool } from './llm.ts';

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

export const TOOL_SCHEMAS: ChatTool[] = [
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
};

export async function runTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  const impl = TOOL_IMPLS[name];
  if (!impl) {
    return { ok: false, output: `Tool sconosciuto: ${name}` };
  }
  return impl(input);
}
