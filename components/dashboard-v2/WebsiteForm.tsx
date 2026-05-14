'use client';

import { useRef, useState, useTransition } from 'react';
import {
  Check,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Card } from './Card';
import { Button } from './Button';
import { TopBar } from './TopBar';
import { FieldRow } from './FieldRow';
import {
  saveWebsiteSettings,
  type TestimonialEntry,
  type WebsitePayload,
} from '@/app/(dashboard)/dashboard/website/actions';
import { cn } from '@/lib/utils';

const HEADLINE_MAX = 80;
const TAGLINE_MAX = 140;
const ABOUT_MAX = 4000;
const QUOTE_MAX = 200;
const TESTIMONIAL_MAX = 6;
const GALLERY_MAX = 8;

export interface WebsiteInitial {
  id: string;
  slug: string;
  name: string;
  website_is_published: boolean | null;
  website_headline: string | null;
  tagline: string | null;
  about_long: string | null;
  hero_image_url: string | null;
  gallery_urls: string[] | null;
  testimonials: TestimonialEntry[] | null;
  instagram_access_token: string | null;
}

interface WebsiteFormProps {
  initial: WebsiteInitial;
}

interface FormState {
  website_is_published: boolean;
  website_headline: string;
  tagline: string;
  about_long: string;
  hero_image_url: string | null;
  gallery_urls: string[];
  testimonials: TestimonialEntry[];
}

function initFromProps(initial: WebsiteInitial): FormState {
  return {
    website_is_published: Boolean(initial.website_is_published),
    website_headline: initial.website_headline ?? '',
    tagline: initial.tagline ?? '',
    about_long: initial.about_long ?? '',
    hero_image_url: initial.hero_image_url ?? null,
    gallery_urls: initial.gallery_urls ?? [],
    testimonials: initial.testimonials ?? [],
  };
}

