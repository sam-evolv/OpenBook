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
}

const DATE_DAYS = 14;

export function SlotPicker({
  serviceId,
  businessId,
  businessSlug,
  colour,
}: SlotPickerProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

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
        const data = await res.json();
        if (!cancelled) setSlots(data.slots ?? []);
      } catch {
        if (!cancelled) setSlots([]);
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
    if (!customerName.trim()) {
      setError('Please enter your name.');
      return;
    }
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
          customer: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim(),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Could not create booking');
      }

      const data = await res.json();
      router.push(`/booking/confirm?id=${data.bookingId}`);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
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
        ) : slots.length === 0 ? (
          <div className="py-12 text-center text-white/45 text-[14px]">
            No slots available on this day.
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

      {/* Contact details */}
      <div className="mt-8 px-5">
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase mb-3">
          Your details
        </h2>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            className="
              h-12 px-4 rounded-2xl text-[14px]
              bg-white/[0.03] border border-white/[0.08]
              text-white placeholder:text-white/35
              focus:outline-none focus:border-white/25
              transition
            "
          />
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="Email (optional)"
            autoComplete="email"
            className="
              h-12 px-4 rounded-2xl text-[14px]
              bg-white/[0.03] border border-white/[0.08]
              text-white placeholder:text-white/35
              focus:outline-none focus:border-white/25
              transition
            "
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone (optional)"
            autoComplete="tel"
            className="
              h-12 px-4 rounded-2xl text-[14px]
              bg-white/[0.03] border border-white/[0.08]
              text-white placeholder:text-white/35
              focus:outline-none focus:border-white/25
              transition
            "
          />
        </div>
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
