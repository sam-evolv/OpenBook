import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { processWhatsAppMessage, createWhatsAppBooking } from '@/lib/whatsapp-brain'
import { createWhatsAppPaymentLink } from '@/lib/whatsapp-payment'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { format, parseISO } from 'date-fns'
import type { ConversationContext } from '@/lib/whatsapp-brain'

/** GET — Meta webhook verification challenge */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

/** POST — incoming WhatsApp messages from Meta Cloud API */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Always return 200 quickly — Meta retries on non-2xx or timeout
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new NextResponse('OK', { status: 200 })
  }

  // Parse Meta webhook payload
  const entry = (body.entry as Array<{ changes: unknown[] }>)?.[0]
  const change = (entry?.changes as Array<{ value: unknown }>)?.[0]
  const value = change?.value as {
    metadata?: { phone_number_id: string; display_phone_number: string }
    messages?: Array<{ from: string; id: string; type: string; text?: { body: string } }>
  } | undefined

  const message = value?.messages?.[0]

  // Ignore anything that isn't an inbound text message
  if (!message || message.type !== 'text' || !message.text?.body) {
    return new NextResponse('OK', { status: 200 })
  }

  const customerPhone = message.from               // e.g. "353871234567"
  const messageText = message.text.body
  const phoneNumberId = value?.metadata?.phone_number_id ?? ''
  const displayPhoneNumber = value?.metadata?.display_phone_number ?? ''

  if (!phoneNumberId || !customerPhone) return new NextResponse('OK', { status: 200 })

  const supabase = await createServiceClient()

  // Find the business by their Meta display phone number
  // Normalise: Meta sends "+353761234567", DB stores "353761234567" or "+353761234567"
  const phoneNorm = displayPhoneNumber.replace(/^\+/, '')
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .or(`whatsapp_phone_number.eq.${displayPhoneNumber},whatsapp_phone_number.eq.${phoneNorm}`)
    .eq('whatsapp_enabled', true)
    .maybeSingle()

  if (!business) return new NextResponse('OK', { status: 200 })

  // Upsert conversation (unique per business + customer)
  const { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .upsert(
      {
        business_id: business.id,
        customer_phone: customerPhone,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,customer_phone', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (!conversation) return new NextResponse('OK', { status: 200 })

  // Persist inbound message
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    direction: 'inbound',
    body: messageText,
    status: 'received',
  })

  // Run AI brain
  const { reply, newState, newContext, bookingDetails } = await processWhatsAppMessage({
    business,
    conversation,
    message: messageText,
    customerPhone,
  })

  let finalReply = reply
  let updatedContext: ConversationContext = newContext
  let finalState = newState

  // Handle booking creation
  if (bookingDetails) {
    const { serviceId, date, time } = bookingDetails

    const bookingId = await createWhatsAppBooking({
      businessId: business.id,
      serviceId,
      customerPhone,
      customerName: conversation.customer_name,
      date,
      time,
    })

    if (bookingId) {
      updatedContext = { ...updatedContext, booking_id: bookingId }

      if (business.stripe_account_id) {
        try {
          const { data: service } = await supabase
            .from('services')
            .select('name, price_cents')
            .eq('id', serviceId)
            .single()

          if (service) {
            const paymentUrl = await createWhatsAppPaymentLink({
              bookingId,
              businessId: business.id,
              customerPhone,
              serviceName: service.name,
              priceEurCents: service.price_cents,
              stripeAccountId: business.stripe_account_id,
            })
            updatedContext.payment_link = paymentUrl
            finalState = 'awaiting_payment'
            finalReply = `${finalReply}\n\nTo confirm your booking, tap the link to pay:\n\n${paymentUrl}\n\nLink expires in 30 minutes.`
          }
        } catch (err) {
          console.error('Payment link error:', err)
          finalState = 'completed'
        }
      } else {
        finalState = 'completed'
        const displayDate = (() => {
          try { return format(parseISO(`${date}T${time}`), 'EEEE d MMMM') } catch { return date }
        })()
        finalReply = `Booking confirmed! See you ${displayDate} at ${time}. Reply CANCEL if anything changes.`
      }
    }
  }

  // Update conversation state
  await supabase
    .from('whatsapp_conversations')
    .update({
      state: finalState,
      context: updatedContext as unknown as import('@/lib/supabase/types').Json,
      last_message_at: new Date().toISOString(),
      customer_name: conversation.customer_name ?? updatedContext.customer_name ?? null,
    })
    .eq('id', conversation.id)

  // Send reply via Meta Cloud API
  await sendWhatsAppMessage({ phoneNumberId, to: customerPhone, message: finalReply })

  // Persist outbound message
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    direction: 'outbound',
    body: finalReply,
    status: 'sent',
  })

  return new NextResponse('OK', { status: 200 })
}
