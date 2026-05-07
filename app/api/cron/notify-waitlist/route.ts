// Vercel Cron entrypoint for waitlist notifications.
//
// As of PR #N this is a thin auth-and-delegate wrapper around the shared
// processor in lib/mcp/process-waitlist-notifications.ts. The same
// processor is also fired (with a smaller batch) inline at the end of
// /api/mcp/tools/get_availability so the queue keeps draining even when
// the project is on Vercel Hobby (which forbids per-minute crons). When
// the project upgrades to Vercel Pro, re-add the entry to vercel.json:
//
//   "crons": [
//     { "path": "/api/cron/notify-waitlist", "schedule": "* * * * *" }
//   ]
//
// The endpoint stays in place because:
//   - it's the more reliable drain path (every minute, regardless of
//     traffic) once Pro is enabled
//   - it can also be invoked manually with the right bearer for ops
//     scenarios (drain a backlog after a maintenance window)

import { NextRequest, NextResponse } from 'next/server';
import { processWaitlistNotifications } from '@/lib/mcp/process-waitlist-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 50;

function isAuthorisedCron(req: NextRequest): boolean {
  const expected = process.env.VERCEL_CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization');
  return header === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  return runCron(req);
}
export async function POST(req: NextRequest) {
  return runCron(req);
}

async function runCron(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorisedCron(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const summary = await processWaitlistNotifications({ limit: BATCH_SIZE });
  return NextResponse.json(summary);
}
