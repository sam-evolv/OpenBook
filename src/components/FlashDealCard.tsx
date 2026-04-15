import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { colors, radius, transitions } from '../constants/theme';
import type { FlashDealData } from '../constants/chatScripts';

interface Props {
  data: FlashDealData;
  onGrab?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FlashDealCard({ data, onGrab }: Props) {
  const [remaining, setRemaining] = useState(data.expiresInSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: `linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)`,
        borderRadius: radius.card,
        border: `1px solid ${colors.goldPrimary}33`,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 16 }}>
        {/* Flash deal badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: `${colors.goldPrimary}22`,
            padding: '5px 12px',
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13 }}>&#9889;</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.goldPrimary, letterSpacing: 0.5 }}>
            FLASH DEAL
          </span>
        </div>

        {/* Business name */}
        <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 6 }}>
          {data.business}
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, marginBottom: 14 }}>
          {data.description}
        </div>

        {/* Pricing row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 14,
              color: colors.textTertiary,
              textDecoration: 'line-through',
            }}
          >
            {data.originalPrice}
          </span>
          <span style={{ fontSize: 28, fontWeight: 800, color: colors.text }}>
            {data.currentPrice}
          </span>
          <span
            style={{
              background: `${colors.green}22`,
              color: colors.green,
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 8,
            }}
          >
            {data.savings}
          </span>
        </div>

        {/* Countdown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: colors.red,
              animation: 'pulse-dot 1s infinite',
            }}
          />
          <span style={{ fontSize: 13, color: colors.red, fontWeight: 600 }}>
            Expires in {formatTime(remaining)}
          </span>
        </div>

        {/* Grab button */}
        <motion.button
          whileTap={transitions.buttonTap}
          onClick={onGrab}
          style={{
            width: '100%',
            padding: '14px',
            background: colors.goldGradient,
            borderRadius: radius.pill,
            color: '#000',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Grab This Deal
        </motion.button>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
