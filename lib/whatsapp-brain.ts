import Anthropic from '@anthropic-ai/sdk'
import { addMinutes, parseISO, format } from 'date-fns'
import { createServiceClient } from './supabase/server'
import { getAvailability } from './availability'
import type { Tables } from './supabase/types'

type Business = Tables<'businesses'>
type Conversation = Tables<'whatsapp_conversations'>


interface ServiceRow {
  id: string
  name: string
  price_cents: number
  duration_minutes: number
  is_active: boolean | null
  sort_order: number | null
}

export type ConversationStateValue =
  | 'idle'
  | 'selecting_service'
  | 'selecting_time'
  | 'confirming'
  | 'awaiting_payment'
  | 'completed'

export interface ConversationContext {
  service_id?: string
  service_name?: string
  date?: string
  time?: string
  customer_name?: string
  booking_id?: string
  payment_link?: string
}

export interface WhatsAppBrainInput {
  business: Business
  conversation: Conversation
  message: string
  customerPhone: string
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function buildSystemPrompt(
  business: Business,
  services: ServiceRow[],
  hours: Array<{ day_of_week: number; open_time: string | null; close_time: string | null }>,
  state: ConversationStateValue,
  context: ConversationContext,
  availabilityHint: string
): string {
  const today = format(new Date(), 'EEEE d MMMM yyyy')
  const serviceList = services
    .map((s) => `- ${s.name}: €${(s.price_cents / 100).toFixed(2)} (${s.duration_minutes ?? 60} min) [id:${s.id}]`)
    .join('\n')

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const hoursText = hours.length
    ? hours.map((h) => `${dayNames[h.day_of_week]}: ${h.open_time ?? '?'}–${h.close_time ?? '?'}`).join(', ')
    : 'Please contact business for hours'

  return `You are the booking assistant for ${business.name}, a ${business.category} in ${business.city ?? 'Ireland'}.
You help customers book appointments via WhatsApp.
You are friendly, concise and efficient.
You ONLY book services that ${business.name} offers.
You NEVER mention OpenBook — you represent ${business.name} directly.
Always respond in plain text, no markdown, no asterisks, no bullet symbols.
Keep replies under 3 sentences where possible.
Today is ${today}.
Business hours: ${hoursText}.

Available services:
${serviceList}

Current booking state: ${state}
Context so far: ${JSON.stringify(context)}

${availabilityHint ? `Availability info: ${availabilityHint}` : ''}

Guide the conversation toward a completed booking:
1. If state is idle: greet and ask what they'd like to book
2. If selecting_service: confirm which service they want
3. If selecting_time: offer available slots and let them pick
4. If confirming: summarise and ask them to confirm
5. If a specific service/date/time is agreed, end your reply with this exact marker (hidden from customer):
   [BOOKING:<serviceId>:<YYYY-MM-DD>:<HH:MM>]

Important rules:
- Never invent availability — only use slots provided in the context
- Always confirm customer name before booking
- If you need availability for a date, ask clearly for a date first
- Use the service id from the list above in the BOOKING marker`
}

async function getAvailabilityHint(
  businessId: string,
  _services: ServiceRow[],
  context: ConversationContext
): Promise<string> {
  if (!context.service_id || !context.date) return ''
  try {
    const result = await getAvailability(businessId, context.service_id, context.date)
    if (result.isClosed) return `Business is closed on ${context.date}`
    const open = result.slots.filter((s) => s.available).map((s) => s.time)
    if (!open.length) return `No availability on ${context.date}, try another date`
    return `Available on ${context.date}: ${open.slice(0, 8).join(', ')}`
  } catch {
    return ''
  }
}

export async function processWhatsAppMessage({
  business,
  conversation,
  message,
}: WhatsAppBrainInput): Promise<{ reply: string; newState: ConversationStateValue; newContext: ConversationContext; bookingDetails?: { serviceId: string; date: string; time: string } }> {
  const supabase = await createServiceClient()

  const state = (conversation.state ?? 'idle') as ConversationStateValue
  const context = (conversation.context ?? {}) as ConversationContext

  // Load services and hours in parallel
  const [{ data: services }, { data: hours }, { data: recentMessages }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes, is_active, sort_order')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('business_hours')
      .select('day_of_week, open_time, close_time')
      .eq('business_id', business.id),
    supabase
      .from('whatsapp_messages')
      .select('direction, body, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const availabilityHint = await getAvailabilityHint(business.id, [], context)

  const systemPrompt = buildSystemPrompt(
    business,
    services ?? [],
    hours ?? [],
    state,
    context,
    availabilityHint
  )

  // Build message history from DB (most recent first → reverse for chronological)
  const history: Anthropic.MessageParam[] = (recentMessages ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      role: m.direction === 'inbound' ? 'user' : ('assistant' as const),
      content: m.body,
    }))

  history.push({ role: 'user', content: message })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: systemPrompt,
    messages: history,
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract booking marker if present
  const bookingMatch = rawText.match(/\[BOOKING:([^:]+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})\]/)
  const cleanReply = rawText.replace(/\[BOOKING:[^\]]+\]/g, '').trim()

  let newState: ConversationStateValue = state
  let newContext: ConversationContext = { ...context }
  let bookingDetails: { serviceId: string; date: string; time: string } | undefined

  if (bookingMatch) {
    const [, serviceId, date, time] = bookingMatch
    bookingDetails = { serviceId, date, time }
    newContext = { ...newContext, service_id: serviceId, date, time }
    newState = 'confirming'
  } else {
    // Infer state transitions from conversation flow
    if (state === 'idle' && cleanReply.length > 0) newState = 'selecting_service'
    // If a service is now mentioned, try to find it
    if (state === 'selecting_service' && !context.service_id) {
      const mentioned = (services ?? []).find((s) =>
        message.toLowerCase().includes(s.name.toLowerCase())
      )
      if (mentioned) {
        newContext.service_id = mentioned.id
        newContext.service_name = mentioned.name
        newState = 'selecting_time'
      }
    }
  }

  return { reply: cleanReply, newState, newContext, bookingDetails }
}

/**
 * Create a booking record in Supabase from WhatsApp bot details.
 */
export async function createWhatsAppBooking({
  businessId,
  serviceId,
  customerPhone,
  customerName,
  date,
  time,
}: {
  businessId: string
  serviceId: string
  customerPhone: string
  customerName: string | null
  date: string
  time: string
}): Promise<string | null> {
  const supabase = await createServiceClient()

  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes, price_cents')
    .eq('id', serviceId)
    .single()

  if (!service) return null

  const startsAt = `${date}T${time}:00`
  const endsAt = addMinutes(parseISO(startsAt), service.duration_minutes ?? 60).toISOString()

  // Upsert customer
  const { data: customer } = await supabase
    .from('customers')
    .upsert(
      { whatsapp_number: customerPhone, name: customerName ?? 'WhatsApp customer' },
      { onConflict: 'whatsapp_number' }
    )
    .select()
    .single()

  if (!customer) return null

  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      business_id: businessId,
      service_id: serviceId,
      customer_id: customer.id,
      starts_at: startsAt,
      ends_at: endsAt,
      price_cents: service.price_cents,
      source: 'whatsapp',
      status: 'pending',
    })
    .select('id')
    .single()

  return booking?.id ?? null
}
