import { describe, expect, it } from 'vitest';
import { getPaymentMode } from '../../lib/payments/payment-mode';

describe('getPaymentMode', () => {
  const stripeReady = { stripe_account_id: 'acct_123', stripe_charges_enabled: true };
  const noStripe = { stripe_account_id: null, stripe_charges_enabled: false };
  const partialStripe = { stripe_account_id: 'acct_123', stripe_charges_enabled: false };
  const enabledNoId = { stripe_account_id: null, stripe_charges_enabled: true };

  it('returns in_person for any free service regardless of Stripe state', () => {
    expect(getPaymentMode(stripeReady, { price_cents: 0 })).toBe('in_person');
    expect(getPaymentMode(noStripe, { price_cents: 0 })).toBe('in_person');
    expect(getPaymentMode(partialStripe, { price_cents: 0 })).toBe('in_person');
  });

  it('returns in_person when business has no Stripe account at all', () => {
    expect(getPaymentMode(noStripe, { price_cents: 4000 })).toBe('in_person');
  });

  it('returns in_person when business has Stripe id but charges not enabled', () => {
    // Partial onboarding: account exists but Stripe rejects paymentIntents
    // with destination set to it. This is the Evolv Performance case.
    expect(getPaymentMode(partialStripe, { price_cents: 4000 })).toBe('in_person');
  });

  it('returns in_person when charges_enabled is true but no account id present', () => {
    // Belt-and-braces: charges_enabled without an account id is an
    // inconsistent row; refuse to route Stripe at it.
    expect(getPaymentMode(enabledNoId, { price_cents: 4000 })).toBe('in_person');
  });

  it('returns stripe_now only when both flags are set and service is paid', () => {
    expect(getPaymentMode(stripeReady, { price_cents: 4000 })).toBe('stripe_now');
    expect(getPaymentMode(stripeReady, { price_cents: 1 })).toBe('stripe_now');
  });
});
