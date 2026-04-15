import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';
import TabBar from '../components/TabBar';

const favourites = [
  { emoji: '\u{1F487}', name: 'Luxe Hair', rating: '4.9' },
  { emoji: '\u{1F485}', name: 'PolishPro', rating: '4.8' },
  { emoji: '\u{1F4AA}', name: 'IronWorks', rating: '4.7' },
  { emoji: '\u{1F9D6}', name: 'Zen Spa', rating: '4.9' },
  { emoji: '\u{1F374}', name: 'Noire', rating: '4.8' },
];

const myPlaces = [
  { emoji: '\u2615', name: 'Bean & Brew', category: 'Coffee', distance: '0.1 mi' },
  { emoji: '\u{1F354}', name: 'Stack Burger', category: 'Food', distance: '0.3 mi' },
  { emoji: '\u{1F3CB}\uFE0F', name: 'FitLife', category: 'Gym', distance: '0.5 mi' },
];

export default function HomeScreen() {
  const navigate = useNavigate();

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
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
                color: colors.goldPrimary,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              OpenBook AI
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>
              Good evening
            </div>
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: colors.goldGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: '#000',
            }}
          >
            S
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
        <div style={{ padding: '12px 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 20px',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>
              Favourites
            </span>
            <span style={{ fontSize: 13, color: colors.goldPrimary, fontWeight: 600 }}>
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
                style={{
                  flexShrink: 0,
                  width: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: radius.squircle,
                    background: colors.surface2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {fav.emoji}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>
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
        <div style={{ padding: '12px 20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
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
                    background: colors.surface4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  {place.emoji}
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
