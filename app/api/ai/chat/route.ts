import { NextRequest } from 'next/server';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { runAgentSSE, type AgentContext } from '@/lib/ai/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/chat
 *
 * Server-Sent Events stream powering the consumer AI booking
 * assistant. The client never sends a customer_id — the route
 * resolves it from the Supabase session via the auth_customer_id()
 * RPC. Anonymous users can chat (read tools work) but write tools
 * surface a `requires_auth` event to the UI.
 *
 * See lib/ai/agent.ts for the OpenAI loop and lib/ai/tools.ts
 * for tool definitions and server-side dispatch.
 */

const REQUIRED_ENV = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const;

let envChecked = false;
function checkEnvOnce() {
  if (envChecked) return;
  envChecked = true;
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('[ai/chat] missing env vars:', missing.join(', '));
  }
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

const ANON_LIMIT_PER_HOUR = 10;
const AUTH_LIMIT_PER_HOUR = 30;

// In-memory anon counter — resets per serverless instance. See README note;
// upgrade to a shared store once the AI tab is in real production load.
const anonCounter = new Map<string, { count: number; resetAt: number }>();

function tickAnonLimit(ipKey: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const cur = anonCounter.get(ipKey);
  if (!cur || cur.resetAt < now) {
    anonCounter.set(ipKey, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { ok: true, remaining: ANON_LIMIT_PER_HOUR - 1 };
  }
  cur.count += 1;
  return {
    ok: cur.count <= ANON_LIMIT_PER_HOUR,
    remaining: Math.max(0, ANON_LIMIT_PER_HOUR - cur.count),
  };
}

async function authedRateOk(
  customerId: string,
  admin: ReturnType<typeof supabaseAdmin>
): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('ai_tool_calls')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .gte('created_at', since);
  return (count ?? 0) < AUTH_LIMIT_PER_HOUR;
}

// ---------------------------------------------------------------------------

function sseError(code: string, message: string): Response {
  const body =
    `event: error\ndata: ${JSON.stringify({ code, message })}\n\n` +
    `event: done\ndata: {}\n\n`;
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}

function getOrigin(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? 'app.openbook.ie';
  return `${proto}://${host}`;
}

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  checkEnvOnce();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return sseError('bad_request', 'Invalid JSON body.');
  }
  const incoming: unknown = body?.messages;
  const conversationId: string | null =
    typeof body?.conversation_id === 'string' ? body.conversation_id : null;

  if (!Array.isArray(incoming) || incoming.length === 0) {
    return sseError('bad_request', 'messages[] is required.');
  }

  // Pass through only the role/content shape the OpenAI SDK accepts.
  const messages: ChatCompletionMessageParam[] = (incoming as any[])
    .filter(
      (m) =>
        m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant' || m.role === 'tool')
    )
    .map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: String(m.tool_call_id ?? ''),
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        } as ChatCompletionMessageParam;
      }
      return {
        role: m.role,
        content: typeof m.content === 'string' ? m.content : '',
      } as ChatCompletionMessageParam;
    });

  // Resolve auth from the Supabase session. Cookies are read from the
  // request — see lib/supabase-server.ts for the cookie wiring.
  const userClient = createSupabaseServerClient();
  const admin = supabaseAdmin();

  let customerId: string | null = null;
  try {
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user) {
      const { data: row } = await userClient.rpc('auth_customer_id');
      if (typeof row === 'string') customerId = row;
    }
  } catch (err) {
    console.error('[ai/chat] auth resolve failed:', err);
  }

  // Rate limiting.
  if (customerId) {
    const ok = await authedRateOk(customerId, admin);
    if (!ok) {
      return sseError(
        'rate_limited',
        'You have hit the hourly chat limit. Try again later.'
      );
    }
  } else {
    const { ok } = tickAnonLimit(clientKey(req));
    if (!ok) {
      return sseError(
        'rate_limited',
        'Hourly limit reached. Sign in for a higher limit.'
      );
    }
  }

  const ctx: AgentContext = {
    userClient,
    adminClient: admin,
    customerId,
    origin: getOrigin(req),
    cookieHeader: req.headers.get('cookie') ?? '',
    conversationId,
  };

  const stream = runAgentSSE(messages, ctx);

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
