/**
 * Server-side helper for checking which third-party integrations are
 * configured. Used so the core OpenBook app can run end-to-end on free
 * Supabase + manual bookings only — Stripe, Resend, WhatsApp, OpenAI
 * and the (future) MCP server are all optional.
 *
 * Each `has*` returns a boolean. Callers that need a typed key can use
 * `requireEnv` once the boolean has been checked, but most call sites
 * just want "is this safe to call?".
 *
 * Mark this `'server-only'` adjacent: only ever import from server
 * components, route handlers, or server actions. Bundling these checks
 * into the client would expose env-var presence to anyone with devtools.
 */

export interface IntegrationStatus {
  stripe: boolean;
  resend: boolean;
  openai: boolean;
  whatsapp: boolean;
  mcp: boolean;
}

function envSet(name: string): boolean {
  const v = process.env[name];
  return typeof v === 'string' && v.trim().length > 0;
}

export function hasStripe(): boolean {
  return envSet('STRIPE_SECRET_KEY');
}

export function hasResend(): boolean {
  return envSet('RESEND_API_KEY');
}

export function hasOpenAI(): boolean {
  return envSet('OPENAI_API_KEY');
}

export function hasWhatsApp(): boolean {
  return (
    envSet('WHATSAPP_ACCESS_TOKEN') &&
    envSet('WHATSAPP_PHONE_NUMBER_ID')
  );
}

export function hasMcp(): boolean {
  // MCP server isn't shipping in the core production cut. Always false
  // for now; the dashboard renders MCP tiles as "Coming soon" until
  // this returns true.
  return false;
}

export function getIntegrationStatus(): IntegrationStatus {
  return {
    stripe: hasStripe(),
    resend: hasResend(),
    openai: hasOpenAI(),
    whatsapp: hasWhatsApp(),
    mcp: hasMcp(),
  };
}

/**
 * Fetch a required env var. Throws when missing. Use this AFTER a
 * matching `has*` check, never before. The throw is intentional — it
 * surfaces a misconfigured production deploy loudly rather than
 * silently swallowing the call.
 */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`${name} is not configured`);
  }
  return v;
}
