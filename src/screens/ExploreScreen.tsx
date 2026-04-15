import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { colors, transitions } from '../constants/theme'
import { supabase } from '../lib/supabase'
import TabBar from '../components/TabBar'
import type { Business } from '../lib/types'

const CATEGORIES = ['All', 'Gym', 'Sauna', 'Salon', 'Barber', 'Massage', 'Physio', 'Yoga', 'Tattoo']

interface DisplayBusiness {
  slug: string
  name: string
  category: string
  primaryColour: string
  heroImage: string
  city: string | null
}

function matchesCategory(b: DisplayBusiness, category: string): boolean {
  if (category === 'All') return true
  return b.category.toLowerCase().includes(category.toLowerCase())
}

export default function ExploreScreen() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All')
  const [businesses, setBusinesses] = useState<DisplayBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data } = await supabase
          .from('businesses')
          .select('slug, name, category, primary_colour, hero_image_url, city')
          .eq('is_live', true)
          .order('name')

        if (!cancelled && data) {
          setBusinesses(data.map((b) => ({
            slug: b.slug,
            name: b.name,
            category: b.category,
            primaryColour: b.primary_colour ?? '#D4AF37',
            heroImage: b.hero_image_url ?? '',
            city: b.city,
          })))
        }
      } catch {
        // fail silently
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let results = businesses
    if (activeCategory !== 'All') {
      results = results.filter((b) => matchesCategory(b, activeCategory))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      results = results.filter((b) =>
        b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
      )
    }
    return results
  }, [businesses, activeCategory, searchQuery])

  const trending = filtered.slice(0, 4)
  const nearby = filtered.slice(4)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transitions.spring}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: colors.bg, overflow: 'hidden' }}
    >
      {/* Sticky header */}
      <div style={{ background: 'rgba(8,8,8,0.84)', backdropFilter: 'blur(22px)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div className="safe-top" style={{ padding: '16px 20px 0' }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <button
              onClick={() => navigate('/')}
              style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.4, margin: 0 }}>
              Explore <span style={{ color: '#D4AF37' }}>Cork</span>
            </h1>
          </div>

          {/* Search bar */}
          <div style={{ height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, marginBottom: 14 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.38)" strokeWidth="2" />
              <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.38)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Gyms, salons, sauna..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }}
            />
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14 }}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    flexShrink: 0,
                    height: 30,
                    padding: '0 14px',
                    borderRadius: 20,
                    background: isActive ? '#D4AF37' : 'rgba(255,255,255,0.08)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.13)',
                    color: isActive ? '#000' : 'rgba(255,255,255,0.55)',
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 120px' }}>
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ height: 90, background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 10, width: '70%', borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ height: 10, width: '45%', borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && trending.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>Trending near you</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {trending.map((b) => (
                <button
                  key={b.slug}
                  onClick={() => navigate(`/business/${b.slug}`)}
                  style={{ textAlign: 'left', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div style={{ height: 90, position: 'relative', overflow: 'hidden', background: b.heroImage ? undefined : b.primaryColour + '33' }}>
                    {b.heroImage ? (
                      <img src={b.heroImage} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${b.primaryColour}44 0%, #080808 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: b.primaryColour, opacity: 0.6 }}>{b.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 60%)' }} />
                    <span style={{ position: 'absolute', bottom: 7, left: 9, fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{b.name}</span>
                  </div>
                  <div style={{ padding: '9px 10px 11px' }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '0 0 5px' }}>{b.category}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill={b.primaryColour}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      <span>5.0</span>
                      {b.city && <span style={{ color: 'rgba(255,255,255,0.4)' }}> · {b.city}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {!loading && nearby.length > 0 && (
          <section>
            <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>All nearby</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {nearby.map((b) => (
                <button
                  key={b.slug}
                  onClick={() => navigate(`/business/${b.slug}`)}
                  style={{ textAlign: 'left', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex' }}
                >
                  <div style={{ width: 70, height: 70, flexShrink: 0, background: b.primaryColour + '22' }}>
                    {b.heroImage ? (
                      <img src={b.heroImage} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: b.primaryColour }}>{b.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, padding: '9px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</p>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{b.category}</span>
                    {b.city && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>{b.city}</span>}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
            <p style={{ fontSize: 28, marginBottom: 10 }}>&#128270;</p>
            <p>No businesses found{activeCategory !== 'All' ? ` for "${activeCategory}"` : ''}</p>
          </div>
        )}
      </div>

      <TabBar />
    </motion.div>
  )
}
