import type { SupabaseClient } from '@supabase/supabase-js';
import { displayCustomerName } from './customer';

/**
 * Messages inbox data layer — Stage 1.
 *
 * `whatsapp_conversations` rows are the inbox entries; we fan out to:
 *  - `whatsapp_messages` for the latest line + preview text
 *  - `customers` for name/email match via phone
 *  - `ai_queries` for the ChatGPT/Claude/Gemini tab
 *
 * Everything is scoped server-side by business_id. RLS is enforced but
 * we still filter explicitly so the queries are deterministic in local
 * dev where RLS can be bypassed via service role.
 *
 * The `unknown as` casts below are belt-and-braces against PostgREST's
 * relationship-inference typing — the generated types cover these rows
 * as of 2026-04-23, but nested-select shapes still collapse to
 * overly-loose types that the compiler won't narrow. Drop the casts
 * in a separate cleanup pass if/when Supabase ships tighter typings.
 */

export type MessageSource = 'bot' | 'manual' | 'automation';

export interface InboxConversation {
  id: string;
  customer_phone: string;
  customer_name_hint: string | null;
  matched_customer_id: string | null;
  display_name: string;
  last_message_at: string | null;
  last_read_at: string | null;
  last_preview: string;
  last_direction: 'inbound' | 'outbound' | null;
  last_source: MessageSource | null;
  unread: boolean;
  state: string | null;
}

export interface ThreadMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  created_at: string;
  source: MessageSource | null;
  status: 'sent' | 'failed' | 'delivered' | null;
}

export interface CustomerContext {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  booking_count: number;
  lifetime_value_cents: number;
  last_booking_at: string | null;
  notes: string | null;
}

export interface AIQueryRow {
  id: string;
  source: string;
  query: string;
  region: string | null;
  resulted_in_booking_id: string | null;
  created_at: string;
}

export interface InboxPayload {
  conversations: InboxConversation[];
  unreadCount: number;
  aiQueries: AIQueryRow[];
}

interface ConversationRow {
  id: string;
  customer_phone: string;
  customer_name: string | null;
  last_message_at: string | null;
  last_read_at: string | null;
  state: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string | null;
  direction: string;
  body: string;
  created_at: string | null;
  source: string | null;
  status: string | null;
}

function normalisePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

function previewOf(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat;
}

function coerceSource(s: string | null): MessageSource | null {
  if (s === 'bot' || s === 'manual' || s === 'automation') return s;
  return null;
}

function coerceStatus(s: string | null): ThreadMessage['status'] {
  if (s === 'sent' || s === 'failed' || s === 'delivered') return s;
  return null;
}

/**
 * Load the full inbox for one business:
 *  - all conversations sorted by last_message_at desc
 *  - latest message per conversation (for preview + unread flags)
 *  - customer match via phone (so we can show names, not just numbers)
 *  - recent AI queries for the second tab
 *
 * Returned in one shot per page load; the Messages client poll-refreshes
 * via router.refresh() every 5 s while visible.
 */
