'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle2, Loader2, Check } from 'lucide-react';
import { StepHeader, NextButton, SkipLink } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

/** What the user has selected. Either a named preset, or a specific hex. */
type BgSelection =
  | { kind: 'auto' }
  | { kind: 'black' }
  | { kind: 'white' }
  | { kind: 'primary' }
  | { kind: 'custom'; hex: string };

/** Convert a selection into the string the server expects. */
function selectionToServerValue(sel: BgSelection): string {
  switch (sel.kind) {
    case 'auto':    return 'auto';
    case 'black':   return 'black';
    case 'white':   return 'white';
    case 'primary': return 'primary';
    case 'custom':  return sel.hex;
  }
}

export function Step3Logo({ state, update, next }: StepProps) {
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<BgSelection>({ kind: 'auto' });
  const [customHex, setCustomHex] = useState('#6366F1'); // A nice indigo default so it's clearly "custom"
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ensureBusinessId(): Promise<string | null> {
    if (state.businessId) return state.businessId;
    try {
      const res = await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, step: 2 }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.businessId) {
        update({ businessId: data.businessId, slug: data.slug ?? state.slug });
        return data.businessId;
      }
    } catch {
      return null;
    }
    return null;
  }

  async function handleFile(file: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.');
      return;
    }

    setUploading(true);
    setError(null);

    const businessId = await ensureBusinessId();
    if (!businessId) {
      setError('We need your business name first — tap Back and complete Step 1.');
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('businessId', businessId);
    formData.append('file', file);
    formData.append('background', selectionToServerValue(selection));

    try {
      const res = await fetch('/api/upload-logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');

      setLogoPath(data.logoPath);
      update({
        logo_url: data.logoUrl,
        processed_icon_url: data.iconUrl,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed. Try a different file.');
    } finally {
      setUploading(false);
    }
  }

  async function regenerate(newSelection: BgSelection) {
    if (!state.businessId || !logoPath) return;
    setRegenerating(true);
    setError(null);

    const formData = new FormData();
    formData.append('businessId', state.businessId);
    formData.append('background', selectionToServerValue(newSelection));
    formData.append('cachedLogoPath', logoPath);

    try {
      const res = await fetch('/api/upload-logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Regenerate failed');
      update({ processed_icon_url: data.iconUrl });
    } catch (err: any) {
      setError(err?.message ?? 'Could not regenerate icon');
    } finally {
      setRegenerating(false);
    }
  }

  function pickPreset(kind: Exclude<BgSelection['kind'], 'custom'>) {
    const newSel: BgSelection = { kind };
    setSelection(newSel);
    setCustomPickerOpen(false);
    if (state.processed_icon_url) regenerate(newSel);
  }

  function openCustomPicker() {
    setCustomPickerOpen(true);
    const newSel: BgSelection = { kind: 'custom', hex: customHex };
    setSelection(newSel);
    if (state.processed_icon_url) regenerate(newSel);
  }

  function applyCustomHex(nextHex: string) {
    const hex = nextHex.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    setCustomHex(hex);
    const newSel: BgSelection = { kind: 'custom', hex };
    setSelection(newSel);
    if (state.processed_icon_url) regenerate(newSel);
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
        subtitle="Drop any logo — PNG, JPG, SVG. We'll auto-crop it and turn it into a premium app icon your customers will recognise."
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
        <div className="flex flex-col gap-7">
          {/* Before / after preview */}
          <div className="flex items-center justify-center gap-5">
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

            <div className="flex flex-col items-center gap-2">
              <div
                className="relative h-[96px] w-[96px] overflow-hidden transition-opacity"
                style={{
                  borderRadius: 22,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
                  opacity: regenerating ? 0.6 : 1,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.processed_icon_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {regenerating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--brand-gold)' }}>
                Your app icon
              </span>
            </div>
          </div>

          {/* Background picker */}
          <div className="flex flex-col gap-3">
            <p
              className="text-[11px] font-semibold tracking-[0.14em] uppercase text-center"
              style={{ color: 'var(--label-3)' }}
            >
              Background
            </p>
            <div className="grid grid-cols-5 gap-2">
              <BgSwatch
                label="Auto"
                active={selection.kind === 'auto'}
                onClick={() => pickPreset('auto')}
                preview="gradient"
              />
              <BgSwatch
                label="Black"
                active={selection.kind === 'black'}
                onClick={() => pickPreset('black')}
                preview="#080808"
              />
              <BgSwatch
                label="White"
                active={selection.kind === 'white'}
                onClick={() => pickPreset('white')}
                preview="#FFFFFF"
              />
              <BgSwatch
                label="Brand"
                active={selection.kind === 'primary'}
                onClick={() => pickPreset('primary')}
                preview={state.primary_colour}
              />
              <BgSwatch
                label="Custom"
                active={selection.kind === 'custom'}
                onClick={openCustomPicker}
                preview={customHex}
                hashIndicator
              />
            </div>

            {customPickerOpen && (
              <div className="flex items-center gap-2 mt-2 animate-reveal-up">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => applyCustomHex(e.target.value)}
                  className="h-10 w-14 rounded-lg border-0 bg-transparent cursor-pointer"
                  aria-label="Pick a custom colour"
                />
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  onBlur={(e) => applyCustomHex(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyCustomHex((e.target as HTMLInputElement).value);
                  }}
                  placeholder="#080808"
                  className="flex-1 h-10 px-3 rounded-lg mat-card text-[13px] font-mono focus:outline-none"
                  style={{ color: 'var(--label-1)' }}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
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
              onClick={() => {
                update({ logo_url: null, processed_icon_url: null });
                setLogoPath(null);
                setSelection({ kind: 'auto' });
                setCustomPickerOpen(false);
              }}
              className="text-[13px] font-medium"
              style={{ color: 'var(--label-3)' }}
            >
              Try a different logo
            </button>
          </div>
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

/* One swatch button for the background picker */
function BgSwatch({
  label,
  active,
  onClick,
  preview,
  hashIndicator = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  preview: string;
  hashIndicator?: boolean;
}) {
  const swatchStyle: React.CSSProperties = preview === 'gradient'
    ? {
        background:
          'radial-gradient(ellipse at 30% 30%, #D4AF37 0%, #8B6428 100%)',
      }
    : { backgroundColor: preview };

  if (preview === '#FFFFFF' || (typeof preview === 'string' && preview.toLowerCase() === '#ffffff')) {
    swatchStyle.border = '0.5px solid rgba(255,255,255,0.2)';
  }

  const checkColour = (preview === '#FFFFFF' || (typeof preview === 'string' && preview.toLowerCase() === '#ffffff'))
    ? '#000'
    : '#fff';

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-all active:scale-95 ${
        active ? 'mat-card-elevated' : 'hover:bg-white/5'
      }`}
      style={{
        border: active ? '1px solid var(--brand-gold)' : '1px solid transparent',
      }}
    >
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center"
        style={swatchStyle}
      >
        {hashIndicator && !active && (
          <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
            #
          </span>
        )}
        {active && (
          <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: checkColour }} />
        )}
      </div>
      <span
        className={`text-[10px] font-medium ${active ? '' : 'opacity-70'}`}
        style={{ color: active ? 'var(--brand-gold)' : 'var(--label-2)' }}
      >
        {label}
      </span>
    </button>
  );
}
