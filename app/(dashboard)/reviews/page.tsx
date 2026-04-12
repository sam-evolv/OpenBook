import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, business_response, created_at,
      customers:customer_id ( name )
    `)
    .eq('business_id', business!.id)
    .order('created_at', { ascending: false })

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
      : 0

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Reviews</h1>
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <Stars rating={avgRating} />
            <span className="text-sm font-semibold text-white">{avgRating.toFixed(1)}</span>
            <span className="text-sm" style={{ color: tokens.text2 }}>({reviews.length})</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {(reviews ?? []).length === 0 && (
          <div
            className="rounded-2xl py-16 text-center"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
          >
            <p className="text-sm" style={{ color: tokens.text3 }}>No reviews yet</p>
          </div>
        )}
        {(reviews ?? []).map((r) => {
          const customer = r.customers as { name: string } | null
          return (
            <div
              key={r.id}
              className="rounded-2xl p-5 space-y-3"
              style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: `${tokens.gold}20`, color: tokens.gold }}
                  >
                    {(customer?.name ?? 'A')[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{customer?.name ?? 'Anonymous'}</div>
                    <div className="text-xs" style={{ color: tokens.text3 }}>
                      {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : ''}
                    </div>
                  </div>
                </div>
                <Stars rating={r.rating ?? 0} />
              </div>

              {r.comment && (
                <p className="text-sm leading-relaxed" style={{ color: tokens.text2 }}>
                  {r.comment}
                </p>
              )}

              {r.business_response && (
                <div
                  className="rounded-xl p-3 text-sm"
                  style={{ background: tokens.surface2, borderLeft: `3px solid ${tokens.gold}` }}
                >
                  <span className="font-medium" style={{ color: tokens.gold }}>Your response: </span>
                  <span style={{ color: tokens.text2 }}>{r.business_response}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={i < Math.round(rating) ? tokens.gold : 'none'}
            stroke={tokens.gold}
            strokeWidth="1.5"
          />
        </svg>
      ))}
    </div>
  )
}
