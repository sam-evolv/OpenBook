'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { addDays, dayLabel, friendlyDate, timeLabel } from '@/lib/time';

interface SlotPickerProps {
  serviceId: string;
  businessId: string;
  businessSlug: string;
  colour: string;
  requiresOnlinePayment: boolean;
}

const DATE_DAYS = 14;

export function SlotPicker({
  serviceId,
  businessId,
  businessSlug,
  colour,
  requiresOnlinePayment,
}: SlotPickerProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DATE_DAYS }, (_, i) => addDays(today, i));
  }, []);

  // Fetch availability when date changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const iso = selectedDate.toISOString().slice(0, 10);
        const res = await fetch(
          `/api/availability?serviceId=${serviceId}&date=${iso}`
        );
        if (!res.ok) throw new Error('Availability failed');
        const data = await res.json();
        if (!cancelled) {
          setSlots(data.slots ?? []);
          setAvailabilityError(null);
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
          setAvailabilityError('Could not load slots. Check your connection and try again.');
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, serviceId]);

  async function confirmBooking() {
    if (!selectedSlot || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          businessId,
          startAt: selectedSlot,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Could not create booking');
      }

      const data = (await res.json()) as {
        bookingId: string;
        requires_payment: boolean;
      };

      // Cash / free path — booking is already confirmed.
      if (!data.requires_payment) {
        router.push(`/booking/confirm?id=${data.bookingId}`);
        return;
      }

      // Paid path — ask the server for a Stripe Checkout URL.
      const checkoutRes = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: data.bookingId }),
      });

      if (!checkoutRes.ok) {
        const errBody = await checkoutRes.json().catch(() => ({}));
        throw new Error(
          errBody?.error ?? 'Could not start payment. Please try again.'
        );
      }

      const checkoutData = (await checkoutRes.json()) as {
        checkout_url: string | null;
      };

      if (checkoutData.checkout_url) {
        // Full redirect — Stripe is a separate domain, not an SPA route.
        window.location.href = checkoutData.checkout_url;
        return;
      }

      // Race-edge: business state changed between booking creation and
      // checkout-session creation, so checkout/create decided no payment
      // was needed after all. Fall through to the confirm page.
      router.push(`/booking/confirm?id=${data.bookingId}`);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
      setSubmitting(false);
    }
    // Note: on success paths we navigate away (router.push or window.location),
    // so we deliberately don't reset `submitting` — the spinner keeps spinning
    // until the page unloads.
  }

  function retryAvailability() {
    setSelectedDate(new Date(selectedDate));
  }

  function chooseNextDate() {
    const currentIndex = dates.findIndex(
      (d) => d.toDateString() === selectedDate.toDateString()
    );
    const nextDate = dates[Math.min(currentIndex + 1, dates.length - 1)];
    if (nextDate) setSelectedDate(nextDate);
  }

  return (
    <>
      {/* Date strip */}
      <div className="mt-6 px-5">
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase mb-3">
          Choose a date
        </h2>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-5 pb-1">
          {dates.map((d) => {
            const active =
              d.toDateString() === selectedDate.toDateString();
            const { weekday, day } = dayLabel(d);
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={`
                  shrink-0 w-[62px] h-[78px] rounded-2xl
                  flex flex-col items-center justify-center gap-0.5
                  transition-all active:scale-95
                  ${
                    active
                      ? 'border text-black'
                      : 'bg-white/[0.03] border border-white/[0.08] text-white/80 hover:border-white/20'
                  }
                `}
                style={
                  active
                    ? {
                        backgroundColor: colour,
                        borderColor: colour,
                      }
                    : undefined
                }
              >
                <span
                  className={`text-[10px] font-semibold tracking-wider ${
                    active ? 'text-black/70' : 'text-white/50'
                  }`}
                >
                  {weekday}
                </span>
                <span className="text-[22px] font-bold tracking-tight leading-none">
                  {day}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      <div className="mt-6 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase">
            {friendlyDate(selectedDate)}
          </h2>
          <span className="text-[12px] text-white/40">
            {loadingSlots ? '' : `${slots.length} slots`}
          </span>
        </div>

        {loadingSlots ? (
          <div className="py-12 flex items-center justify-center text-white/40">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : availabilityError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-5 text-center">
            <p className="text-[14px] font-medium text-red-100">
              {availabilityError}
            </p>
            <button
              type="button"
              onClick={retryAvailability}
              className="mt-3 h-9 rounded-full border border-red-300/25 px-4 text-[13px] font-semibold text-red-100 active:scale-95"
            >
              Retry
            </button>
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-7 text-center">
            <p className="text-[14px] font-semibold text-white/75">
              No slots available on this day.
            </p>
            <p className="mx-auto mt-1 max-w-[260px] text-[12.5px] leading-snug text-white/45">
              Try the next date or ask the AI tab to find the soonest opening.
            </p>
            <button
              type="button"
              onClick={chooseNextDate}
              disabled={selectedDate.toDateString() === dates[dates.length - 1]?.toDateString()}
              className="mt-4 h-10 rounded-full bg-white/[0.06] px-5 text-[13px] font-semibold text-white/80 border border-white/[0.10] active:scale-95 disabled:opacity-40"
            >
              Try next date
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((iso) => {
              const dt = new Date(iso);
              const active = selectedSlot === iso;
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedSlot(iso)}
                  className={`
                    h-12 rounded-2xl text-[14px] font-semibold
                    transition-all active:scale-95
                    ${
                      active
                        ? 'text-black'
                        : 'bg-white/[0.03] border border-white/[0.08] text-white/85 hover:border-white/20'
                    }
                  `}
                  style={
                    active
                      ? {
                          backgroundColor: colour,
                        }
                      : undefined
                  }
                >
                  {timeLabel(dt)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky confirm */}
      <div
        className="
          fixed left-0 right-0 z-40 px-4 pb-[110px] pt-6
          bg-gradient-to-t from-[#020202] via-[#020202]/95 to-transparent
        "
        style={{ bottom: 0 }}
      >
        {error && (
          <p className="mb-2 text-center text-[12px] text-red-400">{error}</p>
        )}
        <p className="mb-2 text-center text-[12px] text-white/45">
          {selectedSlot
            ? requiresOnlinePayment
              ? 'Next step: secure Stripe payment. Your slot is held briefly.'
              : 'No online payment is needed. This confirms the booking.'
            : 'Choose a time to continue.'}
        </p>
        <button
          onClick={confirmBooking}
          disabled={!selectedSlot || submitting}
          className="
            w-full h-14 rounded-full font-semibold text-[15px]
            flex items-center justify-center gap-2
            disabled:opacity-40 disabled:pointer-events-none
            active:scale-[0.98] transition
            shadow-[0_10px_30px_rgba(0,0,0,0.5)]
          "
          style={{
            backgroundColor: colour,
            color: '#000',
          }}
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" strokeWidth={2.5} />
              {selectedSlot
                ? `Confirm for ${timeLabel(new Date(selectedSlot))}`
                : 'Select a time'}
            </>
          )}
        </button>
      </div>
    </>
  );
}
