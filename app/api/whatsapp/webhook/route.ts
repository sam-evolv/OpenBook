import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature, parseIncomingMessage, sendWhatsAppMessage } from '@/lib/whatsapp'
import { runBookingAssistant } from '@/lib/claude'
import { getAvailability } from '@/lib/availability'
import { addMinutes, parseISO } from 'date-fns'
import type { ConversationState } from '@/lib/types'

/** GET — Meta webhook verification challenge */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/** POST — incoming WhatsApp messages */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''

  const valid = await verifyWebhookSignature(rawBody, signature)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>
  const message = parseIncomingMessage(payload)
  if (!message) return NextResponse.json({ ok: true })

  const supabase = await createServiceClient()

  // Find which business this WhatsApp number belongs to
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, category, description')
    .eq('whatsapp_number', message.from)
    .maybeSingle()

  if (!business) return NextResponse.json({ ok: true })

  // Load conversation state
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('conversation_state')
    .eq('whatsapp_number', message.from)
    .eq('business_id', business.id)
    .maybeSingle()

  const state: ConversationState = (session?.conversation_state as unknown as ConversationState) ?? {
    history: [],
  }

  // Get services
  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price_cents')
    .eq('business_id', business.id)
    .eq('is_active', true)

  // Run Claude
  const botResponse = await runBookingAssistant(
    business,
    services ?? [],
    state,
    message.text
  )

  // Execute action
  if (botResponse.action === 'check_availability') {
    const { date, service_name } = botResponse.params as { date: string; service_name: string }
    const service = (services ?? []).find((s) =>
      s.name.toLowerCase().includes((service_name ?? '').toLowerCase())
    )
    if (service && date) {
      const availability = await getAvailability(business.id, service.id, date)
      const available = availability.slots.filter((s) => s.available).map((s) => s.time)
      const followUp = available.length
        ? `Available slots on ${date}: ${available.slice(0, 6).join(', ')}`
        : `No availability on ${date} — try another date?`
      await sendWhatsAppMessage(message.from, `${botResponse.message}\n\n${followUp}`)
    } else {
      await sendWhatsAppMessage(message.from, botResponse.message)
    }
  } else if (botResponse.action === 'create_booking') {
    const { service_id, date, time, customer_name } = botResponse.params as {
      service_id: string
      date: string
      time: string
      customer_name: string
    }
    const service = (services ?? []).find((s) => s.id === service_id)
    if (service && date && time) {
      const startsAt = `${date}T${time}:00`
      const endsAt = addMinutes(parseISO(startsAt), service.duration_minutes).toISOString()

      // Upsert customer by WhatsApp number
      const { data: customer } = await supabase
        .from('customers')
        .upsert({ whatsapp_number: message.from, name: customer_name }, { onConflict: 'whatsapp_number' })
        .select()
        .single()

      if (customer) {
        await supabase.from('bookings').insert({
          business_id: business.id,
          service_id,
          customer_id: customer.id,
          starts_at: startsAt,
          ends_at: endsAt,
          price_cents: service.price_cents,
          source: 'whatsapp',
          status: 'confirmed',
        })
      }
    }
    await sendWhatsAppMessage(message.from, botResponse.message)
  } else {
    await sendWhatsAppMessage(message.from, botResponse.message)
  }

  // Update conversation state
  const updatedState: ConversationState = {
    ...state,
    history: [
      ...state.history,
      { role: 'user' as const, content: message.text },
      { role: 'assistant' as const, content: botResponse.message },
    ].slice(-20), // keep last 20 turns
  }

  await supabase.from('whatsapp_sessions').upsert(
    {
      whatsapp_number: message.from,
      business_id: business.id,
      conversation_state: updatedState as unknown as import('@/lib/supabase/types').Json,
      last_message_at: new Date().toISOString(),
    },
    { onConflict: 'whatsapp_number,business_id' }
  )

  return NextResponse.json({ ok: true })
}
