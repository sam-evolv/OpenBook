'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireCurrentBusiness } from '@/lib/queries/business';
import {
  deriveCohort,
  type CohortStatus,
} from '@/lib/dashboard-v2/customers-queries';
import type { TargetAudience } from '@/lib/dashboard-v2/flash-sales-queries';

const MIN_DISCOUNT = 5;
const MAX_DISCOUNT = 50;
const DEFAULT_MAX_BOOKINGS = 1;
const MAX_MESSAGE_LEN = 500;

/**
 * Stage 1 server actions for Flash Sales.
 *
 * No WhatsApp outbound fires — that's Stage 2. Publishing a draft
 * materialises one `flash_sale_notifications` row per customer in the
 * target set:
 *   - opted-in customers → status='queued' (Stage 2 picks these up)
 *   - non-opted-in       → status='blocked' + block_reason='no_opt_in'
 * In Stage 1 every customer is non-opted-in by construction, so every
 * row lands as 'blocked' — but the UI separates the counts honestly
 * so the zero-send state is obvious.
 *
 * Discard is soft-delete via status='deleted' (no DELETE RLS policy
 * on flash_sales by design).
 */

interface BusinessRow {
  id: string;
}

export interface CreateDraftInput {
  serviceId: string;
  slotTimeIso: string;
  discountPercent: number;
  maxBookings: number;
  message: string | null;
  /** Optional: opening the create flow from a quiet-window suggestion. */
  sourceHint?: 'quiet_suggestion' | 'manual';
  audience: TargetAudience;
  /** Sale window hours — how long after slot_time the sale claim expires. */
  expiresInHours: number;
}

export async function createFlashSaleDraftAction(
  input: CreateDraftInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const validation = validateCreateInput(input);
  if (!validation.ok) return validation;

  const { sb, business } = await requireCurrentBusiness<BusinessRow>('id');

  const { data: service } = await sb
    .from('services')
    .select('id, business_id, price_cents')
    .eq('id', input.serviceId)
    .maybeSingle();

  const svc = service as { id: string; business_id: string; price_cents: number } | null;
  if (!svc || svc.business_id !== business.id) {
    return { ok: false, error: 'Service not found' };
  }

  const original = svc.price_cents;
  const salePrice = Math.round(original * (1 - input.discountPercent / 100));
  const expiresAt = new Date(
    new Date(input.slotTimeIso).getTime() + input.expiresInHours * 60 * 60 * 1000,
  ).toISOString();

  const { data: inserted, error } = await sb
    .from('flash_sales')
    .insert({
      business_id: business.id,
      service_id: svc.id,
      slot_time: input.slotTimeIso,
      expires_at: expiresAt,
      discount_percent: input.discountPercent,
      original_price_cents: original,
      sale_price_cents: salePrice,
      max_bookings: input.maxBookings,
      message: input.message?.trim() || null,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? 'Could not create flash sale' };
  }

  // Persist the target audience alongside the sale for Stage-2 retargeting.
  // Stage 1 keeps it simple by recomputing at publish-time; no need to store
  // it on the row since the DB schema doesn't have the column and we don't
  // want a migration for ephemeral state. Audience is passed through the
  // publish action's payload when the owner clicks Publish.

  revalidatePath('/dashboard/flash-sales');
  return { ok: true, id: (inserted as { id: string }).id };
}

export async function discardFlashSaleAction(
  saleId: string,
): Promise<{ ok: boolean }> {
  const { sb, business } = await requireCurrentBusiness<BusinessRow>('id');

  const { data: sale } = await sb
    .from('flash_sales')
    .select('id, business_id, status')
    .eq('id', saleId)
    .maybeSingle();

  const row = sale as { id: string; business_id: string; status: string | null } | null;
  if (!row || row.business_id !== business.id) return { ok: false };

  await sb.from('flash_sales').update({ status: 'deleted' }).eq('id', saleId);
  revalidatePath('/dashboard/flash-sales');
  return { ok: true };
}

export interface PublishInput {
  saleId: string;
  audience: TargetAudience;
}

export async function publishFlashSaleDryRunAction(
  input: PublishInput,
): Promise<
  | {
      ok: true;
      queued: number;
      blocked: number;
      targetTotal: number;
    }
  | { ok: false; error: string }
