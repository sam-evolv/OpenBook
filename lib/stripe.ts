import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Platform fee: 5% of each transaction
export const PLATFORM_FEE_PERCENT = 5

export function platformFee(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100)
}

/**
 * Create a PaymentIntent routed to the connected business account.
 */
export async function createBookingPaymentIntent({
  amountCents,
  currency = 'eur',
  stripeAccountId,
  customerId,
  metadata,
}: {
  amountCents: number
  currency?: string
  stripeAccountId: string
  customerId?: string
  metadata?: Record<string, string>
}): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customerId,
    application_fee_amount: platformFee(amountCents),
    transfer_data: { destination: stripeAccountId },
    metadata: metadata ?? {},
    automatic_payment_methods: { enabled: true },
  })
}

/**
 * Generate a Stripe Connect Express onboarding link.
 */
export async function createConnectAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
  return link.url
}

/**
 * Create a new Stripe Connect Express account for a business.
 */
export async function createConnectAccount(email: string): Promise<string> {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })
  return account.id
}

/**
 * Retrieve connect account status.
 */
export async function getConnectAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId)
  return {
    connected: true,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    account_id: accountId,
  }
}
