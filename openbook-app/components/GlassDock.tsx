'use client'

import { useRouter, usePathname } from 'next/navigation'

/* ─── Types ─────────────────────────────────────────────────────────── */

type TabKey = 'home' | 'bookings' | 'wallet' | 'me'

interface GlassDockProps {
  /** Override active tab (defaults to pathname detection) */
  activeTab?: TabKey
  /** Optional external nav handler — fires alongside router.push */
  onNavigate?: (tab: TabKey) => void
}

/* ─── Shared dock-icon style ─────────────────────────────────────────── */

const iconBase: React.CSSProperties = {
  position: 'relative',
  width: 56,
  height: 56,
  borderRadius: 15,
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.28)',
  boxShadow: `
    inset 0 1.5px 0 rgba(255,255,255,0.4),
    0 2px 12px rgba(0,0,0,0.3)
  `,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'transform 0.18s cubic-bezier(0.16,1,0.3,1)',
  flexShrink: 0,
}

/* ─── Specular highlight (top-left glow) ────────────────────────────── */
function Specular() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: -9,
        left: -9,
        width: 38,
        height: 38,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(255,255,255,0.52) 0%, transparent 68%)',
        zIndex: 4,
        pointerEvents: 'none',
      }}
    />
  )
}

/* ─── Tint layer ────────────────────────────────────────────────────── */
function Tint({ gradient, opacity = 1 }: { gradient: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        borderRadius: 14,
        background: gradient,
        opacity,
      }}
    />
  )
}

/* ─── BOOKINGS icon ─────────────────────────────────────────────────── */
function BookingsIcon({ active }: { active: boolean }) {
  const now = new Date()
  const monthLabel = now
    .toLocaleString('en-US', { month: 'short' })
    .toUpperCase()
  const dayNum = now.getDate().toString()

  return (
    <div
      className="active:scale-[0.84]"
      style={{
        ...iconBase,
        opacity: active ? 1 : 0.78,
      }}
    >
      <Tint gradient="linear-gradient(145deg, #ef4444, #991b1b)" />
      <Specular />
      {/* Calendar symbol */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        <span
          style={{
            fontSize: 8.5,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1,
            letterSpacing: '0.04em',
          }}
        >
          {monthLabel}
        </span>
        <span
          style={{
            fontSize: 21,
            fontWeight: 900,
            color: 'white',
            lineHeight: 1,
          }}
        >
          {dayNum}
        </span>
      </div>
    </div>
  )
}

/* ─── OPENBOOK orb icon ──────────────────────────────────────────────── */
function OpenBookIcon({ active }: { active: boolean }) {
  return (
    <div
      className="active:scale-[0.84]"
      style={{
        ...iconBase,
        width: 56,
        height: 56,
        borderRadius: 15,
        border: '1px solid rgba(212,175,55,0.45)',
        boxShadow: `
          inset 0 1.5px 0 rgba(255,255,255,0.4),
          0 2px 12px rgba(0,0,0,0.3),
          0 2px 16px rgba(212,175,55,0.25)
        `,
        marginTop: -6,
        opacity: active ? 1 : 0.82,
      }}
    >
      <Tint
        gradient="linear-gradient(145deg, rgba(212,175,55,0.55), rgba(139,100,40,0.45))"
      />
      <Specular />
      {/* Compass / concentric circles logo */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer ring */}
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="2.5"
          />
          {/* Inner ring */}
          <circle
            cx="20"
            cy="20"
            r="9"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
          />
          {/* Center dot */}
          <circle cx="20" cy="20" r="3.5" fill="rgba(255,255,255,0.9)" />
          {/* Cardinal lines */}
          <line
            x1="20" y1="4" x2="20" y2="11"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="20" y1="29" x2="20" y2="36"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="4" y1="20" x2="11" y2="20"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="29" y1="20" x2="36" y2="20"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

/* ─── WALLET icon ───────────────────────────────────────────────────── */
function WalletIcon({ active }: { active: boolean }) {
  return (
    <div
      className="active:scale-[0.84]"
      style={{
        ...iconBase,
        opacity: active ? 1 : 0.78,
      }}
    >
      <Tint gradient="linear-gradient(145deg, #10b981, #065f46)" />
      <Specular />
      {/* Card symbol */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <svg
          width="28"
          height="24"
          viewBox="0 0 24 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Card outline */}
          <rect
            x="2"
            y="3"
            width="20"
            height="14"
            rx="3"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="1.9"
          />
          {/* Magnetic stripe */}
          <line
            x1="2"
            y1="7"
            x2="22"
            y2="7"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="1.9"
          />
          {/* Chip */}
          <rect
            x="5"
            y="10"
            width="5"
            height="3"
            rx="1"
            fill="rgba(255,255,255,0.65)"
          />
        </svg>
      </div>
    </div>
  )
}

/* ─── ME icon ───────────────────────────────────────────────────────── */
function MeIcon({ active }: { active: boolean }) {
  return (
    <div
      className="active:scale-[0.84]"
      style={{
        ...iconBase,
        opacity: active ? 1 : 0.78,
      }}
    >
      <Tint gradient="linear-gradient(145deg, #818cf8, #3730a3)" />
      <Specular />
      {/* Profile symbol */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Head */}
          <circle
            cx="12"
            cy="8"
            r="4"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="1.9"
          />
          {/* Shoulders */}
          <path
            d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

/* ─── Icon label ────────────────────────────────────────────────────── */
function IconLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.75)',
        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
        marginTop: 5,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}

/* ─── Dock item wrapper ─────────────────────────────────────────────── */
function DockItem({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label={label}
    >
      {children}
      <IconLabel>{label}</IconLabel>
    </button>
  )
}

/* ─── Pathname → tab mapping ─────────────────────────────────────────── */
function pathnameToTab(pathname: string): TabKey {
  if (pathname.startsWith('/bookings')) return 'bookings'
  if (pathname.startsWith('/wallet')) return 'wallet'
  if (pathname.startsWith('/me')) return 'me'
  return 'home'
}

/* ─── Route map ─────────────────────────────────────────────────────── */
const routes: Record<TabKey, string> = {
  home: '/',
  bookings: '/bookings',
  wallet: '/wallet',
  me: '/me',
}

/* ─── GlassDock ─────────────────────────────────────────────────────── */
export default function GlassDock({ activeTab, onNavigate }: GlassDockProps) {
  const router = useRouter()
  const pathname = usePathname()

  const active: TabKey = activeTab ?? pathnameToTab(pathname)

  function navigate(tab: TabKey) {
    router.push(routes[tab])
    onNavigate?.(tab)
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 18,
        height: 88,
        borderRadius: 28,
        background: 'rgba(255,255,255,0.13)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.24)',
        boxShadow: `
          inset 0 1.5px 0 rgba(255,255,255,0.32),
          inset 0 -1px 0 rgba(0,0,0,0.12),
          0 8px 32px rgba(0,0,0,0.45)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 14px',
        zIndex: 100,
      }}
    >
      <DockItem label="Bookings" onClick={() => navigate('bookings')}>
        <BookingsIcon active={active === 'bookings'} />
      </DockItem>

      <DockItem label="OpenBook" onClick={() => navigate('home')}>
        <OpenBookIcon active={active === 'home'} />
      </DockItem>

      <DockItem label="Wallet" onClick={() => navigate('wallet')}>
        <WalletIcon active={active === 'wallet'} />
      </DockItem>

      <DockItem label="Me" onClick={() => navigate('me')}>
        <MeIcon active={active === 'me'} />
      </DockItem>
    </div>
  )
}
