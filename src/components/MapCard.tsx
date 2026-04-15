import { motion } from 'framer-motion';
import { colors, radius } from '../constants/theme';
import type { MapCardData } from '../constants/chatScripts';

interface Props {
  data: MapCardData;
}

export default function MapCard({ data }: Props) {
  return (
    <div
      style={{
        background: colors.surface2,
        borderRadius: radius.card,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Map area with SVG grid */}
      <div
        style={{
          position: 'relative',
          height: 200,
          background: colors.surface1,
          overflow: 'hidden',
        }}
      >
        {/* Grid lines */}
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, opacity: 0.1 }}
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={`${(i + 1) * 10}%`}
              x2="100%"
              y2={`${(i + 1) * 10}%`}
              stroke={colors.textSecondary}
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={`${(i + 1) * 10}%`}
              y1="0"
              x2={`${(i + 1) * 10}%`}
              y2="100%"
              stroke={colors.textSecondary}
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* User dot (blue pulsing) */}
        <motion.div
          style={{
            position: 'absolute',
            left: `${data.userDot.x}%`,
            top: `${data.userDot.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
          }}
        >
          <motion.div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: `${colors.blue}22`,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: colors.blue,
              border: '3px solid #fff',
              boxShadow: `0 0 10px ${colors.blue}`,
            }}
          />
        </motion.div>

        {/* Pins */}
        {data.pins.map((pin) => (
          <div
            key={pin.label}
            style={{
              position: 'absolute',
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              transform: 'translate(-50%, -100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 1,
            }}
          >
            <div
              style={{
                background: `${colors.bg}cc`,
                padding: '3px 8px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                color: colors.goldPrimary,
                marginBottom: 4,
                whiteSpace: 'nowrap',
                border: `1px solid ${colors.goldPrimary}33`,
              }}
            >
              {pin.label}
            </div>
            <svg width="18" height="24" viewBox="0 0 18 24" fill="none">
              <path
                d="M9 0C4.02 0 0 4.02 0 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.98-4.02-9-9-9z"
                fill={colors.goldPrimary}
              />
              <circle cx="9" cy="9" r="3.5" fill={colors.bg} />
            </svg>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: 13, color: colors.textSecondary }}>
          {data.resultCount} results found
        </span>
        <span style={{ fontSize: 13, color: colors.goldPrimary, fontWeight: 600 }}>
          Open Map &rarr;
        </span>
      </div>
    </div>
  );
}
