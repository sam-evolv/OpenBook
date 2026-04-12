import {
  DollarSign,
  CalendarCheck,
  Users,
  Package,
  Clock,
  UserCheck,
  CreditCard,
} from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { ScheduleItem } from '@/components/dashboard/ScheduleItem'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import {
  mockDashboardStats,
  mockBookings,
  getCustomerById,
  getServiceById,
} from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'

const TODAY = '2026-04-12'

export default function OverviewPage() {
  const stats = mockDashboardStats
  const todayBookings = mockBookings
    .filter((b) => b.date === TODAY)
    .sort((a, b) => a.time.localeCompare(b.time))

  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.price, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Revenue today"
          value={formatCurrency(stats.revenueToday)}
          icon={DollarSign}
          iconBg="bg-brand-500/15"
          iconColor="text-brand-500"
          trend={{ value: '+12% vs last Sun', direction: 'up' }}
        />
        <StatCard
          label="Bookings today"
          value={String(stats.bookingsToday)}
          icon={CalendarCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          trend={{ value: '+2 vs yesterday', direction: 'up' }}
        />
        <StatCard
          label="Active clients"
          value={String(stats.activeClients)}
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={{ value: '+5 this month', direction: 'up' }}
        />
        <StatCard
          label="Package revenue"
          value={formatCurrency(stats.packageRevenue)}
          icon={Package}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          trend={{ value: 'This week', direction: 'neutral' }}
        />
      </div>

      {/* Main content row */}
      <div className="flex gap-6">
        {/* Today's schedule */}
        <div className="flex-1 min-w-0 bg-white rounded-premium border border-gray-100 shadow-card">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">Today&apos;s schedule</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Sunday, 12 April · {todayBookings.length} bookings ·{' '}
                {formatCurrency(todayRevenue)}
              </p>
            </div>
            <span className="inline-flex items-center h-5 px-2 rounded-full bg-brand-500/10 text-[10px] font-semibold text-brand-500">
              {todayBookings.filter((b) => b.status === 'confirmed' || b.status === 'checked-in').length} active
            </span>
          </div>

          <div className="divide-y divide-gray-50 py-1">
            {todayBookings.map((booking) => {
              const customer = getCustomerById(booking.customerId)
              const service = getServiceById(booking.serviceId)
              if (!customer || !service) return null
              return (
                <ScheduleItem
                  key={booking.id}
                  booking={booking}
                  customerName={customer.name}
                  serviceName={service.name}
                  serviceColor={service.color}
                />
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="w-[340px] shrink-0 space-y-4">
          {/* Revenue chart card */}
          <div className="bg-white rounded-premium border border-gray-100 shadow-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[13px] font-semibold text-gray-900">Weekly revenue</h2>
                <p className="text-[11px] text-gray-400">This week</p>
              </div>
              <span className="text-[20px] font-bold text-gray-900">
                {formatCurrency(stats.weeklyRevenue.reduce((a, b) => a + b, 0))}
              </span>
            </div>
            <RevenueChart data={stats.weeklyRevenue} />
          </div>

          {/* Panel stats */}
          <div className="bg-white rounded-premium border border-gray-100 shadow-card divide-y divide-gray-50">
            <PanelStat
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              label="Upcoming this week"
              value={String(stats.upcomingCount)}
              sub="bookings confirmed"
            />
            <PanelStat
              icon={UserCheck}
              iconBg="bg-rose-50"
              iconColor="text-rose-500"
              label="Waitlist"
              value={String(stats.waitlistCount)}
              sub="clients waiting"
            />
            <PanelStat
              icon={CreditCard}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              label="Package credits sold"
              value={formatCurrency(stats.packageRevenue)}
              sub="this week"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PanelStat({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-150">
      <div className={`flex items-center justify-center w-8 h-8 rounded-premium shrink-0 ${iconBg}`}>
        <Icon size={14} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-gray-700 truncate">{label}</p>
        <p className="text-[11px] text-gray-400">{sub}</p>
      </div>
      <span className="text-[15px] font-bold text-gray-900 shrink-0">{value}</span>
    </div>
  )
}
