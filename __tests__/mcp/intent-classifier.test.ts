import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cache mocks — overridable per test.
const getCachedMock = vi.fn(async (_key: string) => null as unknown);
const setCachedMock = vi.fn(async (_key: string, _v: unknown) => undefined);

vi.mock('../../lib/mcp/intent-classifier-cache', async () => {
  const real = await vi.importActual<typeof import('../../lib/mcp/intent-classifier-cache')>(
    '../../lib/mcp/intent-classifier-cache',
  );
  return {
    computeCacheKey: real.computeCacheKey,
    getCachedClassification: (...args: unknown[]) => getCachedMock(args[0] as string),
    setCachedClassification: (...args: unknown[]) =>
      setCachedMock(args[0] as string, args[1]),
  };
});

// OpenAI client mock.
const createMock = vi.fn();
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: (...args: unknown[]) => createMock(...args) } };
  },
}));

const successResponse = (payload: unknown) => ({
  choices: [{ message: { content: JSON.stringify(payload) } }],
});

const {
  classifyIntent,
  FALLBACK_CLASSIFICATION,
} = await import('../../lib/mcp/intent-classifier');
const { computeCacheKey } = await import('../../lib/mcp/intent-classifier-cache');

beforeEach(() => {
  getCachedMock.mockReset();
  setCachedMock.mockReset();
  createMock.mockReset();
  getCachedMock.mockResolvedValue(null);
  setCachedMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('classifyIntent', () => {
  it('returns structured classification for a clear intent', async () => {
    createMock.mockResolvedValue(
      successResponse({
        category: 'personal_training',
        subcategories: ['strength_conditioning'],
        vibe: ['focused', 'results_oriented'],
        price_tier: 'mid',
        duration_preference_minutes: null,
        constraint_keywords: [],
        confidence: 0.91,
      }),
    );

    const result = await classifyIntent({ intent: 'personal trainer in Dublin' });
    expect(result.category).toBe('personal_training');
    expect(result.confidence).toBeCloseTo(0.91);
    expect(result.subcategories).toEqual(['strength_conditioning']);
  });

  it('falls back to category=other on OpenAI error and does not cache', async () => {
    createMock.mockRejectedValue(new Error('upstream 500'));
    const result = await classifyIntent({ intent: 'something' });
    expect(result).toEqual(FALLBACK_CLASSIFICATION);
    expect(setCachedMock).not.toHaveBeenCalled();
  });

  it('falls back when the OpenAI call exceeds the 3s timeout', async () => {
    // The handler aborts via AbortController on timeout. The simplest way to
    // exercise that branch is to make the OpenAI mock honour the signal and
    // reject when aborted — that's what the real SDK does.
    createMock.mockImplementation((_args: unknown, opts: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    vi.useFakeTimers();
    const promise = classifyIntent({ intent: 'tap dancing in dingle' });
    await vi.advanceTimersByTimeAsync(3500);
    const result = await promise;
    expect(result).toEqual(FALLBACK_CLASSIFICATION);
    expect(setCachedMock).not.toHaveBeenCalled();
  });

  it('returns the cached value without calling OpenAI on cache hit', async () => {
    const cached = {
      category: 'yoga',
      subcategories: [],
      vibe: ['relaxing'],
      price_tier: null,
      duration_preference_minutes: null,
      constraint_keywords: [],
      confidence: 0.85,
    };
    getCachedMock.mockResolvedValue(cached);

    const result = await classifyIntent({ intent: 'yoga' });
    expect(result).toEqual(cached);
    expect(createMock).not.toHaveBeenCalled();
    expect(setCachedMock).not.toHaveBeenCalled();
  });

  it('writes to cache on cache miss with successful classification', async () => {
    createMock.mockResolvedValue(
      successResponse({
        category: 'massage',
        subcategories: ['deep_tissue'],
        vibe: ['relaxing'],
        price_tier: null,
        duration_preference_minutes: null,
        constraint_keywords: [],
        confidence: 0.8,
      }),
    );
    await classifyIntent({ intent: 'deep tissue massage' });
    expect(createMock).toHaveBeenCalledOnce();
    // setCachedClassification fires fire-and-forget; let microtasks settle.
    await Promise.resolve();
    expect(setCachedMock).toHaveBeenCalledOnce();
  });

  it('does NOT cache when classification fails (cache miss + OpenAI error)', async () => {
    createMock.mockRejectedValue(new Error('500'));
    const result = await classifyIntent({ intent: 'whatever' });
    expect(result).toEqual(FALLBACK_CLASSIFICATION);
    expect(setCachedMock).not.toHaveBeenCalled();
  });

  it('fuses customer_context into the user message sent to OpenAI', async () => {
    createMock.mockResolvedValue(
      successResponse({
        category: 'yoga',
        subcategories: ['gentle'],
        vibe: ['relaxing'],
        price_tier: null,
        duration_preference_minutes: null,
        constraint_keywords: ['injury_friendly'],
        confidence: 0.7,
      }),
    );
    await classifyIntent({
      intent: 'yoga class',
      customer_context: { constraints: ['recovering hamstring'], mood_or_vibe: 'gentle' },
    });
    const call = createMock.mock.calls[0];
    const messages = (call[0] as { messages: Array<{ role: string; content: string }> }).messages;
    const userMsg = messages.find((m) => m.role === 'user')!;
    expect(userMsg.content).toContain('recovering hamstring');
    expect(userMsg.content).toContain('gentle');
  });

  it('passes through constraint_keywords from the model output', async () => {
    createMock.mockResolvedValue(
      successResponse({
        category: 'pilates',
        subcategories: [],
        vibe: [],
        price_tier: null,
        duration_preference_minutes: null,
        constraint_keywords: ['injury_friendly'],
        confidence: 0.75,
      }),
    );
    const result = await classifyIntent({
      intent: 'pilates',
      customer_context: { constraints: ['herniated disc'] },
    });
    expect(result.constraint_keywords).toContain('injury_friendly');
  });
});

describe('computeCacheKey', () => {
  it('is stable across key ordering of customer_context', async () => {
    const a = computeCacheKey({
      intent: 'pt',
      customer_context: { preferences: ['strength'], constraints: ['knee'] },
    });
    const b = computeCacheKey({
      intent: 'pt',
      customer_context: { constraints: ['knee'], preferences: ['strength'] },
    });
    expect(a).toBe(b);
  });

  it('distinguishes different intents and different contexts', async () => {
    const k1 = computeCacheKey({ intent: 'pt' });
    const k2 = computeCacheKey({ intent: 'yoga' });
    const k3 = computeCacheKey({ intent: 'pt', customer_context: { preferences: ['x'] } });
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k2).not.toBe(k3);
  });
});
