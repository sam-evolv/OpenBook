import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors, transitions } from '../constants/theme';

const tabs = [
  { id: 'home',      label: 'Home',     path: '/',          icon: 'home' },
  { id: 'explore',   label: 'Explore',  path: '/explore',   icon: 'explore' },
  { id: 'ai',        label: 'Ask AI',   path: '/assistant', icon: 'ai' },
  { id: 'bookings',  label: 'Bookings', path: '/bookings',  icon: 'bookings' },
  { id: 'me',        label: 'Me',       path: '/me',        icon: 'me' },
];

function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? colors.goldPrimary : colors.textSecondary;

  switch (icon) {
    case 'home':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'explore':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
          <path d="M16.5 16.5L21 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'bookings':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="17" rx="3" stroke={color} strokeWidth="2" />
          <path d="M3 9h18" stroke={color} strokeWidth="2" />
          <path d="M8 2v4M16 2v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'me':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
          <path
            d="M5 20c0-3.3 2.7-6 7-6s7 2.7 7 6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActive = (id: string) => {
    const p = location.pathname;
    if (id === 'home')     return p === '/';
    if (id === 'explore')  return p === '/explore';
    if (id === 'ai')       return p === '/assistant';
    if (id === 'bookings') return p === '/bookings';
    if (id === 'me')       return p === '/me';
    return false;
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: `linear-gradient(180deg, transparent 0%, ${colors.bg} 20%)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: 64,
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderTop: '0.5px solid rgba(255,255,255,0.1)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          paddingBottom: 4,
        }}
      >
        {tabs.map((tab) => {
          const active = getActive(tab.id);

          if (tab.id === 'ai') {
            return (
              <div
                key={tab.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {/* Fixed-size wrapper so pulse rings have a reference box */}
                <div
                  style={{
                    position: 'relative',
                    width: 62,
                    height: 62,
                    marginTop: -30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Pulse ring 1 */}
                  <motion.div
                    style={{
                      position: 'absolute',
                      width: 62,
                      height: 62,
                      borderRadius: '50%',
                      border: `1.5px solid ${colors.goldPrimary}`,
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      margin: 'auto',
                    }}
                    animate={{
                      scale: [1, 1.6, 1.6],
                      opacity: [0.5, 0, 0],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                  {/* Pulse ring 2 */}
                  <motion.div
                    style={{
                      position: 'absolute',
                      width: 62,
                      height: 62,
                      borderRadius: '50%',
                      border: `1.5px solid ${colors.goldPrimary}`,
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      margin: 'auto',
                    }}
                    animate={{
                      scale: [1, 1.9, 1.9],
                      opacity: [0.3, 0, 0],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: 'easeOut',
                      delay: 0.4,
                    }}
                  />

                  {/* AI button */}
                  <motion.button
                    whileTap={transitions.buttonTap}
                    onClick={() => navigate('/assistant')}
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      width: 62,
                      height: 62,
                      borderRadius: '50%',
                      background: colors.goldGradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(212,175,55,0.4)',
                          '0 0 35px rgba(212,175,55,0.6)',
                          '0 0 20px rgba(212,175,55,0.4)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                      }}
                    />
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ position: 'relative', zIndex: 1 }}
                    >
                      <path
                        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
                        fill="#000"
                        stroke="#000"
                        strokeWidth="1"
                      />
                    </svg>
                  </motion.button>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    color: colors.goldPrimary,
                  }}
                >
                  Ask AI
                </span>
              </div>
            );
          }

          return (
            <motion.button
              key={tab.id}
              whileTap={transitions.buttonTap}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '8px 0',
                minWidth: 52,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <TabIcon icon={tab.icon} active={active} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: active ? colors.goldPrimary : colors.textSecondary,
                }}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
