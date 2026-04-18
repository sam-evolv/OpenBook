import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';
import { suggestionPills } from '../constants/chatScripts';
import FloatingDock from '../components/FloatingDock';
import { useState } from 'react';

export default function AssistantScreen() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');

  const handlePillClick = (type: string) => {
    navigate(`/chat?type=${type}`);
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      navigate(`/chat?type=custom&q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={transitions.spring}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg,
        overflow: 'hidden',
      }}
    >
      {/* Top nav */}
      <div
        className="safe-top"
        style={{
          padding: '16px 20px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 4,
            color: colors.goldPrimary,
            textTransform: 'uppercase',
          }}
        >
          OPENBOOK
        </div>
      </div>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          paddingBottom: 100,
        }}
      >
        {/* Concentric rings animation */}
        <div
          style={{
            position: 'relative',
            width: 160,
            height: 160,
            marginBottom: 32,
          }}
        >
          {/* Outer rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                inset: -10 * i - 10,
                borderRadius: '50%',
                border: `1px solid ${colors.goldPrimary}`,
                opacity: 0.15 - i * 0.04,
              }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.15 - i * 0.04, 0.08, 0.15 - i * 0.04],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Core logo */}
          <motion.div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${colors.goldPrimary}15 0%, transparent 70%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            animate={{
              boxShadow: [
                `0 0 40px rgba(212,175,55,0.1)`,
                `0 0 60px rgba(212,175,55,0.2)`,
                `0 0 40px rgba(212,175,55,0.1)`,
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <motion.div
              style={{ fontSize: 56 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              &#10024;
            </motion.div>
          </motion.div>
        </div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ...transitions.spring }}
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          How can I help you?
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          Ask me anything about local services
        </motion.div>

        {/* Suggestion pills 2x2 grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            width: '100%',
            maxWidth: 340,
            marginBottom: 24,
          }}
        >
          {suggestionPills.map((pill, i) => (
            <motion.button
              key={pill.type}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08, ...transitions.spring }}
              whileTap={transitions.buttonTap}
              onClick={() => handlePillClick(pill.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 16px',
                background: colors.surface2,
                borderRadius: radius.pill,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                fontWeight: 500,
                color: colors.text,
              }}
            >
              <span style={{ fontSize: 18 }}>{pill.icon}</span>
              {pill.label}
            </motion.button>
          ))}
        </div>

        {/* Powered by */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            fontSize: 12,
            color: colors.textTertiary,
          }}
        >
          Powered by OpenBook
        </motion.div>
      </div>

      {/* Input bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 118px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          padding: '8px 16px',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          background: `linear-gradient(180deg, transparent 0%, ${colors.bg} 30%)`,
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: colors.surface2,
            borderRadius: 28,
            padding: '6px 6px 6px 16px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.text,
              fontSize: 15,
            }}
          />
          <motion.button
            whileTap={transitions.buttonTap}
            onClick={handleSend}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: colors.goldGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" fill="#000" />
            </svg>
          </motion.button>
        </div>
      </div>

      <FloatingDock />
    </motion.div>
  );
}
