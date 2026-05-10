'use client';

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  loadStripe,
  type Stripe,
  type PaymentRequest as StripePaymentRequest,
  type StripeElementsOptions,
} from '@stripe/stripe-js';
import {
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';

import TopBar from './components/TopBar';
import Hero from './components/Hero';
import BookingSummary from './components/BookingSummary';
import Countdown from './components/Countdown';
import PaymentBlock from './components/PaymentBlock';
import ConfirmCTA from './components/ConfirmCTA';
import { Field, PhoneField, TextAreaField } from './components/Field';
import BridgeCard, { type AssistantSource } from './components/BridgeCard';
import { pickContextualLine } from '@/lib/checkout/contextual-lines';
import { categoryIconFor } from '@/lib/checkout/category-icons';

export type CustomerHints = {
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type CheckoutBundle = {
  token: string;
  hold: { id: string; expires_at: string; server_now: string };
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
    category: string | null;
    tagline: string | null;
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
  source_assistant: string | null;
  is_free: boolean;
  payment_mode: 'stripe_now' | 'in_person';
  is_promoted: boolean;
  original_price_cents: number | null;
  start_voice: string;
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
function getStripePromise(pk: string): Promise<Stripe | null> {
  // The PaymentIntent is created on the platform account with
  // transfer_data.destination (destination charges), so Stripe.js must
  // run unscoped — passing { stripeAccount } here would scope retrieve
  // calls to the connected account where the PI does not exist and
  // surface as "No such payment_intent" on confirm.
  let cached = STRIPE_CACHE.get(pk);
  if (!cached) {
    cached = loadStripe(pk);
    STRIPE_CACHE.set(pk, cached);
  }
  return cached;
}

const FALLBACK_STRIPE_PROMISE: Promise<Stripe | null> = process.env
  .NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

const STRIPE_APPEARANCE: NonNullable<StripeElementsOptions['appearance']> = {
  theme: 'night',
  variables: {
    colorPrimary: '#D4AF37',
    colorBackground: '#161616',
    colorText: '#F5F5F0',
    colorDanger: '#E84B4B',
    fontFamily: 'Geist Sans, system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '8px',
  },
  rules: {
    '.Input': { backgroundColor: '#161616', border: '1px solid #1F1F1F' },
    '.Input:focus': { border: '1px solid #D4AF37' },
    '.Label': { color: '#A1A1A1', fontSize: '13px', fontWeight: '500' },
  },
};

export default function CheckoutClient(props: Props) {
  if (props.mode === 'expired') {
    return <ExpiredView token={props.token} businessName={props.expiredBusinessName} />;
  }

  const { bundle } = props;

  // In-person path: skip Stripe Elements entirely. The /confirm endpoint
  // handles the booking write and returns the reference. Free services
  // (price_cents === 0) and businesses without Stripe Connect both flow
  // through here.
  if (bundle.payment_mode === 'in_person') {
    return (
      <PageShell bundle={bundle}>
        {props.mode === 'confirmed' ? (
          <ConfirmedView bundle={bundle} />
        ) : (
          <InPersonReadyView bundle={bundle} />
        )}
      </PageShell>
    );
  }

  const isPayable =
    Boolean(bundle.stripe_publishable_key) &&
    Boolean(bundle.business.stripe_account_id) &&
    bundle.business.stripe_charges_enabled;

  if (!bundle.is_free && !isPayable) {
    // Defensive: getPaymentMode should have routed every non-payable
    // business through the in_person branch above. If we get here the
    // bundle is inconsistent (e.g. a stale cached payment_mode value).
    return <PageShell bundle={bundle}><NotPayableView businessName={bundle.business.name} /></PageShell>;
  }

  const stripePromise =
    !bundle.is_free && isPayable
      ? getStripePromise(bundle.stripe_publishable_key!)
      : FALLBACK_STRIPE_PROMISE;

  // For paid bookings we initialise Elements in deferred mode so the
  // PaymentElement can render before we have a PaymentIntent. We pass the
  // amount/currency up front and create the PaymentIntent lazily on submit.
  const elementsOptions: StripeElementsOptions = bundle.is_free
    ? { appearance: STRIPE_APPEARANCE }
    : {
        mode: 'payment',
        amount: bundle.service.price_cents,
        currency: 'eur',
        appearance: STRIPE_APPEARANCE,
        // The MCP checkout is single-purpose; we don't reuse cards.
      };

  return (
    <PageShell bundle={bundle}>
      <Elements stripe={stripePromise} options={elementsOptions}>
        {props.mode === 'confirmed' ? (
          <ConfirmedView bundle={bundle} />
        ) : (
          <ReadyView bundle={bundle} />
        )}
      </Elements>
    </PageShell>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Page shell — top bar, hero, animated main column, footer.
// ──────────────────────────────────────────────────────────────────────────

function PageShell({ bundle, children }: { bundle: CheckoutBundle; children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--ob-co-bg)',
        color: 'var(--ob-co-text-1)',
        fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
        fontSize: 16,
        lineHeight: 1.5,
      }}
    >
      <TopBar>
        <Countdown
          expiresAt={bundle.hold.expires_at}
          serverNow={bundle.hold.server_now}
        />
      </TopBar>
      <div className="ob-co-page-enter">
        <Hero business={bundle.business} />
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto',
            padding: '32px 24px 48px',
            display: 'grid',
            gap: 32,
          }}
        >
          {children}
        </div>
        <Footer businessName={bundle.business.name} />
      </div>
    </main>
  );
}

