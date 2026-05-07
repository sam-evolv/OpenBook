'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  MonitorSmartphone,
  Palette,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '../Button';
import { Card } from '../Card';
import { FieldRow } from '../FieldRow';
import { TopBar } from '../TopBar';
import { saveMyAppProfile } from '@/app/(dashboard)/dashboard/my-app/actions';
import {
  DEFAULT_TILE_COLOUR,
  TILE_PALETTE,
  type TileColourSlug,
  isValidTileColour,
} from '@/lib/tile-palette';
import { cn } from '@/lib/utils';
import { publicBusinessDisplayUrl, publicBusinessUrl } from '@/lib/public-url';
import {
  CTA_LABELS,
  type AppIconStyle,
  type BusinessAppConfig,
  type HeroStyle,
  type PreviewDevice,
  getBusinessAppConfig,
} from '@/lib/business-app-config';
import type { ServiceRow } from '../ServiceDrawer';

const DESCRIPTION_MAX = 700;
const GALLERY_LIMIT = 6;

export interface MyAppInitial {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  tagline: string | null;
  about_long: string | null;
  city: string | null;
  primary_colour: string | null;
  logo_url: string | null;
  processed_icon_url: string | null;
  cover_image_url: string | null;
  hero_image_url: string | null;
  gallery_urls: string[] | null;
  offers: unknown;
}

