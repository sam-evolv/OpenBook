import { formatCurrency } from '@/lib/utils'
import type { Package } from '@/lib/types'

interface PackageStripProps {
  packages: Package[]
}

const packageLabels: Record<string, string> = {
  pkg_001: 'Best value',
  pkg_002: 'Most popular',
  pkg_003: 'New client',
  pkg_004: 'Group deal',
}

const labelStyles: Record<string, string> = {
  'Best value': 'bg-brand-500 text-black',
  'Most popular': 'bg-blue-500 text-white',
  'New client': 'bg-emerald-500 text-white',
  'Group deal': 'bg-rose-500 text-white',
}

export function PackageStrip({ packages }: PackageStripProps) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
        Packages &amp; bundles
      </p>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {packages.map((pkg) => {
          const label = packageLabels[pkg.id] ?? ''
          const labelStyle = labelStyles[label] ?? 'bg-gray-700 text-white'

          return (
            <button
              key={pkg.id}
              className="flex-none w-48 flex flex-col gap-2.5 p-4 bg-white/8 rounded-premium border border-white/10 text-left hover:bg-white/12 hover:border-white/20 transition-all duration-150 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {/* Label badge */}
              {label && (
                <span className={`self-start inline-flex h-4 px-2 rounded-full text-[9px] font-bold uppercase tracking-wide ${labelStyle}`}>
                  {label}
                </span>
              )}

              {/* Color dot + name */}
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: pkg.color }}
                />
                <p className="text-[13px] font-semibold text-white leading-snug">{pkg.name}</p>
              </div>

              {/* Price */}
              <p className="text-[18px] font-bold text-white leading-none">
                {formatCurrency(pkg.price)}
              </p>

              {/* Savings */}
              <p className="text-[11px] text-emerald-400 font-medium">
                Save {formatCurrency(pkg.savings)}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
