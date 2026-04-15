'use client'

import { motion } from 'framer-motion'
import type { ChatMessage, SlotOption } from './chatScripts'
import BusinessCard from './BusinessCard'
import MapCard from './MapCard'
import FlashDealCard from './FlashDealCard'

interface Props {
  message: ChatMessage
  index: number
  onSlotSelect?: (slot: SlotOption) => void
  selectedSlot?: string | null
  onConfirm?: () => void
  onBook?: () => void
}

export default function MessageBubble({ message, index, onSlotSelect, selectedSlot, onConfirm, onBook }: Props) {
  const isUser = message.sender === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.05 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>

      {!isUser && message.type === 'text' && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '85%' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>&#10024;</div>
          <div style={{ background: '#1e1e1e', borderRadius: 22, borderBottomLeftRadius: 6, padding: '12px 16px', fontSize: 15, lineHeight: 1.5, color: '#f0f0f0' }}>{message.text}</div>
        </div>
      )}

      {isUser && message.type === 'text' && (
        <div style={{ background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', borderRadius: 22, borderBottomRightRadius: 6, padding: '12px 16px', fontSize: 15, lineHeight: 1.5, color: '#000', fontWeight: 500, maxWidth: '85%' }}>{message.text}</div>
      )}

      {message.type === 'slots' && message.slots && (
        <div style={{ width: '100%', paddingLeft: 40 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, paddingRight: 16 }}>
            {message.slots.map((slot) => {
              const sel = selectedSlot === slot.id
              return (
                <motion.button key={slot.id} whileTap={{ scale: 0.93 }} onClick={() => onSlotSelect?.(slot)}
                  style={{ flexShrink: 0, padding: '10px 18px', borderRadius: 16, background: sel ? 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)' : '#1e1e1e', color: sel ? '#000' : '#f0f0f0', fontSize: 14, fontWeight: 600, border: sel ? 'none' : '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {slot.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {message.type === 'business-card' && message.businessCard && (
        <div style={{ width: '100%', paddingLeft: 40 }}>
          <BusinessCard data={message.businessCard} onBook={onBook} />
        </div>
      )}

      {message.type === 'map-card' && message.mapCard && (
        <div style={{ width: '100%', paddingLeft: 40 }}>
          <MapCard data={message.mapCard} />
        </div>
      )}

      {message.type === 'flash-deal' && message.flashDeal && (
        <div style={{ width: '100%', paddingLeft: 40 }}>
          <FlashDealCard data={message.flashDeal} onGrab={onConfirm} />
        </div>
      )}

      {message.type === 'confirm-cta' && (
        <div style={{ width: '100%', paddingLeft: 40 }}>
          <motion.button whileTap={{ scale: 0.93 }} onClick={onConfirm}
            style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', borderRadius: 16, color: '#000', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(212,175,55,0.3)' }}>
            {message.text}
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
