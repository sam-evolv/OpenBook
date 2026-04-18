import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';
import FloatingDock from '../components/FloatingDock';
import PageDots from '../components/PageDots';
import LiquidGlassIcon from '../components/LiquidGlassIcon';
import {
  businessSymbols,
  type BusinessSymbolId,
} from '../components/icons/BusinessSymbols';

type Favourite = {
  initials: string;
  name: string;
  rating: string;
  primaryColour: string;
  symbolId?: BusinessSymbolId;
};

type MyPlace = {
  initials: string;
  name: string;
  category: string;
  distance: string;
  primaryColour: string;
};

const favourites: Favourite[] = [
  { initials: 'EP', name: 'Evolv Performance', rating: '4.9', primaryColour: '#6E4AB7', symbolId: 'evolv' },
  { initials: 'SS', name: 'Saltwater Sauna', rating: '4.8', primaryColour: '#1E6F86', symbolId: 'saltwater' },
  { initials: 'NS', name: 'The Nail Studio', rating: '4.7', primaryColour: '#B45A82', symbolId: 'nail-studio' },
  { initials: 'RB', name: 'Refresh Barber', rating: '4.9', primaryColour: '#2D6A4F', symbolId: 'refresh' },
  { initials: 'CP', name: 'Cork Physio & Sports', rating: '4.8', primaryColour: '#B24A3A', symbolId: 'cork-physio' },
  { initials: 'YF', name: 'Yoga Flow', rating: '4.9', primaryColour: '#3E7CB1', symbolId: 'yoga-flow' },
  { initials: 'IG', name: 'Iron Gym', rating: '4.7', primaryColour: '#2A2A2A', symbolId: 'iron-gym' },
];

const myPlaces: MyPlace[] = [
  { initials: 'BB', name: 'Bean & Brew', category: 'Coffee', distance: '0.1 mi', primaryColour: '#8B5A3C' },
  { initials: 'SB', name: 'Stack Burger', category: 'Food', distance: '0.3 mi', primaryColour: '#B2453C' },
  { initials: 'FL', name: 'FitLife', category: 'Gym', distance: '0.5 mi', primaryColour: '#3A6E9C' },
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
        background: colors.wallpaper,
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
                fontWeight: 500,
                marginBottom: 4,
                letterSpacing: -0.3,
              }}
            >
              <span style={{ color: colors.text }}>OpenBook</span>
            </div>
            <div style={{ fontSize: 15, color: colors.textSecondary }}>
              Good evening, Sam
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
              fontSize: 17,
              fontWeight: 500,
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
          paddingBottom: 160,
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
            <span style={{ fontSize: 17, fontWeight: 500, color: colors.text }}>
              Favourites
            </span>
            <span style={{ fontSize: 13, color: colors.goldPrimary, fontWeight: 500 }}>
              See all
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 14,
              overflowX: 'auto',
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            {favourites.map((fav, i) => {
              const Symbol = fav.symbolId ? businessSymbols[fav.symbolId] : null;
              return (
                <motion.div
                  key={fav.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, ...transitions.spring }}
                  whileTap={transitions.buttonTap}
                  style={{
                    flexShrink: 0,
                    width: 72,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <LiquidGlassIcon
                    primaryColour={fav.primaryColour}
                    symbol={Symbol ? <Symbol /> : undefined}
                    fallbackInitials={fav.initials}
                    size={62}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: colors.text,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      maxWidth: 72,
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
              );
            })}
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
            <span style={{ fontSize: 17, fontWeight: 500, color: colors.text }}>
              My Places
            </span>
            <span style={{ fontSize: 13, color: colors.goldPrimary, fontWeight: 500 }}>
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
                  padding: '12px 14px',
                  border: `1px solid ${colors.border}`,
                }}
              >
                <LiquidGlassIcon
                  primaryColour={place.primaryColour}
                  fallbackInitials={place.initials}
                  size={44}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: colors.text }}>
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

          {/* Add a place */}
          <motion.button
            whileTap={transitions.buttonTap}
            onClick={() => navigate('/assistant')}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '12px 14px',
              borderRadius: radius.squircle,
              border: `1.5px dashed ${colors.hairline}`,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: colors.mutedGlass,
                border: `0.5px solid ${colors.hairline}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
                +
              </span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, color: colors.textSecondary }}>
              Add a place
            </span>
          </motion.button>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 108px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
        }}
      >
        <PageDots count={3} active={0} />
      </div>

      <FloatingDock />
    </motion.div>
  );
}
