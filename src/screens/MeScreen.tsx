import { motion } from 'framer-motion';
import { colors, radius, transitions } from '../constants/theme';
import TabBar from '../components/TabBar';

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 18l6-6-6-6" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardIcon({ type }: { type: string }) {
  const c = colors.textSecondary;
  switch (type) {
    case 'payment':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="3" stroke={c} strokeWidth="1.5" />
          <path d="M2 10h20" stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'notifications':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M13.73 21a2 2 0 01-3.46 0" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'saved':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'help':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

const settingsRows = [
  { icon: 'payment',       label: 'Payment methods' },
  { icon: 'notifications', label: 'Notifications' },
  { icon: 'saved',         label: 'Saved places' },
  { icon: 'help',          label: 'Help & Support' },
];

export default function MeScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -30 }}
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
      <div className="safe-top" style={{ padding: '18px 24px 14px' }}>
        <span
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: colors.text,
            letterSpacing: '-0.03em',
          }}
        >
          Me
        </span>
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Profile section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, ...transitions.spring }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 24px 28px',
          }}
        >
          {/* Gold initial circle */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: colors.goldGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 900,
              color: '#000',
              letterSpacing: '-0.02em',
              marginBottom: 12,
              boxShadow: '0 8px 32px rgba(212,175,55,0.35)',
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: colors.text,
              letterSpacing: '-0.03em',
              marginBottom: 4,
            }}
          >
            Sam
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, color: colors.textSecondary, lineHeight: 1.6 }}>
            Member since April 2024
          </div>
        </motion.div>

        {/* Settings rows */}
        <div style={{ padding: '0 24px' }}>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Settings
          </span>

          <div
            style={{
              background: '#161616',
              borderRadius: 20,
              border: '0.5px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              marginBottom: 20,
            }}
          >
            {settingsRows.map((row, i) => (
              <motion.button
                key={row.label}
                whileTap={transitions.buttonTap}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: i < settingsRows.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <CardIcon type={row.icon} />
                <span
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: 500,
                    color: colors.text,
                    lineHeight: 1.6,
                  }}
                >
                  {row.label}
                </span>
                <ChevronRight />
              </motion.button>
            ))}
          </div>

          {/* Sign out */}
          <motion.button
            whileTap={transitions.buttonTap}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 18px',
              background: '#161616',
              borderRadius: 20,
              border: '0.5px solid rgba(255,80,60,0.2)',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: colors.red,
                letterSpacing: '-0.01em',
              }}
            >
              Sign Out
            </span>
          </motion.button>
        </div>
      </div>

      <TabBar />
    </motion.div>
  );
}
