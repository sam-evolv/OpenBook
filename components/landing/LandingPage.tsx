'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/* ── Design tokens ── */
const GOLD        = '#D4AF37'
const BG          = '#080812'
const BG_ALT      = '#0d0d16'
const FOOTER_BG   = '#050508'
const WALLPAPER   = `
  radial-gradient(ellipse at 25% 15%, #1a3a6b 0%, transparent 55%),
  radial-gradient(ellipse at 78% 55%, #2d1b4e 0%, transparent 50%),
  radial-gradient(ellipse at 50% 88%, #0d2d1a 0%, transparent 50%),
  radial-gradient(ellipse at 88% 8%,  #3b1a0a 0%, transparent 45%),
  #080812
`

/* ── Static data ── */
const JOURNEY_STEPS = [
  { num: 1, title: 'Onboard',       desc: 'Set up your business in 15 minutes. Add services, hours and brand colours.' },
  { num: 2, title: 'Go live',       desc: 'Your booking page is live at openbook.ie/your-name. Share it anywhere.' },
  { num: 3, title: 'Get found',     desc: "Appear as an app icon on your customers' phones. One tap to book." },
  { num: 4, title: 'Take bookings', desc: 'Bookings flow in 24/7. Stripe handles payments. Reminders go out automatically.' },
  { num: 5, title: 'Build loyalty', desc: 'Repeat customers book faster. Build a loyal client base with zero commission.' },
]

const OLD_WAY_PILLS = [
  'Phone calls to book',
  'Instagram DMs',
  'Facebook Messenger',
  'Paper appointment books',
  'No-shows with no reminder',
  'Fresha taking 20% commission',
  'No consumer app of your own',
]

const FEATURES = [
  { title: 'Smart scheduling',       desc: 'Your availability is calculated automatically. No double bookings, no conflicts.' },
  { title: 'Card payments',          desc: 'Stripe-powered. Money goes straight to your account. OpenBook charges a small flat fee.' },
  { title: 'Automated reminders',    desc: '24h and 2h email reminders sent automatically. Fewer no-shows.' },
  { title: 'Your own booking page',  desc: 'A beautiful page at openbook.ie/your-name. Share it on Instagram. Put it in your bio.' },
  { title: 'Consumer app icon',      desc: "Appear as an app icon on your customers' home screens. They tap and book instantly." },
  { title: 'Real-time dashboard',    desc: "See today's bookings, this week's revenue, and all your customers in one view." },
]

const HOME_ICONS = [
  { initials: 'EP', colour: '#D4AF37', label: 'Evolv' },
  { initials: 'SW', colour: '#a78bfa', label: 'Saltwater' },
  { initials: 'NS', colour: '#f472b6', label: 'Nail Studio' },
  { initials: 'RB', colour: '#34d399', label: 'Refresh' },
]

const STATS = [
  { num: '15 min', label: 'To go live' },
  { num: '0%',     label: 'Commission on bookings' },
  { num: '24/7',   label: 'Booking availability' },
  { num: '1 tap',  label: 'For returning customers' },
]

/* ── Shared glass style ── */
const glass = {
  background:           'rgba(255,255,255,0.05)',
  border:               '1px solid rgba(255,255,255,0.09)',
  backdropFilter:       'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
} as const

/* ── Mini phone-frame icon ── */
function PhoneIcon({ initials, colour, label, size = 52 }: { initials: string; colour: string; label: string; size?: number }) {
  const radius = Math.round(size * 0.27)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div
        style={{
          width: size, height: size,
          borderRadius: radius,
          position: 'relative', overflow: 'hidden',
          backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.22)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.28)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: colour, opacity: 0.60 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '48%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 100%)', borderRadius: `${radius}px ${radius}px 60% 60% / ${radius}px ${radius}px 30px 30px` }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', background: 'linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: Math.round(size * 0.27), fontWeight: 800, color: colour, letterSpacing: '-0.02em', textShadow: `0 0 ${Math.round(size * 0.23)}px ${colour}, 0 2px 4px rgba(0,0,0,0.5)` }}>
            {initials}
          </span>
        </div>
      </div>
      <span style={{ fontSize: Math.max(8, Math.round(size * 0.19)), fontWeight: 500, color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 3px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  )
}

