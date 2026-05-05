/**
 * Legacy webhook path. The implementation lives at
 * /api/webhooks/stripe — Stripe's dashboard config now points there.
 * This file stays as a thin re-export so any older webhook
 * registration that still posts to /api/stripe/webhook continues to
 * be processed identically (signature check, dedupe, handlers).
 */
export { POST, runtime, dynamic } from '@/app/api/webhooks/stripe/route';