function Footer({ businessName }: { businessName: string }) {
  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '0 24px 48px',
        fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
        fontSize: 12,
        fontWeight: 400,
        color: 'var(--ob-co-text-3)',
        lineHeight: 1.6,
      }}
    >
      <div>By booking you agree to {businessName}&apos;s cancellation policy.</div>
      <div>
        Powered by{' '}
        <a
          href="https://openbook.ie"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--ob-co-gold)', textDecoration: 'none', fontWeight: 500 }}
        >
          OpenBook
        </a>
        .
      </div>
    </footer>
  );
}

function NotPayableView({ businessName }: { businessName: string }) {
  return (
    <section
      style={{
        background: 'var(--ob-co-surface)',
        border: '1px solid var(--ob-co-border-quiet)',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
        Payments aren&apos;t available right now
      </h1>
      <p style={{ marginTop: 12, color: 'var(--ob-co-text-2)', fontSize: 15 }}>
        {businessName} hasn&apos;t finished setting up online payments yet. Try again
        soon, or contact them directly.
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

  const anyPrefilled = useMemo(() => {
    const h = bundle.customer_hints;
    return Boolean(h.name || h.email || h.phone || h.notes);
  }, [bundle.customer_hints]);

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
  // PaymentRequest button when canMakePayment resolves true. canMakePayment
  // will return false in dev — that's expected and we render nothing.
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
      // Wallet flow: server creates a PaymentIntent, we confirm it with the
      // wallet payment_method, then call finalise to wait for the webhook
      // to flip the booking row.
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

  const onSubmit = async (e: FormEvent) => {
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

    // Deferred PaymentElement flow:
    //   1. elements.submit() validates the card form locally.
    //   2. Server creates the PaymentIntent (returns client_secret).
    //   3. stripe.confirmPayment() confirms inline; redirect:'if_required'
    //      keeps us on-page unless 3DS forces a redirect.
    setPhase('processing');
    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setSubmitError(submitErr.message ?? 'Please check your card details.');
      setPhase('ready');
      return;
    }

    const intent = await createIntent(bundle.token, { name, email, phone, notes });
    if (intent.kind === 'error') {
      setSubmitError(intent.message);
      setPhase('ready');
      return;
    }
    if (intent.kind === 'free') {
      setConfirmedBookingId(intent.booking_id);
      setPhase('confirmed');
      return;
    }

    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: intent.client_secret,
      confirmParams: {
        return_url: typeof window !== 'undefined' ? window.location.href : 'https://openbook.ie',
        payment_method_data: {
          billing_details: {
            name,
            email,
            phone: phone || undefined,
          },
        },
      },
      redirect: 'if_required',
    });
    if (confirmErr) {
      setSubmitError(confirmErr.message ?? 'Card was declined');
      setPhase('ready');
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

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 32 }}>
      <BookingSummary
        serviceName={bundle.service.name}
        startVoice={bundle.start_voice}
        durationMinutes={bundle.service.duration_minutes}
        city={bundle.business.city}
        isFree={bundle.is_free}
        priceCents={bundle.service.price_cents}
        isPromoted={bundle.is_promoted}
        originalPriceCents={bundle.original_price_cents}
        accent={bundle.business.primary_colour}
      />

      <fieldset
        disabled={isProcessing}
        style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}
      >
        {anyPrefilled ? <PreFillPill /> : null}

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
        <PhoneField
          value={phone}
          onChange={setPhone}
          initiallyVisible={Boolean(bundle.customer_hints.phone)}
        />
        <TextAreaField
          label="Anything we should know? — optional"
          value={notes}
          onChange={setNotes}
          rows={3}
          placeholder=""
        />

        {!bundle.is_free ? (
          <PaymentBlock paymentRequest={paymentRequest} walletAvailable={walletAvailable} />
        ) : null}

        {submitError ? (
          <div
            role="alert"
            style={{
              color: 'var(--ob-co-danger)',
              fontSize: 14,
              padding: '12px 16px',
              background: 'rgba(232, 75, 75, 0.08)',
              border: '1px solid rgba(232, 75, 75, 0.25)',
              borderRadius: 8,
            }}
          >
            {submitError}
          </div>
        ) : null}

        <ConfirmCTA
          isFree={bundle.is_free}
          priceCents={bundle.service.price_cents}
          isProcessing={isProcessing}
          disabled={!formValid || stripeLoading}
        />
      </fieldset>
    </form>
  );
}

