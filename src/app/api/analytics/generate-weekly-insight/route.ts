import { NextResponse } from 'next/server';
import { generateWeeklyInsight } from '@/lib/ai/generateWeeklyInsight';
import { createServiceRoleClient } from '@/lib/ai/serviceRoleClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron-triggered endpoint: generates a weekly GPT-4o insight per business.
 *
 *   curl -X POST /api/analytics/generate-weekly-insight \
 *     -H "Authorization: Bearer $ANALYTICS_CRON_SECRET"
 *
 * In dev, a single business can be targeted via `?business_id=<uuid>` so
 * the demo button can trigger a one-off generation without waiting for Monday.
 */
export async function POST(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const token = authz.toLowerCase().startsWith('bearer ')
    ? authz.slice(7).trim()
    : '';
  const expected = process.env.ANALYTICS_CRON_SECRET;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const businessId = url.searchParams.get('business_id');
  const supabase = createServiceRoleClient();

  let businessIds: string[] = [];
  if (businessId) {
    businessIds = [businessId];
  } else {
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('is_live', true);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    businessIds = (data ?? []).map((b) => b.id);
  }

  const results: Array<{ business_id: string; status: string }> = [];
  for (const id of businessIds) {
    try {
      const insight = await generateWeeklyInsight(id);
      results.push({
        business_id: id,
        status: insight ? 'generated' : 'skipped',
      });
    } catch (err) {
      results.push({
        business_id: id,
        status: err instanceof Error ? `error:${err.message}` : 'error',
      });
    }
  }

  return NextResponse.json({ results });
}
