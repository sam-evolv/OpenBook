'use client';

import { useRouter } from 'next/navigation';
import { Clock, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { getTileColour } from '@/lib/tile-palette';

interface Props {
  business: any;
  services: any[];
  selectedService: any;
  onSelectService: (s: any) => void;
}

export function BusinessBook({ business, services, selectedService, onSelectService }: Props) {
  const router = useRouter();
  const primary = getTileColour(business.primary_colour).mid;
  const featuredService = selectedService ?? services[0] ?? null;

  function continueToBooking() {
    if (selectedService) {
      router.push(`/booking/${selectedService.id}?business=${business.slug}`);
    }
  }

  return (
    <div className="px-5 pb-8 pt-[calc(78px+env(safe-area-inset-top))]">
      <div
        className="mb-5 overflow-hidden rounded-[30px] p-5"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.10), 0 18px 48px rgba(0,0,0,0.34)',
        }}
      >
        <p
          className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5"
          style={{ color: primary }}
        >
          Step 1 · Choose a service
        </p>
        <h1 className="text-[30px] font-bold leading-[1.02] tracking-[-0.025em]">
          Choose your time with {business.name}
        </h1>
        {featuredService && (
          <div className="mt-5 grid grid-cols-3 gap-2">
            <BookMetric label="From" value={formatPrice(featuredService.price_cents)} primary={primary} />
            <BookMetric label="Time" value={formatDuration(featuredService.duration_minutes)} primary={primary} />
            <BookMetric label="Services" value={String(services.length)} primary={primary} />
          </div>
        )}
      </div>

      {services.length === 0 ? (
        <div
          className="rounded-[26px] px-5 py-8 text-center"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.025) 100%)',
            border: '0.5px solid rgba(255,255,255,0.10)',
          }}
        >
          <Sparkles className="mx-auto mb-3 h-6 w-6" style={{ color: primary }} strokeWidth={1.7} />
          <p className="text-[15px] font-semibold text-white/82">Services coming soon</p>
          <p className="mx-auto mt-1 max-w-[250px] text-[12.5px] leading-snug text-white/45">
            Check back shortly or contact the business directly.
          </p>
        </div>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {services.map((svc) => {
            const selected = selectedService?.id === svc.id;
            return (
              <button
                key={svc.id}
                onClick={() => onSelectService(svc)}
                className="flex items-center gap-3 rounded-[24px] p-4 text-left transition-all active:scale-[0.99]"
                style={{
                  background: selected
                    ? `linear-gradient(180deg, ${primary}24 0%, rgba(255,255,255,0.035) 100%)`
                    : 'linear-gradient(180deg, rgba(255,255,255,0.052) 0%, rgba(255,255,255,0.025) 100%)',
                  border: selected ? `1px solid ${primary}` : '0.5px solid rgba(255,255,255,0.09)',
                  boxShadow: selected
                    ? `0 12px 32px ${primary}22, inset 0 1px 0 rgba(255,255,255,0.12)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.06)',
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
                  <h3 className="font-serif text-[18px] font-semibold leading-tight">{svc.name}</h3>
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
                  {svc.description && (
                    <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-white/45">
                      {svc.description}
                    </p>
                  )}
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

function BookMetric({
  label,
  value,
  primary,
}: {
  label: string;
  value: string;
  primary: string;
}) {
  return (
    <div className="rounded-[17px] bg-black/20 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/36">
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold" style={{ color: primary }}>
        {value}
      </p>
    </div>
  );
}

function formatPrice(priceCents: number): string {
  return priceCents === 0 ? 'Free' : `€${(priceCents / 100).toFixed(0)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
