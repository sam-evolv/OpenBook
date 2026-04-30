/**
 * Shared types for the consumer AI tab. Mirrors the SSE event payload
 * shapes emitted by lib/ai/agent.ts + lib/ai/tools.ts so the UI never
 * has to second-guess the wire format.
 */

export interface BusinessSummary {
  business_id: string;
  name: string;
  slug: string;
  category: string;
  primary_colour: string;
  address: string | null;
  rating: number | null;
}

export interface AvailabilitySlot {
  slot_start: string;
  slot_end: string;
}

export interface Proposal {
  business_id: string;
  service_id: string;
  business_name: string;
  service_name: string;
  slot_start: string;
  slot_end: string;
  price_cents: number;
  requires_payment: boolean;
  /** Filled in by the UI once the proposal is confirmed/cancelled. */
  status?: 'open' | 'confirmed' | 'cancelled';
  /**
   * UI-only flag. Set to true when this proposal was rehydrated from
   * localStorage after an OAuth round-trip. The Confirm handler uses
   * this to bypass the agent (which has no conversation history
   * post-redirect) and POST directly to /api/booking/confirm-from-proposal.
   */
  isResumed?: boolean;
}

export interface PaymentRequest {
  booking_id: string;
  payment_url: string;
  expires_at: string | null;
  /** Recap shown on the card — denormalised from the prior proposal. */
  proposal: Proposal;
  /** UI-only: lets us swap to a Confirmed card in place when polling sees status flip. */
  status?: 'awaiting_payment' | 'confirmed' | 'expired';
}

export interface ConfirmedBooking {
  booking_id: string;
  business_name: string;
  service_name: string;
  slot_start: string;
  slot_end: string;
  price_cents: number;
}

export interface AuthGate {
  pending_proposal: Proposal;
}

export type Message =
  | { id: string; kind: 'user'; content: string }
  | { id: string; kind: 'assistant_text'; content: string }
  | {
      id: string;
      kind: 'tool_call';
      tool: string;
      status: 'running' | 'done';
      args?: Record<string, unknown>;
    }
  | { id: string; kind: 'business_chips'; businesses: BusinessSummary[] }
  | {
      id: string;
      kind: 'availability_slots';
      business_id: string;
      service_id: string;
      slots: AvailabilitySlot[];
    }
  | { id: string; kind: 'proposal'; proposal: Proposal }
  | { id: string; kind: 'payment'; payment: PaymentRequest }
  | { id: string; kind: 'confirmed'; booking: ConfirmedBooking }
  | { id: string; kind: 'auth_gate'; gate: AuthGate }
  | { id: string; kind: 'error'; code: string; message: string };

/** What gets sent to /api/ai/chat — strip UI-only state. */
export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function toApiHistory(messages: Message[]): ApiMessage[] {
  const out: ApiMessage[] = [];
  for (const m of messages) {
    if (m.kind === 'user') {
      out.push({ role: 'user', content: m.content });
    } else if (m.kind === 'assistant_text' && m.content.trim().length > 0) {
      out.push({ role: 'assistant', content: m.content });
    }
  }
  return out;
}
