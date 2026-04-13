'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ChevronDown, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

interface Service {
  id: string
  name: string
  price_cents: number
  duration_minutes: number
}

interface Business {
  id: string
  name: string
  slug: string
}

const EXPIRES_OPTIONS = [
  { label: '1 hour',     value: 1  },
  { label: '2 hours',    value: 2  },
  { label: '4 hours',    value: 4  },
  { label: 'End of day', value: -1 },
]

export function FlashSaleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [business, setBusiness]     = useState<Business | null>(null)
  const [services, setServices]     = useState<Service[]>([])
  const [loading, setLoading]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Form state
  const [serviceId,       setServiceId]       = useState('')
  const [slotDate,        setSlotDate]        = useState(() => new Date().toISOString().split('T')[0])
  const [slotTime,        setSlotTime]        = useState('')
  const [salePriceCents,  setSalePriceCents]  = useState<number | ''>('')
  const [discountPercent, setDiscountPercent] = useState<number | ''>('')
  const [expiresHours,    setExpiresHours]    = useState(2)
  const [message,         setMessage]         = useState('')

  const selectedService     = services.find((s) => s.id === serviceId)
  const originalPriceCents  = selectedService?.price_cents ?? 0

  // Fetch business + services when modal opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return

        const { data: biz } = await supabase
          .from('businesses')
          .select('id, name, slug')
          .eq('owner_id', user.id)
          .single()

        if (cancelled || !biz) return
        setBusiness(biz)

        const { data: svcs } = await supabase
          .from('services')
          .select('id, name, price_cents, duration_minutes')
          .eq('business_id', biz.id)
          .eq('is_active', true)
          .order('name')

        if (cancelled) return
        const list = svcs ?? []
        setServices(list)
        if (list.length > 0) {
          setServiceId(list[0].id)
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load services.')
        console.error('[FlashSaleModal] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open])

  // Auto-fill 20% discount when service changes
  useEffect(() => {
    if (!selectedService) return
    const salePrice = Math.round(selectedService.price_cents * 0.8)
    setSalePriceCents(salePrice)
    setDiscountPercent(20)
  }, [selectedService?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSalePriceChange(val: number | '') {
    setSalePriceCents(val)
    if (val !== '' && originalPriceCents > 0) {
      const pct = Math.round(((originalPriceCents - val) / originalPriceCents) * 100)
      setDiscountPercent(Math.max(0, Math.min(99, pct)))
    }
  }

  function handleDiscountChange(pct: number | '') {
    setDiscountPercent(pct)
    if (pct !== '' && originalPriceCents > 0) {
      setSalePriceCents(Math.round(originalPriceCents * (1 - (pct as number) / 100)))
    }
  }

  function getExpiresAt(): Date {
    const now = new Date()
    if (expiresHours === -1) {
      const eod = new Date(now)
      eod.setHours(23, 59, 59, 999)
      return eod
    }
    return new Date(now.getTime() + expiresHours * 60 * 60 * 1000)
  }

  function getBookByLabel(): string {
    return getExpiresAt().toLocaleTimeString('en-IE', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!business || !serviceId || salePriceCents === '' || !slotTime) return
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: sale, error: insertErr } = await supabase
        .from('flash_sales')
        .insert({
          business_id:          business.id,
          service_id:           serviceId,
          original_price_cents: originalPriceCents,
          sale_price_cents:     salePriceCents as number,
          discount_percent:     discountPercent === '' ? 0 : (discountPercent as number),
          slot_time:            `${slotDate}T${slotTime}:00`,
          expires_at:           getExpiresAt().toISOString(),
          max_bookings:         1,
          bookings_taken:       0,
          status:               'active',
          message:              message.trim() || null,
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      // Fire-and-forget: notify saved customers
      fetch('/api/flash-sales/notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ flashSaleId: sale.id }),
      }).catch((err) => console.error('[FlashSaleModal] notify error:', err))

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        handleClose()
      }, 2000)
    } catch (err) {
      console.error('[FlashSaleModal] submit error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setServiceId('')
    setSlotDate(new Date().toISOString().split('T')[0])
    setSlotTime('')
    setSalePriceCents('')
    setDiscountPercent('')
    setExpiresHours(2)
    setMessage('')
    setSuccess(false)
    setError(null)
  }

  function handleClose() {
    onClose()
    resetForm()
  }

  const canSubmit = !!(serviceId && slotTime && salePriceCents !== '' && !submitting)

  // Preview values
  const previewService  = selectedService?.name ?? 'Service'
  const previewSale     = salePriceCents !== '' ? formatPrice(salePriceCents as number) : '€0'
  const previewOrig     = originalPriceCents > 0 ? formatPrice(originalPriceCents) : '€0'
  const previewBookBy   = slotTime ? getBookByLabel() : '6pm'
  const previewBiz      = business?.name ?? 'Your Business'
  const previewInitials = previewBiz.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl rounded-2xl data-[state=open]:animate-slide-up focus:outline-none"
          style={{
            background: '#111111',
            border:     '1px solid rgba(255,255,255,0.14)',
            maxHeight:  '92vh',
            overflowY:  'auto',
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-6 py-5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div>
              <Dialog.Title className="text-[16px] font-bold text-white flex items-center gap-2">
                <Zap size={16} fill="#D4AF37" color="#D4AF37" />
                Create Flash Sale
              </Dialog.Title>
              <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Push an offer to everyone who has saved your business
              </p>
            </div>
            <Dialog.Close
              onClick={handleClose}
              className="flex items-center justify-center w-7 h-7 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={14} />
            </Dialog.Close>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {/* ── Success ── */}
          {!loading && success && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Zap size={40} fill="#D4AF37" color="#D4AF37" />
              <div className="text-center">
                <p className="text-white font-bold text-lg">Flash sale sent!</p>
                <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Customers are being notified now.
                </p>
              </div>
            </div>
          )}

          {/* ── Form ── */}
          {!loading && !success && (
            <form onSubmit={handleSubmit}>
              <div className="flex">
                {/* Left: fields */}
                <div
                  className="flex-1 p-6 space-y-4 min-w-0"
                  style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <Field label="Service">
                    <div className="relative">
                      <select
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                        className="field-input"
                        required
                      >
                        <option value="">Select service…</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {formatPrice(s.price_cents)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      />
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Date">
                      <input
                        type="date"
                        value={slotDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setSlotDate(e.target.value)}
                        className="field-input"
                        required
                      />
                    </Field>
                    <Field label="Time slot">
                      <input
                        type="time"
                        value={slotTime}
                        onChange={(e) => setSlotTime(e.target.value)}
                        className="field-input"
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Original price">
                      <input
                        type="text"
                        value={originalPriceCents > 0 ? formatPrice(originalPriceCents) : '—'}
                        readOnly
                        className="field-input"
                        style={{ opacity: 0.5, cursor: 'not-allowed' }}
                      />
                    </Field>
                    <Field label="Sale price (cents)">
                      <input
                        type="number"
                        value={salePriceCents === '' ? '' : salePriceCents}
                        onChange={(e) =>
                          handleSalePriceChange(
                            e.target.value === '' ? '' : parseInt(e.target.value, 10)
                          )
                        }
                        placeholder="e.g. 2500"
                        min={1}
                        max={originalPriceCents || undefined}
                        className="field-input"
                        required
                      />
                    </Field>
                  </div>

                  {/* Discount % */}
                  <Field label="Discount %">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={discountPercent === '' ? '' : discountPercent}
                        onChange={(e) =>
                          handleDiscountChange(
                            e.target.value === '' ? '' : parseInt(e.target.value, 10)
                          )
                        }
                        placeholder="e.g. 25"
                        min={1}
                        max={99}
                        className="field-input"
                        style={{ width: 90 }}
                      />
                      {discountPercent !== '' && Number(discountPercent) > 0 && (
                        <span
                          className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
                          style={{
                            background: 'rgba(212,175,55,0.15)',
                            color: '#D4AF37',
                          }}
                        >
                          {discountPercent}% off
                        </span>
                      )}
                    </div>
                  </Field>

                  {/* Expires in chips */}
                  <Field label="Expires in">
                    <div className="flex gap-2 flex-wrap">
                      {EXPIRES_OPTIONS.map((opt) => {
                        const isActive = expiresHours === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setExpiresHours(opt.value)}
                            style={{
                              height:       30,
                              paddingLeft:  12,
                              paddingRight: 12,
                              borderRadius: 20,
                              fontSize:     12,
                              fontWeight:   isActive ? 700 : 500,
                              background:   isActive ? '#D4AF37' : 'rgba(255,255,255,0.07)',
                              border:       isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                              color:        isActive ? '#000' : 'rgba(255,255,255,0.55)',
                              cursor:       'pointer',
                              transition:   'all 0.15s',
                            }}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </Field>

                  {/* Custom message */}
                  <Field label="Custom message (optional)">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Come in this morning — quiet day and would love to see you."
                      rows={3}
                      maxLength={200}
                      className="field-input resize-none"
                    />
                  </Field>

                  {error && (
                    <p className="text-[12px]" style={{ color: '#f87171' }}>{error}</p>
                  )}
                </div>

                {/* Right: preview panel */}
                <div
                  className="w-[248px] shrink-0 p-5 flex flex-col gap-4"
                  style={{ background: '#0d0d0d' }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Notification preview
                  </p>

                  {/* Mock iOS push notification */}
                  <div
                    style={{
                      background:           'rgba(40,40,50,0.85)',
                      backdropFilter:       'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border:               '1px solid rgba(255,255,255,0.12)',
                      borderRadius:         16,
                      padding:              '11px 13px',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* App icon */}
                      <div
                        style={{
                          width:          36,
                          height:         36,
                          borderRadius:   9,
                          background:     '#D4AF37',
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'center',
                          flexShrink:     0,
                          fontSize:       11,
                          fontWeight:     900,
                          color:          '#000',
                          letterSpacing:  '-0.02em',
                        }}
                      >
                        {previewInitials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                            {previewBiz}
                          </span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>
                            just now
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#fff', margin: '0 0 2px', fontWeight: 600, lineHeight: 1.3 }}>
                          ⚡ Flash sale · {previewService}
                        </p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.4 }}>
                          {previewSale} instead of {previewOrig} · Book by {previewBookBy}
                        </p>
                      </div>
                    </div>

                    {message.trim() && (
                      <p
                        style={{
                          fontSize:    11,
                          color:       'rgba(255,255,255,0.42)',
                          margin:      '9px 0 0',
                          paddingTop:  9,
                          borderTop:   '1px solid rgba(255,255,255,0.07)',
                          lineHeight:  1.5,
                          fontStyle:   'italic',
                        }}
                      >
                        &ldquo;{message}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Price summary */}
                  {selectedService && salePriceCents !== '' && (
                    <div
                      className="text-center py-4 rounded-xl"
                      style={{
                        background: 'rgba(212,175,55,0.07)',
                        border:     '1px solid rgba(212,175,55,0.15)',
                      }}
                    >
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Sale price
                      </p>
                      <p style={{ fontSize: 26, fontWeight: 900, color: '#D4AF37', lineHeight: 1 }}>
                        {previewSale}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, textDecoration: 'line-through' }}>
                        was {previewOrig}
                      </p>
                      {discountPercent !== '' && Number(discountPercent) > 0 && (
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', marginTop: 4 }}>
                          {discountPercent}% off
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center gap-3 px-6 py-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
              >
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-10 px-5 rounded-xl text-[13px] font-medium transition-all"
                  style={{
                    border:      '1px solid rgba(255,255,255,0.14)',
                    background:  'transparent',
                    color:       'rgba(255,255,255,0.55)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-1 h-10 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: canSubmit ? '#D4AF37' : 'rgba(255,255,255,0.07)',
                    color:      canSubmit ? '#000' : 'rgba(255,255,255,0.2)',
                    cursor:     canSubmit ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? (
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: '#000', borderTopColor: 'transparent' }}
                    />
                  ) : (
                    <>
                      <Zap size={14} strokeWidth={2.5} />
                      Send Flash Sale
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <style jsx>{`
            .field-input {
              width: 100%;
              height: 36px;
              padding: 0 12px;
              background: rgba(255,255,255,0.07);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 12px;
              color: white;
              font-size: 13px;
              outline: none;
              appearance: none;
            }
            .field-input option { background: #1a1a1a; }
            .field-input::placeholder { color: rgba(255,255,255,0.3); }
            textarea.field-input { height: auto; padding: 10px 12px; }
            input[type="date"].field-input,
            input[type="time"].field-input,
            input[type="number"].field-input {
              color-scheme: dark;
            }
          `}</style>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
