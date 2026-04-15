import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';

export default function ConfirmScreen() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={transitions.spring}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="safe-top"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <motion.button
          whileTap={transitions.buttonTap}
          onClick={() => navigate(-1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: colors.surface3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke={colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>
          Confirm Booking
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
        }}
      >
        {/* Booking card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...transitions.spring }}
          style={{
            background: colors.surface2,
            borderRadius: radius.card,
            padding: 20,
            border: `1px solid ${colors.border}`,
            marginBottom: 16,
          }}
        >
          {/* Business header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: colors.goldGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              &#10024;
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>
                PolishPro Nails
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <span style={{ color: '#FFD700', fontSize: 13 }}>&#9733;</span>
                <span style={{ fontSize: 13, color: colors.text, fontWeight: 600 }}>4.9</span>
                <span style={{ fontSize: 12, color: colors.textSecondary }}>(284 reviews)</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '\u{1F485}', label: 'Service', value: 'Gel Manicure' },
              { icon: '\u{1F4C5}', label: 'Date', value: 'Today, April 15' },
              { icon: '\u{1F552}', label: 'Time', value: '2:00 PM' },
              { icon: '\u23F1\uFE0F', label: 'Duration', value: '45 minutes' },
              { icon: '\u{1F4CD}', label: 'Location', value: '123 Main St, 0.3 mi away' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, color: colors.textSecondary }}>
                    {item.label}
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payment row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ...transitions.spring }}
          style={{
            background: colors.surface2,
            borderRadius: radius.card,
            padding: 20,
            border: `1px solid ${colors.border}`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>
              Payment
            </span>
            <span style={{ fontSize: 13, color: colors.goldPrimary, fontWeight: 600 }}>
              Change
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 28,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #1a1f71 0%, #2d4fd7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              VISA
            </div>
            <span style={{ fontSize: 14, color: colors.text }}>
              &#8226;&#8226;&#8226;&#8226; 4242
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 18,
              padding: '14px 0 0',
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
              Total
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: colors.goldPrimary }}>
              $38.00
            </span>
          </div>
        </motion.div>

        {/* Spacer for buttons */}
        <div style={{ height: 120 }} />
      </div>

      {/* Bottom buttons */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          padding: '16px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
          background: `linear-gradient(180deg, transparent 0%, ${colors.bg} 30%)`,
        }}
      >
        <motion.button
          whileTap={transitions.buttonTap}
          onClick={() => navigate('/success')}
          style={{
            width: '100%',
            padding: '18px',
            background: colors.goldGradient,
            borderRadius: radius.pill,
            color: '#000',
            fontSize: 17,
            fontWeight: 700,
            marginBottom: 10,
            boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
          }}
        >
          Confirm &amp; Pay $38.00
        </motion.button>

        <motion.button
          whileTap={transitions.buttonTap}
          onClick={() => navigate(-1)}
          style={{
            width: '100%',
            padding: '14px',
            background: 'transparent',
            borderRadius: radius.pill,
            color: colors.textSecondary,
            fontSize: 15,
            fontWeight: 600,
            border: `1px solid ${colors.border}`,
          }}
        >
          Go Back
        </motion.button>
      </div>
    </motion.div>
  );
}
