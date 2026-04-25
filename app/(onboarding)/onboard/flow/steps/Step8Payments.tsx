'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { StepHeader, NextButton, SkipLink } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
  /** Server-side flag — true when STRIPE_SECRET_KEY is configured. */
  stripeAvailable?: boolean;
}

export function Step8Payments({ state, next, stripeAvailable = false }: StepProps) {
  const [connecting, setConnecting] = useState(false);

  async function connectStripe() {
    if (!state.businessId) return;
    setConnecting(true);
    const res = await fetch('/api/onboarding/stripe-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: state.businessId }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.url) {
      window.location.href = data.url;
    } else {
      // disabled / not configured / error — fall through to skip path
      setConnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-[520px]">
      <StepHeader
        eyebrow="Step 8 of 9 · Get paid"
        title={
          stripeAvailable ? (
            <>
              Connect Stripe <br />
              to accept payments.
            </>
          ) : (
            <>
              Payments are <br />
              optional for now.
            </>
          )
        }
        subtitle={
          stripeAvailable
            ? "Customers can pay for their bookings directly through your app. OpenBook takes no commission — money goes straight to your Stripe account. You can skip this and enable it later."
            : 'OpenBook works without payments — customers can book and pay you in person. We will add Stripe Connect for you later when you are ready to accept card payments online.'
        }
      />

      {stripeAvailable && state.stripe_connected ? (
        <div
          className="flex items-center gap-4 p-5 rounded-[22px]"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '0.5px solid rgba(16, 185, 129, 0.35)',
          }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-emerald-300">
              Stripe connected
            </p>
            <p className="text-[13px] text-emerald-300/70">
              You're ready to accept card payments.
            </p>
          </div>
        </div>
      ) : stripeAvailable ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={connectStripe}
            disabled={connecting}
            className="group relative flex items-center gap-4 p-5 rounded-[22px] mat-card hover:mat-card-elevated active:scale-[0.99] transition-all"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
              style={{
                background: 'linear-gradient(145deg, #635BFF, #4B43E6)',
                boxShadow: '0 6px 16px rgba(99, 91, 255, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              {connecting ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <CreditCard className="h-5 w-5 text-white" strokeWidth={2} />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[16px] font-semibold">Connect with Stripe</p>
              <p className="text-[13px]" style={{ color: 'var(--label-2)' }}>
                2–3 minutes. Takes you to Stripe, then back here.
              </p>
            </div>
          </button>

          <div
            className="flex items-start gap-3 p-4 rounded-2xl mat-card"
            style={{ borderColor: 'var(--sep)' }}
          >
            <div className="text-[20px] shrink-0">💡</div>
            <div>
              <p className="text-[13px] font-semibold mb-1">
                Good to know
              </p>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--label-2)' }}>
                OpenBook takes <span className="text-white">0% commission</span>. Stripe's standard card fee is ~1.4% + €0.25. You'll see everything transparently on your dashboard.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            className="flex items-start gap-4 p-5 rounded-[22px] mat-card"
            style={{ borderColor: 'var(--sep)' }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
              style={{
                background: 'linear-gradient(145deg, rgba(212,175,55,0.35), rgba(212,175,55,0.15))',
                border: '0.5px solid rgba(212,175,55,0.4)',
              }}
            >
              <Sparkles className="h-5 w-5 text-[#D4AF37]" strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-semibold">Online payments — coming soon</p>
              <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--label-2)' }}>
                Stripe Connect isn't enabled on this OpenBook deployment yet.
                You can launch your business and take bookings today; we'll wire up
                card payments for you when Stripe is live.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2">
        <NextButton onClick={next} label="Continue" />
        <SkipLink
          onClick={next}
          label={
            stripeAvailable
              ? state.stripe_connected
                ? 'Continue'
                : "Skip — I'll enable payments later"
              : 'Continue without online payments'
          }
        />
      </div>
    </div>
  );
}
