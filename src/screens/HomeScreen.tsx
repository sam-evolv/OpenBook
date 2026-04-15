import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';
import TabBar from '../components/TabBar';

const favourites = [
  { initials: 'EP', name: 'Elite Pampering', gradient: 'linear-gradient(145deg, #d4a820, #8a6810)', badge: null },
  { initials: 'SW', name: 'StyleWorks',      gradient: 'linear-gradient(145deg, #8070d0, #5040a8)', badge: '2' },
  { initials: 'NS', name: 'NailStar',        gradient: 'linear-gradient(145deg, #d05070, #a02848)', badge: null },
  { initials: 'RB', name: 'Rose Beauty',     gradient: 'linear-gradient(145deg, #28b880, #107850)', badge: null },
];

const myPlaces = [
  { initials: 'CP', name: 'CorePower',   gradient: 'linear-gradient(145deg, #3880d8, #1858a8)', badge: null },
  { initials: 'YF', name: 'YogaFlow',    gradient: 'linear-gradient(145deg, #d08028, #a05808)', badge: null },
  { initials: 'IG', name: 'IronGrip Gym', gradient: 'linear-gradient(145deg, #585858, #303030)', badge: '1' },
];

function IconTile({
  initials,
  name,
  gradient,
  badge,
  delay,
}: {
  initials: string;
  name: string;
  gradient: string;
  badge: string | null;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ...transitions.spring }}
      whileTap={transitions.buttonTap}
      style={{
        flexShrink: 0,
        width: 72,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        cursor: 'pointer',
      }}
    >
      {/* Squircle icon */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.02em',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 24px rgba(0,0,0,0.4)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          {initials}
        </div>
        {badge && (
          <div
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: colors.red,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              border: '2px solid #080808',
            }}
          >
            {badge}
          </div>
        )}
      </div>

      {/* Name */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: 72,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>

      {/* Dot indicator */}
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: colors.goldPrimary,
          opacity: 0.7,
        }}
      />
    </motion.div>
  );
}

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
      <div className="safe-top" style={{ padding: '18px 24px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: colors.text,
              letterSpacing: '-0.03em',
            }}
          >
            OpenBook
          </span>

          <motion.button
            whileTap={transitions.buttonTap}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="9.5" cy="9.5" r="6.5" stroke="#D4AF37" strokeWidth="2" />
              <line x1="14.5" y1="14.5" x2="20" y2="20" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* FAVOURITES */}
        <div style={{ paddingTop: 14 }}>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '0 24px',
              marginBottom: 14,
            }}
          >
            Favourites
          </span>

          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingLeft: 24,
              paddingRight: 24,
              scrollbarWidth: 'none',
            }}
          >
            {favourites.map((fav, i) => (
              <IconTile key={fav.initials} {...fav} delay={i * 0.07} />
            ))}
          </div>
        </div>

        {/* MY PLACES */}
        <div style={{ paddingTop: 28 }}>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '0 24px',
              marginBottom: 14,
            }}
          >
            My Places
          </span>

          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingLeft: 24,
              paddingRight: 24,
              scrollbarWidth: 'none',
            }}
          >
            {myPlaces.map((place, i) => (
              <IconTile key={place.initials} {...place} delay={0.28 + i * 0.07} />
            ))}
          </div>
        </div>

        {/* Add a place */}
        <div style={{ padding: '28px 24px 0' }}>
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
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 18, color: colors.textSecondary, lineHeight: 1 }}>+</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: colors.textSecondary,
                lineHeight: 1.6,
              }}
            >
              Add a place
            </span>
          </motion.button>
        </div>
      </div>

      <TabBar />
    </motion.div>
  );
}
