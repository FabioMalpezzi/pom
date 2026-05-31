// llm.ts — client OpenAI-compatible (funziona con OpenAI, DeepSeek, Groq, Mistral,
// Together, Ollama locale e qualunque endpoint che esponga `/chat/completions`
// nel formato OpenAI). Nessun lock-in al provider.

import OpenAI from 'openai';

const baseURL = process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1';
const apiKey = process.env.LLM_API_KEY;
const model = process.env.LLM_MODEL ?? 'gpt-4o-mini';

if (!apiKey) {
  throw new Error(
    'LLM_API_KEY non impostata. Configura il file .env (vedi .env.example).'
  );
}

export const client = new OpenAI({
  baseURL,
  apiKey,
});

export const MODEL = model;

export type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;
export type ChatTool = OpenAI.Chat.ChatCompletionTool;
export type ChatToolCall = OpenAI.Chat.ChatCompletionMessageToolCall;
export type ChatChoice = OpenAI.Chat.ChatCompletion.Choice;

export async function chat(
  messages: ChatMessage[],
  tools?: ChatTool[]
): Promise<{
  choice: ChatChoice;
  rawAssistant: OpenAI.Chat.ChatCompletionMessage;
}> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools,
    // tool_choice "auto" lascia decidere al modello se chiamare un tool o
    // produrre una risposta finale. È il default dei provider compatibili.
    tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
    temperature: 0.2,
  });

  const choice = response.choices[0];
  return {
    choice,
    rawAssistant: choice.message,
  };
}

export function describeProvider(): string {
  return `${MODEL} via ${baseURL}`;
}
