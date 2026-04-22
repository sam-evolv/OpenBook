import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not configured');
    _openai = new OpenAI({ apiKey: key });
  }
  return _openai;
}

/**
 * Migrated from Anthropic Claude Sonnet 4.5 → OpenAI gpt-4o-mini
 * on 2026-04-22. System prompt adapted for GPT conventions
 * (OpenAI models respond to "Do X" imperatives; Claude responded
 * better to "You should X" framing). Tool-calling switched from
 * Anthropic's tool_use/tool_result blocks to OpenAI's function-
 * calling API with role='tool' result messages.
 */
const SYSTEM_PROMPT = `You are OpenBook Assistant, a warm, concise booking concierge for local businesses in Ireland (gyms, salons, barbers, physios, yoga, saunas, etc.).

Rules:
- Keep replies brief and conversational — 1–3 sentences unless the user asks for more.
- When the user wants to find or book something, call the search_businesses function. Do not invent businesses or make up names.
- After receiving tool results, recommend 1–3 options and ask a single clarifying question if needed (e.g. time preference).
- If there are no matches, say so plainly and suggest a broader search.
- Never mention that you are an AI, language model, or tool. Never name internal functions.
- Currency is EUR. Default location is Ireland.`;

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_businesses',
      description:
        'Search live OpenBook businesses by a keyword (category or name) and optional city. Returns up to 8 matches.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Category or keyword — e.g. "personal trainer", "sauna", "barber", "yoga"',
          },
          city: {
            type: 'string',
            description: 'Optional city name, e.g. "Cork", "Dublin"',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
];

interface BusinessSearchResult {
  slug: string;
  name: string;
  category: string;
  city: string | null;
  primary_colour: string | null;
  rating: number | null;
  cover_image_url: string | null;
  description: string | null;
}

async function runToolSearch(
  args: { query: string; city?: string },
): Promise<{ results: BusinessSearchResult[]; error?: string }> {
  const sb = supabaseAdmin();
  let q = sb
    .from('businesses')
    .select(
      'slug, name, category, city, primary_colour, rating, cover_image_url, description',
    )
    .eq('is_live', true)
    .limit(8);

  if (args.query) {
    const term = args.query.toLowerCase();
    q = q.or(
      `name.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`,
    );
  }
  if (args.city) {
    q = q.ilike('city', `%${args.city}%`);
  }

  const { data, error } = await q;
  if (error) {
    return { error: error.message, results: [] };
  }
  return { results: (data ?? []) as BusinessSearchResult[] };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 });
    }

    const openai = getOpenAI();

    let history: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    let collectedBusinesses: BusinessSearchResult[] = [];
    let finalText = '';

    // Up to 3 tool-call rounds
    for (let hop = 0; hop < 3; hop++) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        messages: history,
        tools,
      });

      const choice = response.choices[0];
      if (!choice) break;
      const msg = choice.message;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Append the assistant message (with tool_calls) to history first
        history = [...history, msg];

        for (const tc of msg.tool_calls) {
          if (tc.type !== 'function') continue;
          if (tc.function.name === 'search_businesses') {
            let args: { query: string; city?: string };
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
              args = { query: '' };
            }
            const result = await runToolSearch(args);
            if (result.results.length > 0) {
              collectedBusinesses = result.results;
            }
            history.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
        }
        continue;
      }

      // No tool calls — final answer
      finalText = (msg.content ?? '').trim();
      break;
    }

    return NextResponse.json({
      reply: finalText || 'Happy to help — what are you looking to book?',
      businesses: collectedBusinesses.slice(0, 3),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/assistant] error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
