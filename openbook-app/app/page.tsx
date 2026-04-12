import WallpaperBackground from '@/components/WallpaperBackground'

/**
 * Home screen — Step 1 scaffold.
 * Full iOS-style wallpaper, status area, wordmark.
 * Business icons + dock will be added in Step 2–3.
 */
export default function HomePage() {
  return (
    <WallpaperBackground className="relative flex flex-col" fixed>
      {/* Status bar area */}
      <div className="h-14 pt-safe" />

      {/* Top bar: wordmark + search */}
      <div className="flex items-center justify-between px-6 mb-6">
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Open
          <span style={{ color: '#D4AF37' }}>Book</span>
          {' '}
          <span style={{ color: '#D4AF37' }}>AI</span>
        </h1>

        {/* Search button */}
        <button
          className="glass flex items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: 20 }}
          aria-label="Search"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>

      {/* Main scroll area */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-4">
        {/* Placeholder content — icons come in Step 2 */}
        <p className="section-label mb-4">Favourites</p>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className="glass"
                style={{ width: 68, height: 68, borderRadius: 18 }}
              />
              <span className="icon-label">—</span>
            </div>
          ))}
        </div>

        <p className="section-label mb-4">My places</p>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className="glass"
                style={{ width: 68, height: 68, borderRadius: 18 }}
              />
              <span className="icon-label">—</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dock placeholder — replaced in Step 3 */}
      <div
        className="glass-dock mx-4 mb-4 flex items-center justify-around"
        style={{ borderRadius: 28, height: 88 }}
      >
        {['Bookings', 'OpenBook', 'Wallet', 'Me'].map((label) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className="glass"
              style={{ width: 52, height: 52, borderRadius: 14 }}
            />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </WallpaperBackground>
  )
}
