import { motion } from 'framer-motion';
import { colors, radius, transitions } from '../constants/theme';
import type { BusinessCardData } from '../constants/chatScripts';

interface Props {
  data: BusinessCardData;
  onBook?: () => void;
}

export default function BusinessCard({ data, onBook }: Props) {
  return (
    <div
      style={{
        background: colors.surface2,
        borderRadius: radius.card,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Emoji header */}
      <div
        style={{
          height: 100,
          background: `linear-gradient(135deg, ${colors.surface3} 0%, ${colors.surface1} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 52,
        }}
      >
        {data.emoji}
      </div>

      <div style={{ padding: '16px 16px 16px' }}>
        {/* Name */}
        <div style={{ fontSize: 17, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
          {data.name}
        </div>

        {/* Rating and distance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#FFD700', fontSize: 14 }}>&#9733;</span>
            <span style={{ color: colors.text, fontSize: 14, fontWeight: 600 }}>{data.rating}</span>
            <span style={{ color: colors.textSecondary, fontSize: 13 }}>({data.reviews})</span>
          </div>
          <div
            style={{
              background: colors.surface4,
              borderRadius: 8,
              padding: '3px 8px',
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            {data.distance}
          </div>
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {data.categories.map((cat) => (
            <span
              key={cat}
              style={{
                background: colors.surface4,
                color: colors.textSecondary,
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 10,
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, marginBottom: 12 }}>
          {data.description}
        </div>

        {/* Price */}
        <div style={{ fontSize: 16, fontWeight: 700, color: colors.goldPrimary, marginBottom: 14 }}>
          {data.price}
        </div>

        {/* Book button */}
        <motion.button
          whileTap={transitions.buttonTap}
          onClick={onBook}
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
          Book Now
        </motion.button>
      </div>
    </div>
  );
}
