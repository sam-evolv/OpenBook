'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: '#080808', color: '#fff',
      fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 100, padding: '0 40px', height: '64px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(8,8,8,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(212,175,55,0.15)' : 'none',
        transition: 'all 0.3s ease'
      }}>
        <span style={{ fontSize: '20px', fontWeight: 900,
          letterSpacing: '-0.02em' }}>
          OpenBook <span style={{ color: '#D4AF37' }}>AI</span>
        </span>
        <div style={{ display: 'flex', gap: '24px',
          alignItems: 'center' }}>
          <Link href="/home" style={{ color: 'rgba(255,255,255,0.6)',
            fontSize: '14px', textDecoration: 'none' }}>
            Consumer app
          </Link>
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.6)',
            fontSize: '14px', textDecoration: 'none' }}>
            Sign in
          </Link>
          <Link href="/onboarding" style={{
            background: '#D4AF37', color: '#000',
            padding: '8px 20px', borderRadius: '10px',
            fontSize: '14px', fontWeight: 700,
            textDecoration: 'none'
          }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh', position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        paddingTop: '80px', textAlign: 'center',
        backgroundImage: `
          linear-gradient(to bottom,
            rgba(8,8,8,0.55) 0%, rgba(8,8,8,0.97) 100%),
          url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80&auto=format')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        {/* Floating gold particles */}
        {[
          {top:'15%',left:'10%',size:3,dur:'4s',delay:'0s'},
          {top:'25%',left:'85%',size:2,dur:'6s',delay:'1s'},
          {top:'60%',left:'5%',size:4,dur:'5s',delay:'2s'},
          {top:'70%',left:'90%',size:2,dur:'7s',delay:'0.5s'},
          {top:'40%',left:'92%',size:3,dur:'4.5s',delay:'1.5s'},
          {top:'80%',left:'15%',size:2,dur:'6s',delay:'2.5s'},
          {top:'20%',left:'45%',size:2,dur:'5s',delay:'0.8s'},
          {top:'55%',left:'75%',size:3,dur:'3.5s',delay:'1.2s'},
        ].map((p,i) => (
          <div key={i} style={{
            position: 'absolute',
            top: p.top, left: p.left,
            width: p.size, height: p.size,
            borderRadius: '50%',
            background: 'rgba(212,175,55,0.7)',
            boxShadow: '0 0 6px rgba(212,175,55,0.5)',
            animation: `floatParticle ${p.dur} ease-in-out
              ${p.delay} infinite`
          }}/>
        ))}

        <div style={{ maxWidth: '760px', padding: '0 24px' }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            gap: '8px', padding: '6px 16px',
            borderRadius: '20px', marginBottom: '32px',
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.3)'
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%',
              background: '#D4AF37' }}/>
            <span style={{ fontSize: '12px',
              color: '#D4AF37', fontWeight: 600,
              letterSpacing: '0.08em' }}>
              NOW LIVE · IRELAND
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.03em', marginBottom: '24px' }}>
            Your booking page,<br/>
            live in{' '}
            <span style={{ color: '#D4AF37' }}>15 minutes.</span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: '19px',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.65, maxWidth: '540px',
            margin: '0 auto 40px' }}>
            Give your business a beautiful booking page and
            a home screen icon on every customer&apos;s phone.
            No marketplace. Zero commission.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '12px',
            justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/onboarding" style={{
              background: '#D4AF37', color: '#000',
              padding: '15px 32px', borderRadius: '14px',
              fontSize: '16px', fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(212,175,55,0.35)'
            }}>
              Get your page live →
            </Link>
            <Link href="/home" style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', padding: '15px 32px',
              borderRadius: '14px', fontSize: '16px',
              fontWeight: 600, textDecoration: 'none'
            }}>
              See the consumer app
            </Link>
          </div>

          <p style={{ marginTop: '16px', fontSize: '13px',
            color: 'rgba(255,255,255,0.25)' }}>
            Free to start · No credit card · Live in 15 minutes
          </p>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: '40px',
          left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '8px'
        }}>
          <span style={{ fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.15em', fontWeight: 600 }}>
            SCROLL TO EXPLORE
          </span>
          <div style={{
            width: '1px', height: '48px',
            background: 'linear-gradient(to bottom, rgba(212,175,55,0.8), transparent)',
            animation: 'scrollLine 2s ease-in-out infinite'
          }}/>
        </div>
      </section>

      {/* WHAT YOU ARE REPLACING */}
      <section style={{ padding: '100px 40px',
        background: '#080808', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#D4AF37',
          letterSpacing: '0.12em', fontWeight: 700,
          marginBottom: '16px' }}>THE OLD WAY</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 900, marginBottom: '48px',
          letterSpacing: '-0.02em' }}>
          What you are replacing
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap',
          gap: '12px', justifyContent: 'center',
          maxWidth: '700px', margin: '0 auto' }}>
          {[
            'Phone calls to book',
            'Instagram DMs',
            'Paper appointment books',
            'No-shows with no reminder',
            'Marketplace taking 20% commission',
            'No app of your own',
            'Facebook Messenger bookings',
          ].map(item => (
            <div key={item} style={{
              padding: '8px 16px', borderRadius: '20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.35)',
              textDecoration: 'line-through'
            }}>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '100px 40px',
        background: '#0d0d0d', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#D4AF37',
          letterSpacing: '0.12em', fontWeight: 700,
          marginBottom: '16px' }}>HOW IT WORKS</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 900, marginBottom: '64px',
          letterSpacing: '-0.02em' }}>
          Live in three steps.
        </h2>
        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { n: '1', title: 'Set up your page',
              body: 'Add your services, hours and brand. Your booking page is live in 15 minutes.' },
            { n: '2', title: 'Customers find you',
              body: 'Appear on the OpenBook consumer app. Customers save you to their phone and book in seconds.' },
            { n: '3', title: 'Get paid. Keep everything.',
              body: 'Card payments go straight to your account. No commission on bookings.' },
          ].map(s => (
            <div key={s.n} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '32px',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 900,
                color: '#D4AF37', lineHeight: 1,
                marginBottom: '16px' }}>{s.n}</div>
              <div style={{ fontSize: '18px', fontWeight: 700,
                marginBottom: '10px' }}>{s.title}</div>
              <div style={{ fontSize: '15px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '100px 40px',
        background: '#080808', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#D4AF37',
          letterSpacing: '0.12em', fontWeight: 700,
          marginBottom: '16px' }}>FOR BUSINESSES</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 900, marginBottom: '64px',
          letterSpacing: '-0.02em' }}>
          Everything you need to run bookings.
        </h2>
        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { title: 'Smart scheduling',
              body: 'Availability calculated automatically. No double bookings.' },
            { title: 'Card payments',
              body: 'Stripe-powered. Money goes straight to your account.' },
            { title: 'Automated reminders',
              body: '24h and 2h reminders sent automatically. Fewer no-shows.' },
            { title: 'Your own booking page',
              body: 'A beautiful page at openbook.ie/your-name. Share it anywhere.' },
            { title: 'Consumer app icon',
              body: 'Appear as an app icon on your customers home screens.' },
            { title: 'Flash sales',
              body: 'Fill empty slots instantly by pushing a flash sale to regulars.' },
          ].map(f => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(212,175,55,0.12)',
              borderLeft: '2px solid #D4AF37',
              borderRadius: '14px', padding: '28px',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '15px', fontWeight: 700,
                marginBottom: '8px' }}>{f.title}</div>
              <div style={{ fontSize: '14px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.6 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER */}
      <section style={{ padding: '100px 40px',
        background: '#0d0d0d', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p style={{ fontSize: '11px', color: '#D4AF37',
            letterSpacing: '0.12em', fontWeight: 700,
            marginBottom: '24px' }}>WHY OPENBOOK</p>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 800, marginBottom: '32px',
            letterSpacing: '-0.02em' }}>
            Built in Ireland, for local businesses
          </h2>
          <p style={{ fontSize: '18px',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.8, marginBottom: '16px' }}>
            OpenBook was not designed in a startup lab.
          </p>
          <p style={{ fontSize: '18px',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.8, marginBottom: '16px' }}>
            It was built because booking a session at a
            local gym or salon should not require Instagram
            DMs, phone calls, or third-party apps taking a
            cut of every transaction.
          </p>
          <p style={{ fontSize: '18px',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.8, marginBottom: '40px' }}>
            Every feature exists because a real business
            needed it.
          </p>
          <Link href="/home" style={{
            color: '#D4AF37', fontSize: '15px',
            fontWeight: 600, textDecoration: 'none'
          }}>
            See it running on openbook.ie →
          </Link>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '100px 40px',
        background: '#080808', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#D4AF37',
          letterSpacing: '0.12em', fontWeight: 700,
          marginBottom: '16px' }}>PRICING</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 900, marginBottom: '64px',
          letterSpacing: '-0.02em' }}>
          Simple, honest pricing.
        </h2>
        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px', maxWidth: '680px', margin: '0 auto' }}>
          {/* Starter */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '40px',
            textAlign: 'left'
          }}>
            <p style={{ fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '16px' }}>STARTER</p>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '52px', fontWeight: 900 }}>
                €0
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)',
                fontSize: '16px' }}>/month</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)',
              marginTop: '24px', paddingTop: '24px',
              display: 'flex', flexDirection: 'column',
              gap: '10px' }}>
              {['Booking page','Up to 2 services',
                'Email confirmations','Basic dashboard'
              ].map(f => (
                <div key={f} style={{ fontSize: '14px',
                  color: 'rgba(255,255,255,0.55)',
                  display: 'flex', gap: '10px' }}>
                  <span style={{ color: '#D4AF37' }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
          {/* Pro */}
          <div style={{
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.4)',
            borderRadius: '20px', padding: '40px',
            textAlign: 'left', position: 'relative'
          }}>
            <div style={{
              position: 'absolute', top: '20px', right: '20px',
              background: '#D4AF37', color: '#000',
              fontSize: '10px', fontWeight: 800,
              padding: '3px 10px', borderRadius: '20px',
              letterSpacing: '0.05em'
            }}>PRO</div>
            <p style={{ fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.1em', color: '#D4AF37',
              marginBottom: '16px' }}>PRO</p>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontSize: '52px', fontWeight: 900,
                color: '#D4AF37' }}>€29</span>
              <span style={{ color: 'rgba(212,175,55,0.6)',
                fontSize: '16px' }}>/month</span>
            </div>
            <p style={{ fontSize: '12px',
              color: 'rgba(255,255,255,0.35)',
              marginBottom: '24px' }}>
              or 5% per booking — whichever is less
            </p>
            <div style={{ borderTop: '1px solid rgba(212,175,55,0.2)',
              paddingTop: '24px',
              display: 'flex', flexDirection: 'column',
              gap: '10px', marginBottom: '28px' }}>
              {['Everything in Starter',
                'Unlimited services',
                'Card payments via Stripe',
                'Consumer app icon',
                'Automated reminders',
                'Flash sales',
                'AI business insights',
                'WhatsApp booking (coming soon)'
              ].map(f => (
                <div key={f} style={{ fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)',
                  display: 'flex', gap: '10px' }}>
                  <span style={{ color: '#D4AF37' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <Link href="/onboarding" style={{
              display: 'block', textAlign: 'center',
              background: '#D4AF37', color: '#000',
              padding: '14px', borderRadius: '12px',
              fontSize: '15px', fontWeight: 700,
              textDecoration: 'none'
            }}>
              Get started free
            </Link>
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section style={{
        padding: '120px 40px', textAlign: 'center',
        backgroundImage: `
          linear-gradient(to bottom,
            rgba(8,8,8,0.7) 0%, rgba(8,8,8,0.97) 100%),
          url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80&auto=format')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 900, marginBottom: '20px',
          letterSpacing: '-0.02em' }}>
          Ready to take bookings?
        </h2>
        <p style={{ fontSize: '19px',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '40px' }}>
          Join businesses already on OpenBook.
        </p>
        <Link href="/onboarding" style={{
          background: '#D4AF37', color: '#000',
          padding: '16px 40px', borderRadius: '14px',
          fontSize: '17px', fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 4px 32px rgba(212,175,55,0.4)'
        }}>
          Get started free
        </Link>
        <p style={{ marginTop: '16px', fontSize: '13px',
          color: 'rgba(255,255,255,0.2)' }}>
          openbook.ie · No credit card required
        </p>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#050508',
        padding: '60px 40px',
        borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px', marginBottom: '40px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 900,
              marginBottom: '12px', letterSpacing: '-0.02em' }}>
              OpenBook <span style={{ color: '#D4AF37' }}>AI</span>
            </div>
            <p style={{ fontSize: '13px',
              color: 'rgba(255,255,255,0.3)',
              lineHeight: 1.6 }}>
              The booking platform for local businesses.
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: '16px' }}>PLATFORM</p>
            {['For businesses', 'Consumer app',
              'Pricing', 'Sign in'].map(l => (
              <div key={l} style={{ marginBottom: '10px' }}>
                <Link href="#" style={{ fontSize: '14px',
                  color: 'rgba(255,255,255,0.4)',
                  textDecoration: 'none' }}>{l}</Link>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: '16px' }}>LEGAL</p>
            {['Privacy Policy', 'Terms of Service',
              'Support'].map(l => (
              <div key={l} style={{ marginBottom: '10px' }}>
                <Link href="#" style={{ fontSize: '14px',
                  color: 'rgba(255,255,255,0.4)',
                  textDecoration: 'none' }}>{l}</Link>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: '13px',
              color: 'rgba(255,255,255,0.2)' }}>
              Designed & Developed by EvolvAI
            </p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '24px', textAlign: 'center',
          fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>
          © 2026 OpenBook AI. All rights reserved.
        </div>
      </footer>

      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-18px); opacity: 0.9; }
        }
        @keyframes scrollLine {
          0%, 100% { opacity: 0.3; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  )
}