export function WebsiteForm({ initial }: WebsiteFormProps) {
  const [form, setForm] = useState<FormState>(() => initFromProps(initial));
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);
  const wasPublished = useRef(Boolean(initial.website_is_published));

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setStatus('idle');
  };

  const reset = () => {
    setForm(initFromProps(initial));
    setDirty(false);
    setStatus('idle');
    setJustPublished(false);
  };

  const onSave = () => {
    setStatus('idle');
    setErrorMsg(null);
    startTransition(async () => {
      const payload: WebsitePayload = {
        website_is_published: form.website_is_published,
        website_headline: form.website_headline,
        tagline: form.tagline,
        about_long: form.about_long,
        gallery_urls: form.gallery_urls,
        testimonials: form.testimonials,
      };
      const res = await saveWebsiteSettings(payload);
      if (res.ok) {
        setStatus('saved');
        setDirty(false);
        if (form.website_is_published && !wasPublished.current) {
          setJustPublished(true);
          wasPublished.current = true;
        } else if (!form.website_is_published) {
          wasPublished.current = false;
          setJustPublished(false);
        }
      } else {
        setStatus('error');
        setErrorMsg(res.error);
      }
    });
  };

  const websiteUrl = `https://${initial.slug}.openbook.ie`;

  return (
    <>
      <TopBar
        title="Website"
        subtitle="Your customer-facing marketing site"
        actions={
          <>
            {dirty && (
              <Button
                variant="ghost"
                size="md"
                icon={<RotateCcw size={13} strokeWidth={2} />}
                onClick={reset}
                disabled={isPending}
              >
                Reset
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              icon={status === 'saved' ? <Check size={13} strokeWidth={2.5} /> : undefined}
              onClick={onSave}
              disabled={!dirty || isPending}
            >
              {isPending ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save changes'}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-3xl px-8 py-8 space-y-10">
        <PublishSection
          slug={initial.slug}
          isPublished={form.website_is_published}
          onToggle={(v) => update('website_is_published', v)}
          justPublished={justPublished}
          websiteUrl={websiteUrl}
        />

        <Section title="Hero photo">
          <Card>
            <HeroUploader
              businessId={initial.id}
              heroUrl={form.hero_image_url}
              onChange={(url) => update('hero_image_url', url)}
            />
          </Card>
        </Section>

        <Section title="Headline">
          <Card>
            <CountedTextInput
              label="Website headline"
              value={form.website_headline}
              max={HEADLINE_MAX}
              onChange={(v) => update('website_headline', v)}
              placeholder="Cork's most demanding personal training studio."
              help="Your hero line. If left blank, your business name is used."
            />
          </Card>
        </Section>

        <Section title="Tagline">
          <Card>
            <CountedTextInput
              label="Tagline"
              value={form.tagline}
              max={TAGLINE_MAX}
              onChange={(v) => update('tagline', v)}
              placeholder="One supporting line below the headline."
              help="Also shown on your business card in the app."
            />
          </Card>
        </Section>

        <Section title="About">
          <Card>
            <AboutEditor
              value={form.about_long}
              onChange={(v) => update('about_long', v)}
            />
          </Card>
        </Section>

        <Section title="Gallery">
          <Card>
            <GalleryEditor
              businessId={initial.id}
              gallery={form.gallery_urls}
              onChange={(urls) => update('gallery_urls', urls)}
              hasInstagram={Boolean(initial.instagram_access_token)}
            />
          </Card>
        </Section>

        <Section title="Testimonials">
          <Card>
            <TestimonialsEditor
              testimonials={form.testimonials}
              onChange={(t) => update('testimonials', t)}
            />
          </Card>
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`${websiteUrl}?preview=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface text-paper-text-1 dark:text-ink-text-1 text-[13px] font-medium hover:bg-paper-surface2 dark:hover:bg-ink-surface2 transition-colors"
          >
            <ExternalLink size={13} strokeWidth={2} />
            Preview website
          </a>
          <p className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
            Opens {initial.slug}.openbook.ie?preview=true in a new tab.
          </p>
        </div>

        {status === 'error' && errorMsg && (
          <p className="text-[12px] text-red-500 dark:text-red-400">
            Couldn't save: {errorMsg}
          </p>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-3">
        {title}
      </div>
      {children}
    </section>
  );
}

function PublishSection({
  slug,
  isPublished,
  onToggle,
  justPublished,
  websiteUrl,
}: {
  slug: string;
  isPublished: boolean;
  onToggle: (v: boolean) => void;
  justPublished: boolean;
  websiteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Section title="Publish">
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-paper-surface2 dark:bg-ink-surface2 border-paper-border dark:border-ink-border text-paper-text-2 dark:text-ink-text-2">
            <Globe size={15} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-paper-text-1 dark:text-ink-text-1">
              Publish website
            </div>
            <div className="mt-0.5 text-[12px] text-paper-text-3 dark:text-ink-text-3 leading-[1.4]">
              When off, your website returns a 404 to visitors.
            </div>
            <div className="mt-1 text-[11.5px] font-mono text-paper-text-2 dark:text-ink-text-2 truncate">
              {slug}.openbook.ie
            </div>
          </div>
          <Switch
            checked={isPublished}
            onChange={() => onToggle(!isPublished)}
            label="Publish website"
          />
        </div>

        {justPublished && (
          <div className="mt-4 rounded-md border border-gold-border bg-gold-soft px-4 py-3">
            <div className="text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1">
              Your website is live at {slug}.openbook.ie
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-paper-surface dark:bg-ink-surface px-2 py-1 text-[12px]">
                {websiteUrl}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(websiteUrl);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* clipboard rejected — surface nothing, user can copy manually */
                  }
                }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </Section>
  );
}

function CountedTextInput({
  label,
  value,
  max,
  onChange,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: string;
}) {
  const remaining = max - value.length;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
          {label}
        </label>
        <span
          className={cn(
            'text-[11px] tabular-nums',
            remaining < 0
              ? 'text-red-500 dark:text-red-400'
              : 'text-paper-text-3 dark:text-ink-text-3',
          )}
        >
          {value.length}/{max}
        </span>
      </div>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md border',
          'bg-paper-surface dark:bg-ink-surface',
          'border-paper-border dark:border-ink-border',
          'focus-within:ring-2 focus-within:ring-gold focus-within:border-gold',
        )}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, max))}
          maxLength={max}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13px] outline-none text-paper-text-1 dark:text-ink-text-1 placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3"
        />
      </div>
      {help && (
        <p className="mt-1.5 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">{help}</p>
      )}
    </div>
  );
}

function AboutEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const remaining = ABOUT_MAX - value.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <label className="block text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
          About
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2 hover:text-paper-text-1 dark:hover:text-ink-text-1"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <span
            className={cn(
              'text-[11px] tabular-nums',
              remaining < 0
                ? 'text-red-500 dark:text-red-400'
                : 'text-paper-text-3 dark:text-ink-text-3',
            )}
          >
            {value.length}/{ABOUT_MAX}
          </span>
        </div>
      </div>

      {showPreview ? (
        <div
          className="min-h-[200px] px-3 py-2.5 rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface text-[13.5px] leading-relaxed text-paper-text-1 dark:text-ink-text-1"
          data-testid="about-preview"
        >
          {value.trim() ? (
            <div className="prose-website">
              <Markdown rehypePlugins={[rehypeSanitize]}>{value}</Markdown>
            </div>
          ) : (
            <span className="text-paper-text-3 dark:text-ink-text-3">Nothing to preview.</span>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex items-start gap-2 px-3 py-2.5 rounded-md border',
            'bg-paper-surface dark:bg-ink-surface',
            'border-paper-border dark:border-ink-border',
            'focus-within:ring-2 focus-within:ring-gold focus-within:border-gold',
          )}
        >
          <textarea
            rows={8}
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, ABOUT_MAX))}
            maxLength={ABOUT_MAX}
            placeholder={'2–3 short paragraphs. Speak directly to your customer.\n\nMarkdown supported: **bold**, _italic_, [links](https://example.com).'}
            className="flex-1 bg-transparent text-[13px] leading-relaxed outline-none resize-vertical text-paper-text-1 dark:text-ink-text-1 placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3"
          />
        </div>
      )}

      <p className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
        2–3 short paragraphs. Speak directly to your customer. Basic markdown
        (bold, italic, links, lists) supported.
      </p>

      <style jsx global>{`
        .prose-website p { margin: 0 0 0.75em; }
        .prose-website p:last-child { margin-bottom: 0; }
        .prose-website strong { font-weight: 600; }
        .prose-website ul, .prose-website ol { margin: 0 0 0.75em 1.2em; }
        .prose-website a { color: #D4AF37; text-decoration: underline; }
      `}</style>
    </div>
  );
}

function HeroUploader({
  businessId,
  heroUrl,
  onChange,
}: {
  businessId: string;
  heroUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image (JPG or PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.');
      return;
    }

    const dimsOk = await checkMinDimensions(file, 1200);
    if (!dimsOk) {
      setError('Image must be at least 1200px wide.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('businessId', businessId);
      fd.append('kind', 'hero');
      fd.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
      onChange(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    setError(null);
    setUploading(true);
    try {
      const params = new URLSearchParams({ businessId, kind: 'hero' });
      const res = await fetch(`/api/upload-image?${params.toString()}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to remove image.');
      }
      onChange(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove image.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {heroUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-paper-border dark:border-ink-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroUrl} alt="Hero preview" className="block w-full aspect-[16/9] object-cover" />
          <button
            type="button"
            onClick={remove}
            disabled={uploading}
            aria-label="Remove hero image"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 hover:bg-black/85 flex items-center justify-center text-white"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) upload(f);
          }}
          className="cursor-pointer flex flex-col items-center justify-center gap-2 aspect-[16/9] rounded-lg border border-dashed border-paper-borderStrong dark:border-ink-borderStrong bg-paper-surface dark:bg-ink-surface hover:bg-paper-surface2 dark:hover:bg-ink-surface2 transition-colors"
        >
          <ImageIcon size={20} strokeWidth={1.5} className="text-paper-text-3 dark:text-ink-text-3" />
          <span className="text-[13px] font-medium text-paper-text-2 dark:text-ink-text-2">
            {uploading ? 'Uploading…' : 'Drop your hero image'}
          </span>
          <span className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
            JPG or PNG · at least 1200px wide · max 5MB
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) upload(f);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<Upload size={12} strokeWidth={2} />}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {heroUrl ? 'Replace' : 'Upload'}
        </Button>
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 text-[11.5px] text-red-500 dark:text-red-400"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                inputRef.current?.click();
              }}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryEditor({
  businessId,
  gallery,
  onChange,
  hasInstagram,
}: {
  businessId: string;
  gallery: string[];
  onChange: (urls: string[]) => void;
  hasInstagram: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const full = gallery.length >= GALLERY_MAX;

  async function uploadFiles(files: FileList) {
    setError(null);
    const remaining = GALLERY_MAX - gallery.length;
    const queue = Array.from(files).slice(0, remaining);
    if (queue.length === 0) return;

    setUploading(true);
    const next = [...gallery];
    for (const file of queue) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are supported.');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Skipped a file over 5MB.');
        continue;
      }
      try {
        const fd = new FormData();
        fd.append('businessId', businessId);
        fd.append('kind', 'gallery');
        fd.append('file', file);
        const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
        next.push(data.url as string);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        break;
      }
    }
    setUploading(false);
    onChange(next.slice(0, GALLERY_MAX));
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= gallery.length) return;
    const next = [...gallery];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  }

  function remove(index: number) {
    const next = gallery.filter((_, i) => i !== index);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
          Photos ({gallery.length}/{GALLERY_MAX})
        </span>
        {hasInstagram && (
          <span className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
            Instagram pull coming soon
          </span>
        )}
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}
      >
        {gallery.map((url, i) => (
          <div
            key={url}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              'relative aspect-square rounded-md overflow-hidden border bg-paper-surface2 dark:bg-ink-surface2 border-paper-border dark:border-ink-border group cursor-move',
              dragIndex === i && 'opacity-50',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="block w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 hover:bg-black/85 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X size={12} strokeWidth={2.2} />
            </button>
          </div>
        ))}

        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
            }}
            disabled={uploading}
            className="aspect-square rounded-md border border-dashed border-paper-borderStrong dark:border-ink-borderStrong bg-paper-surface dark:bg-ink-surface hover:bg-paper-surface2 dark:hover:bg-ink-surface2 flex flex-col items-center justify-center gap-1 transition-colors"
          >
            <Plus size={16} strokeWidth={2} className="text-paper-text-3 dark:text-ink-text-3" />
            <span className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
              {uploading ? 'Uploading…' : 'Add'}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <p className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
        Up to {GALLERY_MAX} photos. Drag to reorder. JPG or PNG, max 5MB each.
      </p>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 text-[11.5px] text-red-500 dark:text-red-400"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              inputRef.current?.click();
            }}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function TestimonialsEditor({
  testimonials,
  onChange,
}: {
  testimonials: TestimonialEntry[];
  onChange: (next: TestimonialEntry[]) => void;
}) {
  function update(index: number, patch: Partial<TestimonialEntry>) {
    const next = testimonials.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(next);
  }
  function add() {
    if (testimonials.length >= TESTIMONIAL_MAX) return;
    onChange([...testimonials, { quote: '', author: '', role: '' }]);
  }
  function remove(index: number) {
    onChange(testimonials.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      {testimonials.map((t, i) => (
        <div
          key={i}
          className="rounded-md border border-paper-border dark:border-ink-border p-3 bg-paper-surface dark:bg-ink-surface"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3">
              Testimonial {i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove testimonial"
              className="h-7 w-7 rounded-md flex items-center justify-center text-paper-text-3 dark:text-ink-text-3 hover:text-red-500 dark:hover:text-red-400 hover:bg-paper-surface2 dark:hover:bg-ink-surface2"
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <CountedTextInput
              label="Quote"
              value={t.quote}
              max={QUOTE_MAX}
              onChange={(v) => update(i, { quote: v })}
              placeholder="“Genuinely the best PT I've ever worked with.”"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRow
                label="Author"
                value={t.author}
                onChange={(v) => update(i, { author: v })}
                placeholder="Aoife M."
              />
              <FieldRow
                label="Role or business (optional)"
                value={t.role ?? ''}
                onChange={(v) => update(i, { role: v })}
                placeholder="Member since 2024"
              />
            </div>
          </div>
        </div>
      ))}

      {testimonials.length < TESTIMONIAL_MAX ? (
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus size={13} strokeWidth={2} />}
          onClick={add}
        >
          Add testimonial
        </Button>
      ) : (
        <p className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
          Up to {TESTIMONIAL_MAX} testimonials.
        </p>
      )}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
        'focus-visible:ring-offset-paper-bg dark:focus-visible:ring-offset-ink-bg',
        checked
          ? 'bg-gold'
          : 'bg-paper-surface3 dark:bg-ink-surface3 border border-paper-border dark:border-ink-border',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all',
          checked ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

async function checkMinDimensions(file: File, minWidth: number): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.naturalWidth >= minWidth);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Couldn't measure — let the upload proceed and surface a clearer
      // server error rather than blocking on a measurement failure.
      resolve(true);
    };
    img.src = url;
  });
}
