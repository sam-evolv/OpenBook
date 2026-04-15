import { useState } from 'react';
import { motion } from 'framer-motion';
import { colors, radius, transitions } from '../constants/theme';
import TabBar from '../components/TabBar';

const upcomingBookings = [
  {
    initials: 'NS',
    gradient: 'linear-gradient(145deg, #d05070, #a02848)',
    business: 'Nail Studio Cork',
    date: 'Thu 19 June',
    time: '6:00 PM',
    service: 'Gel Manicure',
    price: '€35',
    status: 'Confirmed',
  },
  {
    initials: 'IG',
    gradient: 'linear-gradient(145deg, #585858, #303030)',
    business: 'Iron Gym Cork',
    date: 'Sat 21 June',
    time: '7:00 AM',
    service: 'Morning Session',
    price: '€12',
    status: 'Confirmed',
  },
];

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="3" stroke={colors.textSecondary} strokeWidth="1.5" />
      <path d="M3 9h18" stroke={colors.textSecondary} strokeWidth="1.5" />
      <path d="M8 2v4M16 2v4" stroke={colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={colors.textSecondary} strokeWidth="1.5" />
      <path d="M12 7v5l3 3" stroke={colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

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
            display: 'block',
            marginBottom: 16,
          }}
        >
          Bookings
        </span>

        {/* Tab pills */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: radius.full,
            padding: 4,
            border: '0.5px solid rgba(255,255,255,0.08)',
            width: 'fit-content',
          }}
        >
          {(['upcoming', 'past'] as const).map((tab) => (
            <motion.button
              key={tab}
              whileTap={transitions.buttonTap}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: radius.full,
                background: activeTab === tab ? colors.goldGradient : 'transparent',
                color: activeTab === tab ? '#000' : colors.textSecondary,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px', paddingBottom: 100 }}>
        {activeTab === 'upcoming' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {upcomingBookings.map((booking, i) => (
              <motion.div
                key={booking.business}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, ...transitions.spring }}
                style={{
                  background: '#161616',
                  borderRadius: 20,
                  padding: 18,
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                {/* Business row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 16,
                      background: booking.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 900,
                      color: '#fff',
                      letterSpacing: '-0.02em',
                      flexShrink: 0,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                  >
                    {booking.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: colors.text,
                        letterSpacing: '-0.02em',
                        marginBottom: 2,
                      }}
                    >
                      {booking.business}
                    </div>
                    <div style={{ fontSize: 13, color: colors.textSecondary }}>{booking.service}</div>
                  </div>
                  {/* Confirmed pill */}
                  <div
                    style={{
                      background: `${colors.green}20`,
                      color: colors.green,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: radius.full,
                      border: `0.5px solid ${colors.green}44`,
                    }}
                  >
                    {booking.status}
                  </div>
                </div>

                {/* Date/time row */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    padding: '12px 0',
                    borderTop: '0.5px solid rgba(255,255,255,0.06)',
                    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CalendarIcon />
                    <span style={{ fontSize: 13, color: colors.textSecondary }}>{booking.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ClockIcon />
                    <span style={{ fontSize: 13, color: colors.textSecondary }}>{booking.time}</span>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: colors.goldPrimary }}>
                      {booking.price}
                    </span>
                  </div>
                </div>

                {/* View button */}
                <motion.button
                  whileTap={transitions.buttonTap}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: colors.goldGradient,
                    borderRadius: radius.pill,
                    color: '#000',
                    fontSize: 14,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: '-0.01em',
                    boxShadow: '0 4px 16px rgba(212,175,55,0.25)',
                  }}
                >
                  View Booking
                </motion.button>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Past tab empty state */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 80,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="3" stroke={colors.textTertiary} strokeWidth="1.5" />
                <path d="M3 9h18" stroke={colors.textTertiary} strokeWidth="1.5" />
                <path d="M8 2v4M16 2v4" stroke={colors.textTertiary} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: colors.textSecondary,
                letterSpacing: '-0.02em',
              }}
            >
              No past bookings yet
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 1.6,
                color: colors.textTertiary,
                textAlign: 'center',
                maxWidth: 240,
              }}
            >
              Your completed and cancelled appointments will appear here.
            </span>
          </motion.div>
        )}
      </div>

      <TabBar />
    </motion.div>
  );
}
