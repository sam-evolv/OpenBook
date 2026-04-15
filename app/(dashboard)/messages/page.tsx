import { createClient } from '@/lib/supabase/server'
import { MessagesClient } from '@/components/dashboard/MessagesClient'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user!.id)
    .single()

  const { data: sessions } = await supabase
    .from('whatsapp_sessions')
    .select('id, whatsapp_number, last_message_at, conversation_state')
    .eq('business_id', business!.id)
    .order('last_message_at', { ascending: false })
    .limit(50)

  const serialized = (sessions ?? []).map((s) => {
    const state = s.conversation_state as { history?: Array<{ role: string; content: string }> } | null
    return {
      id: s.id,
      phone: s.whatsapp_number,
      lastMessageAt: s.last_message_at,
      messages: state?.history ?? [],
    }
  })

  return <MessagesClient conversations={serialized} businessName={business?.name ?? 'Business'} />
}
