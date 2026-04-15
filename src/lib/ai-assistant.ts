import { supabase } from './supabase'
import { getAvailability } from './availability'
import type { Business, Service, TimeSlot } from './types'
import { formatPrice, getDurationLabel } from './utils'

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  businesses?: Business[]
  services?: Service[]
  slots?: TimeSlot[]
  selectedBusiness?: Business
  selectedService?: Service
  selectedDate?: string
  bookingConfirmed?: boolean
}

interface AiContext {
  businesses: Business[]
  selectedBusiness: Business | null
  selectedService: Service | null
  services: Service[]
  slots: TimeSlot[]
  selectedDate: string
}

/**
 * Simple keyword-based AI assistant that queries real Supabase data.
 * No Anthropic API needed - we do NLU locally via keywords.
 */
export async function processUserMessage(
  userMessage: string,
  context: AiContext
): Promise<{ reply: string; updatedContext: Partial<AiContext>; action?: string }> {
  const msg = userMessage.toLowerCase()

  // If user confirms a booking
  if (context.selectedService && context.selectedBusiness && context.slots.length > 0) {
    // Check if user is selecting a time
    const timeMatch = msg.match(/(\d{1,2}:\d{2})/) || msg.match(/(\d{1,2})\s*(am|pm)/i)
    if (timeMatch) {
      const slot = context.slots.find(s => s.available && s.time.includes(timeMatch[1]))
      if (slot) {
        return {
          reply: `Great choice! I've found the ${slot.time} slot for **${context.selectedService.name}** at **${context.selectedBusiness.name}**.\n\nPrice: ${formatPrice(context.selectedService.price_cents)}\nDuration: ${getDurationLabel(context.selectedService.duration_minutes)}\n\nNavigating to the booking page now...`,
          updatedContext: {},
          action: `navigate:/business/${context.selectedBusiness.slug}`,
        }
      }
    }

    // If they say yes/book/confirm
    if (msg.includes('yes') || msg.includes('book') || msg.includes('confirm') || msg.includes('sure')) {
      return {
        reply: `Let me take you to the booking page for **${context.selectedBusiness.name}** so you can pick a time and confirm!`,
        updatedContext: {},
        action: `navigate:/business/${context.selectedBusiness.slug}`,
      }
    }
  }

  // Search for businesses by category
  const categories = ['gym', 'sauna', 'salon', 'barber', 'massage', 'physio', 'yoga', 'nail', 'tattoo', 'pt', 'fitness', 'beauty', 'hair']
  const matchedCategory = categories.find(c => msg.includes(c))

  if (matchedCategory || msg.includes('find') || msg.includes('book') || msg.includes('appointment') || msg.includes('nearby')) {
    // Search businesses
    let query = supabase.from('businesses').select('*').eq('is_live', true)

    if (matchedCategory) {
      query = query.ilike('category', `%${matchedCategory}%`)
    }

    const { data: businesses } = await query.limit(5)

    if (businesses && businesses.length > 0) {
      const biz = businesses[0]

      // Get services for the top result
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', biz.id)
        .eq('is_active', true)
        .order('sort_order')

      // Get availability for today
      const today = new Date().toISOString().split('T')[0]
      let slots: TimeSlot[] = []
      if (services && services.length > 0) {
        const result = await getAvailability(biz.id, services[0].id, today)
        slots = result.slots.filter(s => s.available)
      }

      const svcList = (services ?? []).slice(0, 4).map(s =>
        `• **${s.name}** — ${formatPrice(s.price_cents)} (${getDurationLabel(s.duration_minutes)})`
      ).join('\n')

      const slotList = slots.length > 0
        ? `\n\nAvailable today: ${slots.slice(0, 6).map(s => s.time).join(', ')}`
        : '\n\nCheck the booking page for real-time availability.'

      const otherBiz = businesses.length > 1
        ? `\n\nI also found: ${businesses.slice(1).map(b => b.name).join(', ')}.`
        : ''

      return {
        reply: `I found **${biz.name}** in ${biz.city ?? 'Cork'}! ${biz.description ?? ''}\n\n**Services:**\n${svcList}${slotList}${otherBiz}\n\nWould you like me to take you to their booking page?`,
        updatedContext: {
          businesses: businesses as Business[],
          selectedBusiness: biz as Business,
          services: (services ?? []) as Service[],
          selectedService: services?.[0] as Service ?? null,
          slots,
          selectedDate: today,
        },
      }
    } else {
      return {
        reply: "I couldn't find any matching businesses right now. Try browsing the **Explore** tab to see all available options!",
        updatedContext: {},
      }
    }
  }

  // Generic helpful response
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return {
      reply: "Hi there! I'm your OpenBook AI assistant. I can help you find and book local services. Try asking me:\n\n• \"Find me a gym nearby\"\n• \"Book a nail appointment\"\n• \"I need a barber\"\n• \"Find a yoga class\"",
      updatedContext: {},
    }
  }

  return {
    reply: "I can help you find and book local services! Try asking something like:\n\n• \"Book me a nail appointment\"\n• \"Find a gym nearby\"\n• \"I need a massage\"\n• \"Find a barber in Cork\"\n\nOr tap one of the suggestion buttons below!",
    updatedContext: {},
  }
}
