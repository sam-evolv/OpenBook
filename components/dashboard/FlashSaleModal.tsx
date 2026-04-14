'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Zap, Clock, Send } from 'lucide-react'

interface FlashSaleModalProps {
  open: boolean
  onClose: () => void
}

const EXPIRE_OPTIONS = [
  { label: '1h', value: 1 },
  { label: '2h', value: 2 },
  { label: '4h', value: 4 },
  { label: '8h', value: 8 },
]

export function FlashSaleModal({ open, onClose }: FlashSaleModalProps) {
  const [discount, setDiscount] = useState(20)
  const [expiresIn, setExpiresIn] = useState(2)
  const [maxBookings, setMaxBookings] = useState(5)
  const [message, setMessage] = useState('')

  function handleClose() {
    onClose()
  }

  function handleSend() {
    // TODO: integrate with flash sale API
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 data-[state=open]:animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] data-[state=open]:animate-slide-up focus:outline-none"
          style={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: 28,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-[#D4AF37]" />
              <Dialog.Title className="text-[16px] font-semibold text-[#D4AF37]">
                Create Flash Sale
              </Dialog.Title>
            </div>
            <Dialog.Close
              onClick={handleClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={14} />
            </Dialog.Close>
          </div>

          <div className="space-y-5">
            {/* Service select */}
            <ModalField label="Service">
              <select className="modal-select">
                <option value="">Select a service…</option>
                <option value="1">Personal Training — €50</option>
                <option value="2">Group Class — €25</option>
              </select>
            </ModalField>

            {/* Discount slider */}
            <ModalField label={`Discount — ${discount}% off`}>
              <div className="relative">
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #D4AF37 ${((discount - 10) / 40) * 100}%, rgba(255,255,255,0.1) ${((discount - 10) / 40) * 100}%)`,
                  }}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-white/30">10%</span>
                  <span className="text-[10px] text-white/30">50%</span>
                </div>
              </div>
            </ModalField>

            {/* Expires in */}
            <ModalField label="Expires in">
              <div className="flex gap-2">
                {EXPIRE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExpiresIn(opt.value)}
                    className="flex-1 h-9 rounded-lg text-[13px] font-medium transition-all duration-150"
                    style={{
                      background: expiresIn === opt.value ? '#D4AF37' : 'rgba(255,255,255,0.06)',
                      color: expiresIn === opt.value ? '#000' : 'rgba(255,255,255,0.5)',
                      border: expiresIn === opt.value ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </ModalField>

            {/* Max bookings */}
            <ModalField label="Max bookings">
              <input
                type="number"
                min={1}
                max={50}
                value={maxBookings}
                onChange={(e) => setMaxBookings(Number(e.target.value))}
                className="modal-select"
              />
            </ModalField>

            {/* Custom message */}
            <ModalField label="Message (optional)">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a custom message for customers…"
                rows={3}
                className="modal-select resize-none !h-auto !py-2.5"
              />
            </ModalField>

            {/* Preview */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
            >
              <p className="section-label mb-2 text-[#D4AF37]">Preview</p>
              <div
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={12} className="text-[#D4AF37]" />
                  <span className="text-[12px] font-semibold text-white">Evolv Performance</span>
                </div>
                <p className="text-[13px] text-white/80">
                  Flash Sale! {discount}% off — Book now before it expires!
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Clock size={10} className="text-white/30" />
                  <span className="text-[10px] text-white/30">Expires in {expiresIn}h</span>
                </div>
              </div>
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              className="w-full h-11 rounded-xl text-[14px] font-bold text-black transition-all duration-150 btn-press flex items-center justify-center gap-2"
              style={{
                background: '#D4AF37',
                boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
              }}
            >
              <Send size={14} />
              Send Flash Sale
            </button>
          </div>

          <style jsx>{`
            .modal-select {
              width: 100%;
              height: 40px;
              padding: 0 12px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 10px;
              color: white;
              font-size: 13px;
              outline: none;
              appearance: none;
              transition: border-color 150ms ease, box-shadow 150ms ease;
            }
            .modal-select:focus {
              border-color: rgba(212,175,55,0.4);
              box-shadow: 0 0 0 3px rgba(212,175,55,0.15);
            }
            .modal-select option { background: #1a1a1a; }
            .modal-select::placeholder { color: rgba(255,255,255,0.3); }
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #D4AF37;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(212,175,55,0.4);
            }
          `}</style>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block section-label mb-2">{label}</label>
      {children}
    </div>
  )
}
