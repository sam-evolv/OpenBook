'use client';

import { useState } from 'react';
import { Plus, X, Minus, Eye, EyeOff, Loader2, Check } from 'lucide-react';

interface Service {
  id?: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
}

interface Props {
  businessId: string;
  initialServices: Service[];
}

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180];

export function ServicesEditor({ businessId, initialServices }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function adjustDuration(current: number, delta: number): number {
    const idx = DURATION_OPTIONS.findIndex((d) => d >= current);
    if (idx === -1) return Math.max(15, current + delta * 15);
    const nextIdx = Math.max(0, Math.min(DURATION_OPTIONS.length - 1, idx + delta));
    return DURATION_OPTIONS[nextIdx];
  }

  function adjustPrice(currentCents: number, deltaEuros: number): number {
    const euros = currentCents / 100;
    const next = Math.max(0, euros + deltaEuros);
    return Math.round(next * 100);
  }

  async function saveService(service: Service, index: number) {
    setError(null);
    setSaving(service.id ?? `new-${index}`);
    try {
      const res = await fetch('/api/dashboard/services', {
        method: service.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, service }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Save failed');

      if (!service.id && data.id) {
        // Replace the temp service with the saved one
        setServices((prev) =>
          prev.map((s, i) => (i === index ? { ...service, id: data.id } : s))
        );
      }
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(null);
    }
  }

  async function deleteService(service: Service, index: number) {
    if (!service.id) {
      // Unsaved, just remove from state
      setServices((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!confirm('Delete this service? Existing bookings are unaffected.')) return;

    setSaving(service.id);
    try {
      const res = await fetch(`/api/dashboard/services?id=${service.id}&businessId=${businessId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Delete failed');
      }
      setServices((prev) => prev.filter((_, i) => i !== index));
    } catch (err: any) {
      setError(err?.message ?? 'Delete failed');
    } finally {
      setSaving(null);
    }
  }

  function updateLocal(index: number, patch: Partial<Service>) {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function addNew() {
    setServices((prev) => [
      ...prev,
      {
        name: '',
        duration_minutes: 60,
        price_cents: 0,
        is_active: true,
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div
          className="rounded-lg p-3 text-[13px]"
          style={{
            background: 'rgba(255,80,80,0.08)',
            border: '0.5px solid rgba(255,80,80,0.25)',
            color: 'rgba(255,150,150,0.9)',
          }}
        >
          {error}
        </div>
      )}

      {services.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            No services yet.
          </p>
          <p className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Click "Add a service" below to get started.
          </p>
        </div>
      )}

      {services.map((svc, idx) => (
        <div
          key={svc.id ?? `new-${idx}`}
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            opacity: svc.is_active ? 1 : 0.55,
          }}
        >
          {/* Name + actions */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={svc.name}
              onChange={(e) => updateLocal(idx, { name: e.target.value })}
              onBlur={() => svc.name.trim() && saveService(svc, idx)}
              placeholder="Service name"
              className="flex-1 bg-transparent text-[15px] font-semibold focus:outline-none"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            />
            <button
              onClick={() => {
                updateLocal(idx, { is_active: !svc.is_active });
                saveService({ ...svc, is_active: !svc.is_active }, idx);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              title={svc.is_active ? 'Hide from customers' : 'Show to customers'}
            >
              {svc.is_active ? (
                <Eye className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
              ) : (
                <EyeOff className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
              )}
            </button>
            <button
              onClick={() => deleteService(svc, idx)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors"
              disabled={saving === (svc.id ?? `new-${idx}`)}
            >
              {saving === (svc.id ?? `new-${idx}`) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              )}
            </button>
          </div>

          {/* Description */}
          <input
            type="text"
            value={svc.description ?? ''}
            onChange={(e) => updateLocal(idx, { description: e.target.value })}
            onBlur={() => svc.name.trim() && saveService(svc, idx)}
            placeholder="Short description (optional)"
            className="w-full bg-transparent text-[13px] focus:outline-none"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          />

          {/* Duration + Price steppers */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="flex items-center gap-1 h-[48px] rounded-lg overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={() => {
                  const newDuration = adjustDuration(svc.duration_minutes, -1);
                  updateLocal(idx, { duration_minutes: newDuration });
                  saveService({ ...svc, duration_minutes: newDuration }, idx);
                }}
                className="h-full w-10 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
              >
                <Minus className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
              <div className="flex-1 text-center">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Duration
                </div>
                <div className="text-[13px] font-semibold tabular-nums">
                  {formatDuration(svc.duration_minutes)}
                </div>
              </div>
              <button
                onClick={() => {
                  const newDuration = adjustDuration(svc.duration_minutes, 1);
                  updateLocal(idx, { duration_minutes: newDuration });
                  saveService({ ...svc, duration_minutes: newDuration }, idx);
                }}
                className="h-full w-10 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
            </div>

            <div
              className="flex items-center gap-1 h-[48px] rounded-lg overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={() => {
                  const newPrice = adjustPrice(svc.price_cents, -5);
                  updateLocal(idx, { price_cents: newPrice });
                  saveService({ ...svc, price_cents: newPrice }, idx);
                }}
                className="h-full w-10 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
              >
                <Minus className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
              <div className="flex-1 text-center">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Price
                </div>
                <div className="text-[13px] font-semibold tabular-nums" style={{ color: '#D4AF37' }}>
                  €{(svc.price_cents / 100).toFixed(0)}
                </div>
              </div>
              <button
                onClick={() => {
                  const newPrice = adjustPrice(svc.price_cents, 5);
                  updateLocal(idx, { price_cents: newPrice });
                  saveService({ ...svc, price_cents: newPrice }, idx);
                }}
                className="h-full w-10 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addNew}
        className="flex items-center justify-center gap-2 py-4 rounded-xl transition-colors"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px dashed rgba(255,255,255,0.15)',
        }}
      >
        <Plus className="h-4 w-4" style={{ color: '#D4AF37' }} />
        <span className="text-[13px] font-medium" style={{ color: '#D4AF37' }}>
          Add a service
        </span>
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
