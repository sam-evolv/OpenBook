'use client';

import { useState, useRef } from 'react';
import { Loader2, Check, Upload, X, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface Props {
  initialBusiness: any;
}

export function SettingsEditor({ initialBusiness }: Props) {
  const [business, setBusiness] = useState(initialBusiness);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(patch: any) {
    setBusiness((prev: any) => ({ ...prev, ...patch }));
    setSaved(false);
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
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
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

      <Section title="Basics">
        <Field label="Business name">
          <TextInput
            value={business.name ?? ''}
            onChange={(v) => update({ name: v })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <TextInput
              value={business.city ?? ''}
              onChange={(v) => update({ city: v })}
            />
          </Field>
          <Field label="Address">
            <TextInput
              value={business.address_line ?? ''}
              onChange={(v) => update({ address_line: v })}
            />
          </Field>
        </div>
      </Section>

      <Section title="Story">
        <Field label="Tagline" hint="One short sentence people see on your app">
          <TextInput
            value={business.tagline ?? ''}
            onChange={(v) => update({ tagline: v })}
            placeholder="Strength and conditioning for all"
          />
        </Field>
        <Field label="About" hint="Show customers who you are">
          <TextArea
            value={business.about_long ?? ''}
            onChange={(v) => update({ about_long: v })}
            rows={5}
          />
        </Field>
        <Field label="Founder / owner name">
          <TextInput
            value={business.founder_name ?? ''}
            onChange={(v) => update({ founder_name: v })}
          />
        </Field>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <TextInput
              value={business.phone ?? ''}
              onChange={(v) => update({ phone: v })}
              placeholder="+353 87 123 4567"
            />
          </Field>
          <Field label="Website">
            <TextInput
              value={business.website ?? ''}
              onChange={(v) => update({ website: v })}
              placeholder="example.com"
            />
          </Field>
        </div>
        <Field label="Instagram">
          <TextInput
            value={business.socials?.instagram ?? ''}
            onChange={(v) =>
              update({
                socials: { ...(business.socials ?? {}), instagram: v },
              })
            }
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
                className="h-10 w-14 rounded-lg border-0 bg-transparent cursor-pointer"
              />
              <TextInput
                value={business.primary_colour ?? '#D4AF37'}
                onChange={(v) => update({ primary_colour: v })}
              />
            </div>
          </Field>
          <Field label="Secondary colour">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={business.secondary_colour ?? '#080808'}
                onChange={(e) => update({ secondary_colour: e.target.value })}
                className="h-10 w-14 rounded-lg border-0 bg-transparent cursor-pointer"
              />
              <TextInput
                value={business.secondary_colour ?? ''}
                onChange={(v) => update({ secondary_colour: v })}
              />
            </div>
          </Field>
        </div>
        <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          To re-upload your logo or change app icon, go through onboarding again (coming soon in a dedicated Logo settings page).
        </p>
      </Section>

      <ImagesSection business={business} update={update} />

      <Section title="Integrations">
        <div
          className="rounded-lg p-4 flex items-center justify-between"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <p className="text-[13px] font-semibold">Stripe</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {business.stripe_account_id
                ? 'Connected. Payments go directly to your account.'
                : 'Not connected. Customers can\'t pay online.'}
            </p>
          </div>
          <a
            href={
              business.stripe_account_id
                ? 'https://dashboard.stripe.com'
                : '/onboard/flow'
            }
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[12px] font-semibold"
            style={{ color: '#D4AF37' }}
          >
            {business.stripe_account_id ? 'Stripe dashboard' : 'Connect'}
            <ExternalLink className="h-3 w-3" strokeWidth={2.2} />
          </a>
        </div>
      </Section>

      {/* Save bar */}
      <div
        className="sticky bottom-0 -mx-6 px-6 py-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(5,5,5,0.95) 30%, #050505 100%)',
        }}
      >
        <button
          onClick={save}
          disabled={saving}
          className="flex h-11 items-center gap-2 px-6 rounded-full text-[13px] font-semibold text-black active:scale-[0.98] transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(145deg, #F6D77C 0%, #D4AF37 50%, #8B6428 100%)',
            boxShadow: '0 8px 20px rgba(212, 175, 55, 0.2)',
          }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-[13px] text-emerald-400">
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2
        className="text-[11px] font-semibold tracking-[0.14em] uppercase"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
        {label}
      </label>
      {children}
      {hint && (
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 px-3 rounded-lg text-[13px] focus:outline-none focus:border-white/20 transition-colors"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.9)',
      }}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg text-[13px] focus:outline-none focus:border-white/20 transition-colors resize-none"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 1.5,
      }}
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
      if (kind === 'hero') {
        update({ hero_image_url: data.url });
      } else {
        update({ gallery_urls: [...gallery, data.url] });
      }
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
      const res = await fetch(`/api/upload-image?${params.toString()}`, {
        method: 'DELETE',
      });
      if (!res.ok) return;
      if (kind === 'hero') update({ hero_image_url: null });
      else if (index !== undefined)
        update({ gallery_urls: gallery.filter((_, i) => i !== index) });
    } catch {
      /* silent */
    }
  }

  return (
    <Section title="Photos">
      {error && <p className="text-[12px] text-red-400">{error}</p>}

      {/* Hero */}
      <Field label="Hero image">
        {business.hero_image_url ? (
          <div className="relative rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={business.hero_image_url}
              alt=""
              className="w-full aspect-[16/9] object-cover"
            />
            <button
              onClick={() => removeImage('hero')}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => heroRef.current?.click()}
            className="rounded-xl aspect-[16/9] flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px dashed rgba(255,255,255,0.15)',
            }}
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
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#D4AF37' }} />
            ) : (
              <>
                <Upload className="h-4 w-4" style={{ color: '#D4AF37' }} />
                <span className="text-[13px] font-medium" style={{ color: '#D4AF37' }}>
                  Upload hero image
                </span>
              </>
            )}
          </button>
        )}
      </Field>

      {/* Gallery */}
      <Field label={`Gallery (${gallery.length}/6)`}>
        <div className="grid grid-cols-3 gap-2">
          {gallery.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage('gallery', i)}
                className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          ))}
          {gallery.length < 6 && (
            <button
              onClick={() => galleryRef.current?.click()}
              className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px dashed rgba(255,255,255,0.15)',
              }}
            >
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  Array.from(e.target.files ?? []).forEach((f) => uploadImage(f, 'gallery'));
                }}
              />
              {uploading === 'gallery' ? (
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#D4AF37' }} />
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" style={{ color: '#D4AF37' }} />
                  <span className="text-[10px] font-medium" style={{ color: '#D4AF37' }}>
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
