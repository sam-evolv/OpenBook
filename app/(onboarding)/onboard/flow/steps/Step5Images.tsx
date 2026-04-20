'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { StepHeader, NextButton, SkipLink } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

const GALLERY_LIMIT = 6;

export function Step5Images({ state, update, next }: StepProps) {
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function ensureBusinessId(): Promise<string | null> {
    if (state.businessId) return state.businessId;
    const res = await fetch('/api/onboarding/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, step: 4 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.businessId) {
      update({ businessId: data.businessId, slug: data.slug ?? state.slug });
      return data.businessId;
    }
    return null;
  }

  async function uploadImage(file: File, kind: 'hero' | 'gallery') {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    const maxSize = kind === 'hero' ? 8 : 5;
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File too large. Max ${maxSize}MB.`);
      return;
    }

    setError(null);
    if (kind === 'hero') setUploadingHero(true);
    else setUploadingGallery(true);

    const businessId = await ensureBusinessId();
    if (!businessId) {
      setError('Complete Step 1 first.');
      if (kind === 'hero') setUploadingHero(false);
      else setUploadingGallery(false);
      return;
    }

    const formData = new FormData();
    formData.append('businessId', businessId);
    formData.append('kind', kind);
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');

      if (kind === 'hero') {
        update({ hero_image_url: data.url });
      } else {
        update({ gallery_urls: [...(state.gallery_urls ?? []), data.url] });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed');
    } finally {
      if (kind === 'hero') setUploadingHero(false);
      else setUploadingGallery(false);
    }
  }

  async function deleteImage(kind: 'hero' | 'gallery', index?: number) {
    if (!state.businessId) return;
    const params = new URLSearchParams({ businessId: state.businessId, kind });
    if (kind === 'gallery' && index !== undefined) params.set('index', String(index));
    try {
      const res = await fetch(`/api/upload-image?${params.toString()}`, {
        method: 'DELETE',
      });
      if (!res.ok) return;
      if (kind === 'hero') update({ hero_image_url: null });
      else if (index !== undefined)
        update({
          gallery_urls: (state.gallery_urls ?? []).filter((_, i) => i !== index),
        });
    } catch {
      /* silent */
    }
  }

  async function handleGalleryFiles(files: FileList) {
    const remaining = GALLERY_LIMIT - (state.gallery_urls ?? []).length;
    const toUpload = Array.from(files).slice(0, remaining);
    for (const file of toUpload) {
      await uploadImage(file, 'gallery');
    }
  }

  const gallery = state.gallery_urls ?? [];
  const galleryFull = gallery.length >= GALLERY_LIMIT;

  return (
    <div className="flex flex-col gap-8 max-w-[560px]">
      <StepHeader
        eyebrow="Step 5 of 9 · Photos"
        title={
          <>
            Show your <br />
            space.
          </>
        }
        subtitle="One hero image at the top of your app, plus up to 6 photos to showcase your business. Interior shots, happy customers, your best work."
      />

      {/* Hero image */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p
            className="text-[11px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: 'var(--label-3)' }}
          >
            Hero image
          </p>
          <span className="text-[11px]" style={{ color: 'var(--label-3)' }}>
            1600×900 ideal
          </span>
        </div>

        {state.hero_image_url ? (
          <div className="relative rounded-2xl overflow-hidden mat-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.hero_image_url}
              alt="Hero"
              className="w-full aspect-[16/9] object-cover"
            />
            <button
              onClick={() => deleteImage('hero')}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center hover:bg-black/90 transition-all"
              aria-label="Remove hero image"
            >
              <X className="h-4 w-4 text-white" strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => heroInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) uploadImage(f, 'hero');
            }}
            className="cursor-pointer rounded-2xl mat-card hover:mat-card-elevated flex flex-col items-center justify-center gap-3 aspect-[16/9] transition-all"
            style={{ borderStyle: 'dashed' }}
          >
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f, 'hero');
              }}
            />
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(ellipse at 30% 20%, #F6D77C 0%, #D4AF37 50%, #7A5418 100%)',
              }}
            >
              {uploadingHero ? (
                <Loader2 className="h-5 w-5 animate-spin text-black/80" />
              ) : (
                <ImageIcon className="h-5 w-5 text-black/80" strokeWidth={2} />
              )}
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold">
                {uploadingHero ? 'Uploading…' : 'Drop your hero image'}
              </p>
              <p className="text-[12px]" style={{ color: 'var(--label-3)' }}>
                The big banner at the top of your app
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gallery */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p
            className="text-[11px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: 'var(--label-3)' }}
          >
            Gallery
          </p>
          <span className="text-[11px]" style={{ color: 'var(--label-3)' }}>
            {gallery.length} / {GALLERY_LIMIT}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {gallery.map((url, i) => (
            <div
              key={url}
              className="relative rounded-xl overflow-hidden mat-card aspect-square group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => deleteImage('gallery', i)}
                className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
              </button>
            </div>
          ))}

          {!galleryFull && (
            <div
              onClick={() => galleryInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length) handleGalleryFiles(e.dataTransfer.files);
              }}
              className="cursor-pointer rounded-xl mat-card hover:mat-card-elevated flex flex-col items-center justify-center gap-2 aspect-square transition-all"
              style={{ borderStyle: 'dashed' }}
            >
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleGalleryFiles(e.target.files);
                }}
              />
              {uploadingGallery ? (
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--brand-gold)' }} />
              ) : (
                <>
                  <Upload className="h-4 w-4" style={{ color: 'var(--brand-gold)' }} strokeWidth={2} />
                  <span className="text-[11px] font-medium" style={{ color: 'var(--label-2)' }}>
                    Add photos
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-center text-[13px] text-red-400 -mt-4">{error}</p>
      )}

      {state.hero_image_url && gallery.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full self-center"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '0.5px solid rgba(16, 185, 129, 0.35)',
          }}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={2.2} />
          <span className="text-[13px] font-medium text-emerald-300">
            Looking great
          </span>
        </div>
      )}

      <div className="mt-2">
        <NextButton onClick={next} />
        <SkipLink
          onClick={next}
          label={
            state.hero_image_url
              ? "Skip \u2014 I'll add more photos later"
              : "Skip \u2014 I'll add photos later"
          }
        />
      </div>
    </div>
  );
}
