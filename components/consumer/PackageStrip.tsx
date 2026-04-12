import { formatPrice } from '@/lib/utils'
import type { Package } from '@/lib/types'

interface PackageStripProps {
  packages: Package[]
}

export function PackageStrip({ packages }: PackageStripProps) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
        Packages &amp; bundles
      </p>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            className="flex-none w-48 flex flex-col gap-2.5 p-4 bg-white/8 rounded-premium border border-white/10 text-left hover:bg-white/12 hover:border-white/20 transition-all duration-150 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {pkg.tagline && (
              <span className="self-start inline-flex h-4 px-2 rounded-full text-[9px] font-bold uppercase tracking-wide bg-brand-500 text-black">
                {pkg.tagline}
              </span>
            )}
            <p className="text-[13px] font-semibold text-white leading-snug">{pkg.name}</p>
            <p className="text-[18px] font-bold text-white leading-none">
              {formatPrice(pkg.price_cents)}
            </p>
            {pkg.session_count && (
              <p className="text-[11px] text-emerald-400 font-medium">
                {pkg.session_count} sessions
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
