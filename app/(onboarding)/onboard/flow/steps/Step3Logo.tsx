'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle2, Loader2, ImageIcon } from 'lucide-react';
import { StepHeader, NextButton, SkipLink } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

export function Step3Logo({ state, update, next }: StepProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    if (!state.businessId) {
      setError('Finish step 1 first.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('businessId', state.businessId);
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');

      update({
        logo_url: data.logoUrl,
        processed_icon_url: data.iconUrl,
        primary_colour: data.detectedColour ?? state.primary_colour,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-[520px]">
      <StepHeader
        eyebrow="Step 3 of 8 · Logo"
        title={
          <>
            Upload your logo.
            <br />
            We'll make it shine.
          </>
        }
        subtitle="Drop any logo — PNG, JPG, SVG. We'll auto-crop it, extract your brand colour, and turn it into a beautiful app icon your customers will recognise."
      />

      {!state.processed_icon_url ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center gap-4 rounded-[28px] py-16 px-8 cursor-pointer transition-all mat-card hover:mat-card-elevated"
          style={{ borderStyle: 'dashed' }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          <div
            className="flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, #F6D77C 0%, #D4AF37 50%, #7A5418 100%)',
              boxShadow: '0 8px 20px rgba(212, 175, 55, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            {uploading ? (
              <Loader2 className="h-7 w-7 animate-spin text-black/80" />
            ) : (
              <Upload className="h-7 w-7 text-black/80" strokeWidth={2} />
            )}
          </div>

          <div className="text-center">
            <p className="text-[17px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
              {uploading ? 'Processing your logo…' : 'Drag your logo here'}
            </p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--label-2)' }}>
              {uploading ? 'Creating your App Store icon' : 'or tap to browse'}
            </p>
          </div>

          <p className="text-[11px]" style={{ color: 'var(--label-3)' }}>
            PNG, JPG, SVG · max 5MB
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-5">
            {/* Before */}
            {state.logo_url && (
              <div className="flex flex-col items-center gap-2">
                <div className="h-[96px] w-[96px] rounded-2xl bg-white/5 p-3 hairline flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={state.logo_url} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                <span className="text-[11px]" style={{ color: 'var(--label-3)' }}>
                  Your logo
                </span>
              </div>
            )}

            <div className="text-white/30 text-[24px]">→</div>

            {/* After */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative h-[96px] w-[96px] overflow-hidden"
                style={{
                  borderRadius: 22,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.processed_icon_url} alt="" className="h-full w-full object-cover" />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--brand-gold)' }}>
                Your app icon
              </span>
            </div>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '0.5px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={2.2} />
            <span className="text-[13px] font-medium text-emerald-300">
              Looks beautiful. Ready to go.
            </span>
          </div>

          <button
            onClick={() => update({ logo_url: null, processed_icon_url: null })}
            className="text-[13px] font-medium"
            style={{ color: 'var(--label-3)' }}
          >
            Try a different logo
          </button>
        </div>
      )}

      {error && (
        <p className="text-center text-[13px] text-red-400 -mt-4">{error}</p>
      )}

      <div className="mt-2">
        <NextButton onClick={next} />
        <SkipLink onClick={next} label="No logo yet? I'll add it later" />
      </div>
    </div>
  );
}
