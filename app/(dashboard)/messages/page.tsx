'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { tokens } from '@/lib/types'
import { format } from 'date-fns'

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  created_at: string | null
  twilio_sid: string | null
}

interface Conversation {
  id: string
  customer_phone: string
  customer_name: string | null
  state: string | null
  last_message_at: string | null
  preview?: string
  previewDir?: string
}

const STATE_LABELS: Record<string, string> = {
  idle: 'New',
  selecting_service: 'Browsing',
  selecting_time: 'Picking time',
  confirming: 'Confirming',
  awaiting_payment: 'Awaiting payment',
  completed: 'Booked',
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return phone
  return `+${digits.slice(0, 3)} *** ${digits.slice(-4)}`
}

function WhatsAppIcon() {
  return (
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
  )
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      if (!biz) return
      setBusinessId(biz.id)

      const { data: convos } = await supabase
        .from('whatsapp_conversations')
        .select('id, customer_phone, customer_name, state, last_message_at')
        .eq('business_id', biz.id)
        .order('last_message_at', { ascending: false })
        .limit(50)

      if (!convos) return

      // Load preview message for each conversation
      const withPreviews = await Promise.all(
        convos.map(async (c) => {
          const { data: last } = await supabase
            .from('whatsapp_messages')
            .select('body, direction')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          return {
            ...c,
            preview: last?.body ?? '',
            previewDir: last?.direction ?? 'inbound',
          }
        })
      )
      setConversations(withPreviews)
    })
  }, [])

  async function loadMessages(convo: Conversation) {
    setSelected(convo)
    const supabase = createClient()
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('id, direction, body, created_at, twilio_sid')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: true })
    setMessages((data as Message[]) ?? [])
  }

  async function sendReply() {
    if (!reply.trim() || !selected || !businessId) return
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selected.id,
          to: selected.customer_phone,
          body: reply.trim(),
        }),
      })
      if (res.ok) {
        setReply('')
        await loadMessages(selected)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="animate-fade-in h-[calc(100vh-120px)] flex gap-4">
      {/* Conversation list */}
      <div
        className="w-80 shrink-0 rounded-2xl overflow-hidden flex flex-col"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: tokens.border }}>
          <h1 className="text-base font-bold text-white">WhatsApp Inbox</h1>
        </div>

        {conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-5 text-center">
            <div>
              <p className="text-sm" style={{ color: tokens.text3 }}>No conversations yet</p>
              <p className="text-xs mt-1" style={{ color: tokens.text3 }}>
                Enable your WhatsApp bot in Settings
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: tokens.border }}>
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => loadMessages(c)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background: selected?.id === c.id ? `${tokens.gold}15` : 'transparent',
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${tokens.gold}20` }}
                >
                  <WhatsAppIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {c.customer_name ?? maskPhone(c.customer_phone)}
                    </span>
                    {c.last_message_at && (
                      <span className="text-xs shrink-0" style={{ color: tokens.text3 }}>
                        {format(new Date(c.last_message_at), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  {c.preview && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: tokens.text2 }}>
                      {c.previewDir === 'outbound' ? 'Bot: ' : ''}{c.preview}
                    </p>
                  )}
                  {c.state && c.state !== 'idle' && (
                    <span
                      className="inline-block text-xs px-1.5 py-0.5 rounded-md mt-1"
                      style={{ background: `${tokens.gold}20`, color: tokens.gold }}
                    >
                      {STATE_LABELS[c.state] ?? c.state}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thread view */}
      <div
        className="flex-1 rounded-2xl flex flex-col overflow-hidden"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-sm" style={{ color: tokens.text3 }}>Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="px-5 py-4 border-b flex items-center gap-3"
              style={{ borderColor: tokens.border }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: `${tokens.gold}20` }}
              >
                <WhatsAppIcon />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {selected.customer_name ?? maskPhone(selected.customer_phone)}
                </div>
                <div className="text-xs" style={{ color: tokens.text3 }}>
                  {maskPhone(selected.customer_phone)}
                  {selected.state && selected.state !== 'idle' && (
                    <> · {STATE_LABELS[selected.state] ?? selected.state}</>
                  )}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: `${tokens.gold}20`, color: tokens.gold }}
                >
                  Handled by AI
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-xs px-4 py-2.5 rounded-2xl text-sm"
                    style={{
                      background:
                        m.direction === 'outbound'
                          ? `${tokens.gold}25`
                          : tokens.surface2,
                      color: tokens.text1,
                      borderBottomRightRadius: m.direction === 'outbound' ? 4 : undefined,
                      borderBottomLeftRadius: m.direction === 'inbound' ? 4 : undefined,
                    }}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    {m.created_at && (
                      <p
                        className="text-xs mt-1 text-right"
                        style={{ color: tokens.text3 }}
                      >
                        {format(new Date(m.created_at), 'HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div
              className="px-4 py-3 border-t flex gap-3 items-end"
              style={{ borderColor: tokens.border }}
            >
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendReply()
                  }
                }}
                placeholder="Type a reply..."
                rows={1}
                className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{
                  background: tokens.surface2,
                  border: `1px solid ${tokens.border}`,
                  color: tokens.text1,
                }}
              />
              <button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ background: tokens.gold, color: '#000' }}
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
