import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PackagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('business_id', business!.id)
    .order('price_cents')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Packages</h1>
        <button
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: tokens.gold, color: '#000' }}
        >
          Add package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(packages ?? []).length === 0 && (
          <div
            className="col-span-full rounded-2xl py-12 text-center"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
          >
            <p className="text-sm" style={{ color: tokens.text3 }}>
              No packages yet
            </p>
          </div>
        )}
        {(packages ?? []).map((p) => (
          <div
            key={p.id}
            className="rounded-2xl p-6 space-y-4"
            style={{
              background: tokens.surface1,
              border: `1px solid ${tokens.border2}`,
            }}
          >
            <div>
              <div className="text-base font-semibold text-white">{p.name}</div>
              {p.tagline && (
                <div className="text-xs mt-1" style={{ color: tokens.text2 }}>{p.tagline}</div>
              )}
            </div>

            <div
              className="text-2xl font-black"
              style={{ color: tokens.gold }}
            >
              {formatPrice(p.price_cents)}
            </div>

            <div className="space-y-1.5 text-sm">
              <PackageRow
                label="Sessions"
                value={p.session_count != null ? String(p.session_count) : 'Unlimited'}
              />
              {p.sessions_per_month && (
                <PackageRow label="Per month" value={String(p.sessions_per_month)} />
              )}
              <PackageRow
                label="Expires"
                value={p.expires_days != null ? `${p.expires_days} days` : 'Never'}
              />
              {(p.cancellation_notice_days ?? 0) > 0 && (
                <PackageRow
                  label="Cancel notice"
                  value={`${p.cancellation_notice_days} days`}
                />
              )}
            </div>

            <div
              className="w-2 h-2 rounded-full"
              style={{ background: p.is_active ? '#22c55e' : tokens.text3 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function PackageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: tokens.text2 }}>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  )
}