function PreFillPill() {
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--ob-co-surface-elev)',
        border: '1px solid var(--ob-co-border-quiet)',
        borderRadius: 999,
        padding: '6px 12px',
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
        style={{ color: 'var(--ob-co-gold)' }}
      >
        <path
          d="M6 1.5l1.4 3 3.1.4-2.3 2.1.6 3-2.8-1.6-2.8 1.6.6-3-2.3-2.1 3.1-.4z"
          fill="currentColor"
        />
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
          fontWeight: 400,
          fontSize: 12,
          color: 'var(--ob-co-text-2)',
        }}
      >
        Pre-filled from your conversation
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// In-person ready state. No Stripe Elements. Required phone field. Submit
// posts directly to /api/c/[token]/confirm. The page is responsible for
// surfacing the amount the customer will pay at the business on the day.
// ──────────────────────────────────────────────────────────────────────────

function formatEurosLine(cents: number): string {
  const euros = cents / 100;
  return `€${euros.toFixed(euros % 1 === 0 ? 0 : 2)}`;
}

function InPersonReadyView({ bundle }: { bundle: CheckoutBundle }) {
  const [name, setName] = useState(bundle.customer_hints.name ?? '');
  const [email, setEmail] = useState(bundle.customer_hints.email ?? '');
  const [phone, setPhone] = useState(bundle.customer_hints.phone ?? '');
  const [notes, setNotes] = useState(
    bundle.customer_hints.notes ?? bundle.booking.notes ?? '',
  );

  const anyPrefilled = useMemo(() => {
    const h = bundle.customer_hints;
    return Boolean(h.name || h.email || h.phone || h.notes);
  }, [bundle.customer_hints]);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'ready' | 'processing' | 'confirmed'>('ready');
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

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

  const validatePhone = (value: string): boolean => {
    if (!value || !value.trim()) {
      setPhoneError('Phone is required so the business can reach you');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateEmail(email)) return;
    if (!name.trim()) return;
    if (!validatePhone(phone)) return;

    setPhase('processing');
    try {
      const res = await fetch(`/api/c/${bundle.token}/confirm`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, phone, notes }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const code = typeof json.error === 'string' ? json.error : 'Could not confirm booking';
        // Surface a real error message rather than the bare error code.
        setSubmitError(
          code === 'missing_required_fields'
            ? 'Please fill in your name, email and phone.'
            : code === 'hold_expired' || code === 'hold_unavailable'
              ? 'Sorry, this slot is no longer being held. Please pick another time.'
              : code === 'already_confirmed'
                ? 'This booking is already confirmed.'
                : 'Could not confirm your booking. Please try again in a moment.',
        );
        setPhase('ready');
        return;
      }
      const bookingId = typeof json.booking_id === 'string' ? json.booking_id : bundle.booking.id;
      setConfirmedBookingId(bookingId);
      setPhase('confirmed');
    } catch (err) {
      console.error('[checkout] in-person submit failed', err);
      setSubmitError('Network error - check your connection and retry.');
      setPhase('ready');
    }
  };

  if (phase === 'confirmed') {
    return (
      <ConfirmedView bundle={bundle} bookingIdOverride={confirmedBookingId ?? undefined} />
    );
  }

  const isProcessing = phase === 'processing';
  const formValid =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    phone.trim().length > 0;

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 32 }}>
      <BookingSummary
        serviceName={bundle.service.name}
        startVoice={bundle.start_voice}
        durationMinutes={bundle.service.duration_minutes}
        city={bundle.business.city}
        isFree={bundle.is_free}
        priceCents={bundle.service.price_cents}
        isPromoted={bundle.is_promoted}
        originalPriceCents={bundle.original_price_cents}
        accent={bundle.business.primary_colour}
      />

      {bundle.service.price_cents > 0 ? (
        <section
          style={{
            background: 'var(--ob-co-surface)',
            border: '1px solid var(--ob-co-border-quiet)',
            borderRadius: 12,
            padding: '20px 24px',
            display: 'grid',
            gap: 6,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--ob-co-text-1)',
            }}
          >
            Pay {formatEurosLine(bundle.service.price_cents)} at {bundle.business.name} on the day.
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
              fontSize: 14,
              color: 'var(--ob-co-text-2)',
            }}
          >
            We hold the slot for you now. You settle directly with the business when you arrive.
          </div>
        </section>
      ) : null}

      <fieldset
        disabled={isProcessing}
        style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}
      >
        {anyPrefilled ? <PreFillPill /> : null}

        <Field
          label="Email *"
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
          label="Name *"
          required
          autoComplete="name"
          value={name}
          onChange={setName}
        />
        <Field
          label="Phone *"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(v) => {
            setPhone(v);
            if (phoneError) validatePhone(v);
          }}
          onBlur={() => validatePhone(phone)}
          error={phoneError}
        />
        <TextAreaField
          label="Anything we should know? — optional"
          value={notes}
          onChange={setNotes}
          rows={3}
          placeholder=""
        />

        {submitError ? (
          <div
            role="alert"
            style={{
              color: 'var(--ob-co-danger)',
              fontSize: 14,
              padding: '12px 16px',
              background: 'rgba(232, 75, 75, 0.08)',
              border: '1px solid rgba(232, 75, 75, 0.25)',
              borderRadius: 8,
            }}
          >
            {submitError}
          </div>
        ) : null}

        <ConfirmCTA
          isFree={bundle.is_free}
          priceCents={bundle.service.price_cents}
          isProcessing={isProcessing}
          disabled={!formValid}
        />
      </fieldset>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Confirmed state — name+time-aware headline, contextual line, action row,
