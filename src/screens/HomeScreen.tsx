import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';
import { useAuth } from '../lib/AuthContext';
import TabBar from '../components/TabBar';

const favourites = [
  { initials: 'EP', name: 'Evolv Performance', rating: '4.9', gradient: 'linear-gradient(135deg, #D4AF37 0%, #b88a18 100%)', slug: 'evolv-performance' },
  { initials: 'SW', name: 'Saltwater Sauna', rating: '4.8', gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', slug: 'saltwater-sauna' },
  { initials: 'NS', name: 'The Nail Studio', rating: '4.7', gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', slug: 'the-nail-studio' },
  { initials: 'RB', name: 'Refresh Barber', rating: '4.9', gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', slug: 'refresh-barber' },
  { initials: 'CP', name: 'Cork Physio', rating: '4.8', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', slug: 'cork-physio' },
  { initials: 'YF', name: 'Yoga Flow Cork', rating: '4.9', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', slug: 'yoga-flow-cork' },
  { initials: 'IG', name: 'Iron Gym Cork', rating: '4.7', gradient: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)', slug: 'iron-gym-cork' },
];

const myPlaces = [
  { initials: 'BB', name: 'Bean & Brew', category: 'Coffee', distance: '0.1 mi', gradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)' },
  { initials: 'SB', name: 'Stack Burger', category: 'Food', distance: '0.3 mi', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
  { initials: 'FL', name: 'FitLife', category: 'Gym', distance: '0.5 mi', gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
];

export default function HomeScreen() {
  const navigate = useNavigate();
  const { customer, user } = useAuth();
  const firstName = customer?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const userInitial = (customer?.name?.[0] ?? user?.email?.[0] ?? 'S').toUpperCase();

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
      <div
        className="safe-top"
        style={{
          padding: '16px 20px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                marginBottom: 4,
                letterSpacing: -0.3,
              }}
            >
              <span style={{ color: colors.text }}>Open</span>
              <span style={{ color: colors.text }}>Book </span>
              <span
                style={{
                  background: colors.goldGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                AI
              </span>
            </div>
            <div style={{ fontSize: 15, color: colors.textSecondary }}>
              {greeting}, {firstName}
            </div>
          </div>
          <div
            onClick={() => navigate('/me')}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: colors.goldGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 17,
              fontWeight: 700,
              color: '#000',
              cursor: 'pointer',
            }}
          >
            {userInitial}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 100,
        }}
      >
        {/* Favourites */}
        <div style={{ padding: '16px 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 20px',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>
              Favourites
            </span>
            <span onClick={() => navigate('/explore')} style={{ fontSize: 13, color: colors.goldPrimary, fontWeight: 600, cursor: 'pointer' }}>
              See all
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            {favourites.map((fav, i) => (
              <motion.div
                key={fav.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, ...transitions.spring }}
                whileTap={transitions.buttonTap}
                onClick={() => navigate(`/business/${fav.slug}`)}
                style={{
                  flexShrink: 0,
                  width: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: radius.squircle,
                    background: fav.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: -0.5,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {fav.initials}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: colors.text,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    maxWidth: 76,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fav.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ color: '#FFD700', fontSize: 10 }}>&#9733;</span>
                  <span style={{ fontSize: 10, color: colors.textSecondary }}>{fav.rating}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* My Places */}
        <div style={{ padding: '8px 20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>
              My Places
            </span>
            <span style={{ fontSize: 13, color: colors.goldPrimary, fontWeight: 600 }}>
              See all
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myPlaces.map((place, i) => (
              <motion.div
                key={place.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, ...transitions.spring }}
                whileTap={transitions.buttonTap}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: colors.surface2,
                  borderRadius: radius.squircle,
                  padding: '14px 16px',
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: place.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: -0.5,
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  {place.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>
                    {place.name}
                  </div>
                  <div style={{ fontSize: 13, color: colors.textSecondary }}>
                    {place.category}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: colors.textTertiary }}>
                  {place.distance}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Add a place button */}
        <div style={{ padding: '12px 20px' }}>
          <motion.button
            whileTap={transitions.buttonTap}
            onClick={() => navigate('/assistant')}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: radius.squircle,
              border: `1.5px dashed ${colors.textTertiary}`,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 20, color: colors.textTertiary }}>+</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: colors.textSecondary }}>
              Add a place
            </span>
          </motion.button>
        </div>
      </div>

      <TabBar />
    </motion.div>
  );
}
