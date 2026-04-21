import type { SupabaseClient } from '@supabase/supabase-js';
import { displayCustomerName } from './customer';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StaffRow {
  id: string;
  name: string;
  colour: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

export interface BookingBlock {
  id: string;
  service_id: string;
  staff_id: string | null;
  customer_id: string;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price_cents: number;
  notes: string | null;
  stripe_payment_intent_id: string | null;
  customer: {
    display_name: string;
    phone: string | null;
    email: string | null;
  };
  service: {
    name: string | null;
    duration_minutes: number | null;
  };
}

export interface ClosureRow {
  date: string;
  name: string | null;
  is_bank_holiday: boolean | null;
}

export interface BusinessHourRow {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
}

export interface ServiceOption {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
}

export interface CustomerOption {
  id: string;
  display_name: string;
  phone: string | null;
}

export interface WeekPayload {
  weekStart: string;
  weekEnd: string;
  bookings: BookingBlock[];
  staff: StaffRow[];
  hours: BusinessHourRow[];
  closures: ClosureRow[];
  services: ServiceOption[];
  customers: CustomerOption[];
}

/**
 * Resolve the Monday 00:00 of the week containing the given date, in the
 * business timezone. We assume Europe/Dublin for now (single-country
 * product) — matches lib/business-hours.ts.
 */
function weekStart(anchor: Date): Date {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const diff = dow === 0 ? -6 : 1 - dow; // Monday start
  d.setDate(d.getDate() + diff);
  return d;
}

export async function loadWeek(
  sb: SupabaseClient,
  businessId: string,
  anchor: Date,
  staffFilter: string | null,
): Promise<WeekPayload> {
  const start = weekStart(anchor);
  const end = new Date(start.getTime() + 7 * MS_PER_DAY);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  // Staff, hours, closures run in parallel with bookings.
  const staffPromise = sb
    .from('staff')
    .select('id, name, colour, is_active, sort_order')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false });

  const hoursPromise = sb
    .from('business_hours')
    .select('day_of_week, open_time, close_time, is_closed')
    .eq('business_id', businessId);

  const closuresPromise = sb
    .from('business_closures')
    .select('date, name, is_bank_holiday')
    .eq('business_id', businessId)
    .gte('date', start.toISOString().slice(0, 10))
    .lt('date', end.toISOString().slice(0, 10));

  let bookingsQuery = sb
    .from('bookings')
    .select(
      [
        'id',
        'service_id',
        'staff_id',
        'customer_id',
        'starts_at',
        'ends_at',
        'status',
        'price_cents',
        'notes',
        'stripe_payment_intent_id',
        'customers(full_name, name, phone, email)',
        'services(name, duration_minutes)',
      ].join(', '),
    )
    .eq('business_id', businessId)
    .gte('starts_at', startIso)
    .lt('starts_at', endIso)
    .order('starts_at', { ascending: true })
    .limit(1000);

  if (staffFilter) {
    bookingsQuery = bookingsQuery.eq('staff_id', staffFilter);
  }

  const servicesPromise = sb
    .from('services')
    .select('id, name, duration_minutes, price_cents, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  // Customers who've booked with this business. Two-step to avoid
  // the Supabase inner-join duplicate-row problem. Capped at 500 —
  // typeahead filters client-side from there; larger business
  // dashboards are rare today and can grow into a server-side search
  // later.
  const priorBookingsPromise = sb
    .from('bookings')
    .select('customer_id')
    .eq('business_id', businessId)
    .limit(1500);

  const [staffRes, hoursRes, closuresRes, bookingsRes, servicesRes, priorRes] =
    await Promise.all([
      staffPromise,
      hoursPromise,
      closuresPromise,
      bookingsQuery,
      servicesPromise,
      priorBookingsPromise,
    ]);

  const customerIdSet = new Set<string>();
  for (const row of (priorRes.data ?? []) as { customer_id: string }[]) {
    if (row.customer_id) customerIdSet.add(row.customer_id);
  }
  let customers: CustomerOption[] = [];
  if (customerIdSet.size > 0) {
    const ids = Array.from(customerIdSet).slice(0, 500);
    const { data: custRows } = await sb
      .from('customers')
      .select('id, full_name, name, phone')
      .in('id', ids);
    customers = ((custRows ?? []) as Array<{
      id: string;
      full_name: string | null;
      name: string | null;
      phone: string | null;
    }>).map((c) => ({
      id: c.id,
      display_name: displayCustomerName({ full_name: c.full_name, name: c.name }),
      phone: c.phone,
    }));
  }

  const bookings: BookingBlock[] = ((bookingsRes.data ?? []) as unknown as Array<{
    id: string;
    service_id: string;
    staff_id: string | null;
    customer_id: string;
    starts_at: string;
    ends_at: string;
    status: BookingBlock['status'];
    price_cents: number;
    notes: string | null;
    stripe_payment_intent_id: string | null;
    customers: { full_name: string | null; name: string | null; phone: string | null; email: string | null } | null;
    services: { name: string | null; duration_minutes: number | null } | null;
  }>).map((b) => ({
    id: b.id,
    service_id: b.service_id,
    staff_id: b.staff_id,
    customer_id: b.customer_id,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    status: b.status,
    price_cents: b.price_cents,
    notes: b.notes,
    stripe_payment_intent_id: b.stripe_payment_intent_id,
    customer: {
      display_name: displayCustomerName(b.customers ?? {}),
      phone: b.customers?.phone ?? null,
      email: b.customers?.email ?? null,
    },
    service: {
      name: b.services?.name ?? null,
      duration_minutes: b.services?.duration_minutes ?? null,
    },
  }));

  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    bookings,
    staff: (staffRes.data ?? []) as StaffRow[],
    hours: (hoursRes.data ?? []) as BusinessHourRow[],
    closures: (closuresRes.data ?? []) as ClosureRow[],
    services: (servicesRes.data ?? []) as ServiceOption[],
    customers,
  };
}
