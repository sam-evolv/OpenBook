import { motion } from 'framer-motion';
import { colors } from '../constants/theme';

export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '4px 0' }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: colors.goldGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        <span style={{ filter: 'brightness(1.2)' }}>&#10024;</span>
      </div>
      <div
        style={{
          background: colors.surface3,
          borderRadius: 22,
          padding: '14px 20px',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: colors.textSecondary,
            }}
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
