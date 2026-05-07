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
  Sparkles,
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
  TILE_PALETTE_MAP,
  type TileColourSlug,
  getTileColour,
  isValidTileColour,
} from '@/lib/tile-palette';
import { cn } from '@/lib/utils';
import { publicBusinessDisplayUrl, publicBusinessUrl } from '@/lib/public-url';

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
}

export function MyAppClient({ initial }: { initial: MyAppInitial }) {
  const [form, setForm] = useState(() => ({
    ...initial,
    gallery_urls: initial.gallery_urls ?? [],
  }));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'hero' | 'gallery' | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const colour: TileColourSlug = isValidTileColour(form.primary_colour)
    ? form.primary_colour
    : DEFAULT_TILE_COLOUR;
  const palette = getTileColour(colour);
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
  const description = form.about_long ?? '';

  const update = <K extends keyof MyAppInitial>(key: K, value: MyAppInitial[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
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
      });
      if (res.ok) {
        setDirty(false);
        setStatus('saved');
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
          <AppPreview
            name={form.name}
            tagline={form.tagline}
            city={form.city}
            category={form.category}
            heroSrc={heroSrc}
            logoSrc={logoSrc}
            gallery={form.gallery_urls}
            palette={palette}
          />
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

function AppPreview({
  name,
  tagline,
  city,
  category,
  heroSrc,
  logoSrc,
  gallery,
  palette,
}: {
  name: string;
  tagline: string | null;
  city: string | null;
  category: string | null;
  heroSrc: string | null;
  logoSrc: string | null;
  gallery: string[];
  palette: (typeof TILE_PALETTE_MAP)[TileColourSlug];
}) {
  return (
    <div className="rounded-[34px] border border-paper-borderStrong bg-paper-surface p-3 shadow-card-light dark:border-ink-borderStrong dark:bg-ink-surface dark:shadow-card-dark">
      <div className="overflow-hidden rounded-[28px] bg-black text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="relative min-h-[620px]">
          <div className="relative h-[330px] overflow-hidden">
            {heroSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `radial-gradient(circle at 50% 28%, ${palette.mid}88, transparent 38%), linear-gradient(150deg, #171717 0%, #050505 100%)`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.30)_48%,rgba(0,0,0,0.96)_100%)]" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="mb-3 flex items-end gap-3">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 text-[30px] font-bold shadow-[0_16px_38px_rgba(0,0,0,0.45)]"
                  style={{
                    background: `linear-gradient(135deg, ${palette.light}, ${palette.mid} 52%, ${palette.dark})`,
                    color: '#111',
                  }}
                >
                  {logoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58">
                    Private booking app
                  </div>
                  <div className="mt-1 truncate text-[12px] text-white/70">
                    {[category, city].filter(Boolean).join(' · ') || 'Book direct'}
                  </div>
                </div>
              </div>
              <h3 className="font-serif text-[34px] font-semibold leading-[0.95] tracking-tight">
                {name || 'Your business'}
              </h3>
              {tagline && <p className="mt-2 text-[13px] leading-snug text-white/78">{tagline}</p>}
            </div>
          </div>

          <div className="space-y-5 px-5 py-6">
            <div className="grid grid-cols-3 gap-2">
              {['Style', 'From', 'Time'].map((label, i) => (
                <div key={label} className="rounded-2xl bg-white/[0.075] px-3 py-3 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/38">
                    {label}
                  </div>
                  <div className="mt-1 truncate text-[12px] font-semibold" style={{ color: palette.mid }}>
                    {i === 0 ? category || 'Service' : i === 1 ? 'Free' : '1h'}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  Gallery
                </div>
                <Sparkles className="h-4 w-4" style={{ color: palette.mid }} />
              </div>
              {gallery.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {gallery.slice(0, 3).map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" className="aspect-square rounded-xl object-cover" />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-[12px] text-white/42">
                  Gallery images will appear here.
                </div>
              )}
            </div>

            <div className="rounded-full px-5 py-3 text-center text-[13px] font-semibold text-black" style={{ background: `linear-gradient(180deg, ${palette.light}, ${palette.mid})` }}>
              Book from Free
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