export function MyAppClient({
  initial,
  services,
}: {
  initial: MyAppInitial;
  services: ServiceRow[];
}) {
  const [form, setForm] = useState(() => ({
    ...initial,
    gallery_urls: initial.gallery_urls ?? [],
  }));
  const [appConfig, setAppConfig] = useState<BusinessAppConfig>(() =>
    getBusinessAppConfig(initial.offers),
  );
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('iphone');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'hero' | 'gallery' | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [isPending, startTransition] = useTransition();
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const colour: TileColourSlug = isValidTileColour(form.primary_colour)
    ? form.primary_colour
    : DEFAULT_TILE_COLOUR;
  const publicUrl = useMemo(
    () => publicBusinessUrl(form.slug, typeof window === 'undefined' ? undefined : window.location.origin),
    [form.slug],
  );
  const displayUrl = useMemo(
    () => publicBusinessDisplayUrl(form.slug, typeof window === 'undefined' ? undefined : window.location.origin),
    [form.slug],
  );
  const heroSrc = form.hero_image_url ?? form.cover_image_url ?? form.gallery_urls[0] ?? null;
  const logoSrc = form.processed_icon_url ?? form.logo_url;
  const livePreviewSrc = useMemo(
    () => `${publicUrl}?dashboardPreview=${previewVersion}`,
    [publicUrl, previewVersion],
  );
  const description = form.about_long ?? '';
  const readiness = getReadiness({
    name: form.name,
    tagline: form.tagline,
    description,
    heroSrc,
    logoSrc,
    galleryCount: form.gallery_urls.length,
    servicesCount: services.length,
    featuredServiceId: appConfig.featuredServiceId,
  });

  const update = <K extends keyof MyAppInitial>(key: K, value: MyAppInitial[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setStatus('idle');
  };

  const updateAppConfig = (patch: Partial<BusinessAppConfig>) => {
    setAppConfig((current) => ({ ...current, ...patch }));
    setDirty(true);
    setStatus('idle');
  };

  const updateSections = (patch: Partial<BusinessAppConfig['sections']>) => {
    setAppConfig((current) => ({
      ...current,
      sections: { ...current.sections, ...patch },
    }));
    setDirty(true);
    setStatus('idle');
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveMyAppProfile({
        name: form.name,
        tagline: form.tagline,
        about_long: form.about_long,
        city: form.city,
        primary_colour: form.primary_colour,
        logo_url: form.logo_url,
        processed_icon_url: form.processed_icon_url,
        appConfig,
      });
      if (res.ok) {
        setDirty(false);
        setStatus('saved');
        setPreviewVersion((version) => version + 1);
      } else {
        setStatus('error');
        setError(res.error);
      }
    });
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard may fail on insecure contexts. */
    }
  };

  async function uploadImage(kind: 'hero' | 'gallery', file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setUploading(kind);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('businessId', form.id);
      fd.append('kind', kind);
      fd.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
      if (kind === 'hero') {
        setForm((f) => ({ ...f, hero_image_url: data.url }));
      } else {
        setForm((f) => ({ ...f, gallery_urls: [...f.gallery_urls, data.url] }));
      }
      setStatus('saved');
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed. Try another image.');
    } finally {
      setUploading(null);
    }
  }

  async function uploadLogo(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file too large. Max 5MB.');
      return;
    }

    setLogoUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('businessId', form.id);
      fd.append('file', file);
      fd.append('background', iconStyleToLogoBackground(appConfig.appIconStyle, colour));
      const res = await fetch('/api/upload-logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
      setLogoPath(data.logoPath ?? null);
      setForm((f) => ({
        ...f,
        logo_url: data.logoUrl,
        processed_icon_url: data.iconUrl,
      }));
      setDirty(true);
      setStatus('idle');
    } catch (err: any) {
      setError(err?.message ?? 'Logo upload failed. Try another image.');
    } finally {
      setLogoUploading(false);
    }
  }

  async function regenerateLogoIcon(appIconStyle: AppIconStyle) {
    if (!form.logo_url && !logoPath) return;
    setLogoUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('businessId', form.id);
      fd.append('background', iconStyleToLogoBackground(appIconStyle, colour));
      if (logoPath) {
        fd.append('cachedLogoPath', logoPath);
      } else if (form.logo_url) {
        fd.append('cachedLogoUrl', form.logo_url);
      }
      const res = await fetch('/api/upload-logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not regenerate icon');
      setLogoPath(data.logoPath ?? logoPath);
      setForm((f) => ({ ...f, processed_icon_url: data.iconUrl }));
      setDirty(true);
      setStatus('idle');
    } catch (err: any) {
      setError(err?.message ?? 'Could not update logo treatment.');
    } finally {
      setLogoUploading(false);
    }
  }

  const changeAppIconStyle = (appIconStyle: AppIconStyle) => {
    updateAppConfig({ appIconStyle });
    if (form.logo_url || logoPath) void regenerateLogoIcon(appIconStyle);
  };

  async function deleteImage(kind: 'hero' | 'gallery', index?: number) {
    const key = kind === 'hero' ? 'hero' : `gallery-${index}`;
    setDeleting(key);
    setError(null);
    try {
      const params = new URLSearchParams({ businessId: form.id, kind });
      if (typeof index === 'number') params.set('index', String(index));
      const res = await fetch(`/api/upload-image?${params.toString()}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Could not delete image');
      if (kind === 'hero') {
        setForm((f) => ({ ...f, hero_image_url: null }));
      } else if (typeof index === 'number') {
        setForm((f) => ({
          ...f,
          gallery_urls: f.gallery_urls.filter((_, i) => i !== index),
        }));
      }
      setStatus('saved');
    } catch (err: any) {
      setError(err?.message ?? 'Could not delete image.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <TopBar
        title="My App"
        subtitle="Shape the customer-facing app your business lives inside"
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              icon={copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
              onClick={copyUrl}
            >
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="md" icon={<ExternalLink size={13} strokeWidth={2} />}>
                View live app
              </Button>
            </a>
          </>
        }
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="space-y-8">
          <Card
            padding="lg"
            className="overflow-hidden bg-gradient-to-br from-gold-soft to-transparent"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold-border bg-gold-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-gold">
                  <MonitorSmartphone size={13} />
                  Customer app studio
                </div>
                <h2 className="text-[22px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1">
                  Make this feel like {form.name || 'your business'} has its own app.
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-paper-text-2 dark:text-ink-text-2">
                  Upload freely. OpenBook will reshape, sharpen, crop, compress, and protect legibility
                  so the final app stays beautiful even when source images are imperfect.
                </p>
              </div>
              <div className="rounded-xl border border-paper-border bg-paper-bg/60 p-4 dark:border-ink-border dark:bg-ink-bg/50">
                <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-paper-text-3 dark:text-ink-text-3">
                  Live address
                </div>
                <div className="mt-1 max-w-[280px] truncate font-mono text-[12.5px] text-paper-text-1 dark:text-ink-text-1">
                  {displayUrl}
                </div>
              </div>
            </div>
          </Card>

          <Section title="App identity">
            <Card>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldRow
                  label="App title"
                  value={form.name ?? ''}
                  onChange={(value) => update('name', value)}
                  help="This is the first thing customers see in your app."
                />
                <FieldRow
                  label="City"
                  value={form.city ?? ''}
                  onChange={(value) => update('city', value)}
                  placeholder="Dublin"
                />
              </div>

              <div className="mt-4">
                <FieldRow
                  label="One-line promise"
                  value={form.tagline ?? ''}
                  onChange={(value) => update('tagline', value)}
                  placeholder="Strength coaching for busy professionals"
                  help="Short, concrete, and customer-facing."
                />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label className="text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
                    Story
                  </label>
                  <span className="text-[11px] tabular-nums text-paper-text-3 dark:text-ink-text-3">
                    {description.length}/{DESCRIPTION_MAX}
                  </span>
                </div>
                <textarea
                  value={description}
                  maxLength={DESCRIPTION_MAX}
                  rows={5}
                  onChange={(e) => update('about_long', e.target.value.slice(0, DESCRIPTION_MAX))}
                  placeholder="Tell customers what makes the experience different..."
                  className="w-full resize-none rounded-md border border-paper-border bg-paper-surface px-3 py-2.5 text-[13px] leading-relaxed text-paper-text-1 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25 dark:border-ink-border dark:bg-ink-surface dark:text-ink-text-1"
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
                  <Palette size={13} />
                  App colour
                </div>
                <div className="flex flex-wrap gap-2">
                  {TILE_PALETTE.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      aria-label={c.name}
                      aria-pressed={colour === c.slug}
                      title={c.name}
                      onClick={() => update('primary_colour', c.slug)}
                      className={cn(
                        'h-9 w-9 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper-bg dark:focus-visible:ring-offset-ink-bg',
                        colour === c.slug ? 'scale-105 ring-2 ring-gold ring-offset-2 ring-offset-paper-bg dark:ring-offset-ink-bg' : 'hover:scale-105',
                      )}
                      style={{
                        background: `linear-gradient(135deg, ${c.light} 0%, ${c.mid} 48%, ${c.dark} 100%)`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <PresetGroup
                  title="Hero style"
                  options={[
                    { value: 'cinematic', label: 'Cinematic', description: 'Photo-led and dramatic' },
                    { value: 'clean', label: 'Clean', description: 'Brighter and calmer' },
                    { value: 'logo-led', label: 'Logo-led', description: 'Best with weak photos' },
                    { value: 'gallery-first', label: 'Gallery-first', description: 'Show visual proof early' },
                  ]}
                  value={appConfig.heroStyle}
                  onChange={(heroStyle) => updateAppConfig({ heroStyle: heroStyle as HeroStyle })}
                />
                <LogoStudio
                  rawLogo={form.logo_url}
                  processedIcon={form.processed_icon_url}
                  businessName={form.name}
                  appIconStyle={appConfig.appIconStyle}
                  uploading={logoUploading}
                  onUpload={() => logoInputRef.current?.click()}
                  onStyleChange={changeAppIconStyle}
                />
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void uploadLogo(file);
                  }}
                />
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
                    Main button
                  </label>
                  <select
                    value={appConfig.ctaLabel}
                    onChange={(e) => updateAppConfig({ ctaLabel: e.target.value })}
                    className="h-9 w-full rounded-md border border-paper-border bg-paper-surface px-3 text-[13px] text-paper-text-1 outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 dark:border-ink-border dark:bg-ink-surface dark:text-ink-text-1"
                  >
                    {CTA_LABELS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
                    Safe wording only, so conversion stays protected.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
                    Featured service
                  </label>
                  <select
                    value={appConfig.featuredServiceId ?? ''}
                    onChange={(e) =>
                      updateAppConfig({ featuredServiceId: e.target.value || null })
                    }
                    className="h-9 w-full rounded-md border border-paper-border bg-paper-surface px-3 text-[13px] text-paper-text-1 outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 dark:border-ink-border dark:bg-ink-surface dark:text-ink-text-1"
                  >
                    <option value="">Auto-pick first active service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
                    Pins the hero CTA to the service they most want to sell.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
                  Sections
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ToggleRow
                    label="Gallery"
                    checked={appConfig.sections.gallery}
                    onChange={() => updateSections({ gallery: !appConfig.sections.gallery })}
                  />
                  <ToggleRow
                    label="About"
                    checked={appConfig.sections.about}
                    onChange={() => updateSections({ about: !appConfig.sections.about })}
                  />
                  <ToggleRow
                    label="Opening hours"
                    checked={appConfig.sections.hours}
                    onChange={() => updateSections({ hours: !appConfig.sections.hours })}
                  />
                  <ToggleRow
                    label="Contact"
                    checked={appConfig.sections.contact}
                    onChange={() => updateSections({ contact: !appConfig.sections.contact })}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                {status === 'error' && error && (
                  <p className="mr-auto text-[12px] text-red-500 dark:text-red-400">{error}</p>
                )}
                {status === 'saved' && !dirty && (
                  <p className="mr-auto text-[12px] text-paper-text-3 dark:text-ink-text-3">
                    Saved to your app.
                  </p>
                )}
                <Button
                  variant="primary"
                  icon={isPending ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />}
                  onClick={save}
                  disabled={!dirty || isPending}
                >
                  {isPending ? 'Saving...' : 'Save identity'}
                </Button>
              </div>
            </Card>
          </Section>

          <Section title="Hero image">
            <Card>
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
                <div>
                  <h3 className="text-[15px] font-semibold text-paper-text-1 dark:text-ink-text-1">
                    First impression image
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-paper-text-2 dark:text-ink-text-2">
                    Best for atmosphere, space, team, or product. We smart-crop to a cinematic
                    vertical-safe frame and add overlays in the app so text remains readable.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      icon={uploading === 'hero' ? <Loader2 className="animate-spin" size={13} /> : <Upload size={13} />}
                      onClick={() => heroInputRef.current?.click()}
                      disabled={uploading !== null}
                    >
                      {heroSrc ? 'Replace hero' : 'Upload hero'}
                    </Button>
                    {form.hero_image_url && (
                      <Button
                        variant="ghost"
                        icon={deleting === 'hero' ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
                        onClick={() => deleteImage('hero')}
                        disabled={deleting !== null}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void uploadImage('hero', file);
                    }}
                  />
                </div>
                <ImagePreview src={heroSrc} label="Hero preview" ratio="wide" />
              </div>
              {heroSrc && (
                <div className="mt-5">
                  <FocalPointPicker
                    src={heroSrc}
                    focalPoint={appConfig.heroFocalPoint}
                    onChange={(heroFocalPoint) => updateAppConfig({ heroFocalPoint })}
                  />
                </div>
              )}
            </Card>
          </Section>

          <Section title="App readiness">
            <Card>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-paper-text-1 dark:text-ink-text-1">
                    Quality score
                  </h3>
                  <p className="mt-1 text-[13px] text-paper-text-2 dark:text-ink-text-2">
                    Private checklist to keep every customer app polished before sharing.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[28px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1">
                    {readiness.score}%
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.5px] text-paper-text-3 dark:text-ink-text-3">
                    Ready
                  </div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {readiness.items.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px]',
                      item.done
                        ? 'border-gold-border bg-gold-soft text-paper-text-1 dark:text-ink-text-1'
                        : 'border-paper-border bg-paper-surface2 text-paper-text-3 dark:border-ink-border dark:bg-ink-surface2 dark:text-ink-text-3',
                    )}
                  >
                    <Check size={13} className={item.done ? 'text-gold' : 'opacity-35'} />
                    {item.label}
                  </div>
                ))}
              </div>
            </Card>
          </Section>

          <Section title="Gallery">
            <Card>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-paper-text-1 dark:text-ink-text-1">
                    Proof of experience
                  </h3>
                  <p className="mt-1 text-[13px] text-paper-text-2 dark:text-ink-text-2">
                    Add up to {GALLERY_LIMIT} images. Each one is cropped square and sharpened for the app gallery.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  icon={uploading === 'gallery' ? <Loader2 className="animate-spin" size={13} /> : <ImagePlus size={13} />}
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploading !== null || form.gallery_urls.length >= GALLERY_LIMIT}
                >
                  Add image
                </Button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void uploadImage('gallery', file);
                  }}
                />
              </div>

              {form.gallery_urls.length === 0 ? (
                <div className="rounded-xl border border-dashed border-paper-borderStrong bg-paper-surface px-5 py-8 text-center dark:border-ink-borderStrong dark:bg-ink-surface">
                  <ImagePlus className="mx-auto mb-3 h-6 w-6 text-paper-text-3 dark:text-ink-text-3" />
                  <p className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1">
                    No gallery images yet
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-[12.5px] text-paper-text-3 dark:text-ink-text-3">
                    Add interiors, customer results, products, team moments, or anything that helps a
                    customer feel the business before booking.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {form.gallery_urls.map((src, index) => (
                    <div key={src} className="group relative overflow-hidden rounded-xl border border-paper-border bg-paper-surface dark:border-ink-border dark:bg-ink-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="aspect-square w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => deleteImage('gallery', index)}
                        disabled={deleting !== null}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-100 backdrop-blur transition hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label="Remove gallery image"
                      >
                        {deleting === `gallery-${index}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-paper-text-3 dark:text-ink-text-3">
              <Smartphone size={13} />
              Preview
            </div>
            <div className="flex rounded-lg border border-paper-border bg-paper-surface p-0.5 dark:border-ink-border dark:bg-ink-surface">
              {(['iphone', 'android'] as const).map((device) => (
                <button
                  key={device}
                  type="button"
                  onClick={() => setPreviewDevice(device)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                    previewDevice === device
                      ? 'bg-gold text-black'
                      : 'text-paper-text-3 hover:text-paper-text-1 dark:text-ink-text-3 dark:hover:text-ink-text-1',
                  )}
                >
                  {device === 'iphone' ? 'iPhone' : 'Android'}
                </button>
              ))}
            </div>
          </div>
          <LiveAppPreview
            src={livePreviewSrc}
            previewDevice={previewDevice}
          />
          {dirty && (
            <p className="mt-3 rounded-xl border border-gold-border bg-gold-soft px-3 py-2 text-[11.5px] leading-snug text-paper-text-2 dark:text-ink-text-2">
              Save changes to refresh the live app preview.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3">
        {title}
      </div>
      {children}
    </section>
  );
}

function ImagePreview({
  src,
  label,
  ratio,
}: {
  src: string | null;
  label: string;
  ratio: 'wide' | 'square';
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-xl border border-paper-border bg-paper-surface2 dark:border-ink-border dark:bg-ink-surface2',
        ratio === 'wide' ? 'aspect-[16/10]' : 'aspect-square',
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="text-center">
          <ImagePlus className="mx-auto mb-2 h-6 w-6 text-paper-text-3 dark:text-ink-text-3" />
          <p className="text-[12px] text-paper-text-3 dark:text-ink-text-3">{label}</p>
        </div>
      )}
    </div>
  );
}

function PresetGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ value: string; label: string; description: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
        {title}
      </div>
      <div className="grid gap-2">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left transition',
                active
                  ? 'border-gold-border bg-gold-soft'
                  : 'border-paper-border bg-paper-surface hover:bg-paper-surface2 dark:border-ink-border dark:bg-ink-surface dark:hover:bg-ink-surface2',
              )}
            >
              <div className="text-[12.5px] font-semibold text-paper-text-1 dark:text-ink-text-1">
                {option.label}
              </div>
              <div className="mt-0.5 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LogoStudio({
  rawLogo,
  processedIcon,
  businessName,
  appIconStyle,
  uploading,
  onUpload,
  onStyleChange,
}: {
  rawLogo: string | null;
  processedIcon: string | null;
  businessName: string;
  appIconStyle: AppIconStyle;
  uploading: boolean;
  onUpload: () => void;
  onStyleChange: (style: AppIconStyle) => void;
}) {
  const initial = businessName.trim().charAt(0).toUpperCase() || 'O';
  const styles: Array<{ value: AppIconStyle; label: string }> = [
    { value: 'glossy', label: 'Auto' },
    { value: 'gold', label: 'Gold' },
    { value: 'dark-glass', label: 'Black' },
    { value: 'flat', label: 'White' },
  ];

  return (
    <div>
      <div className="mb-2 text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
        Logo and app tile
      </div>
      <div className="rounded-xl border border-paper-border bg-paper-surface p-4 dark:border-ink-border dark:bg-ink-surface">
        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-4">
          <div>
            <div className="flex flex-wrap gap-1.5">
              {styles.map((style) => {
                const active = appIconStyle === style.value;
                return (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => onStyleChange(style.value)}
                    disabled={uploading}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition',
                      active
                        ? 'border-gold-border bg-gold-soft text-paper-text-1 dark:text-ink-text-1'
                        : 'border-paper-border bg-paper-surface2 text-paper-text-3 hover:text-paper-text-1 dark:border-ink-border dark:bg-ink-surface2 dark:text-ink-text-3 dark:hover:text-ink-text-1',
                    )}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px] leading-snug text-paper-text-3 dark:text-ink-text-3">
              Upload any logo. OpenBook trims it, improves contrast, and turns it into an app-style tile.
            </p>
            <Button
              className="mt-3"
              variant="secondary"
              icon={uploading ? <Loader2 className="animate-spin" size={13} /> : <Upload size={13} />}
              onClick={onUpload}
              disabled={uploading}
            >
              {processedIcon ? 'Replace logo' : 'Upload logo'}
            </Button>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-24 w-24 overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-[0_16px_34px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.18)]">
              {processedIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={processedIcon} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F8DE83] via-[#D4AF37] to-[#8A641D] font-serif text-[42px] text-black">
                  {initial}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gold">
              App tile
            </span>
          </div>
        </div>
        {rawLogo && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-paper-border bg-paper-bg/60 p-3 dark:border-ink-border dark:bg-ink-bg/40">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rawLogo} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-paper-text-1 dark:text-ink-text-1">
                Source logo
              </p>
              <p className="mt-0.5 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
                Preserved separately from the generated app tile.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex items-center justify-between rounded-lg border border-paper-border bg-paper-surface px-3 py-2 text-left text-[13px] text-paper-text-1 transition hover:bg-paper-surface2 dark:border-ink-border dark:bg-ink-surface dark:text-ink-text-1 dark:hover:bg-ink-surface2"
    >
      {label}
      <span
        className={cn(
          'relative h-5 w-9 rounded-full transition',
          checked ? 'bg-gold' : 'bg-paper-surface3 dark:bg-ink-surface3',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

function FocalPointPicker({
  src,
  focalPoint,
  onChange,
}: {
  src: string;
  focalPoint: { x: number; y: number };
  onChange: (point: { x: number; y: number }) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
          Image focus
        </div>
        <div className="text-[11px] text-paper-text-3 dark:text-ink-text-3">
          Click the important part
        </div>
      </div>
      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onChange({
            x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
            y: Math.round(((event.clientY - rect.top) / rect.height) * 100),
          });
        }}
        className="relative block aspect-[16/7] w-full overflow-hidden rounded-xl border border-paper-border bg-paper-surface2 dark:border-ink-border dark:bg-ink-surface2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }}
        />
        <span
          className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-black/45 shadow-[0_0_0_999px_rgba(0,0,0,0.08)] backdrop-blur"
          style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
        >
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      </button>
    </div>
  );
}

function LiveAppPreview({
  src,
  previewDevice,
}: {
  src: string;
  previewDevice: PreviewDevice;
}) {
  const size =
    previewDevice === 'android'
      ? { width: 360, height: 720, radius: 30 }
      : { width: 390, height: 844, radius: 44 };

  return (
    <div
      className="mx-auto border border-paper-borderStrong bg-paper-surface p-3 shadow-card-light dark:border-ink-borderStrong dark:bg-ink-surface dark:shadow-card-dark"
      style={{
        width: size.width,
        maxWidth: '100%',
        borderRadius: size.radius + 10,
      }}
    >
      <div
        className="relative overflow-hidden bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]"
        style={{
          height: size.height,
          maxHeight: 'calc(100dvh - 190px)',
          borderRadius: size.radius,
        }}
      >
        <iframe
          key={src}
          src={src}
          title="Live customer app preview"
          className="h-full w-full border-0 bg-black"
        />
      </div>
    </div>
  );
}

function iconStyleToLogoBackground(style: AppIconStyle, colour: TileColourSlug): string {
  if (style === 'dark-glass') return 'black';
  if (style === 'flat') return 'white';
  if (style === 'gold') return 'primary';
  return colour === 'gold' ? 'auto' : 'primary';
}

function getReadiness(input: {
  name: string;
  tagline: string | null;
  description: string;
  heroSrc: string | null;
  logoSrc: string | null;
  galleryCount: number;
  servicesCount: number;
  featuredServiceId: string | null;
}) {
  const items = [
    { label: 'App title added', done: input.name.trim().length > 1 },
    { label: 'Hero image uploaded', done: Boolean(input.heroSrc) },
    { label: 'Logo or app icon ready', done: Boolean(input.logoSrc) },
    { label: 'Clear one-line promise', done: Boolean(input.tagline && input.tagline.length <= 110) },
    { label: 'Story added', done: input.description.trim().length >= 80 },
    { label: 'At least two services live', done: input.servicesCount >= 2 },
    { label: 'Gallery has three images', done: input.galleryCount >= 3 },
    { label: 'Featured service chosen', done: Boolean(input.featuredServiceId) },
  ];
  const score = Math.round((items.filter((item) => item.done).length / items.length) * 100);
  return { score, items };
}
