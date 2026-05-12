/**
 * POST /api/internal/test-push
 * Body: { customerId: string }
 *
 * Verification-only endpoint used by Phase 7 of PR 4a's rollout. Sends
 * a test push to every active device token registered to the given
 * customer. Gated by CRON_SECRET so the public internet can't fire
 * pushes at arbitrary customers.
 *
 * Path uses `internal/` (no leading underscore) because Next.js treats
 * `_`-prefixed folders as private and excludes them from the router.
 *
 * Diagnostic only — remove or repurpose once PR 4b's real dispatcher
 * ships and the pipeline has live coverage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendPush } from '@/lib/push';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron_secret_unconfigured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let customerId: string | undefined;
  try {
    const body = await req.json();
    customerId = typeof body?.customerId === 'string' ? body.customerId : undefined;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!customerId) {
    return NextResponse.json({ error: 'customerId_required' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: tokens, error } = await sb
    .from('push_device_tokens')
    .select('token, platform')
    .eq('customer_id', customerId)
    .eq('is_active', true);

  if (error) {
    console.error('[test-push] token lookup failed', error);
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ error: 'no_active_tokens' }, { status: 404 });
  }

  const results = await Promise.all(
    tokens.map((t) =>
      sendPush(
        customerId!,
        t.token as string,
        {
          title: 'OpenBook test push',
          body: 'If you see this, the pipeline works.',
          data: { test: 'true' },
        },
        'test',
      ),
    ),
  );

  return NextResponse.json({
    sent: results.length,
    successes: results.filter((r) => r.success).length,
    failures: results.filter((r) => !r.success).map((r) => r.error),
  });
}
