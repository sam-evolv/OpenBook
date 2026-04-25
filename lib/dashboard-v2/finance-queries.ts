import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { IRISH_SERVICES_VAT_THRESHOLD_CENTS } from './vat';
import { hasStripe, requireEnv } from '@/lib/integrations';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getStripe(): Stripe {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'), { apiVersion: '2026-03-25.dahlia' });
}

// ============================================================================
// Types
// ============================================================================

export interface FinanceBusiness {
  id: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean | null;
}

export interface PayoutRow {
  id: string;
  amountCents: number;
  arrivalDate: string; // ISO
  status: 'paid' | 'pending' | 'in_transit' | 'canceled' | 'failed';
  bookingCount: number; // derived from balance transactions in this payout
  feeCents: number; // fees attributable to this payout
}

export interface TransactionRow {
  bookingId: string;
  customerName: string;
  serviceName: string | null;
  startsAt: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  refundedCents: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'refunded';
  payoutArrivalDate: string | null;
}

export interface PnLRow {
  label: string;
  sub: string;
  amountCents: number;
  negative?: boolean;
}

export interface RevenueMixRow {
  label: string;
  valueCents: number;
  percent: number;
}

export interface FinancePayload {
  connected: boolean;
  schedule: {
    interval: string | null; // 'weekly' | 'daily' | 'monthly' | 'manual' | null
    bankLabel: string | null; // "AIB ****3847" or null
  };
  headline: {
    nextPayoutCents: number;
    availableBalanceCents: number;
    grossThisMonthCents: number;
    stripeFees30dCents: number;
  };
  vat: {
    accruedCents: number;
    thresholdCents: number;
    percent: number;
    crossingIn: string | null; // "October 2026" or null
  };
  pnl: {
    rows: PnLRow[];
    netCents: number;
    monthLabel: string;
  };
  revenueMix: RevenueMixRow[];
  payouts: PayoutRow[];
  transactions: TransactionRow[];
  warnings: string[]; // surface to UI if anything weird happened (pagination hit, Stripe partial failure, etc.)
}

// ============================================================================
// Internal helpers
// ============================================================================

const STRIPE_TIMEOUT_MS = 8000;

async function withTimeout<T>(p: Promise<T>, label: string): Promise<T | { __error: Error }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ __error: new Error(`${label} timed out after ${STRIPE_TIMEOUT_MS}ms`) });
    }, STRIPE_TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        resolve({ __error: e instanceof Error ? e : new Error(String(e)) });
      },
    );
  });
}

function isError<T>(v: T | { __error: Error }): v is { __error: Error } {
  return typeof v === 'object' && v !== null && '__error' in v;
}

function monthStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function monthLabel(now: Date): string {
  return now.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' });
}

function estimateVatCrossing(
  accruedCents: number,
  thresholdCents: number,
  dailyPaceCents: number,
): string | null {
  if (accruedCents >= thresholdCents) return null;
  if (dailyPaceCents <= 0) return null;
  const daysToCross = Math.ceil((thresholdCents - accruedCents) / dailyPaceCents);
  const d = new Date(Date.now() + daysToCross * MS_PER_DAY);
  return d.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' });
}

/** Paginate Stripe list endpoints up to `cap` items so we don't spin
 *  forever on a runaway account. */
async function listAll<T>(
  fetchPage: (startingAfter?: string) => Promise<Stripe.ApiList<T>>,
  cap: number,
): Promise<{ items: T[]; hitCap: boolean }> {
  const items: T[] = [];
  let cursor: string | undefined = undefined;
  while (items.length < cap) {
    const page: Stripe.ApiList<T> = await fetchPage(cursor);
    items.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    const last = page.data[page.data.length - 1] as unknown as { id: string };
    cursor = last.id;
  }
  return { items: items.slice(0, cap), hitCap: items.length > cap };
}

// ============================================================================
// The one big loader
// ============================================================================

