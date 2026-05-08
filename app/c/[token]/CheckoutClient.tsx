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
import SuccessState from './components/SuccessState';
import BridgeCard, { type AssistantSource } from './components/BridgeCard';
import { ExpiredState, SlotTakenState } from './components/EdgeStates';

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
      expiredSourceAssistant?: never;
    }
  | {
      mode: 'expired';
      token: string;
      expiredReason: string;
      expiredBusinessName: string | null;
      expiredSourceAssistant: string | null;
      bundle?: never;
    };

function normaliseAssistant(raw: string | null | undefined): AssistantSource {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === 'chatgpt' || v === 'claude' || v === 'gemini' || v === 'siri') return v;
  return 'other';
}

const STRIPE_CACHE = new Map<string, Promise<Stripe | null>>();
function getStripePromise(pk: string, connectedAccountId?: string | null): Promise<Stripe | null> {
  // The Stripe.js singleton is keyed by both the publishable key and the
  // connected account so we don't reuse a Stripe instance scoped to the
  // wrong business when two MCP checkouts open in the same tab session.
  const key = `${pk}::${connectedAccountId ?? ''}`;
  let cached = STRIPE_CACHE.get(key);
  if (!cached) {
    cached = loadStripe(pk, connectedAccountId ? { stripeAccount: connectedAccountId } : undefined);
    STRIPE_CACHE.set(key, cached);
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
    return (
      <ExpiredShell>
        <ExpiredState sourceAssistant={normaliseAssistant(props.expiredSourceAssistant)} />
      </ExpiredShell>
    );
  }

  const { bundle } = props;

  const isPayable =
    Boolean(bundle.stripe_publishable_key) &&
    Boolean(bundle.business.stripe_account_id) &&
    bundle.business.stripe_charges_enabled;

  if (!bundle.is_free && !isPayable) {
    return <PageShell bundle={bundle}><NotPayableView businessName={bundle.business.name} /></PageShell>;
  }

  const stripePromise =
    !bundle.is_free && isPayable
      ? getStripePromise(bundle.stripe_publishable_key!, bundle.business.stripe_account_id)
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
    <Elements stripe={stripePromise} options={elementsOptions}>
      {props.mode === 'confirmed' ? (
        <PageShell bundle={bundle} topBarRight={<ConfirmedPill />}>
          <ConfirmedView bundle={bundle} />
        </PageShell>
      ) : (
        <ReadyView bundle={bundle} />
      )}
    </Elements>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Page shell — top bar, hero, animated main column, footer.
// ──────────────────────────────────────────────────────────────────────────

function PageShell({
  bundle,
  children,
  topBarRight,
}: {
  bundle: CheckoutBundle;
  children: ReactNode;
  topBarRight?: ReactNode;
}) {
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
        {topBarRight ?? (
          <Countdown
            expiresAt={bundle.hold.expires_at}
            serverNow={bundle.hold.server_now}
          />
        )}
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

function ExpiredShell({ children }: { children: ReactNode }) {
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
      <TopBar />
      <div className="ob-co-page-enter">{children}</div>
    </main>
  );
}

function ConfirmedPill() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
        fontWeight: 500,
        fontSize: 12,
        color: 'var(--ob-co-gold)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: 'var(--ob-co-confirm-green)',
        }}
      />
      Confirmed
    </span>
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
  // Phases:
  //   ready                — initial form
  //   processing           — confirm in-flight (one attempt)
  //   awaiting_webhook     — payment succeeded, polling /finalise
  //   retrying             — confirm failed, auto-retry running
  //   network_failed       — all auto-retries exhausted; "Try again." surface
  //   slot_taken           — server returned SLOT_UNAVAILABLE
  //   transitioning        — booking confirmed, briefly co-rendering form fade-out + success
  //   confirmed            — success state only
  //   declined             — payment failed cleanly
  const [phase, setPhase] = useState<
    | 'ready'
    | 'processing'
    | 'awaiting_webhook'
    | 'retrying'
    | 'network_failed'
    | 'slot_taken'
    | 'transitioning'
    | 'confirmed'
    | 'declined'
  >('ready');
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

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
        if (intent.kind !== 'paid') {
          ev.complete('fail');
          if (intent.kind === 'error') setSubmitError(intent.message);
          if (intent.kind === 'slot_taken') setPhase('slot_taken');
          else if (intent.kind === 'network_failed') setPhase('network_failed');
          else if (intent.kind === 'free') {
            // Wallets shouldn't trigger the free path, but if it happens
            // we still want to surface the success state.
            flipToConfirmed(intent.booking_id);
          } else {
            setPhase('ready');
          }
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
          setPhase('transitioning');
          setTimeout(() => setPhase('confirmed'), 250);
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

  const flipToConfirmed = (bookingId: string) => {
    setConfirmedBookingId(bookingId);
    // Brief co-render so the form fades out while the success block fades in.
    setPhase('transitioning');
    setTimeout(() => setPhase('confirmed'), 250);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateEmail(email)) return;
    if (!name.trim()) return;

    if (bundle.is_free) {
      setPhase('processing');
      const intent = await createIntentWithRetry(
        bundle.token,
        { name, email, phone, notes },
        (attempt) => {
          setRetryAttempt(attempt);
          if (attempt > 0) setPhase('retrying');
        },
      );
      if (intent.kind === 'free') {
        flipToConfirmed(intent.booking_id);
        return;
      }
      if (intent.kind === 'slot_taken') {
        setPhase('slot_taken');
        return;
      }
      if (intent.kind === 'network_failed') {
        setPhase('network_failed');
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

    const intent = await createIntentWithRetry(
      bundle.token,
      { name, email, phone, notes },
      (attempt) => {
        setRetryAttempt(attempt);
        if (attempt > 0) setPhase('retrying');
      },
    );
    if (intent.kind === 'error') {
      setSubmitError(intent.message);
      setPhase('ready');
      return;
    }
    if (intent.kind === 'slot_taken') {
      setPhase('slot_taken');
      return;
    }
    if (intent.kind === 'network_failed') {
      setPhase('network_failed');
      return;
    }
    if (intent.kind === 'free') {
      flipToConfirmed(intent.booking_id);
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
      flipToConfirmed(final.booking_id);
    } else {
      setSubmitError('Payment received but confirmation is delayed. Refresh in a moment.');
      setPhase('declined');
    }
  };

  // Slot-taken edge state — full-width, no booking summary card.
  if (phase === 'slot_taken') {
    return (
      <ExpiredShell>
        <SlotTakenState
          token={bundle.token}
          sourceAssistant={normaliseAssistant(bundle.source_assistant)}
        />
      </ExpiredShell>
    );
  }

  // Confirmed — render the success block + bridge card. Top-bar pill replaces
  // the countdown.
  if (phase === 'confirmed') {
    return (
      <PageShell bundle={bundle} topBarRight={<ConfirmedPill />}>
        <ConfirmedView bundle={bundle} bookingIdOverride={confirmedBookingId ?? undefined} />
      </PageShell>
    );
  }

  const isProcessing =
    phase === 'processing' || phase === 'awaiting_webhook' || phase === 'retrying';
  const formValid = name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const stripeLoading = !bundle.is_free && !stripe;

  // Transitioning — co-render the form (fade-out class) and the success
  // block beneath it so the success block's entrance feels like a reveal,
  // not an abrupt swap.
  if (phase === 'transitioning') {
    return (
      <PageShell bundle={bundle} topBarRight={<ConfirmedPill />}>
        <div style={{ display: 'grid', gap: 32 }}>
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
          <div className="ob-co-form-fade-out" aria-hidden style={{ minHeight: 0 }}>
            {/* The form is being torn down; suppress interaction. */}
            <ConfirmCTA
              isFree={bundle.is_free}
              priceCents={bundle.service.price_cents}
              isProcessing
              disabled
            />
          </div>
          <SuccessState
            bookingId={confirmedBookingId ?? bundle.booking.id}
            startIso={bundle.booking.starts_at}
            endIso={bundle.booking.ends_at}
            serviceName={bundle.service.name}
            customerName={bundle.customer_hints.name}
            category={bundle.business.category}
            businessName={bundle.business.name}
            businessAddress={bundle.business.address}
            businessPhone={bundle.business.phone}
          />
          <BridgeCard sourceAssistant={normaliseAssistant(bundle.source_assistant)} />
        </div>
      </PageShell>
    );
  }

  const isNetworkFailed = phase === 'network_failed';
  const showRetrySlowHint = phase === 'retrying' && retryAttempt >= 2;

  return (
    <PageShell bundle={bundle}>
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

          {isNetworkFailed ? (
            <p
              role="status"
              style={{
                margin: 0,
                fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
                fontWeight: 500,
                fontSize: 15,
                color: 'var(--ob-co-text-2)',
                textAlign: 'center',
              }}
            >
              We couldn&apos;t confirm that booking. Your slot is still held — tap to try again.
            </p>
          ) : null}

          <ConfirmCTA
            isFree={bundle.is_free}
            priceCents={bundle.service.price_cents}
            isProcessing={isProcessing}
            disabled={!formValid || stripeLoading}
            tryAgain={isNetworkFailed}
          />

          {showRetrySlowHint ? (
            <p
              style={{
                margin: 0,
                marginTop: -8,
                fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
                fontWeight: 400,
                fontSize: 13,
                color: 'var(--ob-co-text-3)',
                textAlign: 'center',
              }}
            >
              Network slow — still trying…
            </p>
          ) : null}
        </fieldset>
      </form>
    </PageShell>
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
// Confirmed state — success block + bridge card (PR 2)
// ──────────────────────────────────────────────────────────────────────────

function ConfirmedView({
  bundle,
  bookingIdOverride,
}: {
  bundle: CheckoutBundle;
  bookingIdOverride?: string;
}) {
  const bookingId = bookingIdOverride ?? bundle.booking.id;
  return (
    <div style={{ display: 'grid', gap: 24 }}>
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
      <SuccessState
        bookingId={bookingId}
        startIso={bundle.booking.starts_at}
        endIso={bundle.booking.ends_at}
        serviceName={bundle.service.name}
        customerName={bundle.customer_hints.name}
        category={bundle.business.category}
        businessName={bundle.business.name}
        businessAddress={bundle.business.address}
        businessPhone={bundle.business.phone}
      />
      <BridgeCard sourceAssistant={normaliseAssistant(bundle.source_assistant)} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Network helpers
// ──────────────────────────────────────────────────────────────────────────

type CreateIntentResult =
  | { kind: 'paid'; client_secret: string; payment_intent_id: string }
  | { kind: 'free'; booking_id: string }
  | { kind: 'slot_taken' }
  | { kind: 'network_failed' }
  | { kind: 'error'; message: string };

// Retry wrapper. Network errors retry up to 3 times with exponential backoff
// (1s, 2s, 4s). Non-network errors short-circuit immediately. Server-side
// 410 (hold expired / unavailable) maps to slot_taken so the UI can offer
// alternatives instead of a generic "couldn't confirm" toast.
async function createIntentWithRetry(
  token: string,
  body: { name: string; email: string; phone: string; notes: string },
  onAttempt: (attempt: number) => void,
): Promise<CreateIntentResult> {
  const delays = [1000, 2000, 4000];
  let lastNetworkError = false;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    onAttempt(attempt);
    const result = await createIntent(token, body);
    if (result.kind !== 'error') return result;
    if (result.kind === 'error' && result.message === '__slot_taken__') {
      return { kind: 'slot_taken' };
    }
    lastNetworkError = result.message === '__network_error__';
    if (!lastNetworkError) return result;
    if (attempt < delays.length) {
      await sleep(delays[attempt]);
    }
  }
  return lastNetworkError ? { kind: 'network_failed' } : { kind: 'error', message: 'Unable to confirm booking.' };
}

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
      // 410: hold expired / unavailable — surface the slot-taken state.
      if (res.status === 410) return { kind: 'error', message: '__slot_taken__' };
      // 5xx: treat as a network-class failure so the retry wrapper kicks in.
      if (res.status >= 500) return { kind: 'error', message: '__network_error__' };
      return {
        kind: 'error',
        message: typeof json.error === 'string' ? json.error : 'Could not start checkout.',
      };
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
    return { kind: 'error', message: '__network_error__' };
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
