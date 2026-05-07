'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { loadStripe, type Stripe, type PaymentRequest as StripePaymentRequest } from '@stripe/stripe-js';
import {
  CardElement,
  Elements,
  PaymentRequestButtonElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';

export type CustomerHints = {
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type CheckoutBundle = {
  token: string;
  hold: { id: string; expires_at: string };
  booking: {
    id: string;
    status: string | null;
    starts_at: string;
    ends_at: string;
    notes: string | null;
  };
  business: {
    id: string;
    name: string;
    slug: string;
    primary_colour: string;
    logo_url: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean;
  };
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    price_cents: number;
  };
  customer_hints: CustomerHints;
  is_free: boolean;
  formatted: {
    date_human: string;
    date_compact: string;
    end_compact: string;
  };
  stripe_publishable_key: string | null;
};

type Props =
  | {
      mode: 'ready' | 'confirmed';
      token: string;
      bundle: CheckoutBundle;
      expiredReason?: never;
      expiredBusinessName?: never;
    }
  | {
      mode: 'expired';
      token: string;
      expiredReason: string;
      expiredBusinessName: string | null;
      bundle?: never;
    };

const STRIPE_CACHE = new Map<string, Promise<Stripe | null>>();
function getStripePromise(pk: string, connectedAccountId?: string | null): Promise<Stripe | null> {
  // The Stripe.js singleton must be keyed by both the publishable key and
  // the connected account so we don't reuse a Stripe instance scoped to
  // the wrong business when two MCP checkouts open in the same tab session.
  const key = `${pk}::${connectedAccountId ?? ''}`;
  let cached = STRIPE_CACHE.get(key);
  if (!cached) {
    cached = loadStripe(pk, connectedAccountId ? { stripeAccount: connectedAccountId } : undefined);
    STRIPE_CACHE.set(key, cached);
  }
  return cached;
}

// Module-scope fallback used by the <Elements> wrapper on free/confirmed
// paths. ReadyView calls useStripe()/useElements() unconditionally, so it
// must always render inside an <Elements> tree even when the form will
// never actually charge a card. Initialised once.
const FALLBACK_STRIPE_PROMISE: Promise<Stripe | null> = process.env
  .NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

export default function CheckoutClient(props: Props) {
  if (props.mode === 'expired') {
    return <ExpiredView token={props.token} businessName={props.expiredBusinessName} />;
  }

  const { bundle } = props;
  const accent = bundle.business.primary_colour;
  const themeStyle: CSSProperties = {
    // CSS custom properties drive every accent surface so the rest of the
    // tree stays brand-agnostic and we never inline business colour into
    // 30 places.
    ['--accent' as string]: accent,
    ['--accent-fg' as string]: pickAccentForeground(accent),
  };

  const isPayable =
    Boolean(bundle.stripe_publishable_key) &&
    Boolean(bundle.business.stripe_account_id) &&
    bundle.business.stripe_charges_enabled;

  if (!bundle.is_free && !isPayable) {
    return (
      <main className="ob-checkout" style={themeStyle}>
        <Header business={bundle.business} />
        <NotPayableView businessName={bundle.business.name} />
        <Footer businessName={bundle.business.name} />
      </main>
    );
  }

  const stripePromise =
    !bundle.is_free && isPayable
      ? getStripePromise(bundle.stripe_publishable_key!, bundle.business.stripe_account_id)
      : FALLBACK_STRIPE_PROMISE;

  return (
    <main className="ob-checkout" style={themeStyle}>
      <Header business={bundle.business} />
      <Elements
        stripe={stripePromise}
        options={{
          // Match the page accent in Stripe Element default themes.
          appearance: {
            theme: 'flat',
            variables: { colorPrimary: accent, fontFamily: 'inherit', borderRadius: '12px' },
          },
        }}
      >
        {props.mode === 'confirmed' ? (
          <ConfirmedView bundle={bundle} />
        ) : (
          <ReadyView bundle={bundle} />
        )}
      </Elements>
      <Footer businessName={bundle.business.name} />
    </main>
  );
}

function Header({ business }: { business: CheckoutBundle['business'] }) {
  return (
    <header className="ob-header">
      {business.logo_url ? (
        <img
          src={business.logo_url}
          alt={`${business.name} logo`}
          className="ob-logo"
          width={40}
          height={40}
        />
      ) : (
        <div className="ob-logo ob-logo-fallback" aria-hidden>
          {business.name.charAt(0)}
        </div>
      )}
      <div className="ob-header-name">{business.name}</div>
    </header>
  );
}

function Footer({ businessName }: { businessName: string }) {
  return (
    <p className="ob-footer">
      By booking you agree to {businessName}&apos;s cancellation policy.
      Powered by <span>OpenBook</span>.
    </p>
  );
}

function NotPayableView({ businessName }: { businessName: string }) {
  return (
    <section className="ob-card">
      <h1>Payments aren&apos;t available right now</h1>
      <p>
        {businessName} hasn&apos;t finished setting up online payments yet.
        Try again soon, or contact them directly.
      </p>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Ready state
// ──────────────────────────────────────────────────────────────────────────

function ReadyView({ bundle }: { bundle: CheckoutBundle }) {
  const stripe = useStripe();
  const elements = useElements();

  const [name, setName] = useState(bundle.customer_hints.name ?? '');
  const [email, setEmail] = useState(bundle.customer_hints.email ?? '');
  const [phone, setPhone] = useState(bundle.customer_hints.phone ?? '');
  const [notes, setNotes] = useState(
    bundle.customer_hints.notes ?? bundle.booking.notes ?? '',
  );
  const notesPrefilled = Boolean(bundle.customer_hints.notes);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    'ready' | 'processing' | 'awaiting_webhook' | 'confirmed' | 'declined'
  >('ready');
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  const [paymentRequest, setPaymentRequest] = useState<StripePaymentRequest | null>(null);
  const [walletAvailable, setWalletAvailable] = useState(false);

  // ── Wallet support detection (Apple Pay / Google Pay / Link)
  // Returns null if no supported method is available; we only render the
  // PaymentRequest button when canMakePayment resolves true.
  useEffect(() => {
    if (!stripe || bundle.is_free) return;
    const pr = stripe.paymentRequest({
      country: 'IE',
      currency: 'eur',
      total: { label: bundle.service.name, amount: bundle.service.price_cents },
      requestPayerEmail: true,
      requestPayerName: true,
      requestPayerPhone: true,
    });
    pr.canMakePayment().then((res) => {
      if (res) {
        setPaymentRequest(pr);
        setWalletAvailable(true);
      }
    });
    pr.on('paymentmethod', async (ev) => {
      // Wallet flow: server creates a PaymentIntent, we confirm it with
      // the wallet payment_method, then call finalise to wait for the
      // webhook to flip the booking row.
      setPhase('processing');
      try {
        const customerName = ev.payerName ?? name;
        const customerEmail = ev.payerEmail ?? email;
        const customerPhone = ev.payerPhone ?? phone;
        const intent = await createIntent(bundle.token, {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          notes,
        });
        if (intent.kind === 'free' || intent.kind === 'error') {
          ev.complete('fail');
          if (intent.kind === 'error') setSubmitError(intent.message);
          setPhase('ready');
          return;
        }
        const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(
          intent.client_secret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false },
        );
        if (confirmErr) {
          ev.complete('fail');
          setPhase('declined');
          setSubmitError(confirmErr.message ?? 'Payment failed');
          return;
        }
        ev.complete('success');
        if (paymentIntent && paymentIntent.status === 'requires_action') {
          // 3DS challenge — Stripe handles via redirect/popup.
          await stripe.confirmCardPayment(intent.client_secret);
        }
        setPhase('awaiting_webhook');
        const final = await waitForFinalisation(bundle.token, paymentIntent?.id);
        if (final.confirmed) {
          setConfirmedBookingId(final.booking_id);
          setPhase('confirmed');
        } else {
          setSubmitError('Payment received but confirmation is delayed. Refresh in a moment.');
          setPhase('declined');
        }
      } catch (err) {
        ev.complete('fail');
        console.error('[checkout] wallet flow failed', err);
        setSubmitError('Payment failed. Please try again.');
        setPhase('declined');
      }
    });
  }, [stripe, bundle, name, email, phone, notes]);

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const onSubmitCard = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateEmail(email)) return;
    if (!name.trim()) return;

    if (bundle.is_free) {
      setPhase('processing');
      const intent = await createIntent(bundle.token, { name, email, phone, notes });
      if (intent.kind === 'free') {
        setConfirmedBookingId(intent.booking_id);
        setPhase('confirmed');
        return;
      }
      setSubmitError(intent.kind === 'error' ? intent.message : 'Could not confirm booking.');
      setPhase('ready');
      return;
    }

    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setPhase('processing');
    const intent = await createIntent(bundle.token, { name, email, phone, notes });
    if (intent.kind === 'error') {
      setSubmitError(intent.message);
      setPhase('ready');
      return;
    }
    if (intent.kind === 'free') {
      // Defensive: server shouldn't return free from a paid path, but if it
      // does, treat it as confirmed.
      setConfirmedBookingId(intent.booking_id);
      setPhase('confirmed');
      return;
    }

    const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(
      intent.client_secret,
      { payment_method: { card, billing_details: { name, email, phone: phone || undefined } } },
    );
    if (confirmErr) {
      setSubmitError(confirmErr.message ?? 'Card was declined');
      setPhase('ready'); // slot still held, user can retry
      return;
    }
    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      setSubmitError('Payment did not succeed. Please try another card.');
      setPhase('ready');
      return;
    }

    setPhase('awaiting_webhook');
    const final = await waitForFinalisation(bundle.token, paymentIntent.id);
    if (final.confirmed) {
      setConfirmedBookingId(final.booking_id);
      setPhase('confirmed');
    } else {
      setSubmitError('Payment received but confirmation is delayed. Refresh in a moment.');
      setPhase('declined');
    }
  };

  if (phase === 'confirmed') {
    return <ConfirmedView bundle={bundle} bookingIdOverride={confirmedBookingId ?? undefined} />;
  }

  const isProcessing = phase === 'processing' || phase === 'awaiting_webhook';
  const formValid = name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const stripeLoading = !bundle.is_free && !stripe;
  const ctaLabel = stripeLoading
    ? 'Loading payment form…'
    : bundle.is_free
      ? 'Confirm Booking'
      : `Confirm and Pay €${(bundle.service.price_cents / 100).toFixed(2)}`;

  return (
    <form className="ob-card" onSubmit={onSubmitCard}>
      <SummaryBlock bundle={bundle} />

      <fieldset disabled={isProcessing} className="ob-fields">
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (emailError) validateEmail(v);
          }}
          onBlur={() => validateEmail(email)}
          error={emailError}
        />
        <Field
          label="Name"
          required
          autoComplete="name"
          value={name}
          onChange={setName}
        />
        <Field
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={setPhone}
        />

        <NotesField
          businessName={bundle.business.name}
          value={notes}
          onChange={setNotes}
          prefilled={notesPrefilled}
        />

        {!bundle.is_free && walletAvailable && paymentRequest ? (
          <div className="ob-wallet">
            <PaymentRequestButtonElement
              options={{ paymentRequest, style: { paymentRequestButton: { height: '52px' } } }}
            />
          </div>
        ) : null}

        {!bundle.is_free ? (
          <div className="ob-card-input">
            <label className="ob-label">{walletAvailable ? 'Or pay with card' : 'Pay with card'}</label>
            <div className="ob-stripe-wrap">
              <CardElement
                options={{ hidePostalCode: true, style: { base: { fontSize: '16px' } } }}
              />
            </div>
          </div>
        ) : null}

        {submitError ? <div className="ob-error" role="alert">{submitError}</div> : null}

        <button
          type="submit"
          className="ob-cta"
          disabled={!formValid || isProcessing || stripeLoading}
          aria-busy={isProcessing || undefined}
        >
          {isProcessing ? <Spinner /> : null}
          <span>{ctaLabel}</span>
        </button>
      </fieldset>

      <Countdown expiresAt={bundle.hold.expires_at} />

      <CheckoutStyles />
    </form>
  );
}

