import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { supabaseAdmin } from '@/lib/supabase';
import { hasOpenAI, requireEnv } from '@/lib/integrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });
  }
  return _openai;
}

// ===========================================================================
// Synonym map
// ===========================================================================
//
// MAINTENANCE: add entries when new business categories launch. This is the
// hand-curated vocabulary bridge between free-text user queries and the
// actual `businesses.category` / name / description values in the DB.
// Example: data says "Personal Training", users type "personal trainer" —
// substring ILIKE alone misses because "training" ≠ "trainer". The map
// below explodes either user-facing key into the set of DB-facing
// substrings to OR-search against.
//
// Post-50-businesses, migrate to pg_trgm (trigram similarity) or Postgres
// full-text search to eliminate this list entirely. Tracked in brief §8.
// ===========================================================================

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'personal trainer': ['personal training', 'personal trainer', 'pt', 'coaching', 'trainer'],
  'physiotherapist': ['physiotherapy', 'physiotherapist', 'physio', 'sports rehab'],
  gym: ['gym', 'fitness', 'strength', 'conditioning'],
  sauna: ['sauna', 'spa', 'ice bath', 'contrast therapy'],
  yoga: ['yoga', 'pilates', 'breathwork', 'meditation'],
  barber: ['barber', 'barbershop', 'haircut', 'fade'],
  salon: ['salon', 'hair'],
  nails: ['nail', 'manicure', 'pedicure'],
  massage: ['massage', 'sports massage'],
};

/** Flatten the synonym map across all keys for lookup. */
function expandQuery(raw: string): string[] {
  const query = raw.trim().toLowerCase();
  if (!query) return [];

  // Exact key match — use its synonym list directly.
  if (CATEGORY_SYNONYMS[query]) {
    return CATEGORY_SYNONYMS[query];
  }

  // Reverse lookup — the user's word matches something inside a synonym list.
  // Use the list that contains it.
  for (const synonyms of Object.values(CATEGORY_SYNONYMS)) {
    if (synonyms.some((s) => s === query || query.includes(s) || s.includes(query))) {
      return synonyms;
    }
  }

  // Novel term — fall back to just the raw query so the ILIKE still runs.
  return [query];
}

/**
 * Escape a value for use inside a Supabase `.or()` string.
 * PostgREST parses `or=(name.ilike.%foo%)` — commas, closing parens, and
 * percent signs inside the value need handling. The ILIKE wildcard `%`
 * is intentional so we don't escape it.
 */
function escapeForOr(value: string): string {
  return value.replace(/,/g, '\\,').replace(/\)/g, '\\)');
}

// ===========================================================================
// Prompt + tool definition
// ===========================================================================

const SYSTEM_PROMPT = `You are OpenBook Assistant, a warm, concise booking concierge for local businesses in Ireland (gyms, salons, barbers, physios, yoga, saunas, etc.).

Rules:
- Keep replies brief and conversational — 1–3 sentences unless the user asks for more.
- When the user wants to find or book something, call the search_businesses function. Do not invent businesses or make up names.
- If the user does NOT explicitly name a city, do NOT assume one — call search_businesses without the city parameter. Never default to Dublin or any other city.
- After receiving tool results, recommend 1–3 options and ask a single clarifying question if needed (e.g. time preference).
- If search returns zero matches when a city was passed, the tool will automatically retry without the city and set fallback: 'city_no_coverage' on the response. When that happens, acknowledge the coverage gap honestly ("No X in Dublin yet") and mention what's available elsewhere in Ireland — name each result's actual city so the user can see the geography.
- If there are truly no matches anywhere, say so plainly and suggest a broader search.
- Never mention that you are an AI, language model, or tool. Never name internal functions.
- Currency is EUR. Default location is Ireland (country-wide), never a specific city.`;

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_businesses',
      description:
        'Search live OpenBook businesses by a keyword (category or name) and optional city. Returns up to 8 matches. If a city is passed and there are zero matches for that city, the tool retries without the city and flags fallback=\'city_no_coverage\' on the response.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Category or keyword. Canonical values that map cleanly to OpenBook categories: "personal trainer", "physiotherapist", "gym", "sauna", "yoga", "barber", "salon", "nails", "massage". This is a GUIDE, not a whitelist — if a user\'s intent maps cleanly to one of these, use it; if it\'s novel ("rock climbing gym", "acupuncture"), pass the user\'s own words and the server will attempt synonym expansion.',
          },
          city: {
            type: 'string',
            description:
              'Optional city name, e.g. "Cork", "Dublin". Only pass if the user explicitly mentioned a city. Do not infer.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
];

// ===========================================================================
// Search
// ===========================================================================

export interface BusinessSearchResult {
  slug: string;
  name: string;
  category: string;
  city: string | null;
  primary_colour: string | null;
  rating: number | null;
  cover_image_url: string | null;
  description: string | null;
}

export interface SearchResponse {
  results: BusinessSearchResult[];
  fallback?: 'city_no_coverage';
  requestedCity?: string;
  error?: string;
}

/** Build the OR expression for PostgREST from a list of substring terms. */
function buildOrClause(terms: string[]): string {
  const clauses: string[] = [];
  for (const term of terms) {
    const safe = escapeForOr(term);
    clauses.push(`name.ilike.%${safe}%`);
    clauses.push(`category.ilike.%${safe}%`);
    clauses.push(`description.ilike.%${safe}%`);
  }
  return clauses.join(',');
}

async function runSingleSearch(
  args: { query: string; city?: string },
): Promise<BusinessSearchResult[]> {
  const sb = supabaseAdmin();
  const terms = expandQuery(args.query);

  let q = sb
    .from('businesses')
    .select(
      'slug, name, category, city, primary_colour, rating, cover_image_url, description',
    )
    .eq('is_live', true)
    .limit(8);

  if (terms.length > 0) {
    q = q.or(buildOrClause(terms));
  }
  if (args.city) {
    q = q.ilike('city', `%${args.city}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error('[api/assistant] supabase error', { query: args.query, city: args.city, error: error.message });
    return [];
  }
  return (data ?? []) as BusinessSearchResult[];
}

async function runToolSearch(
  args: { query: string; city?: string },
): Promise<SearchResponse> {
  const firstPass = await runSingleSearch(args);

  if (firstPass.length === 0 && args.city) {
    // City filter came back empty — retry without city, flag the fallback so
    // the model can acknowledge the coverage gap rather than say "no results".
    const broader = await runSingleSearch({ query: args.query });
    if (broader.length > 0) {
      return {
        results: broader,
        fallback: 'city_no_coverage',
        requestedCity: args.city,
      };
    }
    return { results: [] };
  }

  return { results: firstPass };
}

// ===========================================================================
// Route
// ===========================================================================

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 });
    }

    if (!hasOpenAI()) {
      // Free / manual deploy without OpenAI configured. Return a friendly
      // fallback so the consumer assistant UI degrades cleanly instead of
      // throwing a 500.
      return NextResponse.json({
        reply:
          'The assistant is taking a break right now — try browsing the businesses on the home tab.',
        businesses: [],
      });
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
