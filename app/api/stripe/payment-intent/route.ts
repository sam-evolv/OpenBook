import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBookingPaymentIntent } from '@/lib/stripe'

/**
 * POST /api/stripe/payment-intent
 *
 * Creates a Stripe PaymentIntent for a consumer booking.
 * - Routes funds to the business's connected Stripe account
 * - Deducts 5% application fee for OpenBook platform
 *
 * Body: { business_id, service_id, customer_id }
 * Returns: { clientSecret, amount, currency }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { business_id, service_id, customer_id } = await req.json()

  if (!business_id || !service_id) {
    return NextResponse.json({ error: 'Missing business_id or service_id' }, { status: 400 })
  }

  // Fetch business stripe account
  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_account_id, name')
    .eq('id', business_id)
    .single()

  if (!business?.stripe_account_id) {
    return NextResponse.json(
      { error: 'Business does not have Stripe connected' },
      { status: 422 }
    )
  }

  // Fetch service price
  const { data: service } = await supabase
    .from('services')
    .select('price_cents, name')
    .eq('id', service_id)
    .single()

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  // Fetch customer's Stripe customer ID if available
  let stripeCustomerId: string | undefined
  if (customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', customer_id)
      .single()
    stripeCustomerId = customer?.stripe_customer_id ?? undefined
  }

  const paymentIntent = await createBookingPaymentIntent({
    amountCents:     service.price_cents,
    stripeAccountId: business.stripe_account_id,
    customerId:      stripeCustomerId,
    metadata: {
      business_id,
      service_id,
      customer_id:   customer_id ?? '',
      service_name:  service.name,
      business_name: business.name,
    },
  })

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    amount:       paymentIntent.amount,
    currency:     paymentIntent.currency,
  })
}
