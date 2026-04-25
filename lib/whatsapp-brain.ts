import OpenAI from 'openai'
import { requireEnv } from '@/lib/integrations'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') })
  return _openai
}

export async function processWhatsAppMessage({
  business,
  conversation,
  messageText,
  recentMessages
}: {
  business: any
  conversation: any
  messageText: string
  recentMessages: any[]
}): Promise<string> {

  const services = business.services
    ?.map((s: any) => `${s.name} - €${s.price_cents / 100} - ${s.duration_minutes}min`)
    .join('\n') || 'No services listed'

  const hours = business.business_hours
    ?.map((h: any) => `${h.day_of_week}: ${h.open_time} - ${h.close_time}`)
    .join('\n') || 'Hours not set'

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = recentMessages
    .slice(-6)
    .map((m: any) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.body as string
    }))

  const systemPrompt = `You are a friendly booking assistant for ${business.name}.
Your job is to help customers book appointments via WhatsApp.

SERVICES:
${services}

BUSINESS HOURS:
${hours}

RULES:
- Be warm, concise and helpful
- Guide customers to pick a service and time
- Keep replies under 3 sentences
- Never mention OpenBook or that you are an AI
- You represent ${business.name} only
- If asked about booking, ask which service they want`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 300,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: messageText }
    ]
  })

  return response.choices[0]?.message?.content ||
    "Hi! I'd be happy to help you book. What service are you interested in?"
}
