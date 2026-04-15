import { NextRequest, NextResponse } from 'next/server'
import { addMinutes, parseISO, format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { createBookingPaymentIntent } from '@/lib/stripe'
import { sendBookingConfirmation } from '@/lib/email'
import type { CreateBookingPayload } from '@/lib/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const payload: CreateBookingPayload = await req.json()

  const { business_id, service_id, customer_id, staff_id, starts_at, notes, source } = payload

  // Fetch service details
  const { data: service, error: serviceErr } = await supabase
    .from('services')
    .select('duration_minutes, price_cents, name')
    .eq('id', service_id)
    .single()

  if (serviceErr || !service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  // Fetch business for Stripe account
  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_account_id, name')
    .eq('id', business_id)
    .single()

  const endsAt = addMinutes(parseISO(starts_at), service.duration_minutes)

  // Create payment intent if Stripe is connected
  let stripePaymentIntentId: string | undefined
  if (business?.stripe_account_id) {
    const pi = await createBookingPaymentIntent({
      amountCents: service.price_cents,
      stripeAccountId: business.stripe_account_id,
      metadata: {
        business_id,
        service_id,
        customer_id,
        service_name: service.name,
      },
    })
    stripePaymentIntentId = pi.id
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      business_id,
      service_id,
      customer_id,
      staff_id,
      starts_at,
      ends_at: endsAt.toISOString(),
      price_cents: service.price_cents,
      status: 'confirmed',
      source: source ?? 'app',
      notes,
      stripe_payment_intent_id: stripePaymentIntentId,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send confirmation email (fire-and-forget — don't block the response)
  try {
    const { data: customer } = await supabase
      .from('customers')
      .select('name, email')
      .eq('id', customer_id)
      .single()

    if (customer?.email) {
      const dateTimeStr = format(parseISO(starts_at), "EEE d MMM 'at' h:mm aaa")
      const priceStr    = `€${(service.price_cents / 100).toFixed(0)}`

      void sendBookingConfirmation({
        to:           customer.email,
        customerName: customer.name ?? 'there',
        serviceName:  service.name,
        businessName: business?.name ?? 'your business',
        dateTime:     dateTimeStr,
        price:        priceStr,
      })
    }
  } catch {
    // Email failure must never break booking creation
  }

  return NextResponse.json({ booking }, { status: 201 })
}
