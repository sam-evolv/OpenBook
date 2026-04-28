import Stripe from 'stripe';

// Singleton Stripe SDK client. Pins apiVersion to a known
// version so webhook event shapes are predictable. Bump
// explicitly when you've reviewed the changelog.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  cached = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
  });
  return cached;
}
