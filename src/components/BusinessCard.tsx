import { motion } from 'framer-motion';
import { colors, radius, transitions } from '../constants/theme';
import type { BusinessCardData } from '../constants/chatScripts';

interface Props {
  data: BusinessCardData;
  onBook?: () => void;
}

const GRADIENTS = [
  'linear-gradient(145deg, #3880d8, #1858a8)',
  'linear-gradient(145deg, #d05070, #a02848)',
  'linear-gradient(145deg, #8070d0, #5040a8)',
  'linear-gradient(145deg, #28b880, #107850)',
  'linear-gradient(145deg, #d08028, #a05808)',
  'linear-gradient(145deg, #d4a820, #8a6810)',
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return GRADIENTS[hash % GRADIENTS.length];
}

export default function BusinessCard({ data, onBook }: Props) {
  const initials = getInitials(data.name);
  const gradient = getGradient(data.name);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: radius.card,
        overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Initials header — no emoji, no photos */}
      <div
        style={{
          height: 100,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.03em',
        }}
      >
        {initials}
      </div>

      <div style={{ padding: '16px 16px 16px' }}>
        {/* Name */}
        <div
          style={{
            fontSize: 17,
            fontWeight: 900,
            color: colors.text,
            letterSpacing: '-0.03em',
            marginBottom: 8,
          }}
        >
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
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.6,
            color: colors.textSecondary,
            marginBottom: 12,
          }}
        >
          {data.description}
        </div>

        {/* Price */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: colors.goldPrimary,
            marginBottom: 14,
          }}
        >
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
            fontWeight: 800,
            letterSpacing: '-0.02em',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
          }}
        >
          Book Now
        </motion.button>
      </div>
    </div>
  );
}
