'use client';

import { useRouter } from 'next/navigation';
import { Clock, Check } from 'lucide-react';
import { useState } from 'react';

interface Props {
  business: any;
  services: any[];
  selectedService: any;
  onSelectService: (s: any) => void;
}

export function BusinessBook({ business, services, selectedService, onSelectService }: Props) {
  const router = useRouter();
  const primary = business.primary_colour ?? '#D4AF37';

  function continueToBooking() {
    if (selectedService) {
      router.push(`/booking/${selectedService.id}?business=${business.slug}`);
    }
  }

  return (
    <div className="pt-20 px-5 pb-6">
      <div className="mb-6">
        <p
          className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5"
          style={{ color: primary }}
        >
          Step 1 · Choose a service
        </p>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">
          What would you <br />
          like to book?
        </h1>
      </div>

      {services.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>No services available.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-8">
          {services.map((svc) => {
            const selected = selectedService?.id === svc.id;
            return (
              <button
                key={svc.id}
                onClick={() => onSelectService(svc)}
                className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.99]"
                style={{
                  background: selected ? `${primary}15` : 'rgba(255,255,255,0.04)',
                  border: selected ? `1px solid ${primary}` : '0.5px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: selected ? primary : 'rgba(255,255,255,0.08)',
                    border: selected ? 'none' : '0.5px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {selected && (
                    <Check
                      className="h-4 w-4"
                      strokeWidth={3}
                      style={{ color: '#000' }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold">{svc.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock
                      className="h-3 w-3"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                      strokeWidth={2}
                    />
                    <span
                      className="text-[12px]"
                      style={{ color: 'rgba(255,255,255,0.55)' }}
                    >
                      {formatDuration(svc.duration_minutes)}
                    </span>
                  </div>
                </div>
                <span
                  className="text-[15px] font-semibold tabular-nums"
                  style={{ color: selected ? primary : 'rgba(255,255,255,0.8)' }}
                >
                  {svc.price_cents === 0 ? 'Free' : `€${(svc.price_cents / 100).toFixed(0)}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={continueToBooking}
        disabled={!selectedService}
        className="flex h-[56px] w-full items-center justify-center rounded-full text-[15px] font-semibold text-black active:scale-[0.98] transition-all disabled:opacity-40"
        style={{
          background: `linear-gradient(145deg, ${primary}CC 0%, ${primary} 50%, ${primary}99 100%)`,
          boxShadow: selectedService ? `0 10px 24px ${primary}55` : 'none',
        }}
      >
        {selectedService ? 'Continue' : 'Select a service'}
      </button>
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
