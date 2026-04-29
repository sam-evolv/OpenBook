/**
 * One-off script to fire confirmation emails for an existing
 * booking row, bypassing the booking flow entirely. Used to
 * verify the email pipeline (Resend + templates + DB lookups)
 * in isolation, without confounding it with the wiring layer.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/test-booking-emails.ts <bookingId>
 *
 * Required env vars (must be loaded — use --env-file or export them):
 *   - RESEND_API_KEY              (read by getResend in lib/email.ts)
 *   - NEXT_PUBLIC_SUPABASE_URL    (read by supabaseAdmin in lib/supabase.ts)
 *   - SUPABASE_SERVICE_ROLE_KEY   (ditto — service role, NOT anon, because
 *                                  the booking → business → owner lookup
 *                                  joins through tables that RLS would
 *                                  block for the anon key)
 *
 * If --env-file isn't honoured by your tsx version, prefix the command:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-booking-emails.ts <id>
 */

import { sendBookingConfirmation } from '../lib/email';

async function main() {
  const bookingId = process.argv[2];
  if (!bookingId) {
    console.error(
      'Usage: npx tsx --env-file=.env.local scripts/test-booking-emails.ts <bookingId>',
    );
    process.exit(1);
  }

  // Cheap pre-flight so we surface a clear error instead of a Supabase /
  // Resend stack trace if the env vars aren't loaded.
  const missing = [
    'RESEND_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(', ')}`);
    console.error('Did you remember --env-file=.env.local?');
    process.exit(1);
  }

  console.log(`\nFiring confirmation emails for booking ${bookingId}\n`);

  const results = await Promise.allSettled([
    sendBookingConfirmation({ bookingId, audience: 'customer' }),
    sendBookingConfirmation({ bookingId, audience: 'business' }),
  ]);

  results.forEach((result, i) => {
    const audience = i === 0 ? 'customer' : 'business';
    if (result.status === 'fulfilled') {
      const v = result.value;
      if (v === null) {
        console.log(
          `  · ${audience}: skipped (no recipient — see helper logs above)`,
        );
      } else {
        console.log(`  ✓ ${audience}: sent — message id ${v.id}`);
      }
    } else {
      console.error(`  ✗ ${audience}: failed`);
      console.error('    ', result.reason);
    }
  });

  console.log(
    '\nCheck inboxes (and the Resend dashboard) within ~1 min.\n',
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
