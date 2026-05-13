/**
 * Shared CRON_SECRET guard for /api/internal/* endpoints. Returns null
 * on success; returns a NextResponse on failure that the route handler
 * should return immediately.
 *
 * The secret is stored in Supabase Vault (the pg_cron drain reads it
 * from there) AND in CRON_SECRET on the Vercel side; both must match.
 * 503 when unconfigured, 401 on mismatch.
 */

import { NextRequest, NextResponse } from 'next/server';

export function checkInternalAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron_secret_unconfigured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}
