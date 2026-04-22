'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { getAvailableSlots, checkSlotAvailability } from '@/lib/dashboard-v2/slot-generation';

async function requireOwnedBusinessId() {
  const owner = await getCurrentOwner();
  if (!owner) return { sb: null, businessId: null, error: 'Not signed in' as const };
  const sb = createSupabaseServerClient();
  const { data } = await sb
    .from('businesses')
    .select('id')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();
  if (!data) return { sb, businessId: null, error: 'No live business' as const };
  return { sb, businessId: (data as { id: string }).id, error: null };
}

function normalisePhone(raw: string): string {
  // Keep leading '+' if present, strip everything else non-digit.
  const plus = raw.trim().startsWith('+') ? '+' : '';
  return plus + raw.replace(/[^0-9]/g, '');
}

export async function cancelBooking(bookingId: string) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  const { error: upErr } = await sb
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'business',
    })
    .eq('id', bookingId)
    .eq('business_id', businessId);

  if (upErr) return { ok: false as const, error: upErr.message };
  revalidatePath('/dashboard/calendar');
  revalidatePath('/dashboard/bookings');
  return { ok: true as const };
}

export type SlotsResult =
  | { ok: true; slots: string[] }
  | { ok: false; error: string };

/**
 * Client-callable slot loader. Used by the modal to refresh the time
 * picker whenever service/staff/date changes.
 */
export async function fetchAvailableSlots(input: {
  serviceId: string;
  staffId: string | null;
  dateYmd: string;
  excludeBookingId?: string;
}): Promise<SlotsResult> {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  const slots = await getAvailableSlots(sb, {
    businessId,
    serviceId: input.serviceId,
    staffId: input.staffId,
    dateYmd: input.dateYmd,
    excludeBookingId: input.excludeBookingId,
  });
  return { ok: true as const, slots };
}

export interface CreateBookingInput {
  customerId: string;
  serviceId: string;
  staffId: string | null;
  dateYmd: string;
  time: string; // 'HH:MM'
}

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; code: 'slot_taken'; freshSlots: string[] }
  | { ok: false; code: 'closed' | 'service_not_found' | 'generic'; error: string };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false, code: 'generic', error };

  const availability = await checkSlotAvailability(sb, {
    businessId,
    serviceId: input.serviceId,
    staffId: input.staffId,
    dateYmd: input.dateYmd,
    time: input.time,
  });

  if (!availability.ok) {
    if (availability.code === 'slot_taken') {
      return { ok: false, code: 'slot_taken', freshSlots: availability.freshSlots };
    }
    if (availability.code === 'closed') {
      return {
        ok: false,
        code: 'closed',
        error: 'That day is closed. Pick a different date.',
      };
    }
    return {
      ok: false,
      code: 'service_not_found',
      error: "Couldn't find that service. Refresh and try again.",
    };
  }

  // Price stamped at creation time from the current service price.
  const { data: svc } = await sb
    .from('services')
    .select('price_cents')
    .eq('id', input.serviceId)
    .eq('business_id', businessId)
    .maybeSingle();
  const priceCents = (svc?.price_cents as number | null) ?? 0;

  const { data: inserted, error: insertErr } = await sb
    .from('bookings')
    .insert({
      business_id: businessId,
      service_id: input.serviceId,
      staff_id: input.staffId,
      customer_id: input.customerId,
      starts_at: availability.startsAt,
      ends_at: availability.endsAt,
      status: 'confirmed',
      price_cents: priceCents,
      source: 'dashboard',
    })
    .select('id')
    .single();

  if (insertErr) return { ok: false, code: 'generic', error: insertErr.message };

  revalidatePath('/dashboard/calendar');
  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard/overview');
  return { ok: true, bookingId: (inserted as { id: string }).id };
}

export interface RescheduleBookingInput {
  bookingId: string;
  serviceId: string;
  staffId: string | null;
  dateYmd: string;
  time: string;
}

/**
 * Reschedule as UPDATE, not delete+insert. Preserves
 * stripe_payment_intent_id, reminder flags, and id for downstream refs.
 */
export async function rescheduleBooking(
  input: RescheduleBookingInput,
): Promise<CreateBookingResult> {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false, code: 'generic', error };

  const availability = await checkSlotAvailability(sb, {
    businessId,
    serviceId: input.serviceId,
    staffId: input.staffId,
    dateYmd: input.dateYmd,
    time: input.time,
    excludeBookingId: input.bookingId,
  });

  if (!availability.ok) {
    if (availability.code === 'slot_taken') {
      return { ok: false, code: 'slot_taken', freshSlots: availability.freshSlots };
    }
    return {
      ok: false,
      code: availability.code,
      error:
        availability.code === 'closed'
          ? 'That day is closed. Pick a different date.'
          : "Couldn't find that service. Refresh and try again.",
    };
  }

  const { error: upErr } = await sb
    .from('bookings')
    .update({
      service_id: input.serviceId,
      staff_id: input.staffId,
      starts_at: availability.startsAt,
      ends_at: availability.endsAt,
      // Reset reminder flags so reminders for the new time go out fresh.
      reminder_24h_sent: false,
      reminder_2h_sent: false,
    })
    .eq('id', input.bookingId)
    .eq('business_id', businessId);

  if (upErr) return { ok: false, code: 'generic', error: upErr.message };

  revalidatePath('/dashboard/calendar');
  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard/overview');
  return { ok: true, bookingId: input.bookingId };
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
}

export type CreateCustomerResult =
  | {
      ok: true;
      action: 'created' | 'existing';
      customer: { id: string; display_name: string; phone: string | null };
    }
  | { ok: false; error: string };

/**
 * Quick-create a customer from the New Booking modal. If the phone
 * matches an existing customer who's already had a booking with this
 * business, return `action: 'existing'` so the modal can offer
 * "Use existing" instead of silently duplicating.
 */
export async function createCustomer(
  input: CreateCustomerInput,
): Promise<CreateCustomerResult> {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false, error };

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Name is required.' };

  const phone = normalisePhone(input.phone);
  if (phone.length < 6) return { ok: false, error: 'Enter a valid phone number.' };

  // Per-business dup check: any customer with this phone who's already
  // booked with *this* business.
  const { data: matches } = await sb
    .from('customers')
    .select('id, full_name, name')
    .eq('phone', phone);

  const matchIds = (matches ?? []).map((m) => (m as { id: string }).id);
  if (matchIds.length > 0) {
    const { data: priorBookings } = await sb
      .from('bookings')
      .select('customer_id')
      .eq('business_id', businessId)
      .in('customer_id', matchIds)
      .limit(1);

    if (priorBookings && priorBookings.length > 0) {
      const existingId = (priorBookings[0] as { customer_id: string }).customer_id;
      const match = (matches ?? []).find(
        (m) => (m as { id: string }).id === existingId,
      ) as { id: string; full_name: string | null; name: string | null } | undefined;
      if (match) {
        return {
          ok: true,
          action: 'existing',
          customer: {
            id: match.id,
            display_name: match.full_name?.trim() || match.name?.trim() || 'Existing customer',
            phone,
          },
        };
      }
    }
  }

  const { data: inserted, error: insertErr } = await sb
    .from('customers')
    .insert({
      full_name: name,
      phone,
    })
    .select('id, full_name')
    .single();

  if (insertErr) return { ok: false, error: insertErr.message };
  const row = inserted as { id: string; full_name: string | null };
  return {
    ok: true,
    action: 'created',
    customer: {
      id: row.id,
      display_name: row.full_name ?? name,
      phone,
    },
  };
}
