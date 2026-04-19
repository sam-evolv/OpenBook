'use client';

import { useState, useRef } from 'react';
import { Loader2, Check, Upload, X, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface Props {
  initialBusiness: any;
}

export function SettingsClient({ initialBusiness }: Props) {
  const [business, setBusiness] = useState(initialBusiness);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  function update(patch: any) {
    setBusiness((prev: any) => ({ ...prev, ...patch }));
    setSaved(false);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          patch: {
            name: business.name,
            tagline: business.tagline,
            about_long: business.about_long,
            founder_name: business.founder_name,
            phone: business.phone,
            website: business.website,
            address_line: business.address_line,
            city: business.city,
            primary_colour: business.primary_colour,
            secondary_colour: business.secondary_colour,
            socials: business.socials,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Save failed');
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dash-fade-in">
      <div className="mb-6">
        <h1
          className="text-[24px] font-semibold leading-none"
          style={{ color: 'var(--fg-0)', letterSpacing: '-0.02em' }}
        >
          Settings
        </h1>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--fg-1)' }}>
          Update your business info, branding, and photos.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-8">
        <div className="flex flex-col gap-6">
          {error && (
            <div
              className="rounded-lg p-3 text-[13px]"
              style={{ background: 'var(--danger-bg)', border: '0.5px solid var(--danger)', color: 'var(--danger)' }}
            >
              {error}
            </div>
          )}

          <Section title="Basics">
            <Field label="Business name">
              <TextInput value={business.name ?? ''} onChange={(v) => update({ name: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <TextInput value={business.city ?? ''} onChange={(v) => update({ city: v })} />
              </Field>
              <Field label="Address">
                <TextInput value={business.address_line ?? ''} onChange={(v) => update({ address_line: v })} />
              </Field>
            </div>
          </Section>

          <Section title="Story">
            <Field label="Tagline" hint="One short sentence customers see at the top of your app">
              <TextInput value={business.tagline ?? ''} onChange={(v) => update({ tagline: v })} placeholder="Strength and conditioning for all" />
            </Field>
            <Field label="About" hint="Show customers who you are">
              <TextArea value={business.about_long ?? ''} onChange={(v) => update({ about_long: v })} rows={5} />
            </Field>
            <Field label="Founder / owner name">
              <TextInput value={business.founder_name ?? ''} onChange={(v) => update({ founder_name: v })} />
            </Field>
          </Section>

          <Section title="Contact">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <TextInput value={business.phone ?? ''} onChange={(v) => update({ phone: v })} placeholder="+353 87 123 4567" />
              </Field>
              <Field label="Website">
                <TextInput value={business.website ?? ''} onChange={(v) => update({ website: v })} placeholder="example.com" />
              </Field>
            </div>
            <Field label="Instagram">
              <TextInput
                value={business.socials?.instagram ?? ''}
                onChange={(v) => update({ socials: { ...(business.socials ?? {}), instagram: v } })}
                placeholder="@yourbusiness"
              />
            </Field>
          </Section>

          <Section title="Branding">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary colour">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={business.primary_colour ?? '#D4AF37'}
                    onChange={(e) => update({ primary_colour: e.target.value })}
                    className="h-9 w-12 rounded-md border-0 bg-transparent cursor-pointer"
                  />
                  <TextInput value={business.primary_colour ?? '#D4AF37'} onChange={(v) => update({ primary_colour: v })} />
                </div>
              </Field>
              <Field label="Secondary colour">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={business.secondary_colour ?? '#080808'}
                    onChange={(e) => update({ secondary_colour: e.target.value })}
                    className="h-9 w-12 rounded-md border-0 bg-transparent cursor-pointer"
                  />
                  <TextInput value={business.secondary_colour ?? ''} onChange={(v) => update({ secondary_colour: v })} />
                </div>
              </Field>
            </div>
          </Section>

          <ImagesSection business={business} update={update} />

          <Section title="Integrations">
            <div
              className="dash-card p-4 flex items-center justify-between"
              style={{ background: 'var(--bg-1)' }}
            >
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--fg-0)' }}>
                  Stripe
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-2)' }}>
                  {business.stripe_account_id
                    ? 'Connected. Payments go directly to your account.'
                    : "Not connected. Customers can't pay online."}
                </p>
              </div>
              <a
                href={business.stripe_account_id ? 'https://dashboard.stripe.com' : '/onboard/flow'}
                target="_blank"
                rel="noreferrer"
                className="dash-btn-secondary"
              >
                {business.stripe_account_id ? 'Stripe dashboard' : 'Connect'}
                <ExternalLink className="h-[13px] w-[13px]" strokeWidth={2} />
              </a>
            </div>
          </Section>

          {/* Save bar — sticky at bottom of content column */}
          <div className="sticky bottom-4 mt-4 flex items-center gap-3 justify-end">
            {dirty && !saving && !saved && (
              <span className="text-[11px]" style={{ color: 'var(--fg-2)' }}>
                Unsaved changes
              </span>
            )}
            {saved && (
              <span className="flex items-center gap-1 text-[13px]" style={{ color: 'var(--success)' }}>
                <Check className="h-4 w-4" strokeWidth={2.2} />
                Saved
              </span>
            )}
            <button onClick={save} disabled={saving || !dirty} className="dash-btn-accent">
              {saving ? <Loader2 className="h-[14px] w-[14px] animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Live phone preview */}
        <div className="sticky top-8 self-start">
          <LivePreview business={business} />
        </div>
      </div>
    </div>
  );
}

function LivePreview({ business }: { business: any }) {
  const primary = business.primary_colour ?? '#D4AF37';
  return (
    <div>
      <p
        className="text-[11px] font-medium uppercase tracking-wider mb-3"
        style={{ color: 'var(--fg-2)' }}
      >
        Live preview
      </p>
      <div
        className="rounded-[36px] p-2 dash-card overflow-hidden"
        style={{
          background: 'var(--bg-2)',
          border: '8px solid var(--bg-3)',
          width: 280,
        }}
      >
        <div
          className="rounded-[28px] overflow-hidden"
          style={{
            background: '#050505',
            color: '#fff',
            aspectRatio: '9/16',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Hero */}
          <div className="relative w-full aspect-[16/10]" style={{ background: '#111' }}>
            {business.hero_image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={business.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse at 30% 20%, ${primary}40 0%, #000 70%)` }}
              />
            )}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)' }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              {business.city && (
                <p
                  className="text-[7px] font-semibold tracking-[0.18em] uppercase mb-1"
                  style={{ color: primary }}
                >
                  {business.city}
                </p>
              )}
              <h2 className="text-[16px] font-bold leading-none" style={{ color: '#fff', letterSpacing: '-0.02em' }}>
                {business.name || 'Your business'}
              </h2>
              {business.tagline && (
                <p className="mt-1 text-[9px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {business.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Content preview */}
          <div className="p-3">
            <p className="text-[8px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Services
            </p>
            <div className="flex flex-col gap-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md px-2 py-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="text-[9px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Sample service {i}
                  </span>
                  <span
                    className="text-[9px] font-semibold tabular-nums"
                    style={{ color: primary }}
                  >
                    €{i * 20}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-center" style={{ color: 'var(--fg-2)' }}>
        Changes appear here in real-time
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-[11px] font-medium uppercase tracking-wider mb-3"
        style={{ color: 'var(--fg-2)' }}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium" style={{ color: 'var(--fg-1)' }}>
        {label}
      </label>
      {children}
      {hint && (
        <span className="text-[11px]" style={{ color: 'var(--fg-2)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="dash-input"
    />
  );
}

function TextArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="dash-textarea"
    />
  );
}

function ImagesSection({ business, update }: { business: any; update: (p: any) => void }) {
  const heroRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'hero' | 'gallery' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const gallery: string[] = business.gallery_urls ?? [];

  async function uploadImage(file: File, kind: 'hero' | 'gallery') {
    setUploading(kind);
    setError(null);
    const formData = new FormData();
    formData.append('businessId', business.id);
    formData.append('kind', kind);
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
      if (kind === 'hero') update({ hero_image_url: data.url });
      else update({ gallery_urls: [...gallery, data.url] });
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  async function removeImage(kind: 'hero' | 'gallery', index?: number) {
    const params = new URLSearchParams({ businessId: business.id, kind });
    if (kind === 'gallery' && index !== undefined) params.set('index', String(index));
    try {
      const res = await fetch(`/api/upload-image?${params.toString()}`, { method: 'DELETE' });
      if (!res.ok) return;
      if (kind === 'hero') update({ hero_image_url: null });
      else if (index !== undefined) update({ gallery_urls: gallery.filter((_, i) => i !== index) });
    } catch { /* silent */ }
  }

  return (
    <Section title="Photos">
      {error && <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p>}

      <Field label="Hero image">
        {business.hero_image_url ? (
          <div className="relative rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.hero_image_url} alt="" className="w-full aspect-[16/9] object-cover" />
            <button
              onClick={() => removeImage('hero')}
              className="absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => heroRef.current?.click()}
            className="rounded-lg aspect-[16/9] flex items-center justify-center gap-2 transition-colors"
            style={{ background: 'var(--bg-2)', border: '0.5px dashed var(--border-2)' }}
          >
            <input
              ref={heroRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f, 'hero');
              }}
            />
            {uploading === 'hero' ? (
              <Loader2 className="h-[14px] w-[14px] animate-spin" style={{ color: 'var(--accent)' }} />
            ) : (
              <>
                <Upload className="h-[14px] w-[14px]" style={{ color: 'var(--accent)' }} strokeWidth={1.8} />
                <span className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
                  Upload hero image
                </span>
              </>
            )}
          </button>
        )}
      </Field>

      <Field label={`Gallery (${gallery.length}/6)`}>
        <div className="grid grid-cols-3 gap-2">
          {gallery.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-md overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage('gallery', i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
          {gallery.length < 6 && (
            <button
              onClick={() => galleryRef.current?.click()}
              className="aspect-square rounded-md flex flex-col items-center justify-center gap-1 transition-colors"
              style={{ background: 'var(--bg-2)', border: '0.5px dashed var(--border-2)' }}
            >
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => Array.from(e.target.files ?? []).forEach((f) => uploadImage(f, 'gallery'))}
              />
              {uploading === 'gallery' ? (
                <Loader2 className="h-[14px] w-[14px] animate-spin" style={{ color: 'var(--accent)' }} />
              ) : (
                <>
                  <ImageIcon className="h-[14px] w-[14px]" style={{ color: 'var(--accent)' }} strokeWidth={1.8} />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>
                    Add
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </Field>
    </Section>
  );
}
