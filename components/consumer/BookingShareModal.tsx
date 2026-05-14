'use client';

import { useEffect, useState } from 'react';
import { Instagram, Link2, Share2, X } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
  /** Hex (#RRGGBB) used as the Stories backgroundTopColor. */
  primaryColourHex: string;
}

export function BookingShareModal({
  open,
  onClose,
  bookingId,
  shareTitle,
  shareText,
  shareUrl,
  primaryColourHex,
}: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [igState, setIgState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const imageUrl = `${shareUrl.replace(/\/$/, '')}/api/booking/${bookingId}/share-image`;

  async function handleNativeShare() {
    haptics.tap();
    if (typeof navigator === 'undefined' || !navigator.share) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({ title: shareTitle, text: shareText, url: imageUrl });
    } catch (err) {
      // AbortError fires when the user dismisses the share sheet — silent.
      if ((err as Error)?.name !== 'AbortError') {
        console.error('[share] navigator.share failed', err);
      }
    }
  }

  async function handleCopy() {
    haptics.tap();
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1600);
    } catch (err) {
      console.error('[share] clipboard write failed', err);
    }
  }

  async function handleInstagramStories() {
    haptics.tap();
    setIgState('loading');
    try {
      // Fetch the share image and base64-encode it. Instagram's Stories
      // deep link expects a data URL on the backgroundImage param.
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`share-image ${res.status}`);
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      const url =
        `instagram-stories://share?source_application=openbook` +
        `&backgroundImage=${encodeURIComponent(dataUrl)}` +
        `&backgroundTopColor=${encodeURIComponent(primaryColourHex)}` +
        `&backgroundBottomColor=${encodeURIComponent('#080808')}`;
      window.location.href = url;
      // Some platforms swallow the deep link silently when Instagram
      // isn't installed. Reset after a beat so the button doesn't sit
      // stuck on "Opening..." indefinitely.
      window.setTimeout(() => setIgState('idle'), 1800);
    } catch (err) {
      console.error('[share] instagram stories failed', err);
      setIgState('error');
      window.setTimeout(() => setIgState('idle'), 2400);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share booking"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'ob-share-fade 200ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#0e0e10',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '20px 22px max(28px, env(safe-area-inset-bottom))',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.55)',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
          animation: 'ob-share-slide 240ms cubic-bezier(0.2,0.9,0.3,1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'rgba(255,255,255,0.95)',
            }}
          >
            Share your booking
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
            }}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isMobile && (
            <ShareButton
              onClick={handleInstagramStories}
              icon={<Instagram size={18} strokeWidth={2} />}
              label={
                igState === 'loading'
                  ? 'Opening Instagram…'
                  : igState === 'error'
                    ? "Couldn't open Instagram"
                    : 'Share to Instagram Stories'
              }
              primary
              disabled={igState === 'loading'}
            />
          )}

          <ShareButton
            onClick={handleNativeShare}
            icon={<Share2 size={18} strokeWidth={2} />}
            label={isMobile ? 'More sharing options' : 'Share'}
          />

          <ShareButton
            onClick={handleCopy}
            icon={<Link2 size={18} strokeWidth={2} />}
            label={copyState === 'copied' ? 'Link copied' : 'Copy link'}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes ob-share-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ob-share-slide {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ShareButton({
  onClick,
  icon,
  label,
  primary,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '14px 18px',
        borderRadius: 14,
        border: primary ? 'none' : '0.5px solid rgba(255,255,255,0.12)',
        background: primary ? '#D4AF37' : 'rgba(255,255,255,0.04)',
        color: primary ? '#080808' : 'rgba(255,255,255,0.92)',
        fontSize: 15,
        fontWeight: primary ? 600 : 500,
        letterSpacing: '-0.01em',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
