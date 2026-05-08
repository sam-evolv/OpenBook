'use client';

import { PaymentElement, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import type { PaymentRequest as StripePaymentRequest } from '@stripe/stripe-js';

type Props = {
  // Apple Pay / Google Pay merchant ID setup is a separate manual task —
  // see docs in the brief / PR description. canMakePayment will return
  // false in dev (and on unsupported devices) and we render nothing.
  paymentRequest: StripePaymentRequest | null;
  walletAvailable: boolean;
};

export default function PaymentBlock({ paymentRequest, walletAvailable }: Props) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h3
        style={{
          fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
          fontWeight: 500,
          fontSize: 14,
          color: 'var(--ob-co-text-2)',
          margin: 0,
        }}
      >
        Payment
      </h3>

      {walletAvailable && paymentRequest ? (
        <PaymentRequestButtonElement
          options={{
            paymentRequest,
            style: {
              paymentRequestButton: {
                type: 'default',
                theme: 'dark',
                height: '52px',
              },
            },
          }}
        />
      ) : null}

      {walletAvailable ? (
        <div
          aria-hidden
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--ob-co-text-3)',
          }}
        >
          <span style={{ flex: 1, height: 1, background: 'var(--ob-co-border-quiet)' }} />
          <span
            style={{
              fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
              fontWeight: 400,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Or pay with card
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--ob-co-border-quiet)' }} />
        </div>
      ) : null}

      <div
        style={{
          background: 'var(--ob-co-surface-elev)',
          border: '1px solid var(--ob-co-border-quiet)',
          borderRadius: 8,
          padding: 16,
        }}
      >
        <PaymentElement
          options={{
            // Wallets are rendered separately above as a single
            // PaymentRequestButton, so suppress them inside the
            // PaymentElement to avoid duplicating Apple/Google Pay.
            wallets: { applePay: 'never', googlePay: 'never' },
            layout: { type: 'tabs', defaultCollapsed: false },
          }}
        />
      </div>
    </section>
  );
}
