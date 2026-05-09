// MCP intent classifier — turns free-text intent + customer_context into
// structured signals the ranker can match against.
// Spec: docs/mcp-server-spec.md section 9.

import OpenAI from 'openai';
import {
  computeCacheKey,
  getCachedClassification,
  setCachedClassification,
} from './intent-classifier-cache';

export const CANONICAL_CATEGORIES = [
  'personal_training',
  'gym',
  'yoga',
  'pilates',
  'crossfit',
  'martial_arts',
  'dance',
  'spa',
  'sauna',
  'massage',
  'beauty',
  'nails',
  'hair',
  'barber',
  'physio',
  'chiropractor',
  'osteopath',
  'counselling',
  'driving_lessons',
  'cooking_class',
  'pottery',
  'art_class',
  'comedy',
  'live_music',
  'experience',
  'other',
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

export type IntentClassification = {
  category: string;
  subcategories: string[];
  vibe: string[];
  price_tier: 'low' | 'mid' | 'high' | null;
  duration_preference_minutes: number | null;
  constraint_keywords: string[];
  confidence: number;
};

export type CustomerContext = {
  preferences?: string[];
  constraints?: string[];
  party_size?: number;
  mood_or_vibe?: string;
  prior_experience?: string;
};

const MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 3000;

export const SYSTEM_PROMPT = `You are an intent classifier for an Irish local-services booking platform (gyms, salons, spas, classes, experiences).

Given the user's free-text intent and any structured \`customer_context\` provided, return a single JSON object that matches the schema. Treat the \`customer_context\` block as authoritative ground truth: preferences and constraints from it are higher signal than the intent text.

Rules:
- \`category\` MUST be one of the canonical categories listed below. If nothing fits, return "other" with low confidence. Do not invent categories.
  Canonical: ${CANONICAL_CATEGORIES.join(', ')}.
- \`subcategories\` are short snake_case tags drawn from the intent (e.g. "strength_conditioning", "deep_tissue", "vinyasa", "wedding"). 0–4 items.
- \`vibe\` is short snake_case tags describing the feel the user wants (e.g. "focused", "relaxing", "energetic", "social", "low_key"). 0–4 items.
- \`price_tier\` is "low" for cheap/budget/affordable signals, "high" for premium/luxury/high-end signals, "mid" only when explicitly mid-tier, otherwise null.
- \`duration_preference_minutes\` is a numeric duration only when the user explicitly states one ("a quick 30-minute session"). Otherwise null.
- \`constraint_keywords\` are short normalised tags like "injury_friendly", "low_impact", "wheelchair_accessible", "kids_welcome", "vegan", "beginner_friendly", "pregnancy_safe". Extract aggressively from BOTH the intent and \`customer_context.constraints\`. 0–8 items.
- \`confidence\` is your self-rated confidence in the category match, between 0 and 1.

Return only the JSON object — no prose, no markdown.`;

const RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'intent_classification',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        category: { type: 'string', enum: [...CANONICAL_CATEGORIES] },
        subcategories: { type: 'array', items: { type: 'string' } },
        vibe: { type: 'array', items: { type: 'string' } },
        price_tier: { type: ['string', 'null'], enum: ['low', 'mid', 'high', null] },
        duration_preference_minutes: { type: ['integer', 'null'] },
        constraint_keywords: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: [
        'category',
        'subcategories',
        'vibe',
        'price_tier',
        'duration_preference_minutes',
        'constraint_keywords',
        'confidence',
      ],
    },
  },
};

export const FALLBACK_CLASSIFICATION: IntentClassification = {
  category: 'other',
  subcategories: [],
  vibe: [],
  price_tier: null,
  duration_preference_minutes: null,
  constraint_keywords: [],
  confidence: 0,
};

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

function buildUserMessage(args: {
  intent: string;
  customer_context?: CustomerContext;
}): string {
  const lines: string[] = [];
  if (args.customer_context) {
    lines.push('customer_context:');
    lines.push(JSON.stringify(args.customer_context, null, 2));
    lines.push('');
  }
  lines.push(`intent: ${args.intent.trim()}`);
  return lines.join('\n');
}

async function callOpenAi(args: {
  intent: string;
  customer_context?: CustomerContext;
}): Promise<IntentClassification> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const completion = await openai().chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(args) },
        ],
        response_format: RESPONSE_FORMAT,
        temperature: 0,
      },
      { signal: controller.signal },
    );

    const raw = completion.choices?.[0]?.message?.content;
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new Error('classifier: empty response');
    }
    const parsed = JSON.parse(raw) as Partial<IntentClassification>;
    if (
      typeof parsed.category !== 'string' ||
      !Array.isArray(parsed.subcategories) ||
      !Array.isArray(parsed.vibe) ||
      !Array.isArray(parsed.constraint_keywords) ||
      typeof parsed.confidence !== 'number'
    ) {
      throw new Error('classifier: malformed JSON shape');
    }
    return parsed as IntentClassification;
  } finally {
    clearTimeout(timer);
  }
}

export async function classifyIntent(args: {
  intent: string;
  customer_context?: CustomerContext;
}): Promise<IntentClassification> {
  const cacheKey = computeCacheKey(args);

  const cached = await getCachedClassification(cacheKey);
  if (cached) return cached;

  try {
    const classification = await callOpenAi(args);
    void setCachedClassification(cacheKey, classification);
    return classification;
  } catch (err) {
    const detail =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : { value: err };
    console.error('[mcp.intent-classifier] failing to fallback:', {
      intent: args.intent,
      has_customer_context: Boolean(args.customer_context),
      ...detail,
    });
    return FALLBACK_CLASSIFICATION;
  }
}
