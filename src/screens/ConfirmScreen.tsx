import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';

function DetailIcon({ type }: { type: string }) {
  const c = colors.textSecondary;
  switch (type) {
    case 'service':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="6" cy="6" r="3" stroke={c} strokeWidth="1.5" />
          <circle cx="6" cy="18" r="3" stroke={c} strokeWidth="1.5" />
          <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'date':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="17" rx="3" stroke={c} strokeWidth="1.5" />
          <path d="M3 9h18" stroke={c} strokeWidth="1.5" />
          <path d="M8 2v4M16 2v4" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'time':
    case 'duration':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" />
          <path d="M12 7v5l3 3" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'location':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={c} strokeWidth="1.5" />
          <circle cx="12" cy="9" r="2.5" stroke={c} strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}

const details = [
  { icon: 'service',  label: 'Service',  value: 'Gel Manicure' },
  { icon: 'date',     label: 'Date',     value: 'Today, April 15' },
  { icon: 'time',     label: 'Time',     value: '2:00 PM' },
  { icon: 'duration', label: 'Duration', value: '45 minutes' },
  { icon: 'location', label: 'Location', value: '123 Main St, 0.3 mi away' },
];

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
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
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
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke={colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        <span
          style={{
            fontSize: 17,
            fontWeight: 900,
            color: colors.text,
            letterSpacing: '-0.03em',
          }}
        >
          Confirm Booking
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

        {/* Booking card — liquid glass */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...transitions.spring }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRadius: radius.card,
            padding: 20,
            border: '0.5px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            marginBottom: 16,
          }}
        >
          {/* Business header — initials squircle instead of emoji */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(145deg, #d05070, #a02848)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.02em',
                flexShrink: 0,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              PP
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: colors.text,
                  letterSpacing: '-0.03em',
                }}
              >
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {details.map((item, i) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: i < details.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <DetailIcon type={item.icon} />
                  <span style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: colors.textSecondary }}>
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
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRadius: radius.card,
            padding: 20,
            border: '0.5px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
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
              borderTop: '0.5px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: colors.goldPrimary }}>
              €38.00
            </span>
          </div>
        </motion.div>

        <div style={{ height: 140 }} />
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
          padding: '16px 24px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
          background: `linear-gradient(180deg, transparent 0%, ${colors.bg} 30%)`,
        }}
      >
        <motion.button
          whileTap={transitions.buttonTap}
          onClick={() => navigate('/success')}
          style={{
            width: '100%',
            height: 56,
            background: colors.goldGradient,
            borderRadius: radius.pill,
            color: '#000',
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            border: 'none',
            cursor: 'pointer',
            marginBottom: 10,
            boxShadow: '0 8px 32px rgba(212,175,55,0.4)',
          }}
        >
          Confirm &amp; Pay €38.00
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
            border: '0.5px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
          }}
        >
          Go Back
        </motion.button>
      </div>
    </motion.div>
  );
}
