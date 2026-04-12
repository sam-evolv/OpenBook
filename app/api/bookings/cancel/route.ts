import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { booking_id, reason }: { booking_id: string; reason?: string } = await req.json()

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('id, status, stripe_payment_intent_id, starts_at')
    .eq('id', booking_id)
    .single()

  if (fetchErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 409 })
  }

  // Refund if payment exists
  if (booking.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        reason: 'requested_by_customer',
      })
    } catch {
      // Log but don't block cancellation
    }
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify waitlist for this service + date
  const bookingDate = booking.starts_at.split('T')[0]
  const { data: waitlistEntries } = await supabase
    .from('waitlist')
    .select('id, customer_id, customers(expo_push_token, email)')
    .eq('requested_date', bookingDate)
    .is('notified_at', null)
    .limit(3)

  if (waitlistEntries?.length) {
    await supabase
      .from('waitlist')
      .update({ notified_at: new Date().toISOString() })
      .in(
        'id',
        waitlistEntries.map((e) => e.id)
      )
  }

  return NextResponse.json({ success: true })
}
