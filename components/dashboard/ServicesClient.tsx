'use client';

import { useState } from 'react';
import { Plus, X, Eye, EyeOff, Loader2, Sparkles, Clock, Euro, GripVertical } from 'lucide-react';

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
  businessCategory: string | null;
  initialServices: Service[];
}

/* Category-specific templates — the empty state shows these as one-click adds */
const CATEGORY_TEMPLATES: Record<string, Array<Omit<Service, 'id' | 'is_active'>>> = {
  'Personal Training': [
    { name: 'PT Session', description: '1:1 training', duration_minutes: 60, price_cents: 6000 },
    { name: 'Initial Consultation', description: 'Assessment + goal setting', duration_minutes: 45, price_cents: 0 },
    { name: '4-Week Block', description: 'Progressive programme', duration_minutes: 60, price_cents: 20000 },
  ],
  'Barber': [
    { name: 'Haircut', description: 'Classic haircut', duration_minutes: 30, price_cents: 2500 },
    { name: 'Beard Trim', description: '', duration_minutes: 15, price_cents: 1500 },
    { name: 'Haircut & Beard', description: '', duration_minutes: 45, price_cents: 3500 },
  ],
  'Hair Salon': [
    { name: 'Cut & Blow Dry', description: '', duration_minutes: 60, price_cents: 5000 },
    { name: 'Colour', description: 'Full head colour', duration_minutes: 120, price_cents: 12000 },
    { name: 'Highlights', description: '', duration_minutes: 150, price_cents: 15000 },
  ],
  'Nail Studio': [
    { name: 'Gel Manicure', description: '', duration_minutes: 45, price_cents: 3500 },
    { name: 'Pedicure', description: '', duration_minutes: 60, price_cents: 4500 },
    { name: 'Nail Art', description: 'Custom design', duration_minutes: 90, price_cents: 6000 },
  ],
  'Yoga': [
    { name: 'Drop-in class', description: 'Single session', duration_minutes: 60, price_cents: 1500 },
    { name: '10 Class Pack', description: '', duration_minutes: 60, price_cents: 12000 },
    { name: 'Private session', description: '1:1', duration_minutes: 60, price_cents: 8000 },
  ],
  'Sauna & Spa': [
    { name: 'Sauna session', description: '60 min solo or shared', duration_minutes: 60, price_cents: 2500 },
    { name: 'Private sauna', description: 'Whole sauna to yourself', duration_minutes: 60, price_cents: 7000 },
  ],
  'Physio': [
    { name: 'Initial Assessment', description: 'Full evaluation + treatment plan', duration_minutes: 60, price_cents: 7500 },
    { name: 'Follow-up Session', description: '', duration_minutes: 45, price_cents: 6000 },
    { name: 'Sports Massage', description: '', duration_minutes: 60, price_cents: 7000 },
  ],
};

const DEFAULT_TEMPLATES = [
  { name: 'Standard session', description: '', duration_minutes: 60, price_cents: 5000 },
  { name: 'Consultation', description: 'First-time visit', duration_minutes: 30, price_cents: 0 },
];

