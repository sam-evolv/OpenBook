import Anthropic from '@anthropic-ai/sdk'
import type { Business, Service, WhatsAppBotResponse, ConversationState } from './types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const WHATSAPP_SYSTEM_PROMPT = (
  business: Pick<Business, 'name' | 'category' | 'description'>,
  services: Pick<Service, 'name' | 'duration_minutes' | 'price_cents'>[]
) => `You are the booking assistant for ${business.name}, a ${business.category} business.
${business.description ? `About the business: ${business.description}` : ''}

Available services:
${services.map((s) => `- ${s.name}: ${s.duration_minutes} min, €${(s.price_cents / 100).toFixed(2)}`).join('\n')}

You help customers check availability and book sessions via WhatsApp.
Always respond in a friendly, conversational tone. Keep messages short — this is WhatsApp.
If a requested slot is unavailable, always offer alternatives.
Confirm all booking details before charging.
For dates, always clarify if ambiguous (e.g. "next Monday").

ALWAYS respond with valid JSON only — no markdown, no extra text:
{ "message": "...", "action": "none|check_availability|create_booking|cancel_booking|list_services", "params": {} }

For check_availability params: { "date": "YYYY-MM-DD", "service_name": "..." }
For create_booking params: { "service_id": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "customer_name": "..." }
For cancel_booking params: { "booking_id": "..." }`

/**
 * Run the WhatsApp booking conversation through Claude.
 */
export async function runBookingAssistant(
  business: Pick<Business, 'name' | 'category' | 'description'>,
  services: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'price_cents'>[],
  state: ConversationState,
  newUserMessage: string
): Promise<WhatsAppBotResponse> {
  const messages: Anthropic.MessageParam[] = [
    ...state.history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user', content: newUserMessage },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: WHATSAPP_SYSTEM_PROMPT(business, services),
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  try {
    return JSON.parse(text) as WhatsAppBotResponse
  } catch {
    return {
      message: text,
      action: 'none',
      params: {},
    }
  }
}
