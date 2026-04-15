import { motion } from 'framer-motion';
import { colors, radius, transitions } from '../constants/theme';
import type { ChatMessage, SlotOption } from '../constants/chatScripts';
import BusinessCard from './BusinessCard';
import MapCard from './MapCard';
import FlashDealCard from './FlashDealCard';

interface Props {
  message: ChatMessage;
  index: number;
  onSlotSelect?: (slot: SlotOption) => void;
  selectedSlot?: string | null;
  onConfirm?: () => void;
  onBook?: () => void;
}

export default function MessageBubble({
  message,
  index,
  onSlotSelect,
  selectedSlot,
  onConfirm,
  onBook,
}: Props) {
  const isUser = message.sender === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...transitions.spring, delay: index * 0.05 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8,
      }}
    >
      {/* Avatar row for AI messages */}
      {!isUser && message.type === 'text' && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '85%' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: colors.goldGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            &#10024;
          </div>
          <div
            style={{
              background: colors.surface3,
              borderRadius: radius.bubble,
              borderBottomLeftRadius: 6,
              padding: '12px 16px',
              fontSize: 15,
              lineHeight: 1.5,
              color: colors.text,
            }}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* User text bubble */}
      {isUser && message.type === 'text' && (
        <div
          style={{
            background: colors.goldGradient,
            borderRadius: radius.bubble,
            borderBottomRightRadius: 6,
            padding: '12px 16px',
            fontSize: 15,
            lineHeight: 1.5,
            color: '#000',
            fontWeight: 500,
            maxWidth: '85%',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Slot chips */}
      {message.type === 'slots' && message.slots && (
        <div style={{ width: '100%', paddingLeft: 40 }}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              paddingRight: 16,
            }}
          >
            {message.slots.map((slot) => {
              const isSelected = selectedSlot === slot.id;
              return (
                <motion.button
                  key={slot.id}
                  whileTap={transitions.buttonTap}
                  onClick={() => onSlotSelect?.(slot)}
                  style={{
                    flexShrink: 0,
                    padding: '10px 18px',
                    borderRadius: radius.pill,
                    background: isSelected ? colors.goldGradient : colors.surface3,
                    color: isSelected ? '#000' : colors.text,
                    fontSize: 14,
                    fontWeight: 600,
                    border: isSelected ? 'none' : `1px solid ${colors.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {slot.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Business card */}
      {message.type === 'business-card' && message.businessCard && (
        <div style={{ width: '100%', paddingLeft: 40 }}>
          <BusinessCard data={message.businessCard} onBook={onBook} />
        </div>
      )}

      {/* Map card */}
      {message.type === 'map-card' && message.mapCard && (
        <div style={{ width: '100%', paddingLeft: 40 }}>
          <MapCard data={message.mapCard} />
        </div>
      )}

      {/* Flash deal */}
      {message.type === 'flash-deal' && message.flashDeal && (
        <div style={{ width: '100%', paddingLeft: 40 }}>
          <FlashDealCard data={message.flashDeal} onGrab={onConfirm} />
        </div>
      )}

      {/* Confirm CTA */}
      {message.type === 'confirm-cta' && (
        <div style={{ width: '100%', paddingLeft: 40, paddingRight: 0 }}>
          <motion.button
            whileTap={transitions.buttonTap}
            onClick={onConfirm}
            style={{
              width: '100%',
              padding: '16px',
              background: colors.goldGradient,
              borderRadius: radius.pill,
              color: '#000',
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
            }}
          >
            {message.text}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
