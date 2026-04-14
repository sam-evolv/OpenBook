import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { confirmWhatsAppBooking } from '@/lib/whatsapp-payment'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { format, parseISO } from 'date-fns'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WHATSAPP_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = event.data.object as unknown as { metadata: Record<string, string> | null }
    const { bookingId, customerPhone, source } = session.metadata ?? {}

    if (source !== 'whatsapp' || !bookingId) {
      return NextResponse.json({ received: true })
    }

    const details = await confirmWhatsAppBooking(bookingId)
    if (!details || !customerPhone) {
      return NextResponse.json({ received: true })
    }

    const displayDate = (() => {
      try { return format(parseISO(details.startsAt), 'EEEE d MMMM') } catch { return details.startsAt }
    })()
    const displayTime = (() => {
      try { return format(parseISO(details.startsAt), 'HH:mm') } catch { return '' }
    })()

    const confirmationMsg =
      `Booking confirmed!\n\n` +
      `${details.serviceName} at ${details.businessName}\n` +
      `${displayDate} at ${displayTime}\n\n` +
      `Reply CANCEL if anything changes.`

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
    if (phoneNumberId) {
      await sendWhatsAppMessage({ phoneNumberId, to: customerPhone, message: confirmationMsg })
    }
  }

  return NextResponse.json({ received: true })
}
