import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `You are OpenBook Assistant, a warm, concise booking concierge for local businesses in Ireland (gyms, salons, barbers, physios, yoga, saunas, etc.).

Rules:
- Be brief and conversational — 1–3 sentences unless the user asks for more.
- When the user asks to find or book something, call the \`search_businesses\` tool. Never invent businesses.
- After receiving tool results, recommend 1–3 options and ask a single clarifying question if needed (e.g. time preference).
- If no matches, say so plainly and suggest a broader search.
- Never mention you're an AI or a language model. Never mention tool names.
- Currency is EUR. Location default is Ireland.`;

const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'search_businesses',
    description:
      'Search live OpenBook businesses by a keyword (category or name) and optional city. Returns up to 8 matches.',
    input_schema: {
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
    },
  },
];

async function runToolSearch(args: { query: string; city?: string }) {
  const sb = supabaseAdmin();
  let q = sb
    .from('businesses')
    .select(
      'slug, name, category, city, primary_colour, rating, cover_image_url, description'
    )
    .eq('is_live', true)
    .limit(8);

  if (args.query) {
    const term = args.query.toLowerCase();
    q = q.or(
      `name.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`
    );
  }
  if (args.city) {
    q = q.ilike('city', `%${args.city}%`);
  }

  const { data, error } = await q;
  if (error) {
    return { error: error.message, results: [] };
  }
  return { results: data ?? [] };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 });
    }

    // Build Claude message history
    let history: Anthropic.Messages.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let collectedBusinesses: any[] = [];
    let finalText = '';

    // Up to 3 tool-use turns
    for (let hop = 0; hop < 3; hop++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        tools,
        messages: history,
      });

      if (response.stop_reason === 'tool_use') {
        const toolUses = response.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use'
        );
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

        for (const tu of toolUses) {
          if (tu.name === 'search_businesses') {
            const args = tu.input as { query: string; city?: string };
            const result = await runToolSearch(args);
            if (result.results?.length) {
              collectedBusinesses = result.results;
            }
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: JSON.stringify(result),
            });
          }
        }

        history = [
          ...history,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ];
        continue;
      }

      // end_turn — extract text
      finalText = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      break;
    }

    return NextResponse.json({
      reply: finalText || 'Happy to help — what are you looking to book?',
      businesses: collectedBusinesses.slice(0, 3),
    });
  } catch (err: any) {
    console.error('[api/assistant] error', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
