import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { colors, transitions } from '../constants/theme';
import LiquidGlassIcon from './LiquidGlassIcon';
import {
  CalendarSymbol,
  CompassSymbol,
  HouseSymbol,
  ProfileSymbol,
  SparkleSymbol,
} from './icons/DockIcons';

type DockTab = {
  id: 'home' | 'explore' | 'ai' | 'bookings' | 'me';
  path: string;
  symbol: React.ReactNode;
  primaryColour: string;
  variant?: 'diagonal' | 'radial-gold';
};

const tabs: DockTab[] = [
  { id: 'home', path: '/', symbol: <HouseSymbol />, primaryColour: '#1a1a1a' },
  { id: 'explore', path: '/', symbol: <CompassSymbol />, primaryColour: '#1a1a1a' },
  {
    id: 'ai',
    path: '/assistant',
    symbol: <SparkleSymbol />,
    primaryColour: '#D4AF37',
    variant: 'radial-gold',
  },
  {
    id: 'bookings',
    path: '/',
    symbol: <CalendarSymbol />,
    primaryColour: '#8a6d1a',
    variant: 'diagonal',
  },
  { id: 'me', path: '/', symbol: <ProfileSymbol />, primaryColour: '#1a1a1a' },
];

export default function FloatingDock() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeId: DockTab['id'] =
    location.pathname === '/assistant' ? 'ai' : 'home';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: 406,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: colors.dockGlass,
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: `0.5px solid ${colors.hairline}`,
          borderRadius: 30,
          boxShadow:
            '0 10px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.25)',
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <motion.button
              key={tab.id}
              whileTap={transitions.buttonTap}
              onClick={() => navigate(tab.path)}
              aria-label={tab.id}
              style={{
                background: 'transparent',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LiquidGlassIcon
                primaryColour={tab.primaryColour}
                symbol={tab.symbol}
                size={50}
                variant={tab.variant ?? 'diagonal'}
                ring={active}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
