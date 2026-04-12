import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      if (account.charges_enabled) {
        await supabase
          .from('businesses')
          .update({ is_live: true })
          .eq('stripe_account_id', account.id)
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