export async function loadFinance(
  sb: SupabaseClient,
  business: FinanceBusiness,
): Promise<FinancePayload> {
  const warnings: string[] = [];
  const now = new Date();
  const thirtyAgoIso = new Date(now.getTime() - 30 * MS_PER_DAY).toISOString();
  const yearAgoIso = new Date(now.getTime() - 365 * MS_PER_DAY).toISOString();
  const monthStartIso = monthStart(now).toISOString();

  // ---- 1. Supabase side runs regardless of Stripe connection ----
  const [monthBookingsRes, yearBookingsRes, recentTxRes] = await Promise.all([
    sb
      .from('bookings')
      .select('id, starts_at, price_cents, status, service_id, stripe_payment_intent_id, customers(full_name, name), services(name)')
      .eq('business_id', business.id)
      .gte('starts_at', monthStartIso)
      .limit(5000),
    sb
      .from('bookings')
      .select('price_cents, status')
      .eq('business_id', business.id)
      .gte('starts_at', yearAgoIso)
      .neq('status', 'cancelled')
      .limit(10000),
    sb
      .from('bookings')
      .select('id, starts_at, price_cents, status, stripe_payment_intent_id, customers(full_name, name), services(name)')
      .eq('business_id', business.id)
      .order('starts_at', { ascending: false })
      .limit(100),
  ]);

  const monthBookings = (monthBookingsRes.data ?? []) as unknown as Array<{
    id: string;
    starts_at: string;
    price_cents: number;
    status: string;
    service_id: string | null;
    stripe_payment_intent_id: string | null;
    customers: { full_name: string | null; name: string | null } | null;
    services: { name: string | null } | null;
  }>;
  const yearBookings = (yearBookingsRes.data ?? []) as Array<{
    price_cents: number;
    status: string;
  }>;
  const recentTxBookings = (recentTxRes.data ?? []) as unknown as Array<{
    id: string;
    starts_at: string;
    price_cents: number;
    status: string;
    stripe_payment_intent_id: string | null;
    customers: { full_name: string | null; name: string | null } | null;
    services: { name: string | null } | null;
  }>;

  // Gross this month = sum of non-cancelled bookings that started in-month
  const grossThisMonthCents = monthBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((s, b) => s + b.price_cents, 0);

  // VAT rolling 12-month accrual (services — all bookings treated as service revenue in v1)
  const accruedCents = yearBookings.reduce((s, b) => s + b.price_cents, 0);
  // Simple daily pace for the crossing projection: accrued / 365.
  // A shorter recent-window pace would be more reactive, but we intentionally
  // keep the projection conservative — owners shouldn't see the ETA swing
  // wildly on a single quiet week.
  const dailyPaceCents = yearBookings.length > 0 ? Math.round(accruedCents / 365) : 0;
  const crossingIn = estimateVatCrossing(
    accruedCents,
    IRISH_SERVICES_VAT_THRESHOLD_CENTS,
    dailyPaceCents,
  );

  // ---- 2. Stripe side (only if connected) ----
  let nextPayoutCents = 0;
  let availableBalanceCents = 0;
  let stripeFees30dCents = 0;
  let payouts: PayoutRow[] = [];
  let scheduleInterval: string | null = null;
  let bankLabel: string | null = null;
  const feesByPaymentIntent = new Map<string, { feeCents: number; payoutId: string | null }>();
  const payoutsById = new Map<string, { arrivalDate: string }>();
  const refundsByPaymentIntent = new Map<string, number>();

  // Gate the entire Stripe path on env presence too — a deploy without
  // STRIPE_SECRET_KEY but with stale stripe_account_id rows on businesses
  // would otherwise crash the page when we tried to instantiate the SDK.
  const stripeConfigured = hasStripe();
  const connected = Boolean(
    stripeConfigured && business.stripe_account_id && business.stripe_charges_enabled,
  );

  if (connected && business.stripe_account_id) {
    const stripe = getStripe();
    const connectOpt = { stripeAccount: business.stripe_account_id } as const;

    const [balanceRes, payoutsRes, txRes, refundsRes, accountRes] = await Promise.all([
      withTimeout(stripe.balance.retrieve({}, connectOpt), 'balance.retrieve'),
      withTimeout(stripe.payouts.list({ limit: 10 }, connectOpt), 'payouts.list'),
      withTimeout(
        listAll(
          (startingAfter) =>
            stripe.balanceTransactions.list(
              {
                limit: 100,
                created: { gte: Math.floor(Date.parse(thirtyAgoIso) / 1000) },
                starting_after: startingAfter,
              },
              connectOpt,
            ),
          500,
        ),
        'balanceTransactions.list',
      ),
      withTimeout(
        stripe.refunds.list({ limit: 100 }, connectOpt),
        'refunds.list',
      ),
      withTimeout(stripe.accounts.retrieve(business.stripe_account_id), 'accounts.retrieve'),
    ]);

    if (isError(balanceRes)) {
      warnings.push(`Couldn't load Stripe balance: ${balanceRes.__error.message}`);
    } else {
      const available = balanceRes.available?.reduce((s, b) => s + b.amount, 0) ?? 0;
      availableBalanceCents = available;
    }

    if (isError(payoutsRes)) {
      warnings.push(`Couldn't load payouts: ${payoutsRes.__error.message}`);
    } else {
      for (const p of payoutsRes.data) {
        payoutsById.set(p.id, {
          arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        });
      }
      const pending = payoutsRes.data.filter(
        (p) => p.status === 'pending' || p.status === 'in_transit',
      );
      nextPayoutCents = pending.reduce((s, p) => s + p.amount, 0);
      payouts = payoutsRes.data.map((p) => ({
        id: p.id,
        amountCents: p.amount,
        arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        status: p.status as PayoutRow['status'],
        bookingCount: 0, // filled in below
        feeCents: 0, // filled in below
      }));
    }

    if (isError(txRes)) {
      warnings.push(`Couldn't load balance transactions: ${txRes.__error.message}`);
    } else {
      if (txRes.hitCap) {
        warnings.push('Showing the 500 most recent balance transactions (cap).');
      }
      for (const bt of txRes.items) {
        // Stripe's TS types don't expose `payout` on BalanceTransaction but
        // the runtime field exists and is what ties a charge to the payout
        // it'll settle into.
        const payoutField = (bt as unknown as { payout?: string | null }).payout ?? null;

        if (bt.type === 'charge' && bt.fee) {
          stripeFees30dCents += bt.fee;

          const source = typeof bt.source === 'string' ? null : bt.source;
          const paymentIntentId =
            source && 'payment_intent' in source && typeof source.payment_intent === 'string'
              ? source.payment_intent
              : null;

          if (paymentIntentId) {
            feesByPaymentIntent.set(paymentIntentId, {
              feeCents: bt.fee,
              payoutId: payoutField,
            });
          }
        }

        if (payoutField && bt.type === 'charge') {
          const existing = payouts.find((p) => p.id === payoutField);
          if (existing) {
            existing.bookingCount += 1;
            existing.feeCents += bt.fee ?? 0;
          }
        }
      }
    }

    if (isError(refundsRes)) {
      warnings.push(`Couldn't load refunds: ${refundsRes.__error.message}`);
    } else {
      for (const r of refundsRes.data) {
        const pi = typeof r.payment_intent === 'string' ? r.payment_intent : r.payment_intent?.id;
        if (pi) {
          refundsByPaymentIntent.set(pi, (refundsByPaymentIntent.get(pi) ?? 0) + r.amount);
        }
      }
    }

    if (isError(accountRes)) {
      warnings.push(`Couldn't load Stripe account: ${accountRes.__error.message}`);
    } else {
      scheduleInterval = accountRes.settings?.payouts?.schedule?.interval ?? null;
      const external = accountRes.external_accounts?.data?.[0];
      if (external && external.object === 'bank_account') {
        const bank = external as unknown as { bank_name: string | null; last4: string };
        bankLabel = `${bank.bank_name ?? 'Bank'} ****${bank.last4}`;
      } else if (external && external.object === 'card') {
        const card = external as unknown as { brand: string; last4: string };
        bankLabel = `${card.brand} ****${card.last4}`;
      }
    }
  }

  // ---- 3. P&L + revenue mix from monthBookings ----

  const nonCancelledMonth = monthBookings.filter((b) => b.status !== 'cancelled');

  const revenueByServiceName = new Map<string, { valueCents: number; count: number }>();
  for (const b of nonCancelledMonth) {
    const key = b.services?.name ?? 'Unspecified';
    const entry = revenueByServiceName.get(key) ?? { valueCents: 0, count: 0 };
    entry.valueCents += b.price_cents;
    entry.count += 1;
    revenueByServiceName.set(key, entry);
  }
  const rankedServices = Array.from(revenueByServiceName.entries())
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.valueCents - a.valueCents);

  const topServices = rankedServices.slice(0, 3);
  const otherServicesTotal = rankedServices.slice(3).reduce(
    (acc, s) => ({
      valueCents: acc.valueCents + s.valueCents,
      count: acc.count + s.count,
    }),
    { valueCents: 0, count: 0 },
  );

  // Refunds attributed to this business's bookings in the current month
  let monthRefundsCents = 0;
  let monthRefundCount = 0;
  for (const b of nonCancelledMonth) {
    if (b.stripe_payment_intent_id) {
      const refunded = refundsByPaymentIntent.get(b.stripe_payment_intent_id) ?? 0;
      if (refunded > 0) {
        monthRefundsCents += refunded;
        monthRefundCount += 1;
      }
    }
  }

  // OpenBook subscription — hardcoded placeholder until billing is wired.
  const OPENBOOK_PRO_MONTHLY_CENTS = 3900;

  const pnlRows: PnLRow[] = [
    ...topServices.map((s) => ({
      label: `Gross revenue — ${s.label}`,
      sub: `${s.count} ${s.count === 1 ? 'booking' : 'bookings'}`,
      amountCents: s.valueCents,
    })),
    ...(otherServicesTotal.valueCents > 0
      ? [
          {
            label: 'Gross revenue — Other services',
            sub: `${otherServicesTotal.count} bookings`,
            amountCents: otherServicesTotal.valueCents,
          },
        ]
      : []),
    ...(monthRefundsCents > 0
      ? [
          {
            label: 'Refunds',
            sub: `${monthRefundCount} ${monthRefundCount === 1 ? 'refund' : 'refunds'}`,
            amountCents: monthRefundsCents,
            negative: true,
          },
        ]
      : []),
    ...(connected && stripeFees30dCents > 0
      ? [
          {
            label: 'Stripe fees',
            sub: '2.9% + €0.25 avg',
            amountCents: stripeFees30dCents,
            negative: true,
          },
        ]
      : []),
    {
      label: 'OpenBook Pro',
      sub: 'Monthly subscription',
      amountCents: OPENBOOK_PRO_MONTHLY_CENTS,
      negative: true,
    },
  ];

  const netCents =
    topServices.reduce((s, r) => s + r.valueCents, 0) +
    otherServicesTotal.valueCents -
    monthRefundsCents -
    (connected ? stripeFees30dCents : 0) -
    OPENBOOK_PRO_MONTHLY_CENTS;

  const revenueMixTotal = rankedServices.reduce((s, r) => s + r.valueCents, 0);
  const revenueMix: RevenueMixRow[] =
    revenueMixTotal === 0
      ? []
      : rankedServices.map((s) => ({
          label: s.label,
          valueCents: s.valueCents,
          percent: Math.round((s.valueCents / revenueMixTotal) * 100),
        }));

  // ---- 4. Transactions table ----

  const transactions: TransactionRow[] = recentTxBookings.map((b) => {
    const feeEntry = b.stripe_payment_intent_id
      ? feesByPaymentIntent.get(b.stripe_payment_intent_id) ?? null
      : null;
    const refundedCents = b.stripe_payment_intent_id
      ? refundsByPaymentIntent.get(b.stripe_payment_intent_id) ?? 0
      : 0;
    const feeCents = feeEntry?.feeCents ?? 0;
    const netCents = b.price_cents - feeCents - refundedCents;
    const payoutArrivalDate = feeEntry?.payoutId
      ? payoutsById.get(feeEntry.payoutId)?.arrivalDate ?? null
      : null;
    return {
      bookingId: b.id,
      customerName:
        b.customers?.full_name?.trim() || b.customers?.name?.trim() || 'Guest',
      serviceName: b.services?.name ?? null,
      startsAt: b.starts_at,
      amountCents: b.price_cents,
      feeCents,
      netCents,
      refundedCents,
      status:
        refundedCents > 0
          ? 'refunded'
          : (b.status as TransactionRow['status']),
      payoutArrivalDate,
    };
  });

  return {
    connected,
    schedule: { interval: scheduleInterval, bankLabel },
    headline: {
      nextPayoutCents,
      availableBalanceCents,
      grossThisMonthCents,
      stripeFees30dCents,
    },
    vat: {
      accruedCents,
      thresholdCents: IRISH_SERVICES_VAT_THRESHOLD_CENTS,
      percent: Math.min(
        100,
        Math.round((accruedCents / IRISH_SERVICES_VAT_THRESHOLD_CENTS) * 1000) / 10,
      ),
      crossingIn,
    },
    pnl: {
      rows: pnlRows,
      netCents,
      monthLabel: monthLabel(now),
    },
    revenueMix,
    payouts,
    transactions,
    warnings,
  };
}
