import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireCurrentBusiness } from '@/lib/queries/business';
import {
  cacheKey,
  isInCooldown,
  readCache,
  stampCooldown,
  writeCache,
} from '@/lib/ai/suggest-reply-cache';
import { summariseBusinessHours } from '@/lib/ai/business-hours-summary';

export const dynamic = 'force-dynamic';

const OPENAI_TIMEOUT_MS = 7_000;
const MODEL = 'gpt-4o-mini';

/**
 * POST /api/ai/suggest-reply
 *
 * Generates 2–3 reply suggestions for a dashboard-open conversation.
 * Invoked by the AISuggestionChips client component whenever:
 *   - The owner opens a conversation whose last message is inbound
 *   - AND that inbound is less than 24 hours old (client enforces)
 *
 * Security order matters:
 *   1. Resolve the owner + business via requireCurrentBusiness
 *   2. Load the conversation and verify business_id ownership
 *   3. ONLY THEN hit OpenAI
 *
 * Every failure path returns 200 with `{ chips: [] }` so the client
 * silently hides — except ownership mismatch, which 404s (distinct
 * from "no suggestions available"). The UI treats any non-array or
 * empty response as "hide the chips".
 */
interface SuggestReplyBody {
  conversationId: string;
}

interface BusinessShape {
  id: string;
  name: string;
  description: string | null;
  category: string;
  services:
    | Array<{
        name: string | null;
        price_cents: number | null;
        duration_minutes: number | null;
      }>
    | null;
  business_hours:
    | Array<{
        day_of_week: number;
        open_time: string | null;
        close_time: string | null;
        is_closed: boolean | null;
        is_open: boolean | null;
      }>
    | null;
}

interface MessageRow {
  id: string;
  direction: string;
  body: string;
  created_at: string | null;
}

export async function POST(req: NextRequest) {
  let body: SuggestReplyBody;
  try {
    body = (await req.json()) as SuggestReplyBody;
  } catch {
    return NextResponse.json({ chips: [] });
  }
  if (!body?.conversationId) {
    return NextResponse.json({ chips: [] });
  }

  // 1. Owner + business (redirects if unauthed — same contract as
  //    the Messages actions).
  const { sb, business } = await requireCurrentBusiness<BusinessShape>(
    'id, name, description, category, services(name, price_cents, duration_minutes), business_hours(day_of_week, open_time, close_time, is_closed, is_open)',
  );

  // 2. Ownership check BEFORE any AI call.
  const { data: convRaw } = await sb
    .from('whatsapp_conversations')
    .select('id, business_id')
    .eq('id', body.conversationId)
    .maybeSingle();

  const conv = convRaw as { id: string; business_id: string } | null;
  if (!conv || conv.business_id !== business.id) {
    // 404 rather than leaking existence or silently returning empty —
    // an owner trying to suggest-reply for a conversation they don't
    // own is a security-interesting event.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 3. Load recent messages; pick last inbound id for the cache key
  //    and count inbound messages for chip-count logic.
  const { data: msgsData } = await sb
    .from('whatsapp_messages')
    .select('id, direction, body, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const messagesDesc = (msgsData ?? []) as unknown as MessageRow[];
  const inbound = messagesDesc.filter((m) => m.direction === 'inbound');
  const lastInbound = inbound[0];
  if (!lastInbound) {
    return NextResponse.json({ chips: [] });
  }

  const chipCount = inbound.length < 3 ? 2 : 3;

  // 4. Cache hit? Return immediately.
  const cached = readCache(conv.id, lastInbound.id);
  if (cached) {
    return NextResponse.json({ chips: cached });
  }

  // 5. Per-conversation cooldown — survive tight client loops.
  if (isInCooldown(conv.id)) {
    return NextResponse.json({ chips: [] });
  }
  stampCooldown(conv.id);

  // 6. Generate. Any failure path returns empty chips; the UI hides.
  const chips = await generateSuggestions({
    business,
    messagesDesc,
    chipCount,
    cacheLabel: cacheKey(conv.id, lastInbound.id),
  });

  if (chips.length > 0) {
    writeCache(conv.id, lastInbound.id, chips);
  }

  return NextResponse.json({ chips });
}

async function generateSuggestions(input: {
  business: BusinessShape;
  messagesDesc: MessageRow[];
  chipCount: number;
  cacheLabel: string;
}): Promise<string[]> {
  const { business, messagesDesc, chipCount, cacheLabel } = input;

  const servicesLine =
    business.services && business.services.length > 0
      ? business.services
          .slice(0, 12)
          .map((s) => `${s.name ?? '—'} (€${((s.price_cents ?? 0) / 100).toFixed(0)})`)
          .join(', ')
      : 'No services listed';

  const hoursLine = summariseBusinessHours(business.business_hours);

  // Today's date, IE locale, so relative references ("tomorrow", "next
  // week") anchor correctly.
  const today = new Date().toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const tone =
    business.description?.trim() ||
    `Friendly, direct, concise — match how ${business.name} would speak to a local customer.`;

  const systemPrompt = `You are helping the owner of ${business.name} (a ${business.category} business) draft quick WhatsApp replies to a customer.

Today is ${today}.
Business hours: ${hoursLine}.
Services: ${servicesLine}.

Owner's tone: ${tone}

Write ${chipCount} different short reply options the owner could send, given the conversation so far. Rules:
- Each reply is one sentence, 120 characters or fewer.
- Plain human sentences. No emojis unless the customer has used them first.
- Prefer concrete, specific replies over generic acknowledgements ("Thanks for reaching out").
- Do NOT invent availability, prices, or staff names that aren't already in the conversation or the context above.
- If availability is genuinely unknown, offer to check rather than guess.
- Vary the options — don't give three paraphrases of the same reply.

Return ONLY a JSON array of ${chipCount} strings, nothing else. Example format: ["Reply 1", "Reply 2", "Reply 3"]`;

  // Oldest → newest for the chat log.
  const history = messagesDesc.slice(0, 8).reverse();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.body,
    })),
  ];

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create(
      {
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 320,
        response_format: { type: 'json_object' },
      },
      { timeout: OPENAI_TIMEOUT_MS },
    );

    const raw = completion.choices?.[0]?.message?.content ?? '';
    return parseSuggestions(raw, chipCount);
  } catch (error) {
    console.error({
      tag: 'suggest_reply_openai_error',
      cache_label: cacheLabel,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Accept either a raw JSON array (legacy prompt response) or a JSON
 * object with a string-array field (since we forced response_format =
 * json_object, OpenAI always returns an object). Validate every step
 * so a malformed response degrades to an empty list rather than
 * crashing the route.
 */
function parseSuggestions(raw: string, chipCount: number): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  let arr: unknown[] | null = null;
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // Accept any single array-valued property — the model tends to
    // use keys like `replies`, `suggestions`, or `options` despite
    // prompting for bare arrays.
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        arr = value;
        break;
      }
    }
  }

  if (!arr) return [];

  const strings = arr
    .filter((v): v is string => typeof v === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 200);

  return strings.slice(0, chipCount);
}
