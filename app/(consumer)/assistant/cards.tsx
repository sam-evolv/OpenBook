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
  ArrowRight,
  Star,
  XCircle,
  Clock,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { OpenBookMark } from '@/components/consumer/OpenBookMark';
import { BusinessIcon } from '@/components/consumer/BusinessIcon';
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

/**
 * Premium "thinking" state shown after the user sends a message and
 * before the first token arrives. A pulsing gold-on-black AI mark sits
 * next to a shimmering "Thinking" label — feels considered rather than
 * a generic loader.
 */
export function ThinkingState() {
  return (
    <div className={`${cardEnter} flex items-center gap-2.5`}>
      <div
        className="relative w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, #1a1a1a 0%, #050505 100%)',
          boxShadow:
            '0 0 0 0.5px rgba(212,175,55,0.45), 0 0 22px rgba(212,175,55,0.35)',
        }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full animate-think-glow"
          style={{
            background:
              'radial-gradient(circle, rgba(212,175,55,0.45) 0%, transparent 70%)',
          }}
        />
        <OpenBookMark
          size={14}
          strokeWidth={1.7}
          style={{ color: '#D4AF37', position: 'relative' }}
        />
      </div>
      <span className="thinking-shimmer text-[13.5px] font-medium tracking-tight">
        Thinking
        <span className="thinking-ellipsis">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </span>
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
            <BusinessIcon
              name={b.name}
              primary_colour={b.primary_colour}
              processed_icon_url={b.processed_icon_url}
              logo_url={b.logo_url}
              size={48}
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
          {status === 'cancelled'
            ? 'Cancelled — let me know if you want to try another time.'
            : proposal.requires_payment
              ? 'Payment required — see below.'
              : 'Confirmed — see below.'}
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
    : Date.now() + 30 * 60 * 1000;
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

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

export function AuthGateCard({
  gate,
  conversationId,
}: {
  gate: AuthGate;
  conversationId: string;
}) {
  const accent = getTileColour(undefined).mid;
  const [loading, setLoading] = useState<'apple' | 'google' | 'email' | null>(null);
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function callbackUrl() {
    const next = encodeURIComponent(`/assistant?resume=${conversationId}`);
    return `${window.location.origin}/auth/callback?next=${next}`;
  }

  async function continueWithProvider(provider: 'apple' | 'google') {
    if (loading) return;
    setLoading(provider);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl(),
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setLoading(null);
      }
      // On success the browser is already redirecting to the provider.
    } catch (err: any) {
      setError(err?.message ?? 'Could not start sign-in.');
      setLoading(null);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading('email');
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl(),
        },
      });
      if (otpError) {
        setError(otpError.message);
      } else {
        setEmailSent(true);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Could not send magic link.');
    } finally {
      setLoading(null);
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

      {emailSent ? (
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
          <p className="text-[14px] font-semibold text-white">Check your inbox</p>
          <p className="mt-1 text-[12.5px] leading-snug text-white/55">
            We sent a secure link to {email}. It will bring this booking back.
          </p>
          <button
            type="button"
            onClick={() => {
              setEmailSent(false);
              setEmailMode(false);
            }}
            className="mt-3 text-[12.5px] font-semibold"
            style={{ color: accent }}
          >
            Use another method
          </button>
        </div>
      ) : emailMode ? (
        <form onSubmit={sendMagicLink} className="mt-4 flex flex-col gap-2">
          <div className="flex h-11 items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.03] px-4">
            <Mail className="h-4 w-4 text-white/45" strokeWidth={2} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/35"
            />
          </div>
          <button
            type="submit"
            disabled={loading !== null || !email.trim()}
            className="h-11 rounded-full text-[14px] font-semibold text-black active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            style={{ background: accent }}
          >
            {loading === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send magic link'}
          </button>
          <button
            type="button"
            onClick={() => setEmailMode(false)}
            className="h-9 rounded-full text-[13px] font-medium text-white/55 active:scale-95"
          >
            Back
          </button>
          {error && <p className="text-[12px] text-red-300 px-1">{error}</p>}
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => continueWithProvider('apple')}
            disabled={loading !== null}
            className="h-11 rounded-full text-[14px] font-semibold text-white active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 border border-white/15 bg-white/[0.06]"
          >
            {loading === 'apple' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <AppleIcon />
                <span>Continue with Apple</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => continueWithProvider('google')}
            disabled={loading !== null}
            className="h-11 rounded-full text-[14px] font-semibold text-black active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            style={{ background: accent }}
          >
            {loading === 'google' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setEmailMode(true)}
            className="h-10 rounded-full text-[13px] font-medium text-white/60 active:scale-95"
          >
            Or continue with email
          </button>
          {error && <p className="text-[12px] text-red-300 px-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
