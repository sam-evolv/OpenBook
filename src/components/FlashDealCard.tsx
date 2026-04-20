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
        border: `0.5px solid ${colors.goldPrimary}44`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 16 }}>
        {/* Flash deal badge — SVG lightning, no emoji */}
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M13 2L4.5 13.5H11L10 22L20.5 10H14L13 2Z"
              fill={colors.goldPrimary}
              stroke={colors.goldPrimary}
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.goldPrimary,
              letterSpacing: '0.06em',
            }}
          >
            FLASH DEAL
          </span>
        </div>

        {/* Business name */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: colors.text,
            letterSpacing: '-0.03em',
            marginBottom: 6,
          }}
        >
          {data.business}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.6,
            color: colors.textSecondary,
            marginBottom: 14,
          }}
        >
          {data.description}
        </div>

        {/* Pricing row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: colors.textTertiary,
              textDecoration: 'line-through',
            }}
          >
            {data.originalPrice}
          </span>
          <span style={{ fontSize: 28, fontWeight: 900, color: colors.text }}>
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
            fontWeight: 800,
            letterSpacing: '-0.02em',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
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
