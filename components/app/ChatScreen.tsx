'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chatScripts, type ChatMessage } from './chatScripts'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import VoiceOverlay from './VoiceOverlay'
import type { Screen } from '@/app/(consumer-app)/app/page'

export default function ChatScreen({ navigate, goBack, chatType }: { navigate: (s: Screen, t?: string) => void; goBack: () => void; chatType: string }) {
  const script = chatScripts[chatType] || chatScripts.nail
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const isRunningRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, 50)
  }, [])

  const runScript = useCallback((startIndex: number, scriptMessages: ChatMessage[]) => {
    if (isRunningRef.current) return
    isRunningRef.current = true
    const addNext = (idx: number) => {
      if (idx >= scriptMessages.length) { isRunningRef.current = false; return }
      const msg = scriptMessages[idx]
      if (msg.sender === 'ai') {
        setIsTyping(true); scrollToBottom()
        setTimeout(() => {
          setIsTyping(false); setMessages((prev) => [...prev, msg]); scrollToBottom()
          setTimeout(() => addNext(idx + 1), 300)
        }, msg.delay || 900)
      } else {
        setMessages((prev) => [...prev, msg]); scrollToBottom()
        setTimeout(() => addNext(idx + 1), msg.delay || 500)
      }
    }
    addNext(startIndex)
  }, [scrollToBottom])

  useEffect(() => {
    const initialMsg: ChatMessage = { id: 'user-init', sender: 'user', type: 'text', text: script.initialUserMessage || 'Help me find something nearby' }
    setMessages([initialMsg]); scrollToBottom()
    const t = setTimeout(() => runScript(0, script.messages), 600)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatType])

  const handleVoiceDismiss = useCallback((triggered: boolean) => {
    setShowVoice(false)
    if (triggered) {
      const msg: ChatMessage = { id: 'voice-user', sender: 'user', type: 'text', text: 'Find me a nail appointment nearby' }
      setMessages((prev) => [...prev, msg]); scrollToBottom()
      setTimeout(() => runScript(0, chatScripts.nail.messages), 600)
    }
  }, [runScript, scrollToBottom])

  const handleSend = () => {
    if (!inputValue.trim()) return
    const msg: ChatMessage = { id: `u-${Date.now()}`, sender: 'user', type: 'text', text: inputValue.trim() }
    setMessages((prev) => [...prev, msg]); setInputValue(''); scrollToBottom()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111111ee', backdropFilter: 'blur(20px)', zIndex: 10 }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={goBack}
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#f0f0f0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.button>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>&#10024;</div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#30d158', border: '2px solid #111111' }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f0f0' }}>OpenBook</div>
          <div style={{ fontSize: 12, color: '#30d158', fontWeight: 500 }}>Online</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} index={i}
            onSlotSelect={(slot) => setSelectedSlot(slot.id)} selectedSlot={selectedSlot}
            onConfirm={() => navigate('confirm')} onBook={() => navigate('confirm')} />
        ))}
        {isTyping && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><TypingIndicator /></motion.div>}
        <div style={{ height: 80 }} />
      </div>

      {/* Input */}
      <div style={{ padding: '8px 16px', paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)', background: '#111111ee', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e1e1e', borderRadius: 28, padding: '6px 6px 6px 16px' }}>
          <input value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f0', fontSize: 15, WebkitUserSelect: 'text', userSelect: 'text' as const }} />
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowVoice(true)}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" fill="#000"/><path d="M5 11a7 7 0 0014 0" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/><path d="M12 18v4" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </motion.button>
          <motion.button whileTap={{ scale: 0.93 }} onClick={handleSend}
            style={{ width: 40, height: 40, borderRadius: '50%', background: inputValue.trim() ? 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)' : '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke={inputValue.trim() ? '#000' : '#444'} strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" fill={inputValue.trim() ? '#000' : '#444'}/></svg>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>{showVoice && <VoiceOverlay onDismiss={handleVoiceDismiss} />}</AnimatePresence>
    </div>
  )
}