function SummaryBlock({ bundle }: { bundle: CheckoutBundle }) {
  const locality = [bundle.business.address, bundle.business.city]
    .filter(Boolean)
    .join(', ');
  return (
    <div className="ob-summary">
      <div className="ob-service">{bundle.service.name}</div>
      <div className="ob-time">
        {bundle.formatted.date_compact} — {bundle.formatted.end_compact.split(', ')[1] ?? ''}
      </div>
      {locality ? <div className="ob-locality">{locality}</div> : null}
      <div className="ob-price">
        {bundle.is_free ? 'Free' : `€${(bundle.service.price_cents / 100).toFixed(2)}`}
      </div>
      <hr className="ob-divider" />
    </div>
  );
}

function NotesField({
  businessName,
  value,
  onChange,
  prefilled,
}: {
  businessName: string;
  value: string;
  onChange: (v: string) => void;
  prefilled: boolean;
}) {
  const firstName = businessName.split(' ')[0];
  return (
    <label className="ob-field ob-notes">
      <span className="ob-label">Anything {firstName} should know?</span>
      <textarea
        className="ob-textarea"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional"
      />
      {prefilled ? (
        <span className="ob-prefill-hint">↑ pre-filled from your conversation</span>
      ) : null}
    </label>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  required,
  error,
  autoComplete,
  inputMode,
  onBlur,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string | null;
  autoComplete?: string;
  inputMode?: 'email' | 'tel' | 'text' | 'numeric';
  onBlur?: () => void;
}) {
  return (
    <label className="ob-field">
      <span className="ob-label">{label}</span>
      <input
        className={`ob-input ${error ? 'ob-input-error' : ''}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onBlur={onBlur}
      />
      {error ? <span className="ob-error-inline">{error}</span> : null}
    </label>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Countdown
// ──────────────────────────────────────────────────────────────────────────

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const totalSec = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const danger = totalSec <= 60;
  const expired = totalSec === 0;

  return (
    <div className={`ob-countdown ${danger ? 'ob-countdown-danger' : ''}`} role="timer" aria-live="polite">
      {expired
        ? 'Hold expired — refresh for new options.'
        : `Slot held for ${minutes}:${String(seconds).padStart(2, '0')}`}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Confirmed state
// ──────────────────────────────────────────────────────────────────────────

function ConfirmedView({
  bundle,
  bookingIdOverride,
}: {
  bundle: CheckoutBundle;
  bookingIdOverride?: string;
}) {
  const bookingId = bookingIdOverride ?? bundle.booking.id;
  const mapsUrl = bundle.business.address
    ? `https://maps.google.com/?q=${encodeURIComponent(`${bundle.business.name} ${bundle.business.address}`)}`
    : null;
  const messageUrl = bundle.business.phone
    ? `sms:${bundle.business.phone.replace(/\s+/g, '')}`
    : null;

  return (
    <section className="ob-card ob-confirmed">
      <div className="ob-check" aria-hidden>✓</div>
      <h1>You&apos;re booked</h1>
      <p className="ob-confirmed-summary">
        {bundle.service.name} with {bundle.business.name}
        <br />
        {bundle.formatted.date_human}.
      </p>
      <p className="ob-confirmed-id">Reference: {bookingId.slice(0, 8)}</p>
      <div className="ob-confirmed-actions">
        <a className="ob-secondary" href={`/api/c/${bundle.token}/ics`} download>
          Add to Calendar
        </a>
        {mapsUrl ? (
          <a className="ob-secondary" href={mapsUrl} target="_blank" rel="noreferrer">
            Get Directions
          </a>
        ) : null}
        {messageUrl ? (
          <a className="ob-secondary" href={messageUrl}>
            Message {bundle.business.name.split(' ')[0]}
          </a>
        ) : null}
      </div>
      <CheckoutStyles />
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Expired state
// ──────────────────────────────────────────────────────────────────────────

type Alternative = {
  start_iso: string;
  start_human: string;
  start_compact: string;
  rebook_url: string;
};

function ExpiredView({
  token,
  businessName,
}: {
  token: string;
  businessName: string | null;
}) {
  const [alts, setAlts] = useState<Alternative[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    fetch(`/api/c/${token}/alternatives`)
      .then(async (res) => {
        if (!res.ok) throw new Error('alternatives_failed');
        const json = (await res.json()) as { alternatives: Alternative[] };
        if (!abort) setAlts(json.alternatives ?? []);
      })
      .catch(() => {
        if (!abort) setError("We couldn't load other times — try the business page directly.");
      });
    return () => {
      abort = true;
    };
  }, [token]);

  return (
    <main className="ob-checkout">
      <section className="ob-card ob-expired">
        <h1>That slot&apos;s gone</h1>
        {businessName ? (
          <p>Here are three more times from {businessName}:</p>
        ) : (
          <p>Here are some other times:</p>
        )}
        {alts === null && !error ? <Spinner /> : null}
        {error ? <p className="ob-error">{error}</p> : null}
        {alts ? (
          alts.length > 0 ? (
            <ul className="ob-alts">
              {alts.map((a) => (
                <li key={a.start_iso}>
                  <a className="ob-alt" href={a.rebook_url}>
                    <span className="ob-alt-time">{a.start_human}</span>
                    <span className="ob-alt-compact">{a.start_compact}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No nearby times — try the business&apos;s page for the full calendar.</p>
          )
        ) : null}
      </section>
      <CheckoutStyles />
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Network helpers
// ──────────────────────────────────────────────────────────────────────────

type CreateIntentResult =
  | { kind: 'paid'; client_secret: string; payment_intent_id: string }
  | { kind: 'free'; booking_id: string }
  | { kind: 'error'; message: string };

async function createIntent(
  token: string,
  body: { name: string; email: string; phone: string; notes: string },
): Promise<CreateIntentResult> {
  try {
    const res = await fetch(`/api/c/${token}/create-payment-intent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { kind: 'error', message: typeof json.error === 'string' ? json.error : 'Could not start checkout.' };
    }
    if (json.is_free === true && typeof json.booking_id === 'string') {
      return { kind: 'free', booking_id: json.booking_id };
    }
    if (typeof json.client_secret === 'string' && typeof json.payment_intent_id === 'string') {
      return {
        kind: 'paid',
        client_secret: json.client_secret,
        payment_intent_id: json.payment_intent_id,
      };
    }
    return { kind: 'error', message: 'Unexpected server response.' };
  } catch {
    return { kind: 'error', message: 'Network error — check your connection and retry.' };
  }
}

async function waitForFinalisation(
  token: string,
  paymentIntentId?: string,
): Promise<{ confirmed: boolean; booking_id: string }> {
  // The webhook is authoritative; finalise polls for status='confirmed'.
  // Quick round (3s) first, then a slower retry round (30s total) in case
  // the webhook is delayed — covers the network-interruption-mid-payment
  // edge case from Section 7.3.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await postFinalise(token, paymentIntentId);
    if (res.confirmed) return res;
    if (res.payment_failed) return { confirmed: false, booking_id: '' };
    await sleep(2000);
  }
  return { confirmed: false, booking_id: '' };
}

async function postFinalise(
  token: string,
  paymentIntentId?: string,
): Promise<{ confirmed: boolean; booking_id: string; payment_failed?: boolean }> {
  try {
    const res = await fetch(`/api/c/${token}/finalise`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payment_intent_id: paymentIntentId ?? null }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      confirmed: json.confirmed === true,
      booking_id: typeof json.booking_id === 'string' ? json.booking_id : '',
      payment_failed: json.payment_failed === true,
    };
  } catch {
    return { confirmed: false, booking_id: '' };
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function pickAccentForeground(hex: string): string {
  // Use luminance to choose readable foreground (white/black) on the brand
  // accent. Pure black accents (the fallback) get white foreground.
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0f0f12' : '#ffffff';
}

function Spinner() {
  return <span className="ob-spinner" aria-hidden />;
}

function CheckoutStyles(): ReactNode {
  // Page-scoped styles, kept here so this PR doesn't rearrange globals.css.
  // The values follow the Section 7.2 layout brief: mobile-first, generous
  // padding, accent-driven CTAs, ≥16px body. All accent surfaces read from
  // CSS custom properties set on the page root.
  return (
    <style>{`
      .ob-checkout {
        min-height: 100dvh;
        background: var(--ob-bg, #fff);
        color: var(--ob-fg, #0f0f12);
        font-family: var(--font-geist-sans, system-ui, -apple-system, sans-serif);
        font-size: 16px;
        max-width: 480px;
        margin: 0 auto;
        padding: 0 24px 48px;
      }
      @media (prefers-color-scheme: dark) {
        .ob-checkout { background: #080808; color: #f7f7f8; }
      }
      .ob-header {
        display: flex; align-items: center; gap: 12px;
        padding: 20px 0; height: 64px;
      }
      .ob-logo {
        width: 40px; height: 40px; border-radius: 10px;
        object-fit: cover; background: #f0f0f3;
      }
      .ob-logo-fallback {
        display: grid; place-items: center;
        background: var(--accent); color: var(--accent-fg);
        font-weight: 600;
      }
      .ob-header-name { font-weight: 600; font-size: 17px; }
      .ob-card { padding: 8px 0 0; }
      .ob-summary { padding-bottom: 8px; }
      .ob-service { font-size: 22px; font-weight: 600; line-height: 1.2; }
      .ob-time { margin-top: 4px; font-size: 17px; opacity: 0.8; }
      .ob-locality { margin-top: 2px; opacity: 0.6; font-size: 15px; }
      .ob-price { margin-top: 16px; font-size: 28px; font-weight: 600; }
      .ob-divider { border: 0; border-top: 1px solid rgba(0,0,0,0.08); margin: 20px 0 24px; }
      @media (prefers-color-scheme: dark) {
        .ob-divider { border-top-color: rgba(255,255,255,0.1); }
      }
      .ob-fields { border: 0; padding: 0; margin: 0; display: grid; gap: 20px; }
      .ob-field { display: grid; gap: 6px; }
      .ob-label { font-size: 13px; font-weight: 500; opacity: 0.7; }
      .ob-input, .ob-textarea {
        font: inherit; padding: 12px 14px; border-radius: 12px;
        border: 1px solid rgba(0,0,0,0.12); background: rgba(0,0,0,0.02);
        color: inherit;
      }
      @media (prefers-color-scheme: dark) {
        .ob-input, .ob-textarea {
          border-color: rgba(255,255,255,0.16); background: rgba(255,255,255,0.04);
        }
      }
      .ob-input:focus, .ob-textarea:focus {
        outline: 2px solid var(--accent); outline-offset: 1px;
      }
      .ob-input-error { border-color: #d33; }
      .ob-error-inline { color: #d33; font-size: 13px; }
      .ob-prefill-hint { font-size: 12px; opacity: 0.7; margin-top: 4px; }
      .ob-wallet { margin-top: 8px; }
      .ob-card-input { display: grid; gap: 6px; }
      .ob-stripe-wrap {
        padding: 14px; border-radius: 12px; background: rgba(0,0,0,0.02);
        border: 1px solid rgba(0,0,0,0.12);
      }
      @media (prefers-color-scheme: dark) {
        .ob-stripe-wrap { border-color: rgba(255,255,255,0.16); background: rgba(255,255,255,0.04); }
      }
      .ob-error { color: #d33; font-size: 14px; }
      .ob-cta {
        margin-top: 4px; padding: 16px;
        background: var(--accent); color: var(--accent-fg);
        border: 0; border-radius: 14px; font: inherit; font-weight: 600;
        font-size: 17px; min-height: 52px;
        display: inline-flex; align-items: center; justify-content: center; gap: 10px;
        cursor: pointer;
      }
      .ob-cta:disabled { opacity: 0.6; cursor: default; }
      .ob-countdown { margin-top: 16px; opacity: 0.7; font-size: 14px; text-align: center; }
      .ob-countdown-danger { color: #d33; opacity: 1; }
      .ob-footer { margin-top: 32px; font-size: 12px; opacity: 0.6; text-align: center; }
      .ob-footer span { font-weight: 600; }

      .ob-confirmed { text-align: center; padding-top: 32px; }
      .ob-check {
        width: 64px; height: 64px; border-radius: 32px;
        background: var(--accent); color: var(--accent-fg);
        display: grid; place-items: center; margin: 0 auto 16px;
        font-size: 32px; font-weight: 700;
      }
      .ob-confirmed h1 { font-size: 24px; margin: 0; }
      .ob-confirmed-summary { margin-top: 8px; font-size: 17px; }
      .ob-confirmed-id { margin-top: 4px; font-size: 13px; opacity: 0.6; }
      .ob-confirmed-actions {
        margin-top: 24px; display: grid; gap: 10px;
      }
      .ob-secondary {
        text-decoration: none; color: inherit;
        padding: 14px; border-radius: 12px;
        border: 1px solid rgba(0,0,0,0.12); background: transparent;
        font-weight: 500; text-align: center;
      }
      @media (prefers-color-scheme: dark) {
        .ob-secondary { border-color: rgba(255,255,255,0.16); }
      }

      .ob-expired h1 { font-size: 22px; }
      .ob-alts { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 10px; }
      .ob-alt {
        display: flex; justify-content: space-between; align-items: center;
        padding: 14px; border-radius: 12px;
        border: 1px solid rgba(0,0,0,0.12);
        text-decoration: none; color: inherit;
      }
      @media (prefers-color-scheme: dark) {
        .ob-alt { border-color: rgba(255,255,255,0.16); }
      }
      .ob-alt-time { font-weight: 500; }
      .ob-alt-compact { font-size: 13px; opacity: 0.6; }

      .ob-spinner {
        width: 18px; height: 18px; border-radius: 50%;
        border: 2px solid currentColor; border-top-color: transparent;
        animation: ob-spin 0.8s linear infinite;
      }
      @keyframes ob-spin { to { transform: rotate(360deg); } }
    `}</style>
  );
}