// and the assistant bridge card.
// ──────────────────────────────────────────────────────────────────────────

function firstNameOf(full: string | null): string | null {
  if (!full) return null;
  const trimmed = full.trim().split(/\s+/)[0];
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function pickConfirmedHeadline(startIso: string, firstName: string | null): string {
  const startMs = new Date(startIso).getTime();
  const nowMs = Date.now();
  const diffMs = startMs - nowMs;
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  const trailing = firstName ? `, ${firstName}` : '';
  if (diffMs > oneDay) return `Booking confirmed${trailing}.`;
  if (diffMs > oneHour) return `You're set${trailing}.`;
  return `All set${trailing}.`;
}

function normaliseAssistant(raw: string | null | undefined): AssistantSource {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === 'chatgpt' || v === 'claude' || v === 'gemini' || v === 'siri') return v;
  return 'other';
}

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

  const firstName = firstNameOf(bundle.customer_hints.name);
  const headline = pickConfirmedHeadline(bundle.booking.starts_at, firstName);
  const contextualLine = pickContextualLine(bookingId, bundle.business.category);
  const Icon = categoryIconFor(bundle.business.category);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section
        style={{
          background: 'var(--ob-co-surface)',
          border: '1px solid var(--ob-co-border-quiet)',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            background: 'var(--ob-co-gold)',
            color: '#080808',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          ✓
        </div>
        <h1
          suppressHydrationWarning
          style={{
            fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
            fontWeight: 600,
            fontSize: 'clamp(28px, 6vw, 32px)',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            margin: 0,
            color: 'var(--ob-co-text-1)',
          }}
        >
          {headline}
        </h1>
        <p
          style={{
            margin: 0,
            marginTop: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 16,
            color: 'var(--ob-co-text-2)',
          }}
        >
          <Icon size={18} color="var(--ob-co-gold)" aria-hidden />
          <span>{contextualLine}</span>
        </p>
        <p style={{ marginTop: 16, fontSize: 17, color: 'var(--ob-co-text-2)' }}>
          {bundle.service.name} with {bundle.business.name}
          <br />
          {bundle.formatted.date_human}.
        </p>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--ob-co-text-3)' }}>
          Reference: {bookingId.slice(0, 8)}
        </p>
        <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
          <SecondaryLink href={`/api/c/${bundle.token}/ics`} download>
            Add to Calendar
          </SecondaryLink>
          {mapsUrl ? (
            <SecondaryLink href={mapsUrl} target="_blank" rel="noreferrer">
              Get Directions
            </SecondaryLink>
          ) : null}
          {messageUrl ? (
            <SecondaryLink href={messageUrl}>
              Message {bundle.business.name.split(' ')[0]}
            </SecondaryLink>
          ) : null}
        </div>
      </section>
      <BridgeCard sourceAssistant={normaliseAssistant(bundle.source_assistant)} />
    </div>
  );
}

