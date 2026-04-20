/* eslint-disable no-console */
/**
 * Seeds 90 days of realistic analytics demo data for one business.
 *
 *   OPENBOOK_DEMO_BUSINESS_SLUG=evolv-performance npm run seed:analytics
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * The script is idempotent per run — it wipes bookings / customers /
 * customer_businesses / reviews for the target business, then regenerates.
 * Services are preserved; if none exist, a small starter set is created.
 */

import { createClient } from '@supabase/supabase-js';
import type { BookingStatus } from '../src/types/database';

const DAY = 24 * 60 * 60 * 1000;

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var ${name}`);
    process.exit(1);
  }
  return v;
}

const supabase = createClient(
  env('NEXT_PUBLIC_SUPABASE_URL'),
  env('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const DEMO_SLUG = process.env.OPENBOOK_DEMO_BUSINESS_SLUG ?? 'evolv-performance';

const CUSTOMER_NAMES = [
  'Aoife Murphy', "Cillian O'Brien", 'Niamh Ryan', 'Tadhg Sheridan', 'Síofra Kelly',
  'Oisín Walsh', 'Saoirse Doyle', 'Eoghan Byrne', 'Aisling Nolan', 'Darragh Lynch',
  'Ciara Hayes', 'Fionn Quinn', 'Clodagh Sweeney', 'Ruairí Ó Súilleabháin', 'Méabh Power',
  'Séan McCarthy', 'Órla Fitzpatrick', 'Dáithí Cullen', 'Caoimhe Maguire', 'Pádraig Daly',
  'Roisín Carroll', 'Fiachra Kenny', 'Bríd Gallagher', 'Conor Brennan', 'Muireann Kavanagh',
  'Rónán O’Connor', 'Aodhán Devlin', 'Sadhbh Clarke', 'Tom Regan', 'Grace Foley',
  'Emma Dunne', 'Hannah Fitzgerald', 'Jack Kennedy', 'Liam Hennessy', 'Laura Moore',
  'Mark Flanagan', 'Mia Lenehan', 'Nate Egan', 'Olivia Prior', 'Paul Duggan',
  'Rachel Keane', 'Sam Whelan', 'Tara Gleeson', 'Will Doran', 'Zara Molloy',
];

const DEFAULT_SERVICES = [
  { name: '1-on-1 PT · 60 min', duration_minutes: 60, price_cents: 7500, capacity: 1 },
  { name: '1-on-1 PT · 30 min', duration_minutes: 30, price_cents: 4500, capacity: 1 },
  { name: 'Sports massage · 60 min', duration_minutes: 60, price_cents: 6500, capacity: 1 },
  { name: 'Sports massage · 30 min', duration_minutes: 30, price_cents: 4000, capacity: 1 },
  { name: 'Group strength class', duration_minutes: 60, price_cents: 2000, capacity: 8 },
  { name: 'Intro consultation', duration_minutes: 30, price_cents: 0, capacity: 1 },
];

// Rough target: 12–18 bookings per week, busy Mon/Tue/Wed evenings, quiet weekends.
const DAY_WEIGHT = [0.4, 1.5, 1.7, 1.6, 1.2, 0.9, 0.5]; // Sun..Sat

const HOUR_WEIGHT_WEEKDAY = buildHourWeights([
  [6, 0.4], [7, 0.9], [8, 1.2], [9, 1.0], [10, 0.6], [11, 0.5], [12, 0.6],
  [13, 0.5], [14, 0.4], [15, 0.4], [16, 0.8], [17, 1.4], [18, 1.9], [19, 1.7],
  [20, 0.8], [21, 0.2],
]);

const HOUR_WEIGHT_WEEKEND = buildHourWeights([
  [9, 0.8], [10, 1.2], [11, 1.0], [12, 0.6], [13, 0.3], [14, 0.3],
  [15, 0.4], [16, 0.3],
]);

function buildHourWeights(entries: Array<[number, number]>): number[] {
  const weights = new Array(24).fill(0) as number[];
  for (const [h, w] of entries) weights[h] = w;
  return weights;
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log(`> Seeding analytics demo for slug="${DEMO_SLUG}"`);

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('slug', DEMO_SLUG)
    .maybeSingle();

  if (!business) {
    console.error(`! No business found with slug "${DEMO_SLUG}". Create it first.`);
    process.exit(1);
  }
  console.log(`> Business: ${business.name} (${business.id})`);

  // Reset transactional tables for this business.
  await supabase.from('reviews').delete().eq('business_id', business.id);
  await supabase.from('bookings').delete().eq('business_id', business.id);
  await supabase.from('customer_businesses').delete().eq('business_id', business.id);

  // Ensure services exist.
  const { data: existingServices } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price_cents, capacity')
    .eq('business_id', business.id);

  let services = existingServices ?? [];
  if (services.length === 0) {
    const { data: created, error } = await supabase
      .from('services')
      .insert(
        DEFAULT_SERVICES.map((s) => ({
          ...s,
          business_id: business.id,
          is_active: true,
        })),
      )
      .select('id, name, duration_minutes, price_cents, capacity');
    if (error) throw error;
    services = created ?? [];
  }
  console.log(`> ${services.length} services ready`);

  // Ensure business hours exist (Mon-Fri 07:00-21:00, Sat 09:00-14:00, Sun closed).
  await supabase.from('business_hours').delete().eq('business_id', business.id);
  await supabase.from('business_hours').insert([
    { business_id: business.id, day_of_week: 1, opens_at: '07:00:00', closes_at: '21:00:00' },
    { business_id: business.id, day_of_week: 2, opens_at: '07:00:00', closes_at: '21:00:00' },
    { business_id: business.id, day_of_week: 3, opens_at: '07:00:00', closes_at: '21:00:00' },
    { business_id: business.id, day_of_week: 4, opens_at: '07:00:00', closes_at: '21:00:00' },
    { business_id: business.id, day_of_week: 5, opens_at: '07:00:00', closes_at: '20:00:00' },
    { business_id: business.id, day_of_week: 6, opens_at: '09:00:00', closes_at: '14:00:00' },
    { business_id: business.id, day_of_week: 0, opens_at: null, closes_at: null },
  ]);

  // Create customers (globally unique emails to avoid collisions).
  const now = Date.now();
  const suffix = Math.random().toString(36).slice(2, 7);
  const customerInserts = CUSTOMER_NAMES.map((name, i) => ({
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}.${suffix}@demo.openbook.ie`,
    phone: `+353 8${rand([3, 5, 7, 6])} ${String(1000000 + Math.floor(Math.random() * 8999999))}`,
  }));

  const { data: createdCustomers, error: custError } = await supabase
    .from('customers')
    .insert(customerInserts)
    .select('id, name');
  if (custError) throw custError;
  const customers = createdCustomers ?? [];
  console.log(`> ${customers.length} customers created`);

  // Pick 3 repeat-offender customers for the no-show story.
  const offenders = customers.slice(0, 3).map((c) => c.id);

  // Generate bookings day by day for the last 90 days.
  type SeedBooking = {
    business_id: string;
    customer_id: string;
    service_id: string;
    start_at: string;
    end_at: string;
    status: BookingStatus;
    price_cents: number;
    deposit_cents: number;
  };
  const bookings: SeedBooking[] = [];

  const start = now - 90 * DAY;
  const cbTracker = new Map<
    string,
    { first_booked_at: string; last_booked_at: string }
  >();

  for (let d = 0; d < 90; d++) {
    const date = new Date(start + d * DAY);
    const dow = date.getDay();
    const targetPerWeek = 15; // sweet spot
    const avgPerDay = targetPerWeek / 7;
    const weight = DAY_WEIGHT[dow];
    const expected = avgPerDay * weight;
    const n = Math.max(0, Math.round(expected + (Math.random() - 0.5) * 2));

    const hourWeights = dow === 0 || dow === 6 ? HOUR_WEIGHT_WEEKEND : HOUR_WEIGHT_WEEKDAY;
    const hoursAvailable = Array.from({ length: 24 }, (_, i) => i);

    for (let b = 0; b < n; b++) {
      const hour = weightedPick(hoursAvailable, hourWeights);
      const minute = rand([0, 15, 30, 45]);
      const svc = weightedPick(services, services.map((_, i) => (i === 4 ? 0.5 : 1)));
      const startAt = new Date(date);
      startAt.setHours(hour, minute, 0, 0);
      const endAt = new Date(startAt.getTime() + svc.duration_minutes * 60 * 1000);

      const isPast = startAt.getTime() < now;
      let status: BookingStatus = 'confirmed';
      const price = svc.price_cents;

      // pick a customer — 3 offenders get a disproportionate share of no-shows
      const makeOffender = Math.random() < 0.08;
      const customerId = makeOffender
        ? rand(offenders)
        : rand(customers.map((c) => c.id));

      if (isPast) {
        const roll = Math.random();
        if (customerId && offenders.includes(customerId)) {
          if (roll < 0.45) status = 'no_show';
          else if (roll < 0.6) status = 'cancelled';
          else status = 'completed';
        } else {
          if (roll < 0.05) status = 'no_show';
          else if (roll < 0.12) status = 'cancelled';
          else status = 'completed';
        }
      } else {
        if (Math.random() < 0.1) status = 'pending';
      }

      bookings.push({
        business_id: business.id,
        customer_id: customerId,
        service_id: svc.id,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status,
        price_cents: price,
        deposit_cents: Math.random() < 0.3 ? Math.round(price * 0.2) : 0,
      });

      // track first/last booked
      const existing = cbTracker.get(customerId);
      const iso = startAt.toISOString();
      if (!existing) {
        cbTracker.set(customerId, { first_booked_at: iso, last_booked_at: iso });
      } else {
        if (iso < existing.first_booked_at) existing.first_booked_at = iso;
        if (iso > existing.last_booked_at) existing.last_booked_at = iso;
      }
    }
  }

  console.log(`> Generated ${bookings.length} bookings, inserting…`);
  const CHUNK = 500;
  for (let i = 0; i < bookings.length; i += CHUNK) {
    const { error } = await supabase
      .from('bookings')
      .insert(bookings.slice(i, i + CHUNK));
    if (error) throw error;
  }

  // customer_businesses join rows
  const cbRows = Array.from(cbTracker.entries()).map(([customer_id, v]) => ({
    customer_id,
    business_id: business.id,
    first_booked_at: v.first_booked_at,
    last_booked_at: v.last_booked_at,
  }));
  if (cbRows.length > 0) {
    const { error } = await supabase.from('customer_businesses').insert(cbRows);
    if (error) throw error;
  }

  // A handful of reviews: mostly positive, a couple of mixed ones.
  const reviewCustomers = customers.slice(4, 14);
  const reviews = reviewCustomers.map((c, i) => {
    const rating = i < 7 ? 5 : i < 9 ? 4 : i === 9 ? 3 : 2;
    const bodies = [
      'Brilliant session. Booking app was effortless.',
      'Genuinely the best in the area. Felt looked after.',
      'Love the new studio. Booking again next week.',
      'Good but a bit rushed today — possibly busy slot.',
      'Fine. Nothing special but the service was on time.',
      "Didn't enjoy the wait at reception, felt chaotic.",
    ];
    return {
      business_id: business.id,
      customer_id: c.id,
      rating,
      body: bodies[i % bodies.length],
      created_at: new Date(now - Math.floor(Math.random() * 60) * DAY).toISOString(),
    };
  });
  await supabase.from('reviews').insert(reviews);

  console.log('> Done. Analytics page should now render a full dataset.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
