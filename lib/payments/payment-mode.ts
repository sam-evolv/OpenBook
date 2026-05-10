// Single source of truth for resolving how a checkout collects payment.
//
// "stripe_now" means the customer pays card-on-file via Stripe Connect at
// checkout time (existing flow).
// "in_person" means the slot is held and confirmed immediately, and the
// customer settles with the business on the day. We use this for businesses
// that have not completed Stripe Connect onboarding (the majority right
// now) and for free services that should never enter Stripe at all.
//
// Future modes ("stripe_deposit", "stripe_later") slot in here.

export type PaymentMode = 'stripe_now' | 'in_person';

export type PaymentModeBusiness = {
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean | null;
};

export type PaymentModeService = {
  price_cents: number;
};

export function getPaymentMode(
  business: PaymentModeBusiness,
  service: PaymentModeService,
): PaymentMode {
  // Free services never go through Stripe regardless of business onboarding.
  if (service.price_cents === 0) return 'in_person';

  // Both signals must be present and truthy. stripe_charges_enabled is
  // updated by our Stripe Connect webhook on account.updated; an account_id
  // alone (without charges_enabled) means onboarding is partial and Stripe
  // will reject paymentIntents with the destination set to that account.
  if (business.stripe_charges_enabled === true && business.stripe_account_id) {
    return 'stripe_now';
  }

  return 'in_person';
}
