import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface Business {
  id: string
  name: string
  services?: Array<{ id: string; name: string; duration_minutes?: number; price?: number }>
  business_hours?: Array<{ day_of_week: number; open_time: string; close_time: string; is_closed?: boolean }>
  [key: string]: unknown
}

interface Conversation {
  id?: string
  state?: string
  context?: Record<string, unknown>
  [key: string]: unknown
}

interface WhatsAppMessage {
  id?: string
  direction: 'inbound' | 'outbound'
  body: string
  created_at?: string
}

interface ProcessParams {
  business: Business
  conversation: Conversation
  messageText: string
  recentMessages: WhatsAppMessage[]
}

export async function processWhatsAppMessage({
  business,
  conversation,
  messageText,
  recentMessages
}: ProcessParams): Promise<string> {
  const servicesText = business.services?.length
    ? business.services.map(s => `- ${s.name}${s.duration_minutes ? ` (${s.duration_minutes} min)` : ''}${s.price ? ` — €${s.price}` : ''}`).join('\n')
    : 'No services listed'

  const hoursText = business.business_hours?.length
    ? business.business_hours
        .filter(h => !h.is_closed)
        .map(h => {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          return `${days[h.day_of_week]}: ${h.open_time}–${h.close_time}`
        })
        .join(', ')
    : 'Hours not set'

  const history = recentMessages
    .slice(-8)
    .map(m => `${m.direction === 'inbound' ? 'Customer' : 'Assistant'}: ${m.body}`)
    .join('\n')

  const systemPrompt = `You are a helpful booking assistant for ${business.name}.
Your job is to help customers book appointments via WhatsApp.

Services offered:
${servicesText}

Business hours: ${hoursText}

Keep replies short and conversational. Guide the customer toward booking an appointment.
If they want to book, collect: service, preferred date/time, and their name.
Always be friendly and professional.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      ...(history ? [{ role: 'user' as const, content: `Previous conversation:\n${history}` }, { role: 'assistant' as const, content: 'Understood, I have the context.' }] : []),
      { role: 'user' as const, content: messageText }
    ]
  })

  const textBlock = response.content.find(b => b.type === 'text')
  return textBlock && textBlock.type === 'text' ? textBlock.text : "Thanks for your message! How can I help you today?"
}
