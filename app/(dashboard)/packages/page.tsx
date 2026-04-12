import { Users, TrendingUp, CreditCard, Pencil } from 'lucide-react'
import { mockPackages } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'

export default function PackagesPage() {
  const totalActive = mockPackages.reduce((s, p) => s + p.activeCount, 0)
  const totalRevenue = mockPackages.reduce((s, p) => s + p.price * p.activeCount, 0)
  const totalCreditsUsed = mockPackages.reduce((s, p) => s + p.activeCount * Math.ceil(p.sessionCount * 0.4), 0)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-4">
        <MiniStat
          icon={Users}
          iconBg="bg-brand-500/15"
          iconColor="text-brand-500"
          label="Active packages"
          value={String(totalActive)}
        />
        <MiniStat
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Package revenue"
          value={formatCurrency(totalRevenue)}
        />
        <MiniStat
          icon={CreditCard}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="Credits used"
          value={String(totalCreditsUsed)}
        />
      </div>

      {/* Packages list */}
      <div className="bg-white rounded-premium border border-gray-100 shadow-card overflow-hidden">
        <div className="divide-y divide-gray-50">
          {mockPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="group flex items-center gap-3.5 px-4 py-4 hover:bg-gray-50 transition-colors duration-150"
            >
              {/* Color dot */}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: pkg.color }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900">{pkg.name}</p>
                <p className="text-[11px] text-gray-400">
                  {pkg.sessionCount} sessions · saves {formatCurrency(pkg.savings)} · {pkg.activeCount} active
                </p>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <p className="text-[15px] font-bold text-gray-900">{formatCurrency(pkg.price)}</p>
                <p className="text-[10px] text-emerald-600 font-semibold">
                  Save {formatCurrency(pkg.savings)}
                </p>
              </div>

              {/* Edit */}
              <button
                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-card text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label={`Edit ${pkg.name}`}
              >
                <Pencil size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string
}) {
  return (
    <div className="bg-white rounded-premium border border-gray-100 shadow-card p-4 flex items-center gap-3">
      <div className={`flex items-center justify-center w-8 h-8 rounded-premium shrink-0 ${iconBg}`}>
        <Icon size={15} className={iconColor} />
      </div>
      <div>
        <p className="text-[11px] font-medium text-gray-400">{label}</p>
        <p className="text-[17px] font-bold text-gray-900 leading-tight">{value}</p>
      </div>
    </div>
  )
}