export function ServicesClient({ businessId, businessCategory, initialServices }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const templates = (businessCategory && CATEGORY_TEMPLATES[businessCategory]) || DEFAULT_TEMPLATES;

  async function addFromTemplate(tpl: Omit<Service, 'id' | 'is_active'>) {
    const newService: Service = { ...tpl, is_active: true };
    await saveNew(newService);
  }

  async function saveNew(service: Service) {
    setError(null);
    const tempId = `new-${Date.now()}`;
    setSaving(tempId);
    setServices((prev) => [...prev, service]);

    try {
      const res = await fetch('/api/dashboard/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, service }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Save failed');
      setServices((prev) =>
        prev.map((s) => (s === service ? { ...service, id: data.id } : s))
      );
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
      setServices((prev) => prev.filter((s) => s !== service));
    } finally {
      setSaving(null);
    }
  }

  async function updateService(service: Service, patch: Partial<Service>) {
    const next = { ...service, ...patch };
    setServices((prev) => prev.map((s) => (s.id === service.id ? next : s)));
    if (!service.id) return;

    setSaving(service.id);
    try {
      await fetch('/api/dashboard/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, service: next }),
      });
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(null);
    }
  }

  async function deleteService(service: Service) {
    if (!service.id) {
      setServices((prev) => prev.filter((s) => s !== service));
      return;
    }
    if (!confirm(`Delete "${service.name}"? Existing bookings are unaffected.`)) return;

    setSaving(service.id);
    try {
      await fetch(`/api/dashboard/services?id=${service.id}&businessId=${businessId}`, {
        method: 'DELETE',
      });
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    } catch (err: any) {
      setError(err?.message ?? 'Delete failed');
    } finally {
      setSaving(null);
    }
  }

  async function addBlank() {
    await saveNew({
      name: 'New service',
      description: '',
      duration_minutes: 60,
      price_cents: 0,
      is_active: true,
    });
  }

  return (
    <div className="flex flex-col gap-6 dash-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[24px] font-semibold leading-none"
            style={{ color: 'var(--fg-0)', letterSpacing: '-0.02em' }}
          >
            Services
          </h1>
          <p
            className="mt-1.5 text-[13px]"
            style={{ color: 'var(--fg-1)' }}
          >
            Add, edit, or remove what customers can book.
          </p>
        </div>
        {services.length > 0 && (
          <button onClick={addBlank} className="dash-btn-accent">
            <Plus className="h-[14px] w-[14px]" strokeWidth={2.2} />
            Add service
          </button>
        )}
      </div>

      {error && (
        <div
          className="rounded-lg p-3 text-[13px]"
          style={{
            background: 'var(--danger-bg)',
            border: '0.5px solid var(--danger)',
            color: 'var(--danger)',
          }}
        >
          {error}
        </div>
      )}

      {services.length === 0 ? (
        <EmptyState templates={templates} category={businessCategory} onPick={addFromTemplate} onBlank={addBlank} />
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((svc) => (
            <ServiceCard
              key={svc.id ?? `tmp-${svc.name}`}
              service={svc}
              isSaving={saving === svc.id}
              onUpdate={(patch) => updateService(svc, patch)}
              onDelete={() => deleteService(svc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  templates,
  category,
  onPick,
  onBlank,
}: {
  templates: Array<Omit<Service, 'id' | 'is_active'>>;
  category: string | null;
  onPick: (t: Omit<Service, 'id' | 'is_active'>) => void;
  onBlank: () => void;
}) {
  return (
    <div className="dash-card p-8" style={{ background: 'var(--bg-1)' }}>
      <div className="flex items-start gap-3 mb-5">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-bg)' }}
        >
          <Sparkles className="h-[16px] w-[16px]" style={{ color: 'var(--accent)' }} strokeWidth={2} />
        </div>
        <div>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--fg-0)' }}>
            Start with a template
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--fg-1)' }}>
            {category
              ? `Quick-add services commonly offered by ${category} businesses`
              : 'Add a starter service in one click — edit everything after'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {templates.map((tpl, i) => (
          <button
            key={i}
            onClick={() => onPick(tpl)}
            className="flex items-center gap-3 p-3 rounded-lg text-left transition-colors"
            style={{
              border: '0.5px solid var(--border-1)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-2)';
              e.currentTarget.style.borderColor = 'var(--border-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-1)';
            }}
          >
            <Plus className="h-4 w-4 shrink-0" style={{ color: 'var(--fg-2)' }} strokeWidth={1.8} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium" style={{ color: 'var(--fg-0)' }}>
                {tpl.name}
              </p>
              {tpl.description && (
                <p className="text-[11px]" style={{ color: 'var(--fg-2)' }}>
                  {tpl.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>
              <span>{tpl.duration_minutes}m</span>
              <span>€{(tpl.price_cents / 100).toFixed(0)}</span>
            </div>
          </button>
        ))}
      </div>

      <div
        className="mt-5 pt-5 border-t flex items-center justify-between"
        style={{ borderColor: 'var(--border-1)' }}
      >
        <span className="text-[12px]" style={{ color: 'var(--fg-2)' }}>
          Or start from scratch
        </span>
        <button onClick={onBlank} className="dash-btn-secondary">
          <Plus className="h-[14px] w-[14px]" strokeWidth={2} />
          Blank service
        </button>
      </div>
    </div>
  );
}

function ServiceCard({
  service,
  isSaving,
  onUpdate,
  onDelete,
}: {
  service: Service;
  isSaving: boolean;
  onUpdate: (patch: Partial<Service>) => void;
  onDelete: () => void;
}) {
  const [localName, setLocalName] = useState(service.name);
  const [localDesc, setLocalDesc] = useState(service.description ?? '');
  const [localDuration, setLocalDuration] = useState(service.duration_minutes);
  const [localPrice, setLocalPrice] = useState((service.price_cents / 100).toString());

  return (
    <div
      className="dash-card p-4 transition-opacity"
      style={{
        background: 'var(--bg-1)',
        opacity: service.is_active ? 1 : 0.55,
      }}
    >
      <div className="flex items-start gap-3">
        <button
          className="mt-1 shrink-0 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          title="Reorder (coming soon)"
        >
          <GripVertical className="h-4 w-4" style={{ color: 'var(--fg-3)' }} strokeWidth={1.5} />
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => localName.trim() !== service.name && onUpdate({ name: localName.trim() })}
            placeholder="Service name"
            className="bg-transparent border-none text-[15px] font-semibold focus:outline-none w-full p-0"
            style={{ color: 'var(--fg-0)' }}
          />

          <input
            type="text"
            value={localDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
            onBlur={() => {
              const next = localDesc.trim();
              if (next !== (service.description ?? '')) onUpdate({ description: next || null });
            }}
            placeholder="Short description (optional)"
            className="bg-transparent border-none text-[12px] focus:outline-none w-full p-0"
            style={{ color: 'var(--fg-1)' }}
          />

          <div className="flex items-center gap-5 mt-1">
            <div className="flex items-center gap-1.5">
              <Clock className="h-[13px] w-[13px]" style={{ color: 'var(--fg-2)' }} strokeWidth={1.8} />
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={localDuration}
                onChange={(e) => setLocalDuration(parseInt(e.target.value) || 60)}
                onBlur={() => {
                  if (localDuration !== service.duration_minutes) {
                    onUpdate({ duration_minutes: localDuration });
                  }
                }}
                className="bg-transparent border-none text-[12px] font-mono tabular-nums focus:outline-none w-12 p-0"
                style={{ color: 'var(--fg-0)' }}
              />
              <span className="text-[12px] font-mono" style={{ color: 'var(--fg-2)' }}>
                min
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Euro className="h-[13px] w-[13px]" style={{ color: 'var(--fg-2)' }} strokeWidth={1.8} />
              <input
                type="number"
                min="0"
                step="1"
                value={localPrice}
                onChange={(e) => setLocalPrice(e.target.value)}
                onBlur={() => {
                  const euros = parseFloat(localPrice);
                  if (isNaN(euros)) {
                    setLocalPrice((service.price_cents / 100).toString());
                    return;
                  }
                  const cents = Math.round(euros * 100);
                  if (cents !== service.price_cents) onUpdate({ price_cents: cents });
                }}
                className="bg-transparent border-none text-[12px] font-mono tabular-nums focus:outline-none w-16 p-0"
                style={{ color: 'var(--fg-0)' }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isSaving && (
            <Loader2 className="h-[14px] w-[14px] animate-spin" style={{ color: 'var(--fg-2)' }} />
          )}
          <button
            onClick={() => onUpdate({ is_active: !service.is_active })}
            className="h-7 w-7 flex items-center justify-center rounded-md transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title={service.is_active ? 'Hide from customers' : 'Show to customers'}
          >
            {service.is_active ? (
              <Eye className="h-[14px] w-[14px]" style={{ color: 'var(--fg-1)' }} strokeWidth={1.8} />
            ) : (
              <EyeOff className="h-[14px] w-[14px]" style={{ color: 'var(--fg-2)' }} strokeWidth={1.8} />
            )}
          </button>
          <button
            onClick={onDelete}
            className="h-7 w-7 flex items-center justify-center rounded-md transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--danger-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="h-[14px] w-[14px]" style={{ color: 'var(--fg-1)' }} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