/* ── Mini glass dock ── */
function MiniDock({ height = 40, iconSize = 24 }: { height?: number; iconSize?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: Math.round(height * 0.4),
        background: 'rgba(14,14,20,0.84)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.11)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: `0 ${Math.round(height * 0.3)}px`,
      }}
    >
      {[true, false, false, false].map((active, i) => (
        <div
          key={i}
          style={{
            width: iconSize, height: iconSize,
            borderRadius: Math.round(iconSize * 0.33),
            background: active ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.07)',
            border: active ? '1px solid rgba(212,175,55,0.28)' : '1px solid rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ width: Math.round(iconSize * 0.33), height: Math.round(iconSize * 0.33), borderRadius: '50%', background: active ? GOLD : 'rgba(255,255,255,0.22)' }} />
        </div>
      ))}
    </div>
  )
}

/* ── Phone frame ── */
function PhoneFrame({ width = 320, compact = false }: { width?: number; compact?: boolean }) {
  const pad = compact ? 16 : 28
  const iconSize = compact ? 38 : 52
  const wordmarkSize = compact ? 11 : 14
  const sectionFontSize = compact ? 8 : 11
  const dockHeight = compact ? 40 : 52

  return (
    <div
      style={{
        width,
        borderRadius: compact ? 28 : 40,
        border: `${compact ? 4 : 6}px solid rgba(255,255,255,0.12)`,
        boxShadow: `0 ${compact ? 30 : 60}px ${compact ? 60 : 120}px rgba(0,0,0,0.7)`,
        overflow: 'hidden',
        background: WALLPAPER,
        padding: `${compact ? 24 : 40}px ${pad}px ${compact ? 16 : 24}px`,
      }}
    >
      {/* Wordmark */}
      <div style={{ marginBottom: compact ? 20 : 28 }}>
        <span style={{ fontSize: wordmarkSize, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
          OpenBook<span style={{ color: GOLD, marginLeft: 2 }}>AI</span>
        </span>
      </div>

      {/* Favourites label */}
      <p style={{ fontSize: sectionFontSize, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: `0 0 ${compact ? 10 : 14}px` }}>
        Favourites
      </p>

      {/* Icon grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: `${compact ? 10 : 16}px ${compact ? 2 : 4}px` }}>
        {HOME_ICONS.map(icon => (
          <PhoneIcon key={icon.initials} {...icon} size={iconSize} />
        ))}
      </div>

      {/* Dock */}
      <div style={{ marginTop: compact ? 20 : 32 }}>
        <MiniDock height={dockHeight} iconSize={Math.round(dockHeight * 0.6)} />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter()
  const [scrolled,    setScrolled]    = useState(false)
  const [activeStep,  setActiveStep]  = useState(0)

  // Client-side auth redirect — logged-in users go straight to /overview
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/overview')
    })
  }, [router])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: BG, color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ═══════════════════════════ NAV ═══════════════════════════ */}
      <nav
        style={{
          position:             'fixed',
          top: 0, left: 0, right: 0,
          zIndex:               100,
          transition:           'background 0.3s, backdrop-filter 0.3s, border-color 0.3s',
          background:           scrolled ? 'rgba(8,8,18,0.88)' : 'transparent',
          backdropFilter:       scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom:         scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Wordmark */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
              OpenBook<span style={{ color: GOLD, marginLeft: 3 }}>AI</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 32 }}>
            <a href="#how-it-works" style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              For businesses
            </a>
            <Link href="/home" style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              Consumer app
            </Link>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link
              href="/onboarding"
              style={{ fontSize: 14, fontWeight: 700, color: '#000', background: GOLD, borderRadius: 10, padding: '8px 18px', textDecoration: 'none' }}
            >
              Get started
            </Link>
          </div>

          {/* Mobile — minimal buttons */}
          <div className="flex md:hidden" style={{ alignItems: 'center', gap: 12 }}>
            <Link href="/login"      style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>Sign in</Link>
            <Link href="/onboarding" style={{ fontSize: 13, fontWeight: 700, color: '#000', background: GOLD, borderRadius: 9, padding: '7px 14px', textDecoration: 'none' }}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section
        style={{
          minHeight:       '100vh',
          background:      WALLPAPER,
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          paddingTop:      160,
          paddingBottom:   80,
          position:        'relative',
        }}
      >
        {/* Bottom fade */}
        <div aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: `linear-gradient(to bottom, transparent, ${BG})`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1120, width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>

          {/* Eyebrow pill */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              ...glass,
              borderRadius: 20, padding: '6px 16px', marginBottom: 28,
            }}
          >
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: GOLD }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Now live · Cork, Ireland
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize:      'clamp(40px, 6vw, 68px)',
              fontWeight:    900,
              color:         '#fff',
              letterSpacing: '-0.03em',
              lineHeight:    1.05,
              maxWidth:      740,
              textAlign:     'center',
              margin:        0,
            }}
          >
            One booking page.<br />
            Every customer.<br />
            <span style={{ color: GOLD }}>Zero commission.</span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.55)', maxWidth: 540, lineHeight: 1.65, marginTop: 24, textAlign: 'center' }}>
            Give your Cork business a beautiful booking page and a home screen icon on every customer&apos;s phone. No marketplace. No fees on each booking.
          </p>

          {/* CTA row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              href="/onboarding"
              style={{ height: 52, borderRadius: 14, padding: '0 28px', background: GOLD, color: '#000', fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
            >
              Get your page live
            </Link>
            <Link
              href="/home"
              style={{ height: 52, borderRadius: 14, padding: '0 28px', ...glass, color: '#fff', fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
            >
              See the consumer app →
            </Link>
          </div>

          {/* Fine print */}
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', marginTop: 16 }}>
            Free to start · No credit card · Live in 15 minutes
          </p>

          {/* Hero phone frame */}
          <div style={{ marginTop: 64 }}>
            <PhoneFrame width={320} />
          </div>
        </div>
      </section>

      {/* ══════════════════ WHAT YOU'RE REPLACING ══════════════════ */}
      <section style={{ background: BG_ALT, padding: '100px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>
            The old way
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, color: '#fff', margin: '0 0 40px' }}>
            What you&apos;re replacing
          </h2>

          {/* Scrollable pill row */}
          <div
            style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}
            className="scrollbar-none"
          >
            {OLD_WAY_PILLS.map(text => (
              <div
                key={text}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 8,
                  ...glass,
                  borderRadius: 12, padding: '10px 16px',
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.40)', textDecoration: 'line-through', whiteSpace: 'nowrap' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ THE JOURNEY ═══════════════════════ */}
      <section style={{ background: BG, padding: '100px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>
            The OpenBook journey
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, color: '#fff', margin: '0 0 60px' }}>
            From first booking to loyal customer
          </h2>

          {/* Desktop timeline */}
          <div className="hidden md:flex" style={{ position: 'relative' }}>
            {/* Connecting line */}
            <div style={{ position: 'absolute', top: 20, left: '10%', right: '10%', height: 1, background: 'rgba(255,255,255,0.07)' }} />

            {JOURNEY_STEPS.map((step, i) => (
              <div
                key={step.num}
                onClick={() => setActiveStep(i)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', padding: '0 8px', position: 'relative', zIndex: 1 }}
              >
                {/* Circle */}
                <div
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: activeStep === i ? GOLD : 'rgba(255,255,255,0.05)',
                    border:     activeStep === i ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800,
                    color: activeStep === i ? '#000' : 'rgba(255,255,255,0.40)',
                    transition: 'all 0.25s ease',
                    marginBottom: 16,
                    boxShadow: activeStep === i ? `0 0 20px ${GOLD}40` : 'none',
                  }}
                >
                  {step.num}
                </div>

                {/* Title */}
                <span
                  style={{
                    fontSize: 15, fontWeight: 700,
                    color: activeStep === i ? '#fff' : 'rgba(255,255,255,0.45)',
                    transition: 'color 0.25s',
                    textAlign: 'center',
                    marginBottom: 10,
                  }}
                >
                  {step.title}
                </span>

                {/* Active desc */}
                {activeStep === i && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, textAlign: 'center', maxWidth: 180, margin: 0 }}>
                    {step.desc}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Mobile steps — vertical list */}
          <div className="flex md:hidden" style={{ flexDirection: 'column', gap: 0 }}>
            {JOURNEY_STEPS.map((step, i) => (
              <div
                key={step.num}
                onClick={() => setActiveStep(i)}
                style={{ display: 'flex', gap: 16, cursor: 'pointer', paddingBottom: i < JOURNEY_STEPS.length - 1 ? 28 : 0, position: 'relative' }}
              >
                {/* Vertical line */}
                {i < JOURNEY_STEPS.length - 1 && (
                  <div style={{ position: 'absolute', left: 19, top: 40, bottom: 0, width: 1, background: 'rgba(255,255,255,0.07)' }} />
                )}
                <div
                  style={{
                    flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                    background: activeStep === i ? GOLD : 'rgba(255,255,255,0.05)',
                    border:     activeStep === i ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800,
                    color: activeStep === i ? '#000' : 'rgba(255,255,255,0.40)',
                    transition: 'all 0.25s',
                  }}
                >
                  {step.num}
                </div>
                <div style={{ paddingTop: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: activeStep === i ? '#fff' : 'rgba(255,255,255,0.50)', marginBottom: activeStep === i ? 8 : 0, transition: 'color 0.25s' }}>
                    {step.title}
                  </div>
                  {activeStep === i && (
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
                      {step.desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ REAL PRODUCT ══════════════════════ */}
      <section style={{ background: BG_ALT, padding: '100px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>
            See inside
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
            This is what your dashboard looks like
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', margin: '0 0 56px', maxWidth: 560 }}>
            No mockups. No concepts. This is the real product running on openbook.ie today.
          </p>

          {/* Two screenshot cards */}
          <div className="grid md:grid-cols-2" style={{ gap: 24, marginBottom: 64 }}>

            {/* Dashboard card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '28px 28px 0' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                  Business Dashboard
                </p>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: '0 0 24px' }}>
                  Log in and instantly see today&apos;s bookings, revenue, and schedule. Add services, manage hours, and share your booking page — all in one place.
                </p>
              </div>

              {/* Dashboard mock */}
              <div
                style={{
                  margin: '0 28px 28px',
                  height: 260,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #0f1115 0%, #080812 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Sidebar strip */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 52, background: 'rgba(255,255,255,0.015)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 10 }}>
                  {[GOLD, 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)'].map((c, i) => (
                    <div key={i} style={{ width: 26, height: 26, borderRadius: 8, background: c === GOLD ? 'rgba(212,175,55,0.15)' : c, border: c === GOLD ? '1px solid rgba(212,175,55,0.25)' : 'none' }} />
                  ))}
                </div>

                {/* Main content */}
                <div style={{ marginLeft: 60, padding: '16px 16px 16px 8px', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Topbar */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Overview</div>

                  {/* 4 stat cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[{ l: 'Revenue', v: '€0.00' }, { l: 'Bookings', v: '0' }, { l: 'Clients', v: '0' }, { l: 'Upcoming', v: '0' }].map(s => (
                      <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', marginBottom: 4 }}>{s.l}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Revenue chart */}
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'flex-end', gap: 4, padding: '10px 10px 8px' }}>
                    <div style={{ flex: 1, fontSize: 9, color: 'rgba(255,255,255,0.20)', marginBottom: 4, position: 'absolute', paddingTop: 6 }}>Weekly revenue</div>
                    {[20, 45, 30, 65, 40, 78, 55].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}%`, background: `rgba(212,175,55,${i === 5 ? 0.55 : 0.12})`, borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Consumer app card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '28px 28px 0' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                  Consumer App
                </p>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: '0 0 24px' }}>
                  Your customers see your business as an app icon on their phone. Tap to book. No app store. No download. Just magic.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0 28px 28px' }}>
                <PhoneFrame width={210} compact />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '32px 24px' }}>
            {STATS.map(s => (
              <div key={s.num} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, color: GOLD, letterSpacing: '-0.02em', marginBottom: 6 }}>
                  {s.num}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section id="how-it-works" style={{ background: BG, padding: '100px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>
            For businesses
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, color: '#fff', margin: '0 0 56px' }}>
            Everything you need to run bookings
          </h2>

          <div className="grid md:grid-cols-3" style={{ gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                style={{ ...glass, borderRadius: 16, padding: '24px 24px' }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(212,175,55,0.10)',
                    border: '1px solid rgba(212,175,55,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: GOLD,
                    marginBottom: 16,
                  }}
                >
                  {i + 1}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{f.title}</h3>
                <p  style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOUNDER STORY ══════════════════════ */}
      <section style={{ background: BG_ALT, padding: '100px 0' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>
            Why OpenBook
          </p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, color: '#fff', margin: '0 0 28px' }}>
            Built in Cork, for Cork businesses
          </h2>

          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75 }}>
            <p style={{ marginTop: 0 }}>OpenBook wasn&apos;t designed in a startup lab.</p>
            <p>
              It was built because booking a session at a local Cork gym or salon shouldn&apos;t
              require Instagram DMs, phone calls, or third-party apps taking a cut of every transaction.
            </p>
            <p style={{ marginBottom: 0 }}>
              Every feature exists because a real business needed it — not because it looked good
              on a pitch deck.
            </p>
          </div>

          <Link
            href="/home"
            style={{ display: 'inline-block', marginTop: 28, fontSize: 16, fontWeight: 600, color: GOLD, textDecoration: 'none' }}
          >
            See it running on openbook.ie →
          </Link>
        </div>
      </section>

      {/* ════════════════════════ CLOSING CTA ════════════════════════ */}
      <section
        style={{ background: WALLPAPER, padding: '120px 24px', textAlign: 'center', position: 'relative' }}
      >
        {/* Top fade from previous section */}
        <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: `linear-gradient(to bottom, ${BG_ALT}, transparent)`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            Ready to take bookings?
          </h2>
          <p style={{ fontSize: 19, color: 'rgba(255,255,255,0.50)', margin: '0 0 36px' }}>
            Get your page live in 15 minutes.<br />
            Join Cork businesses already on OpenBook.
          </p>
          <Link
            href="/onboarding"
            style={{ display: 'inline-flex', alignItems: 'center', height: 56, borderRadius: 16, padding: '0 36px', background: GOLD, color: '#000', fontSize: 18, fontWeight: 700, textDecoration: 'none', boxShadow: `0 8px 32px ${GOLD}40` }}
          >
            Get started free
          </Link>
          <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
            openbook.ie · No credit card required
          </p>
        </div>
      </section>

      {/* ════════════════════════════ FOOTER ════════════════════════════ */}
      <footer style={{ background: FOOTER_BG, padding: '64px 24px 32px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>

          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '40px 32px', marginBottom: 48 }}>

            {/* Col 1 — Brand */}
            <div className="col-span-2 md:col-span-1">
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12 }}>
                OpenBook<span style={{ color: GOLD, marginLeft: 2 }}>AI</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.40)', lineHeight: 1.65, margin: '0 0 12px', maxWidth: 220 }}>
                The booking platform for Cork businesses.
              </p>
              <a href="mailto:sam@openbook.ie" style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
                sam@openbook.ie
              </a>
            </div>

            {/* Col 2 — Platform */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
                Platform
              </p>
              {[
                { label: 'For Businesses', href: '#how-it-works' },
                { label: 'Consumer App',   href: '/home'          },
                { label: 'Pricing',        href: '#'              },
                { label: 'Sign in',        href: '/login'         },
              ].map(({ label, href }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <a href={href} style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', textDecoration: 'none' }}>{label}</a>
                </div>
              ))}
            </div>

            {/* Col 3 — Legal */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
                Legal
              </p>
              {[
                { label: 'Privacy Policy',    href: '/privacy' },
                { label: 'Terms of Service',  href: '/terms'   },
                { label: 'Support',           href: '/support' },
              ].map(({ label, href }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <a href={href} style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', textDecoration: 'none' }}>{label}</a>
                </div>
              ))}
            </div>

            {/* Col 4 — Built with */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
                Built with
              </p>
              <a
                href="https://evolvai.ie"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', textDecoration: 'none', lineHeight: 1.65 }}
              >
                Designed &amp; Developed by EvolvAI
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
            © 2026 OpenBook AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
