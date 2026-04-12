import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { getInitials } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', business!.id)
    .order('name')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Staff</h1>
        <button
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: tokens.gold, color: '#000' }}
        >
          Add staff member
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        {(staff ?? []).length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: tokens.text3 }}>No staff members yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: tokens.border }}>
            {(staff ?? []).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                {s.avatar_url ? (
                  <img
                    src={s.avatar_url}
                    alt={s.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: `${tokens.gold}20`, color: tokens.gold }}
                  >
                    {getInitials(s.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{s.name}</div>
                  {s.email && (
                    <div className="text-xs mt-0.5" style={{ color: tokens.text2 }}>{s.email}</div>
                  )}
                </div>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: s.is_active ? '#22c55e' : tokens.text3 }}
                  title={s.is_active ? 'Active' : 'Inactive'}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
