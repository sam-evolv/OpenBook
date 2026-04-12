import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: sessions } = await supabase
    .from('whatsapp_sessions')
    .select('id, whatsapp_number, last_message_at, conversation_state')
    .eq('business_id', business!.id)
    .order('last_message_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-bold text-white">Messages</h1>

      {(sessions ?? []).length === 0 ? (
        <div
          className="rounded-2xl py-16 text-center"
          style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
        >
          <p className="text-sm" style={{ color: tokens.text3 }}>
            No WhatsApp conversations yet
          </p>
          <p className="text-xs mt-2" style={{ color: tokens.text3 }}>
            Connect your WhatsApp number in Settings to enable the booking bot.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
        >
          <div className="divide-y" style={{ borderColor: tokens.border }}>
            {(sessions ?? []).map((s) => {
              const state = s.conversation_state as { history?: Array<{ role: string; content: string }> } | null
              const lastMsg = state?.history?.slice(-1)[0]
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${tokens.gold}20` }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
                        fill={tokens.gold}
                      />
                      <path
                        d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.524 5.845L0 24l6.335-1.509A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.892 0-3.667-.498-5.2-1.367l-.369-.22-3.762.896.947-3.66-.247-.384A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"
                        fill={tokens.gold}
                        opacity="0.5"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{s.whatsapp_number}</div>
                    {lastMsg && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: tokens.text2 }}>
                        {lastMsg.role === 'user' ? 'Customer: ' : 'Bot: '}{lastMsg.content}
                      </div>
                    )}
                  </div>
                  {s.last_message_at && (
                    <div className="text-xs shrink-0" style={{ color: tokens.text3 }}>
                      {format(new Date(s.last_message_at), 'dd MMM HH:mm')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