function SecondaryLink({
  href,
  children,
  target,
  rel,
  download,
}: {
  href: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      download={download || undefined}
      style={{
        textDecoration: 'none',
        color: 'var(--ob-co-text-1)',
        padding: '14px',
        borderRadius: 12,
        border: '1px solid var(--ob-co-border-quiet)',
        background: 'var(--ob-co-surface-elev)',
        fontWeight: 500,
        textAlign: 'center',
        fontSize: 15,
      }}
    >
      {children}
    </a>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Expired state — kept for PR 2 redesign; minimally re-skinned to dark.
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
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--ob-co-bg)',
        color: 'var(--ob-co-text-1)',
        fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
      }}
    >
      <TopBar />
      <section
        style={{
          maxWidth: 520,
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>That slot&apos;s gone</h1>
        {businessName ? (
          <p style={{ marginTop: 8, color: 'var(--ob-co-text-2)' }}>
            Here are three more times from {businessName}:
          </p>
        ) : (
          <p style={{ marginTop: 8, color: 'var(--ob-co-text-2)' }}>
            Here are some other times:
          </p>
        )}
        {alts === null && !error ? (
          <div className="ob-co-skeleton" style={{ height: 56, marginTop: 16 }} />
        ) : null}
        {error ? <p style={{ color: 'var(--ob-co-danger)' }}>{error}</p> : null}
        {alts ? (
          alts.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 10 }}>
              {alts.map((a) => (
                <li key={a.start_iso}>
                  <a
                    href={a.rebook_url}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid var(--ob-co-border-quiet)',
                      background: 'var(--ob-co-surface-elev)',
                      textDecoration: 'none',
                      color: 'var(--ob-co-text-1)',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{a.start_human}</span>
                    <span style={{ fontSize: 13, color: 'var(--ob-co-text-3)' }}>
                      {a.start_compact}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--ob-co-text-2)' }}>
              No nearby times — try the business&apos;s page for the full calendar.
            </p>
          )
        ) : null}
      </section>
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
  // Quick round (3 attempts × 2s) covers the network-interruption-mid-payment
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
