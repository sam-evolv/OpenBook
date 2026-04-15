'use client'

import { useState, useMemo } from 'react'
import { Search, Send, Bot, MessageSquare } from 'lucide-react'
import { formatRelativeTime, getInitials } from '@/lib/utils'

interface Message {
  role: string
  content: string
}

interface Conversation {
  id: string
  phone: string
  lastMessageAt: string | null
  messages: Message[]
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone
  return '*** *** ' + phone.slice(-4)
}

export function MessagesClient({
  conversations,
  businessName,
}: {
  conversations: Conversation[]
  businessName: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')

  const filtered = useMemo(() => {
    if (!search) return conversations
    const q = search.toLowerCase()
    return conversations.filter((c) =>
      c.phone.includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q))
    )
  }, [conversations, search])

  const selected = conversations.find((c) => c.id === selectedId)
  const hasBotMessages = selected?.messages.some((m) => m.role === 'assistant')

  if (conversations.length === 0) {
    return (
      <div className="dashboard-card flex flex-col items-center justify-center py-16">
        <MessageSquare size={32} className="text-[#D4AF37] mb-3" />
        <p className="text-[14px] font-medium text-white mb-1">No conversations yet</p>
        <p className="text-[13px] text-white/40 text-center max-w-sm">
          Connect your WhatsApp number in Settings to enable the AI booking bot
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex rounded-2xl overflow-hidden"
      style={{
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        height: 'calc(100vh - 140px)',
      }}
    >
      {/* Left panel — conversation list */}
      <div
        className="w-[300px] shrink-0 flex flex-col"
        style={{
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg text-[12px] text-white placeholder:text-white/30 gold-focus-ring"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {filtered.map((conv) => {
            const isSelected = conv.id === selectedId
            const lastMsg = conv.messages.slice(-1)[0]
            const isBotMsg = lastMsg?.role === 'assistant'

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors"
                style={{
                  background: isSelected ? 'rgba(212,175,55,0.06)' : 'transparent',
                  borderLeft: isSelected ? '2px solid #D4AF37' : '2px solid transparent',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                  style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
                >
                  {getInitials(conv.phone.slice(-4))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-white truncate">
                      {maskPhone(conv.phone)}
                    </span>
                    {conv.lastMessageAt && (
                      <span className="text-[10px] text-white/30 shrink-0 ml-2">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isBotMsg && (
                      <span
                        className="text-[9px] font-semibold px-1 py-0.5 rounded"
                        style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}
                      >
                        AI
                      </span>
                    )}
                    <span className="text-[12px] text-white/40 truncate">
                      {lastMsg?.content ?? 'No messages'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel — message thread */}
      <div className="flex-1 flex flex-col" style={{ background: '#080808' }}>
        {selected ? (
          <>
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 h-14 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-medium text-white">{maskPhone(selected.phone)}</span>
                <span className="text-[11px] text-white/30">{businessName}</span>
              </div>
              {hasBotMessages && (
                <span
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}
                >
                  <Bot size={11} /> AI active
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-none">
              {selected.messages.map((msg, i) => {
                const isBot = msg.role === 'assistant'
                return (
                  <div
                    key={i}
                    className={`flex ${isBot ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[75%]">
                      <div
                        className="px-4 py-2.5 text-[13px] leading-[1.5]"
                        style={{
                          background: isBot ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.06)',
                          borderRadius: isBot ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          color: 'rgba(255,255,255,0.85)',
                        }}
                      >
                        {msg.content}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isBot ? 'justify-end' : ''}`}>
                        {isBot && (
                          <span
                            className="text-[9px] font-semibold px-1 py-0.5 rounded"
                            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
                          >
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* AI banner */}
            {hasBotMessages && (
              <div
                className="px-5 py-2 text-center text-[11px] text-white/30"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                AI is handling this conversation
              </div>
            )}

            {/* Input */}
            <div className="px-5 pb-5">
              <div
                className="flex items-center gap-2 rounded-xl px-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply…"
                  className="flex-1 h-10 bg-transparent text-[13px] text-white placeholder:text-white/30 outline-none"
                />
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                  style={{
                    background: reply ? '#D4AF37' : 'transparent',
                    color: reply ? '#000' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[13px] text-white/30">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