export async function loadInbox(
  sb: SupabaseClient,
  businessId: string,
): Promise<InboxPayload> {
  const [convRes, aiRes] = await Promise.all([
    sb
      .from('whatsapp_conversations')
      .select('id, customer_phone, customer_name, last_message_at, last_read_at, state')
      .eq('business_id', businessId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(200),
    sb
      .from('ai_queries')
      .select('id, source, query, region, resulted_in_booking_id, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const conversationRows = (convRes.data ?? []) as unknown as ConversationRow[];
  const aiQueries = (aiRes.data ?? []) as unknown as AIQueryRow[];

  if (conversationRows.length === 0) {
    return { conversations: [], unreadCount: 0, aiQueries };
  }

  const convIds = conversationRows.map((c) => c.id);

  const [msgsRes, pivotRes] = await Promise.all([
    sb
      .from('whatsapp_messages')
      .select('id, conversation_id, direction, body, created_at, source, status')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(1000),
    // Customers already linked to this business via the pivot. Phones
    // are stored in every format imaginable ("+353 87…", "087…", raw
    // digits) so we fetch the bounded set and match in-memory against
    // normalised digits rather than trying to build a PostgREST OR.
    sb
      .from('customer_businesses')
      .select('customer_id, customers(id, full_name, name, phone, whatsapp_number)')
      .eq('business_id', businessId),
  ]);

  const messages = (msgsRes.data ?? []) as unknown as MessageRow[];
  const pivotRows = (pivotRes.data ?? []) as unknown as Array<{
    customer_id: string;
    customers:
      | {
          id: string;
          full_name: string | null;
          name: string | null;
          phone: string | null;
          whatsapp_number: string | null;
        }
      | null;
  }>;

  type CustomerLite = {
    id: string;
    full_name: string | null;
    name: string | null;
    phone: string | null;
    whatsapp_number: string | null;
  };

  // phone (digits only) -> first matching customer for this business
  const customerByPhone = new Map<string, CustomerLite>();
  for (const row of pivotRows) {
    const c = row.customers;
    if (!c) continue;
    if (c.phone) customerByPhone.set(normalisePhone(c.phone), c);
    if (c.whatsapp_number) customerByPhone.set(normalisePhone(c.whatsapp_number), c);
  }

  // conversation_id -> latest message
  const latestByConv = new Map<string, MessageRow>();
  for (const m of messages) {
    if (!m.conversation_id) continue;
    const existing = latestByConv.get(m.conversation_id);
    if (!existing || (m.created_at ?? '') > (existing.created_at ?? '')) {
      latestByConv.set(m.conversation_id, m);
    }
  }

  let unreadCount = 0;
  const conversations: InboxConversation[] = conversationRows.map((c) => {
    const matched = customerByPhone.get(normalisePhone(c.customer_phone));
    const latest = latestByConv.get(c.id);

    const displayName = displayCustomerName(
      matched
        ? {
            full_name: matched.full_name,
            name: matched.name,
            phone: matched.phone,
            whatsapp_number: matched.whatsapp_number,
          }
        : { name: c.customer_name, customer_phone: c.customer_phone },
    );

    const lastAt = c.last_message_at ?? latest?.created_at ?? null;
    const unread = isUnread(lastAt, c.last_read_at, latest);
    if (unread) unreadCount += 1;

    return {
      id: c.id,
      customer_phone: c.customer_phone,
      customer_name_hint: c.customer_name,
      matched_customer_id: matched?.id ?? null,
      display_name: displayName,
      last_message_at: lastAt,
      last_read_at: c.last_read_at,
      last_preview: latest ? previewOf(latest.body) : '',
      last_direction: (latest?.direction as 'inbound' | 'outbound' | null) ?? null,
      last_source: coerceSource(latest?.source ?? null),
      unread,
      state: c.state,
    };
  });

  return { conversations, unreadCount, aiQueries };
}

/**
 * Unread = latest inbound message is newer than last_read_at.
 * Outbound-only conversations are never unread.
 */
function isUnread(
  lastMessageAt: string | null,
  lastReadAt: string | null,
  latestMessage: MessageRow | undefined,
): boolean {
  if (!latestMessage) return false;
  if (latestMessage.direction !== 'inbound') return false;
  if (!lastMessageAt) return true;
  if (!lastReadAt) return true;
  return lastMessageAt > lastReadAt;
}

/**
 * Load the full message history for one conversation + the matched
 * customer's context (if any). Called on thread selection.
 */
export async function loadThread(
  sb: SupabaseClient,
  businessId: string,
  conversationId: string,
): Promise<{
  messages: ThreadMessage[];
  conversation: ConversationRow;
  customerContext: CustomerContext | null;
} | null> {
  const { data: convRaw } = await sb
    .from('whatsapp_conversations')
    .select('id, business_id, customer_phone, customer_name, last_message_at, last_read_at, state')
    .eq('id', conversationId)
    .maybeSingle();

  const conv = convRaw as unknown as (ConversationRow & { business_id: string }) | null;
  if (!conv || conv.business_id !== businessId) return null;

  const { data: msgsData } = await sb
    .from('whatsapp_messages')
    .select('id, direction, body, created_at, source, status')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);

  const msgs = (msgsData ?? []) as unknown as Array<
    Omit<MessageRow, 'conversation_id'>
  >;

  const messages: ThreadMessage[] = msgs.map((m) => ({
    id: m.id,
    direction: m.direction === 'outbound' ? 'outbound' : 'inbound',
    body: m.body,
    created_at: m.created_at ?? new Date().toISOString(),
    source: coerceSource(m.source),
    status: coerceStatus(m.status),
  }));

  const customerContext = await loadCustomerContextByPhone(
    sb,
    businessId,
    conv.customer_phone,
  );

  return {
    messages,
    conversation: {
      id: conv.id,
      customer_phone: conv.customer_phone,
      customer_name: conv.customer_name,
      last_message_at: conv.last_message_at,
      last_read_at: conv.last_read_at,
      state: conv.state,
    },
    customerContext,
  };
}

async function loadCustomerContextByPhone(
  sb: SupabaseClient,
  businessId: string,
  phone: string,
): Promise<CustomerContext | null> {
  const normalised = normalisePhone(phone);

  const { data: pivotData } = await sb
    .from('customer_businesses')
    .select('customer_id, customers(id, full_name, name, email, phone, whatsapp_number, notes)')
    .eq('business_id', businessId);

  const pivotRows = (pivotData ?? []) as unknown as Array<{
    customers:
      | {
          id: string;
          full_name: string | null;
          name: string | null;
          email: string | null;
          phone: string | null;
          whatsapp_number: string | null;
          notes: string | null;
        }
      | null;
  }>;

  const match = pivotRows
    .map((r) => r.customers)
    .find(
      (c): c is NonNullable<typeof c> =>
        !!c &&
        ((!!c.phone && normalisePhone(c.phone) === normalised) ||
          (!!c.whatsapp_number && normalisePhone(c.whatsapp_number) === normalised)),
    );

  if (!match) return null;

  const { data: bookingData } = await sb
    .from('bookings')
    .select('starts_at, price_cents, status')
    .eq('business_id', businessId)
    .eq('customer_id', match.id)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: false })
    .limit(500);

  const bookings = (bookingData ?? []) as Array<{
    starts_at: string;
    price_cents: number;
  }>;

  const booking_count = bookings.length;
  const lifetime_value_cents = bookings.reduce((s, b) => s + (b.price_cents ?? 0), 0);
  const last_booking_at = bookings[0]?.starts_at ?? null;

  return {
    id: match.id,
    display_name: displayCustomerName({
      full_name: match.full_name,
      name: match.name,
      phone: match.phone,
    }),
    email: match.email,
    phone: match.phone,
    booking_count,
    lifetime_value_cents,
    last_booking_at,
    notes: match.notes,
  };
}
