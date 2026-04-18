'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Share2, Smartphone, Loader2, PartyPopper } from 'lucide-react';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

export function Step8Launch({ state }: StepProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appHost = typeof window !== 'undefined'
    ? window.location.host.replace('dash.', 'app.').replace(/^localhost.*$/, 'app.openbook.ie')
    : 'app.openbook.ie';
  const publicUrl = `https://${appHost}/business/${state.slug}`;

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not publish');
      setPublished(true);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    // Auto-publish the moment they hit step 8
    if (!published && !publishing) publish();
  }, []);

  function copyUrl() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareUrl() {
    if (navigator.share) {
      navigator.share({
        title: state.name,
        text: `Book with ${state.name} on OpenBook`,
        url: publicUrl,
      });
    } else {
      copyUrl();
    }
  }

  function goToDashboard() {
    const host = window.location.host;
    if (host.startsWith('app.')) {
      window.location.href = `https://${host.replace('app.', 'dash.')}/dashboard`;
    } else {
      router.push('/dashboard');
    }
  }

  if (publishing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37] mb-4" />
        <p className="text-[16px] font-medium">Publishing your app…</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--label-2)' }}>
          This takes a few seconds.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-[400px] mx-auto">
        <p className="text-[16px] font-semibold text-red-400 mb-2">Couldn't publish</p>
        <p className="text-[13px]" style={{ color: 'var(--label-2)' }}>
          {error}
        </p>
        <button
          onClick={publish}
          className="mt-6 h-11 px-6 rounded-full bg-[#D4AF37] text-black font-semibold text-[14px]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-[520px] animate-reveal-up">
      {/* Hero */}
      <div className="text-center">
        <div
          className="mx-auto flex h-[96px] w-[96px] items-center justify-center rounded-full mb-5"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, #F6D77C 0%, #D4AF37 50%, #7A5418 100%)',
            boxShadow: '0 20px 50px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          <PartyPopper className="h-10 w-10 text-black/80" strokeWidth={1.8} />
        </div>

        <p className="text-caption-eyebrow mb-2" style={{ color: 'var(--brand-gold)' }}>
          You're live
        </p>
        <h1 className="text-display leading-[0.98]" style={{ fontSize: '38px' }}>
          {state.name}
          <br />
          is on OpenBook.
        </h1>
        <p className="mt-4 text-[16px] max-w-[400px] mx-auto" style={{ color: 'var(--label-2)' }}>
          Your app is ready. Share the link — when customers tap it, they get your booking page on their home screen.
        </p>
      </div>

      {/* Public URL card */}
      <div
        className="rounded-[22px] p-5 mat-card-elevated"
        style={{
          background:
            'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%), var(--mat-surface-2)',
        }}
      >
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: 'var(--label-3)' }}>
          Your public URL
        </p>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-[15px] font-mono truncate"
            style={{ color: 'var(--brand-gold)' }}
          >
            {publicUrl}
          </code>
          <button
            onClick={copyUrl}
            className="h-10 px-3 rounded-full mat-card hover:mat-card-elevated flex items-center gap-1.5 transition-all active:scale-95"
            aria-label="Copy URL"
          >
            {copied ? (
              <>
                <Check className="h-[14px] w-[14px] text-emerald-400" strokeWidth={2.5} />
                <span className="text-[12px] font-medium text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-[14px] w-[14px]" strokeWidth={2} />
                <span className="text-[12px] font-medium">Copy</span>
              </>
            )}
          </button>
          <button
            onClick={shareUrl}
            className="h-10 px-3 rounded-full mat-card hover:mat-card-elevated flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Share2 className="h-[14px] w-[14px]" strokeWidth={2} />
            <span className="text-[12px] font-medium">Share</span>
          </button>
        </div>
      </div>

      {/* QR code */}
      <div className="rounded-[22px] p-5 mat-card">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--label-3)' }}>
          Put it on your shopfront
        </p>
        <div className="flex items-center gap-5">
          <div className="rounded-xl bg-white p-3 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}&margin=0`}
              alt="QR code"
              width={120}
              height={120}
              className="block"
            />
          </div>
          <div>
            <p className="text-[14px] font-semibold mb-1">
              Scan to book
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--label-2)' }}>
              Print this, put it on your counter, window, or business cards. Every scan becomes a booking.
            </p>
          </div>
        </div>
      </div>

      {/* Install instructions */}
      <div className="rounded-[22px] p-5 mat-card">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-4 w-4" style={{ color: 'var(--brand-gold)' }} strokeWidth={2} />
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--label-3)' }}>
            Add to home screen
          </p>
        </div>
        <div className="flex flex-col gap-2.5 text-[13px] leading-relaxed" style={{ color: 'var(--label-2)' }}>
          <p>
            <span className="text-white font-semibold">iPhone:</span> Open the URL in Safari → tap the Share icon → "Add to Home Screen."
          </p>
          <p>
            <span className="text-white font-semibold">Android:</span> Open the URL in Chrome → tap ⋮ → "Add to Home Screen."
          </p>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="mt-2">
        <button
          onClick={goToDashboard}
          className="flex h-[56px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-black active:scale-[0.98] transition-all"
          style={{
            background: 'linear-gradient(145deg, #F6D77C 0%, #D4AF37 50%, #8B6428 100%)',
            boxShadow: '0 10px 24px rgba(212, 175, 55, 0.3)',
          }}
        >
          Go to my dashboard
        </button>
      </div>
    </div>
  );
}