> {
  const { sb, business } = await requireCurrentBusiness<BusinessRow>('id');

  const { data: sale } = await sb
    .from('flash_sales')
    .select('id, business_id, status')
    .eq('id', input.saleId)
    .maybeSingle();

  const row = sale as { id: string; business_id: string; status: string | null } | null;
  if (!row || row.business_id !== business.id) {
    return { ok: false, error: 'Sale not found' };
  }
  if (row.status !== 'draft') {
    return { ok: false, error: 'Only drafts can be published' };
  }

  const targetCustomerIds = await resolveAudience(sb, business.id, input.audience);
  if (targetCustomerIds.length === 0) {
    // Still mark scheduled — the owner published intentionally, we
    // just have no one to notify. Surface honestly in the UI.
    await sb
      .from('flash_sales')
      .update({ status: 'scheduled' })
      .eq('id', input.saleId);
    revalidatePath('/dashboard/flash-sales');
    return { ok: true, queued: 0, blocked: 0, targetTotal: 0 };
  }

  // Resolve each customer's opt-in status.
  const { data: pivotData } = await sb
    .from('customer_businesses')
    .select('customer_id, promo_opt_in')
    .eq('business_id', business.id)
    .in('customer_id', targetCustomerIds);

  const optInByCustomer = new Map<string, boolean>();
  for (const p of (pivotData ?? []) as Array<{
    customer_id: string;
    promo_opt_in: boolean;
  }>) {
    optInByCustomer.set(p.customer_id, !!p.promo_opt_in);
  }

  const rows = targetCustomerIds.map((customer_id) => {
    const optedIn = optInByCustomer.get(customer_id) ?? false;
    return {
      sale_id: input.saleId,
      customer_id,
      status: optedIn ? 'queued' : 'blocked',
      block_reason: optedIn ? null : 'no_opt_in',
    };
  });

  // upsert on (sale_id, customer_id) so re-publishing a draft that was
  // reverted (not supported in Stage 1 but harmless here) is idempotent.
  const { error } = await sb
    .from('flash_sale_notifications')
    .upsert(rows, { onConflict: 'sale_id,customer_id' });

  if (error) {
    return { ok: false, error: error.message };
  }

  await sb
    .from('flash_sales')
    .update({ status: 'scheduled' })
    .eq('id', input.saleId);

  const queued = rows.filter((r) => r.status === 'queued').length;
  const blocked = rows.filter((r) => r.status === 'blocked').length;

  revalidatePath('/dashboard/flash-sales');
  return {
    ok: true,
    queued,
    blocked,
    targetTotal: rows.length,
  };
}

// ---- helpers ----

function validateCreateInput(
  i: CreateDraftInput,
): { ok: true } | { ok: false; error: string } {
  if (!i.serviceId) return { ok: false, error: 'Pick a service' };
  if (!i.slotTimeIso) return { ok: false, error: 'Pick a slot' };
  const slot = new Date(i.slotTimeIso);
  if (Number.isNaN(slot.getTime())) return { ok: false, error: 'Invalid slot time' };
  if (slot.getTime() < Date.now()) {
    return { ok: false, error: 'Slot is in the past' };
  }
  if (i.discountPercent < MIN_DISCOUNT || i.discountPercent > MAX_DISCOUNT) {
    return {
      ok: false,
      error: `Discount must be ${MIN_DISCOUNT}%–${MAX_DISCOUNT}%`,
    };
  }
  if (i.maxBookings < 1 || i.maxBookings > 50) {
    return { ok: false, error: 'Max bookings must be 1–50' };
  }
  if (i.expiresInHours < 1 || i.expiresInHours > 72) {
    return { ok: false, error: 'Expiry window must be 1–72 hours' };
  }
  if (i.message && i.message.length > MAX_MESSAGE_LEN) {
    return { ok: false, error: `Message must be ${MAX_MESSAGE_LEN} chars or fewer` };
  }
  return { ok: true };
}

async function resolveAudience(
  sb: SupabaseClient,
  businessId: string,
  audience: TargetAudience,
): Promise<string[]> {
  // Load the pivot + booking aggregates we need for cohort derivation,
  // mirroring loadCustomers' logic on a bounded in-memory scan.
  const [pivotRes, bookingsRes] = await Promise.all([
    sb
      .from('customer_businesses')
      .select('customer_id, is_favourite')
      .eq('business_id', businessId),
    sb
      .from('bookings')
      .select('customer_id, starts_at, status')
      .eq('business_id', businessId)
      .neq('status', 'cancelled')
      .limit(5000),
  ]);

  const pivotRows = (pivotRes.data ?? []) as Array<{
    customer_id: string;
    is_favourite: boolean | null;
  }>;
  const bookings = (bookingsRes.data ?? []) as Array<{
    customer_id: string;
    starts_at: string;
  }>;

  if (audience === 'all') {
    return Array.from(new Set(pivotRows.map((r) => r.customer_id)));
  }
  if (audience === 'favourites') {
    return pivotRows.filter((r) => r.is_favourite).map((r) => r.customer_id);
  }

  const aggByCustomer = new Map<string, { count: number; first: string; last: string }>();
  for (const b of bookings) {
    const cur = aggByCustomer.get(b.customer_id);
    if (!cur) {
      aggByCustomer.set(b.customer_id, {
        count: 1,
        first: b.starts_at,
        last: b.starts_at,
      });
      continue;
    }
    cur.count += 1;
    if (b.starts_at < cur.first) cur.first = b.starts_at;
    if (b.starts_at > cur.last) cur.last = b.starts_at;
  }

  const targetCohort: CohortStatus = audience;
  const ids: string[] = [];
  for (const [customerId, agg] of aggByCustomer) {
    const cohort = deriveCohort(agg.count, agg.first, agg.last);
    if (cohort === targetCohort) ids.push(customerId);
  }
  return ids;
}
