import OpenAI from 'openai';

let singleton: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (singleton) return singleton;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      'Missing OPENAI_API_KEY — set it in your environment before calling GPT.',
    );
  }
  singleton = new OpenAI({ apiKey: key });
  return singleton;
}

export const OPENAI_MODEL = 'gpt-4o';
