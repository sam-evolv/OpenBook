import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';

function ConfettiParticle({ delay, angle }: { delay: number; angle: number }) {
  const distance = 120 + Math.random() * 100;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  const size = 6 + Math.random() * 6;
  const particleColors = [colors.goldPrimary, colors.goldLight, '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'];
  const color = particleColors[Math.floor(Math.random() * particleColors.length)];
  const rotation = Math.random() * 360;

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{
        x,
        y: y + 40,
        opacity: [1, 1, 0],
        scale: [1, 1.2, 0.5],
        rotate: rotation,
      }}
      transition={{
        duration: 1.2,
        delay,
        ease: 'easeOut',
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: Math.random() > 0.5 ? '50%' : 2,
        background: color,
      }}
    />
  );
}

export default function SuccessScreen() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const confettiParticles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    delay: 0.3 + Math.random() * 0.3,
    angle: (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        padding: 24,
        overflow: 'hidden',
      }}
    >
      {/* Checkmark ring with confetti */}
      <div
        style={{
          position: 'relative',
          width: 120,
          height: 120,
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Confetti */}
        <AnimatePresence>
          {showConfetti &&
            confettiParticles.map((p) => (
              <ConfettiParticle key={p.id} delay={p.delay} angle={p.angle} />
            ))}
        </AnimatePresence>

        {/* Ring */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 12,
            delay: 0.1,
          }}
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `${colors.green}15`,
            border: `3px solid ${colors.green}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 40px ${colors.green}33`,
          }}
        >
          {/* Checkmark */}
          <motion.svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15,
              delay: 0.4,
            }}
          >
            <motion.path
              d="M5 13l4 4L19 7"
              stroke={colors.green}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
          </motion.svg>
        </motion.div>
      </div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, ...transitions.spring }}
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: colors.text,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        Booking Confirmed!
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: 32,
          lineHeight: 1.5,
        }}
      >
        You're all set. We've sent the details to your phone.
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, ...transitions.spring }}
        style={{
          width: '100%',
          maxWidth: 340,
          background: colors.surface2,
          borderRadius: radius.card,
          padding: 20,
          border: `1px solid ${colors.border}`,
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: colors.goldGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            &#10024;
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
              PolishPro Nails
            </div>
            <div style={{ fontSize: 13, color: colors.textSecondary }}>
              Gel Manicure
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>Date</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Today, Apr 15</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>Time</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>2:00 PM</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0 0',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ fontSize: 14, color: colors.textSecondary }}>Total paid</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: colors.goldPrimary }}>$38.00</span>
        </div>
      </motion.div>

      {/* Back to home */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, ...transitions.spring }}
        whileTap={transitions.buttonTap}
        onClick={() => navigate('/')}
        style={{
          width: '100%',
          maxWidth: 340,
          padding: '18px',
          background: colors.goldGradient,
          borderRadius: radius.pill,
          color: '#000',
          fontSize: 17,
          fontWeight: 700,
          boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
        }}
      >
        Back to Home
      </motion.button>
    </motion.div>
  );
}
