// record_post_booking_feedback — capture post-booking signal so the
// ranker's QualityScore inputs improve and the assistant can keep user
// history in mind.
// Spec: docs/mcp-server-spec.md section 5.9. Schema: section 8.6.
//
// Behaviour:
//   1. Look up the booking + business name (for the thanks_message).
//      BOOKING_NOT_FOUND if missing.
//   2. Reject if the booking isn't in a terminal-from-the-user's-POV
//      state. Allowed: confirmed, cancelled. ('completed' / 'no_show'
//      are NOT booking statuses in this schema — they're recorded on
//      bookings.outcome via this very tool.) BOOKING_NOT_FINALISED
//      otherwise.
//   3. Upsert the booking_feedback row keyed on booking_id. The unique
//      constraint on booking_feedback.booking_id means re-submission
//      is the user revising their feedback ("actually it was a 5,
//      not a 4") — we accept it.
//   4. If `showed_up` is provided, write the matching value to
//      bookings.outcome via a guarded UPDATE that only touches NULL
//      outcomes. Existing outcomes (a manual cancellation, a webhook
//      backfill) win over assistant-inferred attendance.
//   5. Voice-friendly thanks_message picked from the rating + verbatim
//      shape. ≤12 words, all variants.

import {
  recordPostBookingFeedbackInput,
  recordPostBookingFeedbackOutput,
} from '../../../../lib/mcp/schemas';
import { supabaseAdmin } from '../../../../lib/supabase';
import { wrapToolBoundary } from '../../../../lib/mcp/serialization';
import type { ToolContext, ToolHandler } from './index';

const ALLOWED_STATUSES = new Set(['confirmed', 'cancelled']);

const responseError = (code: string, message: string) => ({
  error: { code, message },
});

type BookingRow = {
  id: string;
  status: string | null;
  source: string | null;
  customer_id: string | null;
  business_id: string;
  outcome: string | null;
  starts_at: string;
  businesses: { id: string; name: string } | null;
};

function pickThanksMessage(args: {
  inferred_rating?: 1 | 2 | 3 | 4 | 5;
  verbatim?: string;
  business_name: string;
}): string {
  const { inferred_rating: rating, verbatim, business_name } = args;
  // High rating → mention the business by name (the warm path).
  if (rating !== undefined && rating >= 4) {
    return `Thanks — passed that along to ${business_name}.`;
  }
  // Low rating → don't promise the business sees it (Section 5.9 comment
  // about not auto-publishing). Acknowledge, file, move on.
  if (rating !== undefined && rating <= 2) {
    return 'Thanks for the honest feedback. I have noted it.';
  }
  // Verbatim without a numeric rating → just say we recorded it.
  if (verbatim && verbatim.trim().length > 0) {
    return 'Thanks — I have recorded that for you.';
  }
  return 'Thanks for letting me know.';
}

export const _recordPostBookingFeedbackImpl: ToolHandler = async (input, ctx: ToolContext) => {
  const parsed = recordPostBookingFeedbackInput.parse(input);

  const supa = supabaseAdmin();

  const { data: booking, error: bookErr } = await supa
    .from('bookings')
    .select(
      `
      id, status, source, customer_id, business_id, outcome, starts_at,
      businesses:business_id ( id, name )
      `,
    )
    .eq('id', parsed.booking_id)
    .maybeSingle<BookingRow>();
  if (bookErr) {
    console.error('[mcp.record_post_booking_feedback] booking lookup failed', bookErr);
    return responseError('INTERNAL_ERROR', 'Failed to fetch booking.');
  }
  if (!booking || !booking.businesses) {
    return responseError('BOOKING_NOT_FOUND', 'Booking not found.');
  }
  if (!booking.status || !ALLOWED_STATUSES.has(booking.status)) {
    return responseError(
      'BOOKING_NOT_FINALISED',
      'Cannot record feedback for a booking that has not yet been completed or cancelled.',
    );
  }

  // Upsert keyed on booking_id (unique constraint on booking_feedback).
  const { error: upsertErr } = await supa
    .from('booking_feedback')
    .upsert(
      {
        booking_id: parsed.booking_id,
        inferred_rating: parsed.inferred_rating ?? null,
        verbatim: parsed.verbatim ?? null,
        showed_up: parsed.showed_up ?? null,
        would_rebook: parsed.would_rebook ?? null,
        source_assistant: ctx.sourceAssistant,
      },
      { onConflict: 'booking_id' },
    );
  if (upsertErr) {
    console.error('[mcp.record_post_booking_feedback] upsert failed', upsertErr);
    return responseError('INTERNAL_ERROR', 'Failed to record feedback.');
  }

  // Backfill bookings.outcome from showed_up. Guarded — never overwrite
  // an existing outcome (manual cancellation or earlier feedback wins).
  // Outcome enum is ('completed', 'no_show', 'cancelled', 'unknown').
  if (parsed.showed_up !== undefined) {
    const outcome = parsed.showed_up ? 'completed' : 'no_show';
    const { error: outcomeErr } = await supa
      .from('bookings')
      .update({ outcome })
      .eq('id', parsed.booking_id)
      .is('outcome', null);
    if (outcomeErr) {
      // Non-fatal: feedback was recorded, the ranker will still benefit
      // from the booking_feedback row. Log and continue.
      console.error('[mcp.record_post_booking_feedback] outcome backfill failed (non-fatal)', outcomeErr);
    }
  }

  const out = {
    acknowledged: true as const,
    thanks_message: pickThanksMessage({
      inferred_rating: parsed.inferred_rating,
      verbatim: parsed.verbatim,
      business_name: booking.businesses.name,
    }),
  };

  const validation = recordPostBookingFeedbackOutput.safeParse(out);
  if (!validation.success) {
    console.error('[mcp.record_post_booking_feedback] response validation failed', validation.error.format());
    return responseError('RESPONSE_VALIDATION_FAILED', 'Internal error constructing feedback response.');
  }
  return validation.data;
};

export const recordPostBookingFeedbackHandler: ToolHandler = wrapToolBoundary(
  'record_post_booking_feedback',
  () => ({
    recorded: false,
    notes: 'OpenBook feedback capture is temporarily unavailable. Please try again shortly.',
  }),
  _recordPostBookingFeedbackImpl,
);
