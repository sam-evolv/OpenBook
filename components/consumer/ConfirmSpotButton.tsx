'use client';

/**
 * ConfirmSpotButton — the money-flow island for /open-spots/[id]/confirm.
 *
 * Responsibilities:
 *  - Own the payment_mode state (and render the picker when applicable).
 *  - POST /api/open-spots/[saleId]/claim, then either redirect to Stripe
 *    Checkout via /api/checkout/create or jump straight to /booking/confirm.
 *  - Map error responses to human states; never surface a stack trace.
 *  - Stick to the bottom on mobile, sit inline on desktop.
 */

import { useCallback, useState } from 'react';
import { Gift, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatEUR } from '@/lib/money';
import { openCheckout } from '@/lib/native-browser';
import { PaymentModePicker, type PaymentMode } from './PaymentModePicker';

type Props = {
  saleId: string;
  salePriceCents: number;
  isFree: boolean;
  stripeEnabled: boolean;
  businessSlug: string;
};

type Status =
  | 'idle'
  | 'submitting'
  | 'error_sold_out'
  | 'error_phone'
  | 'error_server'
  | 'rate_limited';

function defaultMode(isFree: boolean, stripeEnabled: boolean): PaymentMode {
  if (isFree) return 'in_person';
  if (!stripeEnabled) return 'in_person';
  return 'stripe_now';
}

export function ConfirmSpotButton({
  saleId,
  salePriceCents,
  isFree,
  stripeEnabled,
  businessSlug,
}: Props) {
  const showPicker = !isFree && stripeEnabled;

  const [mode, setMode] = useState<PaymentMode>(
    defaultMode(isFree, stripeEnabled),
  );
  const [status, setStatus] = useState<Status>('idle');

  const ctaLabel = (() => {
    if (status === 'submitting') return 'Working…';
    if (isFree) return 'Confirm booking';
    if (mode === 'stripe_now' && stripeEnabled) {
      return `Book and pay ${formatEUR(salePriceCents)}`;
    }
    return 'Reserve your spot';
  })();

  const onClaim = useCallback(async () => {
    console.log('[confirm-cta] tap', { saleId, mode, state: status });
    if (typeof window !== 'undefined') {
      window.navigator.vibrate?.(8);
    }
    setStatus('submitting');

    try {
      const res = await fetch(`/api/open-spots/${saleId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_mode: mode }),
      });

      const cloned = res.clone();
      const debugBody = await cloned.text().catch(() => '<unreadable>');
      console.log('[confirm-cta] response', { status: res.status, body: debugBody });

      if (res.status === 410) {
        setStatus('error_sold_out');
        return;
      }
      if (res.status === 422) {
        setStatus('error_phone');
        return;
      }
      if (res.status === 429) {
        setStatus('rate_limited');
        setTimeout(() => setStatus('idle'), 5000);
        return;
      }
      if (!res.ok) {
        setStatus('error_server');
        return;
      }

      const { booking_id } = (await res.json()) as { booking_id: string };

      if (mode === 'stripe_now' && !isFree && stripeEnabled) {
        const checkoutRes = await fetch('/api/checkout/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking_id }),
        });
        if (!checkoutRes.ok) {
          setStatus('error_server');
          return;
        }
        const { checkout_url } = (await checkoutRes.json()) as {
          checkout_url: string | null;
        };
        if (checkout_url) {
          await openCheckout(checkout_url);
          return;
        }
        window.location.assign(`/booking/confirm?id=${booking_id}`);
        return;
      }

      window.location.assign(`/booking/confirm?id=${booking_id}`);
    } catch (err) {
      console.error('[confirm-cta] error', err);
      setStatus('error_server');
    }
  }, [saleId, mode, isFree, stripeEnabled, status]);

  if (status === 'error_sold_out') {
    return (
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <p className="font-serif text-[18px] text-white">
          This spot just got taken.
        </p>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1 text-[14px] font-medium text-[#D4AF37]"
        >
          See what else is open
          <ArrowRight className="h-[14px] w-[14px]" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {showPicker && <PaymentModePicker value={mode} onChange={setMode} />}

      <div className="flex items-center justify-center gap-6">
        <span
          aria-disabled
          className="inline-flex cursor-not-allowed items-center gap-1.5 text-[13px] font-medium text-[#D4AF37] opacity-60"
          title="Coming soon"
        >
          <Gift className="h-[14px] w-[14px]" aria-hidden />
          Gift this spot
          <span className="text-[10px] text-zinc-500">(Coming soon)</span>
        </span>
        <Link
          href={`/business/${businessSlug}`}
          className="inline-flex items-center gap-1 text-[13px] text-zinc-400"
        >
          More about this place
          <ArrowRight className="h-[12px] w-[12px]" aria-hidden />
        </Link>
      </div>

      <div className="md:static md:bg-transparent md:p-0 md:pb-0 fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-black/80 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur md:border-none md:backdrop-blur-0">
        <button
          type="button"
          onClick={onClaim}
          disabled={status === 'submitting' || status === 'rate_limited'}
          className="flex h-[56px] w-full items-center justify-center rounded-xl bg-white text-[16px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-70"
        >
          {ctaLabel}
        </button>

        {status === 'error_phone' && (
          <p className="mt-2 text-center text-[12px] text-zinc-300">
            We need a phone number to confirm in-person bookings.{' '}
            <Link href="/me/edit" className="text-[#D4AF37] underline">
              Tap to add one
            </Link>{' '}
            and try again.
          </p>
        )}
        {status === 'rate_limited' && (
          <p className="mt-2 text-center text-[12px] text-zinc-300">
            You&rsquo;re going too fast — try again in a moment.
          </p>
        )}
        {status === 'error_server' && (
          <p className="mt-2 text-center text-[12px] text-zinc-300">
            Something went wrong.{' '}
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="text-[#D4AF37] underline"
            >
              Tap to retry
            </button>
            .
          </p>
        )}
      </div>
    </div>
  );
}
