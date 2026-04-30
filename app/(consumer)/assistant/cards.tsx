'use client';

/**
 * All inline cards rendered inside the AI tab conversation:
 *   - BusinessChips  — search_businesses results
 *   - AvailabilitySlots — pickable time chips after get_availability
 *   - ProposalCard — propose_slot result with Confirm / Cancel
 *   - PaymentCard  — payment_required with Stripe button + countdown + polling
 *   - ConfirmedCard — booking confirmed (free path or after payment)
 *   - AuthGateCard — sign-in form for anonymous proposal confirmations
 *   - ToolPill / ErrorPill / TypingDots — small inline status elements
 *
 * All visual styling stays inside the iOS-26 liquid-glass aesthetic the
 * tab already uses. Per-business primary_colour drives card accents only —
 * never the global gold/black theme.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Star,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { getTileColour } from '@/lib/tile-palette';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  formatProposalTime,
  formatSlotTime,
  formatPrice,
  formatCountdown,
} from './format';
import type {
  AvailabilitySlot,
  AuthGate,
  BusinessSummary,
  ConfirmedBooking,
  PaymentRequest,
  Proposal,
} from './types';

// ----------------------------------------------------------------------------
// Building blocks
// ----------------------------------------------------------------------------

const cardEnter = 'animate-reveal-up';

export function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-white/55">
      <span className="block w-1.5 h-1.5 rounded-full bg-white/55 animate-gentle-pulse" />
      <span
        className="block w-1.5 h-1.5 rounded-full bg-white/55 animate-gentle-pulse"
        style={{ animationDelay: '0.15s' }}
      />
      <span
        className="block w-1.5 h-1.5 rounded-full bg-white/55 animate-gentle-pulse"
        style={{ animationDelay: '0.3s' }}
      />
    </div>
  );
}

export function ToolPill({
  label,
}: {
  label: string;
}) {
  return (
    <div
      className={`${cardEnter} inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/65`}
    >
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorPill({
  message,
  tone = 'soft',
}: {
  message: string;
  tone?: 'soft' | 'firm';
}) {
  return (
    <div
      className={`${cardEnter} inline-flex items-start gap-2 px-3 py-2 rounded-2xl text-[13px] leading-snug ${
        tone === 'firm'
          ? 'bg-red-500/10 border border-red-500/30 text-red-200'
          : 'bg-white/[0.04] border border-white/[0.08] text-white/70'
      }`}
    >
      <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-80" />
      <span>{message}</span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Business chips
// ----------------------------------------------------------------------------

export function BusinessChips({ businesses }: { businesses: BusinessSummary[] }) {
  if (!businesses.length) return null;
  return (
    <div className={`${cardEnter} flex flex-col gap-2 max-w-[86%]`}>
      {businesses.map((b) => {
        const colour = getTileColour(b.primary_colour).mid;
        return (
          <Link
            key={b.business_id}
            href={`/business/${b.slug}`}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 active:scale-[0.99] transition"
          >
            <div
              className="w-12 h-12 rounded-xl shrink-0"
              style={{
                background: `linear-gradient(140deg, ${colour} 0%, ${colour}55 100%)`,
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white truncate font-serif">
                {b.name}
              </p>
              <p className="text-[12px] text-white/55 truncate">
                {b.category}
                {b.address ? ` · ${b.address}` : ''}
              </p>
            </div>
            {b.rating != null && (
              <div className="flex items-center gap-1 pr-1">
                <Star
                  className="w-[12px] h-[12px]"
                  strokeWidth={0}
                  style={{ fill: colour, color: colour }}
                />
                <span className="text-[12px] font-medium text-white/80">
                  {Number(b.rating).toFixed(1)}
                </span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Availability slot chips
// ----------------------------------------------------------------------------

export function AvailabilitySlots({
  slots,
  onPick,
  disabled,
}: {
  slots: AvailabilitySlot[];
  onPick: (slot: AvailabilitySlot) => void;
  disabled?: boolean;
}) {
  if (!slots.length) return null;
  return (
    <div className={`${cardEnter} max-w-[92%]`}>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {slots.map((s) => (
          <button
            key={s.slot_start}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="shrink-0 px-3.5 h-9 rounded-full bg-white/[0.05] border border-white/[0.10] text-[13px] font-medium text-white/85 hover:border-white/25 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
          >
            {formatSlotTime(s.slot_start)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Proposal
// ----------------------------------------------------------------------------

export function ProposalCard({
  proposal,
  onConfirm,
  onCancel,
}: {
  proposal: Proposal;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const accent = getTileColour(undefined).mid;
  const status = proposal.status ?? 'open';

  const durationMin = Math.round(
    (new Date(proposal.slot_end).getTime() -
      new Date(proposal.slot_start).getTime()) /
      60000
  );

  return (
    <div
      className={`${cardEnter} max-w-[92%] rounded-3xl p-4 mat-glass-thin`}
      style={{
        borderColor: accent,
        boxShadow: `0 0 0 0.5px ${accent}40, 0 12px 36px rgba(0,0,0,0.5)`,
      }}
    >
      <p
        className="text-[10px] font-semibold tracking-[0.22em] uppercase mb-2"
        style={{ color: accent }}
      >
        Proposed booking
      </p>
      <h3 className="text-[20px] font-serif leading-tight text-white">
        {proposal.business_name}
      </h3>
      <p className="text-[14px] text-white/80 mt-0.5">
        {proposal.service_name}
        {durationMin > 0 ? ` · ${durationMin} min` : ''}
      </p>
      <p className="text-[14px] text-white/65 mt-1">
        {formatProposalTime(proposal.slot_start)}
      </p>
      <p className="text-[16px] font-semibold mt-2" style={{ color: accent }}>
        {formatPrice(proposal.price_cents)}
      </p>

      {status === 'open' ? (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-11 rounded-full text-[14px] font-semibold text-black active:scale-95 transition"
            style={{
              background: accent,
              boxShadow: `0 4px 14px ${accent}55`,
            }}
          >
            Confirm booking
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-4 rounded-full text-[14px] font-medium text-white/80 border border-white/15 hover:border-white/30 active:scale-95 transition"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-white/50">
          {status === 'confirmed'
            ? 'Confirmed — see below.'
            : 'Cancelled — let me know if you want to try another time.'}
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Payment
// ----------------------------------------------------------------------------

export function PaymentCard({
  payment,
  onStatusChange,
  onExpired,
  onRetry,
}: {
  payment: PaymentRequest;
  onStatusChange: (next: PaymentRequest) => void;
  onExpired: () => void;
  onRetry: () => void;
}) {
  const accent = getTileColour(undefined).mid;
  const expiresAt = payment.expires_at
    ? new Date(payment.expires_at).getTime()
    : Date.now() + 10 * 60 * 1000;
  const [now, setNow] = useState(() => Date.now());
  const status = payment.status ?? 'awaiting_payment';

  // 1Hz countdown tick.
  useEffect(() => {
    if (status !== 'awaiting_payment') return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [status]);

  // Polling — every 3s while card is open. Bails on confirmed/expired.
  useEffect(() => {
    if (status !== 'awaiting_payment') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/booking/${payment.booking_id}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          booking?: { status?: string };
        };
        const bookingStatus = json.booking?.status;
        if (cancelled) return;
        if (bookingStatus === 'confirmed') {
          onStatusChange({ ...payment, status: 'confirmed' });
        }
      } catch {
        /* network blip — try again next tick */
      }
    };
    void poll();
    const i = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [payment, status, onStatusChange]);

  // Expiry handler — fires once when countdown crosses zero.
  const expiredFiredRef = useRef(false);
  useEffect(() => {
    if (status !== 'awaiting_payment') return;
    if (now < expiresAt) return;
    if (expiredFiredRef.current) return;
    expiredFiredRef.current = true;
    onExpired();
  }, [now, expiresAt, status, onExpired]);

  if (status === 'expired') {
    return (
      <div className={`${cardEnter} max-w-[92%] rounded-3xl p-4 mat-glass-thin border-white/10`}>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/55 mb-2">
          Slot released
        </p>
        <h3 className="text-[18px] font-serif text-white leading-tight">
          That hold expired
        </h3>
        <p className="text-[13px] text-white/65 mt-1">
          Payment wasn't completed in time, so the slot has been released. We can
          look at other times.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-11 px-5 rounded-full text-[14px] font-semibold text-black active:scale-95 transition"
          style={{ background: accent }}
        >
          Try a different time
        </button>
      </div>
    );
  }

  if (status === 'confirmed') {
    // Caller will replace this with a ConfirmedCard message; render nothing.
    return null;
  }

  const remaining = expiresAt - now;

  return (
    <div
      className={`${cardEnter} max-w-[92%] rounded-3xl p-4 mat-glass-thin`}
      style={{
        borderColor: accent,
        boxShadow: `0 0 0 0.5px ${accent}40, 0 12px 36px rgba(0,0,0,0.5)`,
      }}
    >
      <p
        className="text-[10px] font-semibold tracking-[0.22em] uppercase mb-2"
        style={{ color: accent }}
      >
        Payment required
      </p>
      <h3 className="text-[20px] font-serif text-white leading-tight">
        Pay {formatPrice(payment.proposal.price_cents)} to confirm your booking
      </h3>
      <p className="text-[14px] text-white/75 mt-1">
        {payment.proposal.service_name} · {payment.proposal.business_name}
      </p>
      <p className="text-[13px] text-white/60 mt-0.5">
        {formatProposalTime(payment.proposal.slot_start)}
      </p>

      <button
        type="button"
        onClick={() =>
          window.open(payment.payment_url, '_blank', 'noopener,noreferrer')
        }
        className="mt-4 w-full h-12 rounded-full text-[15px] font-semibold text-black flex items-center justify-center gap-2 active:scale-[0.98] transition"
        style={{
          background: accent,
          boxShadow: `0 6px 18px ${accent}55`,
        }}
      >
        <span>Pay with Stripe</span>
        <ExternalLink className="w-4 h-4" />
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-white/55">
        <Clock className="w-3.5 h-3.5" />
        <span>Slot held for {formatCountdown(remaining)}</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Confirmed
// ----------------------------------------------------------------------------

export function ConfirmedCard({ booking }: { booking: ConfirmedBooking }) {
  const accent = getTileColour(undefined).mid;
  return (
    <div
      className={`${cardEnter} max-w-[92%] rounded-3xl p-4 mat-glass-thin`}
      style={{
        borderColor: accent,
        boxShadow: `0 0 0 0.5px ${accent}40, 0 12px 36px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4" style={{ color: accent }} />
        <p
          className="text-[10px] font-semibold tracking-[0.22em] uppercase"
          style={{ color: accent }}
        >
          Booked
        </p>
      </div>
      <h3 className="text-[20px] font-serif leading-tight text-white">
        {booking.business_name}
      </h3>
      <p className="text-[14px] text-white/80 mt-0.5">{booking.service_name}</p>
      <p className="text-[14px] text-white/65 mt-1">
        {formatProposalTime(booking.slot_start)}
      </p>
      <p className="text-[14px] text-white/65 mt-0.5">
        {formatPrice(booking.price_cents)}
      </p>
      <Link
        href={`/consumer-bookings/${booking.booking_id}`}
        className="mt-4 inline-flex items-center justify-center gap-1.5 w-full h-11 rounded-full text-[14px] font-semibold text-black active:scale-95 transition"
        style={{ background: accent }}
      >
        <span>View in Bookings</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Auth gate
// ----------------------------------------------------------------------------

export function AuthGateCard({
  gate,
  conversationId,
  onSent,
}: {
  gate: AuthGate;
  conversationId: string;
  onSent: () => void;
}) {
  const accent = getTileColour(undefined).mid;
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const next = `/assistant?resume=${encodeURIComponent(conversationId)}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (otpError) {
        setError(otpError.message);
      } else {
        onSent();
      }
    } catch (err: any) {
      setError(err?.message ?? 'Could not send sign-in link.');
    } finally {
      setSubmitting(false);
    }
  }

  const proposal = gate.pending_proposal;

  return (
    <div
      className={`${cardEnter} max-w-[92%] rounded-3xl p-4 mat-glass-thin`}
      style={{
        borderColor: accent,
        boxShadow: `0 0 0 0.5px ${accent}40, 0 12px 36px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4" style={{ color: accent }} />
        <p
          className="text-[10px] font-semibold tracking-[0.22em] uppercase"
          style={{ color: accent }}
        >
          Sign in to confirm
        </p>
      </div>
      <h3 className="text-[20px] font-serif leading-tight text-white">
        Sign in to confirm your booking
      </h3>
      <div className="mt-2 text-[13px] text-white/70">
        <p>
          {proposal.service_name} · {proposal.business_name}
        </p>
        <p className="text-white/55">{formatProposalTime(proposal.slot_start)}</p>
        <p className="text-white/55">{formatPrice(proposal.price_cents)}</p>
      </div>

      {gate.state === 'pending' ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
          <label className="flex items-center gap-2 h-11 px-4 rounded-full bg-white/[0.05] border border-white/[0.10] focus-within:border-white/30 transition">
            <Mail className="w-4 h-4 text-white/55" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-white/35"
              disabled={submitting}
            />
          </label>
          <button
            type="submit"
            disabled={!email.trim() || submitting}
            className="h-11 rounded-full text-[14px] font-semibold text-black active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5"
            style={{ background: accent }}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Send sign-in link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          {error && (
            <p className="text-[12px] text-red-300 px-1">{error}</p>
          )}
        </form>
      ) : (
        <p className="mt-4 text-[13px] text-white/75 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
          Check your email — we sent a link.
        </p>
      )}
    </div>
  );
}
