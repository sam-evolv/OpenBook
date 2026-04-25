'use client';

import { useState, useTransition } from 'react';
import { CreditCard } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';

interface ConnectStripePromptProps {
  businessId: string;
}

/**
 * Shown when stripe_account_id is null OR stripe_charges_enabled is false.
 * The button reuses the onboarding stripe-link endpoint — it returns a
 * Stripe-hosted onboarding URL (new account) or a continuation URL (already
 * started but not finished). Either way, Stripe bounces back to the onboarding
 * flow; we accept the URL drift for now and re-land on Finance on next visit.
 */
export function ConnectStripePrompt({ businessId }: ConnectStripePromptProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onConnect = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/onboarding/stripe-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Failed to start Stripe connect' }));
          setError(body.error ?? 'Failed to start Stripe connect');
          return;
        }
        const data = await res.json();
        if (data?.disabled) {
          setError(
            'Online payments are not enabled on this OpenBook deployment yet. You can keep taking bookings — your dashboard works without Stripe.',
          );
          return;
        }
        if (data?.url) {
          window.location.href = data.url;
        } else {
          setError('No onboarding URL returned by Stripe.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  };

  return (
    <Card padding="lg">
      <div className="flex flex-col items-center text-center py-6 px-4 max-w-lg mx-auto">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-paper-surface2 dark:bg-ink-surface2 border border-paper-border dark:border-ink-border mb-4">
          <CreditCard size={20} className="text-paper-text-3 dark:text-ink-text-3" />
        </div>
        <h3 className="text-[15px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 mb-1.5">
          Connect Stripe to see payouts and fees
        </h3>
        <p className="text-[13px] leading-relaxed text-paper-text-2 dark:text-ink-text-2 mb-6">
          Stripe Connect handles card payments, transfers the net to your bank on your chosen
          schedule, and tells OpenBook what you've earned. VAT tracking, P&amp;L, and the
          accountant CSV all work without Stripe — but payouts, fees, and refund tracking need it.
        </p>
        <Button variant="primary" onClick={onConnect} disabled={isPending}>
          {isPending ? 'Connecting…' : 'Connect Stripe'}
        </Button>
        {error && (
          <p className="mt-3 text-[12px] text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    </Card>
  );
}
