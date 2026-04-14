import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createServiceClient } from '@/lib/supabase/server'
import { processWhatsAppMessage, createWhatsAppBooking } from '@/lib/whatsapp-brain'
import { createWhatsAppPaymentLink } from '@/lib/whatsapp-payment'
import { format, parseISO } from 'date-fns'
import type { ConversationContext } from '@/lib/whatsapp-brain'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!

/** Send a WhatsApp message via Twilio REST API */
async function sendTwilioMessage(to: string, from: string, body: string): Promise<string | null> {
  const client = twilio(accountSid, authToken)
  const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const fromWa = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`
  try {
    const msg = await client.messages.create({ from: fromWa, to: toWa, body })
    return msg.sid
  } catch (err) {
    console.error('Twilio send error:', err)
    return null
  }
}

/** Empty TwiML response — we reply via REST API, not TwiML */
function twimlOk(): NextResponse {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Parse form-urlencoded body that Twilio sends
  const text = await req.text()
  const params = Object.fromEntries(new URLSearchParams(text).entries())

  // Verify Twilio signature
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const url = req.url
  const valid = twilio.validateRequest(authToken, signature, url, params)
  if (!valid) {
    console.error('Invalid Twilio signature')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const customerPhone = params['From'] ?? '' // e.g. "whatsapp:+353871234567"
  const businessTwilioNumber = params['To'] ?? ''  // e.g. "whatsapp:+353761234567"
  const messageBody = params['Body'] ?? ''
  const twilioSid = params['MessageSid'] ?? ''

  if (!customerPhone || !messageBody) return twimlOk()

  // Normalise numbers — strip whatsapp: prefix for DB storage
  const customerPhoneNorm = customerPhone.replace(/^whatsapp:/, '')
  const businessNumberNorm = businessTwilioNumber.replace(/^whatsapp:/, '')

  const supabase = await createServiceClient()

  // Find the business by their Twilio WhatsApp number
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('whatsapp_phone_number', businessNumberNorm)
    .eq('whatsapp_enabled', true)
    .maybeSingle()

  if (!business) return twimlOk()

  // Upsert conversation
  const { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .upsert(
      {
        business_id: business.id,
        customer_phone: customerPhoneNorm,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,customer_phone', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (!conversation) return twimlOk()

  // Save inbound message
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    direction: 'inbound',
    body: messageBody,
    twilio_sid: twilioSid,
    status: 'received',
  })

  // Run AI brain
  const { reply, newState, newContext, bookingDetails } = await processWhatsAppMessage({
    business,
    conversation,
    message: messageBody,
    customerPhone: customerPhoneNorm,
  })

  let finalReply = reply
  let updatedContext: ConversationContext = newContext
  let finalState = newState

  // If brain returned a booking to create
  if (bookingDetails) {
    const { serviceId, date, time } = bookingDetails

    const bookingId = await createWhatsAppBooking({
      businessId: business.id,
      serviceId,
      customerPhone: customerPhoneNorm,
      customerName: conversation.customer_name,
      date,
      time,
    })

    if (bookingId) {
      updatedContext = { ...updatedContext, booking_id: bookingId }

      // If business has Stripe, send payment link
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
              customerPhone: customerPhoneNorm,
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
          // Fall through — confirm without payment
          finalState = 'completed'
        }
      } else {
        // No Stripe — confirm directly
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

  // Send reply via Twilio
  const outboundSid = await sendTwilioMessage(customerPhone, businessTwilioNumber, finalReply)

  // Save outbound message
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    direction: 'outbound',
    body: finalReply,
    twilio_sid: outboundSid ?? undefined,
    status: 'sent',
  })

  return twimlOk()
}
