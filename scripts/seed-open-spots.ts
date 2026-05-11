#!/usr/bin/env tsx
/**
 * Seed realistic Open Spots flash sales against existing Cork
 * test businesses. Idempotent — safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/seed-open-spots.ts          (live data)
 *   npx tsx scripts/seed-open-spots.ts --clear  (clears seeded rows first)
 *   npx tsx scripts/seed-open-spots.ts --dry    (print, don't write)
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Identifies rows seeded by this script so --clear can find them.
const SEED_TAG = 'seed:open-spots-v1';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');
const CLEAR = args.has('--clear');

type SeedPlanItem = {
  business_id: string;
  business_name: string;
  service_id: string;
  duration_minutes: number;
  original_price_cents: number;
  sale_price_cents: number;
  discount_percent: number;
  slot_offset_hours: number;
  expires_offset_minutes: number;
  max_bookings: number;
  bookings_taken: number;
  source: 'planned' | 'cancellation_fill' | 'weather_triggered';
};

async function main(): Promise<void> {
  if (CLEAR) {
    const { error, count } = await sb
      .from('flash_sales')
      .delete({ count: 'exact' })
      .like('message', `%${SEED_TAG}%`);
    if (error) throw error;
    console.log(`Cleared ${count ?? 0} previously seeded flash_sales rows.`);
    return;
  }

  const targetSlugs = [
    'evolv-performance',
    'saltwater-sauna-cork',
    'the-nail-studio',
    'refresh-barber',
    'cork-physio-sports',
    'yoga-flow-cork',
  ];

  const { data: businesses, error: bizErr } = await sb
    .from('businesses')
    .select('id, slug, name, primary_colour, city')
    .in('slug', targetSlugs);

  if (bizErr) throw bizErr;
  if (!businesses || businesses.length === 0) {
    console.error('No matching businesses found. Aborting.');
    process.exit(1);
  }

  const seedPlan: SeedPlanItem[] = [];

  for (const biz of businesses) {
    const { data: svcRows } = await sb
      .from('services')
      .select('id, name, duration_minutes, price_cents')
      .eq('business_id', biz.id)
      .eq('is_active', true)
      .gt('price_cents', 0)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
      .limit(1);

    const svc = svcRows?.[0];
    if (!svc) {
      console.log(`Skipping ${biz.name} — no priced active services.`);
      continue;
    }

    const base = {
      business_id: biz.id,
      business_name: biz.name,
      service_id: svc.id,
      duration_minutes: svc.duration_minutes ?? 60,
      original_price_cents: svc.price_cents,
    };

    // Tier 1 — Just opened (within 4h, cancellation_fill source)
    if (biz.slug === 'evolv-performance' || biz.slug === 'refresh-barber') {
      const sale = Math.round(svc.price_cents * 0.55);
      seedPlan.push({
        ...base,
        sale_price_cents: sale,
        discount_percent: Math.round((1 - sale / svc.price_cents) * 100),
        slot_offset_hours: biz.slug === 'evolv-performance' ? 2.5 : 3.5,
        expires_offset_minutes: biz.slug === 'evolv-performance' ? 90 : 150,
        max_bookings: 1,
        bookings_taken: 0,
        source: 'cancellation_fill',
      });
    }

    // Tier 2 — Limited (within 24h, planned source)
    if (biz.slug === 'saltwater-sauna-cork') {
      const sale = Math.round(svc.price_cents * 0.50);
      seedPlan.push({
        ...base,
        sale_price_cents: sale,
        discount_percent: Math.round((1 - sale / svc.price_cents) * 100),
        slot_offset_hours: 18,
        expires_offset_minutes: 17 * 60,
        max_bookings: 4,
        bookings_taken: 1,
        source: 'planned',
      });
    }
    if (biz.slug === 'the-nail-studio') {
      const sale = Math.round(svc.price_cents * 0.60);
      seedPlan.push({
        ...base,
        sale_price_cents: sale,
        discount_percent: Math.round((1 - sale / svc.price_cents) * 100),
        slot_offset_hours: 20,
        expires_offset_minutes: 19 * 60,
        max_bookings: 1,
        bookings_taken: 0,
        source: 'planned',
      });
    }
    if (biz.slug === 'yoga-flow-cork') {
      const sale = Math.round(svc.price_cents * 0.50);
      seedPlan.push({
        ...base,
        sale_price_cents: sale,
        discount_percent: Math.round((1 - sale / svc.price_cents) * 100),
        slot_offset_hours: 22,
        expires_offset_minutes: 21 * 60,
        max_bookings: 3,
        bookings_taken: 2,
        source: 'planned',
      });
    }

    // Tier 3 — No badge (24h+, planned source)
    if (biz.slug === 'cork-physio-sports' || biz.slug === 'evolv-performance') {
      const sale = Math.round(svc.price_cents * 0.55);
      seedPlan.push({
        ...base,
        sale_price_cents: sale,
        discount_percent: Math.round((1 - sale / svc.price_cents) * 100),
        slot_offset_hours: biz.slug === 'cork-physio-sports' ? 48 : 72,
        expires_offset_minutes: biz.slug === 'cork-physio-sports' ? 47 * 60 : 71 * 60,
        max_bookings: 1,
        bookings_taken: 0,
        source: 'planned',
      });
    }
    if (biz.slug === 'refresh-barber') {
      const sale = Math.round(svc.price_cents * 0.55);
      seedPlan.push({
        ...base,
        sale_price_cents: sale,
        discount_percent: Math.round((1 - sale / svc.price_cents) * 100),
        slot_offset_hours: 96,
        expires_offset_minutes: 95 * 60,
        max_bookings: 1,
        bookings_taken: 0,
        source: 'planned',
      });
    }
  }

  console.log(`\nSeed plan: ${seedPlan.length} flash sales across ${businesses.length} businesses.`);
  seedPlan.forEach((p, i) => {
    const eur = (c: number) => `€${(c / 100).toFixed(2).replace(/\.00$/, '')}`;
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${p.business_name.padEnd(24)} ` +
      `${eur(p.sale_price_cents)} (was ${eur(p.original_price_cents)}) ` +
      `· +${p.slot_offset_hours}h · cap ${p.bookings_taken}/${p.max_bookings} · ${p.source}`
    );
  });

  if (DRY) {
    console.log('\n--dry mode — no writes performed.');
    return;
  }

  await sb
    .from('flash_sales')
    .delete()
    .like('message', `%${SEED_TAG}%`);

  const now = Date.now();
  const rows = seedPlan.map((p) => ({
    business_id: p.business_id,
    service_id: p.service_id,
    original_price_cents: p.original_price_cents,
    sale_price_cents: p.sale_price_cents,
    discount_percent: p.discount_percent,
    slot_time: new Date(now + p.slot_offset_hours * 3600 * 1000).toISOString(),
    expires_at: new Date(now + p.expires_offset_minutes * 60 * 1000).toISOString(),
    max_bookings: p.max_bookings,
    bookings_taken: p.bookings_taken,
    status: 'active' as const,
    duration_minutes: p.duration_minutes,
    source: p.source,
    message: `${SEED_TAG} — ${p.business_name} ${p.source} seed`,
  }));

  const { error: insErr, count } = await sb
    .from('flash_sales')
    .insert(rows, { count: 'exact' });

  if (insErr) throw insErr;
  console.log(`\nInserted ${count ?? rows.length} flash sales. Done.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
