import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { formatPrice, getDurationLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business!.id)
    .order('sort_order')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Services</h1>
        <button
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: tokens.gold, color: '#000' }}
        >
          Add service
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div className="divide-y" style={{ borderColor: tokens.border }}>
          {(services ?? []).length === 0 && (
            <p className="py-12 text-center text-sm" style={{ color: tokens.text3 }}>
              No services yet — add one to start taking bookings.
            </p>
          )}
          {(services ?? []).map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: s.colour ?? tokens.gold }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{s.name}</div>
                {s.description && (
                  <div className="text-xs mt-0.5 truncate" style={{ color: tokens.text3 }}>
                    {s.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <span className="text-sm" style={{ color: tokens.text2 }}>
                  {getDurationLabel(s.duration_minutes)}
                </span>
                {(s.capacity ?? 1) > 1 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-lg"
                    style={{ background: `${tokens.gold}15`, color: tokens.gold }}
                  >
                    {s.capacity} spots
                  </span>
                )}
                <span className="text-sm font-semibold text-white">{formatPrice(s.price_cents)}</span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: s.is_active ? '#22c55e' : tokens.text3 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
