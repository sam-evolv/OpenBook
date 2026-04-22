import { NextResponse } from 'next/server';
import { requireCurrentBusiness } from '@/lib/queries/business';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadFinance } from '@/lib/dashboard-v2/finance-queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Full ledger CSV — what a bookkeeper wants. Includes every non-cancelled
 * booking this business has, joined with the per-transaction Stripe fee and
 * refund (when Stripe is connected). Field escaping follows RFC 4180:
 *   - fields containing "," or "\"" or newlines are double-quoted
 *   - literal double-quotes are doubled-up inside quoted fields
 * so that customer names with commas ("Kelly, Aoife") or quote marks
 * ("Aoife \"Red\" Kelly") don't blow up Excel / Sheets.
 */
export async function GET() {
  const { business } = await requireCurrentBusiness<{
    id: string;
    slug: string;
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean | null;
  }>('id, slug, stripe_account_id, stripe_charges_enabled');

  const payload = await loadFinance(createSupabaseServerClient(), {
    id: business.id,
    stripe_account_id: business.stripe_account_id,
    stripe_charges_enabled: business.stripe_charges_enabled,
  });

  const headers = [
    'booking_date',
    'customer_name',
    'service',
    'status',
    'price_eur',
    'stripe_fee_eur',
    'refunded_eur',
    'net_eur',
    'payout_date',
  ];

  const rows = payload.transactions.map((t) => [
    new Date(t.startsAt).toISOString().slice(0, 10),
    t.customerName,
    t.serviceName ?? '',
    t.status,
    centsToEur(t.amountCents),
    centsToEur(t.feeCents),
    centsToEur(t.refundedCents),
    centsToEur(t.netCents),
    t.payoutArrivalDate ? new Date(t.payoutArrivalDate).toISOString().slice(0, 10) : '',
  ]);

  const csv = [headers, ...rows].map(formatCsvRow).join('\r\n');

  const now = new Date().toISOString().slice(0, 10);
  const filename = `openbook-${business.slug}-finance-${now}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function centsToEur(cents: number): string {
  // Two decimals always — bookkeepers expect consistent scale.
  return (cents / 100).toFixed(2);
}

/** RFC 4180 row formatter. */
function formatCsvRow(fields: (string | number)[]): string {
  return fields.map(formatCsvField).join(',');
}

function formatCsvField(field: string | number): string {
  const raw = String(field ?? '');
  const needsQuoting = /[",\r\n]/.test(raw);
  if (!needsQuoting) return raw;
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}
