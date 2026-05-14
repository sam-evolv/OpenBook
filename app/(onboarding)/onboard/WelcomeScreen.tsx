'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Loader2, Mail, ArrowRight } from 'lucide-react';

export function WelcomeScreen() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'buttons' | 'email'>('buttons');
  const [loading, setLoading] = useState<'google' | 'apple' | 'email' | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWith(provider: 'google' | 'apple') {
    setLoading(provider);
    setError(null);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading('email');
    setError(null);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setEmailSent(true);
    }
    setLoading(null);
  }

  // Intentionally dark regardless of the theme cookie: this is the
  // marketing-style hero shown before sign-in, and the gold gradient on
  // pure black is the brand's signed-out look. Dashboard surfaces honour
  // the theme cookie; this screen does not.
  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-white">
      {/* Background */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(1000px 700px at 50% 0%, rgba(212, 175, 55, 0.18) 0%, transparent 55%), linear-gradient(180deg, #050505 0%, #000 100%)',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        }}
      />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pt-safe pb-safe">
        {/* Hero */}
        <div className="flex flex-1 flex-col items-center justify-center text-center animate-reveal-up">
          <div
            className="relative mb-8 flex h-[108px] w-[108px] items-center justify-center rounded-[28px] overflow-hidden"
            style={{
              background:
                'radial-gradient(ellipse at 30% 20%, #F6D77C 0%, #D4AF37 45%, #7A5418 100%)',
              boxShadow:
                '0 20px 50px rgba(212, 175, 55, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            }}
          >
            <span className="text-[56px] font-bold text-black/80" style={{ letterSpacing: '-0.04em' }}>
              O
            </span>
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 22%, transparent 50%)',
              }}
            />
          </div>

          <p
            className="text-caption-eyebrow mb-3"
            style={{ color: 'var(--brand-gold)' }}
          >
            Get set up in 15 minutes
          </p>

          <h1
            className="text-display leading-[0.95]"
            style={{ fontSize: '38px', color: 'var(--label-1)' }}
          >
            Your business,
            <br />
            your own app.
          </h1>

          <p
            className="mt-4 text-[16px] leading-[1.45] max-w-[320px]"
            style={{ color: 'var(--label-2)', letterSpacing: '-0.005em' }}
          >
            Your booking page on every customer's home screen. No commissions, no setup fees.
          </p>
        </div>

        {/* Auth panel */}
        <div
          className="pb-8 animate-reveal-up"
          style={{ animationDelay: '120ms' }}
        >
          {emailSent ? (
            <div
              className="rounded-[22px] p-6 text-center mat-card"
            >
              <Mail className="mx-auto mb-3 h-6 w-6 text-[#D4AF37]" strokeWidth={1.8} />
              <p className="text-title text-[16px]">Check your inbox</p>
              <p className="mt-1.5 text-[14px]" style={{ color: 'var(--label-2)' }}>
                We sent a magic link to <span className="text-white">{email}</span>
              </p>
              <button
                onClick={() => {
                  setEmailSent(false);
                  setMode('buttons');
                }}
                className="mt-5 text-[13px] font-medium text-[#D4AF37]"
              >
                Use a different email
              </button>
            </div>
          ) : mode === 'buttons' ? (
            <div className="flex flex-col gap-2.5">
              <AuthButton
                onClick={() => signInWith('apple')}
                loading={loading === 'apple'}
                label="Continue with Apple"
                theme="apple"
              />
              <AuthButton
                onClick={() => signInWith('google')}
                loading={loading === 'google'}
                label="Continue with Google"
                theme="google"
              />
              <button
                onClick={() => setMode('email')}
                className="mt-1 h-12 rounded-full text-[14px] font-medium text-white/70 hover:text-white transition-colors"
              >
                Or continue with email
              </button>
            </div>
          ) : (
            <form onSubmit={signInWithEmail} className="flex flex-col gap-2.5">
              <div
                className="flex h-[52px] items-center gap-3 rounded-full px-5 mat-card focus-within:ring-2"
                style={{ borderColor: 'var(--sep-strong)' }}
              >
                <Mail className="h-[18px] w-[18px] text-white/40" strokeWidth={2} />
                <input
                  autoFocus
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] placeholder:text-white/35 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!email.trim() || loading === 'email'}
                className="flex h-[52px] items-center justify-center gap-2 rounded-full font-semibold text-black disabled:opacity-40 active:scale-[0.98] transition-all"
                style={{
                  background:
                    'linear-gradient(145deg, #F6D77C 0%, #D4AF37 50%, #8B6428 100%)',
                  boxShadow: '0 8px 20px rgba(212, 175, 55, 0.3)',
                }}
              >
                {loading === 'email' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Send magic link
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode('buttons')}
                className="mt-1 h-10 rounded-full text-[13px] font-medium text-white/50 hover:text-white transition-colors"
              >
                Back
              </button>
            </form>
          )}

          {error && (
            <p className="mt-3 text-center text-[13px] text-red-400">{error}</p>
          )}

          <p
            className="mt-6 text-center text-[11px] leading-relaxed"
            style={{ color: 'var(--label-4)' }}
          >
            By continuing you agree to our{' '}
            <a href="https://openbook.ie/terms" className="underline">
              Terms
            </a>{' '}
            and{' '}
            <a href="https://openbook.ie/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

function AuthButton({
  onClick,
  loading,
  label,
  theme,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  theme: 'apple' | 'google';
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex h-[52px] items-center justify-center gap-3 rounded-full text-[15px] font-semibold text-white disabled:opacity-60 active:scale-[0.98] transition-transform mat-card"
      style={{ transitionTimingFunction: 'var(--ease-apple)' }}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          {theme === 'apple' ? <AppleIcon /> : <GoogleIcon />}
          {label}
        </>
      )}
    </button>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
      <path d="M13.1 9.56c-.02-2.26 1.85-3.35 1.93-3.4-1.05-1.54-2.7-1.75-3.28-1.77-1.4-.14-2.73.82-3.44.82-.72 0-1.81-.8-2.98-.78-1.53.02-2.95.89-3.74 2.26-1.6 2.76-.41 6.85 1.15 9.1.76 1.1 1.66 2.33 2.84 2.28 1.14-.04 1.57-.74 2.95-.74 1.37 0 1.76.74 2.97.71 1.23-.02 2-1.12 2.76-2.22.87-1.27 1.22-2.5 1.24-2.57-.03-.01-2.37-.9-2.4-3.58zm-2.27-6.57c.63-.76 1.05-1.82.94-2.88-.91.04-2.01.6-2.66 1.36-.58.68-1.08 1.76-.94 2.8 1.01.08 2.04-.51 2.66-1.28z" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.257h2.908c1.702-1.567 2.684-3.874 2.684-6.614z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
