'use client';

/**
 * Consumer AI tab — agent-loop UI.
 *
 * Streams Server-Sent Events from /api/ai/chat and renders inline
 * cards for every meaningful agent step: business chips, availability
 * slot pickers, proposal cards, payment cards (with countdown +
 * polling), confirmation cards, and an auth-gate card for anonymous
 * users.  Conversation state persists to localStorage so a refresh or
 * an OAuth round-trip (anonymous → signed-in) doesn't drop
 * the user back to a blank chat.
 *
 * The bottom nav, global gold/black theme, hero empty state, and
 * pinned input bar are deliberately preserved from the previous
 * iteration — only the chat surface changes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUp, Plus, Sparkles } from 'lucide-react';
import { parseSSE } from './sse';
import {
  AuthGateCard,
  AvailabilitySlots,
  BusinessChips,
  ConfirmedCard,
  ErrorPill,
  PaymentCard,
  ProposalCard,
  ToolPill,
  TypingDots,
} from './cards';
import {
  clearActiveConversation,
  getOrCreateAnonSessionId,
  getOrCreateConversationId,
  loadActiveConversation,
  loadConversation,
  saveConversation,
  setActiveConversationId,
} from './storage';
import { toApiHistory, type Message, type Proposal } from './types';

const SUGGESTIONS = [
  { label: 'Personal trainers', q: 'Find me a personal trainer nearby' },
  { label: 'Saunas tonight', q: 'Any saunas available tonight?' },
  { label: 'Barbers open now', q: 'Show me barbers open now' },
  { label: 'Yoga this week', q: 'Book a yoga class this week' },
];

const TOOL_LABELS: Record<string, string> = {
  search_businesses: 'Searching businesses…',
  list_services: 'Looking up services…',
  get_availability: 'Checking availability…',
  propose_slot: 'Drafting your booking…',
  hold_and_book: 'Holding your slot…',
  cancel_hold: 'Releasing the slot…',
};

const ERROR_COPY: Record<string, string> = {
  slot_unavailable: 'That slot was just taken — let me find another.',
  rate_limited: 'Slow down a moment — too many requests. Try again in a minute.',
  ai_unavailable: 'The booking assistant is having a moment. Please try again.',
  tool_failed: 'A tool call failed — let me try again.',
  checkout_unavailable: 'Could not start payment. Please try again.',
};

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'm_' + Math.random().toString(36).slice(2);
}

export function AssistantChat() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamPending, setStreamPending] = useState(false);
  const [inputDisabledUntil, setInputDisabledUntil] = useState(0);
  const [showResumeNote, setShowResumeNote] = useState(false);

  const conversationIdRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Buckets the most recent text bubble so deltas append to it instead
  // of creating a new bubble per token.
  const activeTextIdRef = useRef<string | null>(null);
  // Map tool_call_id (synthetic by name+order) → message id so we can
  // mark the pill 'done' and drop it once the result is rendered as a
  // standalone card (chips, slots, proposal, etc).
  const activeToolPillsRef = useRef<{ id: string; tool: string }[]>([]);

  // ----- Init / resume -----
  useEffect(() => {
    const resumeParam = searchParams?.get('resume');
    if (resumeParam) {
      const saved = loadConversation(resumeParam);
      if (saved) {
        conversationIdRef.current = saved.conversation_id;
        setActiveConversationId(saved.conversation_id);
        // Reactivate any pending auth-gate card as a fresh proposal so the
        // newly-authed user can confirm without retyping intent.
        const reopened = saved.messages.map((m) => {
          if (m.kind === 'auth_gate') {
            return {
              id: uid(),
              kind: 'proposal',
              proposal: {
                ...(m.gate.pending_proposal as Proposal),
                status: 'open' as const,
              },
            } as Message;
          }
          return m;
        });
        setMessages(reopened);
        setShowResumeNote(true);
      } else {
        // Resume id pointed to nothing — start fresh.
        conversationIdRef.current = getOrCreateConversationId();
      }
      router.replace('/assistant');
      return;
    }

    const active = loadActiveConversation();
    if (active) {
      conversationIdRef.current = active.conversation_id;
      setMessages(active.messages);
    } else {
      conversationIdRef.current = getOrCreateConversationId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every meaningful change.
  useEffect(() => {
    if (!conversationIdRef.current) return;
    if (messages.length === 0) return;
    saveConversation(conversationIdRef.current, messages);
  }, [messages]);

  // Auto-scroll on new messages / streaming.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, streamPending]);

  // Hide resume note after a few seconds.
  useEffect(() => {
    if (!showResumeNote) return;
    const t = setTimeout(() => setShowResumeNote(false), 4000);
    return () => clearTimeout(t);
  }, [showResumeNote]);

  // ----- Helpers --------------------------------------------------

  const appendMessage = useCallback((m: Message) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const updateMessage = useCallback(
    (id: string, fn: (m: Message) => Message) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
    },
    []
  );

  const dropPillsForTool = useCallback(
    (tool: string) => {
      const ids = activeToolPillsRef.current
        .filter((p) => p.tool === tool)
        .map((p) => p.id);
      activeToolPillsRef.current = activeToolPillsRef.current.filter(
        (p) => p.tool !== tool
      );
      if (ids.length > 0) {
        setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
      }
    },
    []
  );

  // ----- Streaming runner -----------------------------------------

  const runStream = useCallback(
    async (history: Message[]) => {
      if (busy) return;
      setBusy(true);
      setStreamPending(true);
      activeTextIdRef.current = null;
      activeToolPillsRef.current = [];

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: toApiHistory(history),
            conversation_id: conversationIdRef.current,
            session_id: getOrCreateAnonSessionId(),
          }),
        });

        if (!res.ok && res.status !== 200) {
          appendMessage({
            id: uid(),
            kind: 'error',
            code: 'http_error',
            message:
              ERROR_COPY.ai_unavailable ?? 'Something went wrong. Try again.',
          });
          return;
        }

        for await (const ev of parseSSE(res)) {
          handleSSE(ev.event, ev.data);
        }
      } catch (e: any) {
        appendMessage({
          id: uid(),
          kind: 'error',
          code: 'network',
          message: 'Lost connection to the assistant. Please try again.',
        });
      } finally {
        setBusy(false);
        setStreamPending(false);
        activeTextIdRef.current = null;
      }
    },
    [busy, appendMessage]
  );

  function handleSSE(event: string, data: any) {
    switch (event) {
      case 'text': {
        const delta: string = typeof data?.delta === 'string' ? data.delta : '';
        if (!delta) return;
        const activeId = activeTextIdRef.current;
        if (activeId) {
          updateMessage(activeId, (m) =>
            m.kind === 'assistant_text'
              ? { ...m, content: m.content + delta }
              : m
          );
        } else {
          const id = uid();
          activeTextIdRef.current = id;
          appendMessage({ id, kind: 'assistant_text', content: delta });
        }
        return;
      }

      case 'tool_call_start': {
        // Any new tool call ends the current text bubble so subsequent text
        // (post-tool reasoning) renders as a fresh bubble below the result.
        activeTextIdRef.current = null;
        const tool: string = String(data?.tool_name ?? 'tool');
        const id = uid();
        activeToolPillsRef.current.push({ id, tool });
        appendMessage({
          id,
          kind: 'tool_call',
          tool,
          status: 'running',
          args: data?.args ?? undefined,
        });
        return;
      }

      case 'tool_call_result': {
        const tool: string = String(data?.tool_name ?? '');
        const result = data?.result ?? {};

        if (tool === 'search_businesses') {
          const businesses = Array.isArray(result?.businesses)
            ? result.businesses
            : [];
          // Drop the running pill — chips speak for themselves.
          dropPillsForTool(tool);
          if (businesses.length > 0) {
            appendMessage({
              id: uid(),
              kind: 'business_chips',
              businesses,
            });
          }
          return;
        }

        if (tool === 'get_availability') {
          const slots = Array.isArray(result?.slots) ? result.slots : [];
          dropPillsForTool(tool);
          if (slots.length > 0) {
            // We don't get business_id/service_id back from the tool result
            // payload directly, but the args carried them in.
            appendMessage({
              id: uid(),
              kind: 'availability_slots',
              business_id: '',
              service_id: '',
              slots,
            });
          }
          return;
        }

        if (tool === 'list_services') {
          // Result isn't independently rendered — the model usually answers
          // in text. Drop the pill quietly.
          dropPillsForTool(tool);
          return;
        }

        // Default: drop the pill.
        dropPillsForTool(tool);
        return;
      }

      case 'proposal': {
        // Results from propose_slot — already cleared by the agent loop emitting
        // its own proposal event in addition to tool_call_result we don't get.
        dropPillsForTool('propose_slot');
        const proposal: Proposal = { ...(data as Proposal), status: 'open' };
        appendMessage({ id: uid(), kind: 'proposal', proposal });
        return;
      }

      case 'payment_required': {
        dropPillsForTool('hold_and_book');
        // Recap from the most recent open proposal.
        let recap: Proposal | null = null;
        setMessages((prev) => {
          for (let i = prev.length - 1; i >= 0; i--) {
            const m = prev[i]!;
            if (m.kind === 'proposal') {
              recap = m.proposal;
              break;
            }
          }
          return prev;
        });
        const proposal: Proposal =
          recap ??
          ({
            business_id: '',
            service_id: '',
            business_name: '',
            service_name: '',
            slot_start: new Date().toISOString(),
            slot_end: new Date().toISOString(),
            price_cents: 0,
            requires_payment: true,
          } as Proposal);
        appendMessage({
          id: uid(),
          kind: 'payment',
          payment: {
            booking_id: String(data.booking_id),
            payment_url: String(data.payment_url),
            expires_at: data.expires_at ?? null,
            proposal,
            status: 'awaiting_payment',
          },
        });
        return;
      }

      case 'confirmed': {
        dropPillsForTool('hold_and_book');
        // Find the open proposal for the recap.
        setMessages((prev) => {
          let recap: Proposal | null = null;
          const next = prev.map((m) => {
            if (m.kind === 'proposal' && m.proposal.status !== 'cancelled') {
              recap = m.proposal;
              return {
                ...m,
                proposal: { ...m.proposal, status: 'confirmed' as const },
              };
            }
            return m;
          });
          const recapSafe: Proposal =
            recap ??
            ({
              business_id: '',
              service_id: '',
              business_name: '',
              service_name: '',
              slot_start: new Date().toISOString(),
              slot_end: new Date().toISOString(),
              price_cents: 0,
              requires_payment: false,
            } as Proposal);
          return [
            ...next,
            {
              id: uid(),
              kind: 'confirmed',
              booking: {
                booking_id: String(data.booking_id),
                business_name: recapSafe.business_name,
                service_name: recapSafe.service_name,
                slot_start: recapSafe.slot_start,
                slot_end: recapSafe.slot_end,
                price_cents: recapSafe.price_cents,
              },
            } as Message,
          ];
        });
        return;
      }

      case 'requires_auth': {
        dropPillsForTool('hold_and_book');
        const pending = (data?.pending_proposal ?? {}) as {
          business_id: string;
          service_id: string;
          slot_start: string;
        };
        let recap: Proposal | null = null;
        setMessages((prev) => {
          for (let i = prev.length - 1; i >= 0; i--) {
            const m = prev[i]!;
            if (m.kind === 'proposal') {
              recap = m.proposal;
              break;
            }
          }
          return prev;
        });
        const proposal: Proposal = recap
          ? { ...(recap as Proposal), ...pending }
          : ({
              ...pending,
              business_name: '',
              service_name: '',
              slot_end: pending.slot_start,
              price_cents: 0,
              requires_payment: false,
            } as Proposal);
        appendMessage({
          id: uid(),
          kind: 'auth_gate',
          gate: { pending_proposal: proposal },
        });
        return;
      }

      case 'error': {
        const code = String(data?.code ?? 'unknown');
        const message =
          ERROR_COPY[code] ??
          (data?.message ? `Something went wrong: ${data.message}` : 'Something went wrong.');
        appendMessage({ id: uid(), kind: 'error', code, message });
        if (code === 'rate_limited') {
          setInputDisabledUntil(Date.now() + 15_000);
        }
        return;
      }

      case 'done':
      default:
        return;
    }
  }

  // ----- User send ------------------------------------------------

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      const userMsg: Message = { id: uid(), kind: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      // history snapshot includes the new user message
      const next = [...messages, userMsg];
      await runStream(next);
    },
    [busy, messages, runStream]
  );

  // ----- Card callbacks ------------------------------------------

  const onConfirmProposal = useCallback(
    (proposalId: string) => {
      const target = messages.find((m) => m.id === proposalId);
      const proposal =
        target && target.kind === 'proposal' ? target.proposal : null;
      if (!proposal) return;

      updateMessage(proposalId, (m) =>
        m.kind === 'proposal'
          ? { ...m, proposal: { ...m.proposal, status: 'confirmed' } }
          : m
      );

      void confirmProposal(proposal);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, updateMessage]
  );

  // The single confirmation path. POSTs the proposal IDs to
  // /api/booking/confirm and surfaces the response as a Confirmed,
  // Payment, or AuthGate card. The agent has no booking tool any more —
  // see PR #69 — so this is now the only way a booking gets created from
  // the AI tab.
  const confirmProposal = useCallback(
    async (proposal: Proposal) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch('/api/booking/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: proposal.business_id,
            service_id: proposal.service_id,
            slot_start: proposal.slot_start,
          }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          kind?: 'confirmed' | 'checkout';
          booking_id?: string;
          url?: string;
          expires_at?: string | null;
          error?: string;
          message?: string;
        };

        // 401 → render the AuthGate card. localStorage already has the
        // proposal (the persistence useEffect runs on every messages
        // change), so after Google OAuth the resume flow rehydrates the
        // proposal and the same Confirm path retries with a session.
        if (res.status === 401) {
          appendMessage({
            id: uid(),
            kind: 'auth_gate',
            gate: { pending_proposal: proposal },
          });
          return;
        }

        if (!res.ok) {
          const code = payload.error ?? 'hold_failed';
          const message =
            ERROR_COPY[code] ??
            (payload.message
              ? `Could not confirm: ${payload.message}`
              : 'Could not confirm the booking. Please try again.');
          appendMessage({ id: uid(), kind: 'error', code, message });
          return;
        }

        if (payload.kind === 'confirmed' && payload.booking_id) {
          appendMessage({
            id: uid(),
            kind: 'confirmed',
            booking: {
              booking_id: payload.booking_id,
              business_name: proposal.business_name,
              service_name: proposal.service_name,
              slot_start: proposal.slot_start,
              slot_end: proposal.slot_end,
              price_cents: proposal.price_cents,
            },
          });
          return;
        }

        if (payload.kind === 'checkout' && payload.booking_id && payload.url) {
          appendMessage({
            id: uid(),
            kind: 'payment',
            payment: {
              booking_id: payload.booking_id,
              payment_url: payload.url,
              expires_at: payload.expires_at ?? null,
              proposal,
              status: 'awaiting_payment',
            },
          });
          // Open Stripe in a new tab from the same user-gesture chain.
          // Popup blockers may still drop it after the await — the
          // PaymentCard's "Pay with Stripe" button is the reliable
          // fallback, so we don't depend on this succeeding.
          try {
            window.open(payload.url, '_blank', 'noopener,noreferrer');
          } catch {
            /* popup blocked — user can tap the card button */
          }
          return;
        }

        appendMessage({
          id: uid(),
          kind: 'error',
          code: 'unexpected_response',
          message: 'Unexpected response from booking service.',
        });
      } catch {
        appendMessage({
          id: uid(),
          kind: 'error',
          code: 'network',
          message: 'Lost connection while confirming. Please try again.',
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, appendMessage]
  );

  const onCancelProposal = useCallback(
    (proposalId: string) => {
      updateMessage(proposalId, (m) =>
        m.kind === 'proposal'
          ? { ...m, proposal: { ...m.proposal, status: 'cancelled' } }
          : m
      );
      void send('Actually, let me think');
    },
    [send, updateMessage]
  );

  const onPickSlot = useCallback(
    (slotIso: string) => {
      // The model already knows the date from the get_availability args;
      // a natural-language confirmation is enough to trigger propose_slot.
      const time = new Intl.DateTimeFormat('en-IE', {
        timeZone: 'Europe/Dublin',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(slotIso));
      void send(`${time} works`);
    },
    [send]
  );

  const onPaymentStatus = useCallback(
    (paymentId: string, next: any) => {
      updateMessage(paymentId, (m) =>
        m.kind === 'payment' ? { ...m, payment: next } : m
      );
      if (next?.status === 'confirmed') {
        // Insert a Confirmed card right after the payment message.
        setMessages((prev) => {
          const idx = prev.findIndex((p) => p.id === paymentId);
          if (idx === -1) return prev;
          const payment = prev[idx];
          if (!payment || payment.kind !== 'payment') return prev;
          const insertion: Message = {
            id: uid(),
            kind: 'confirmed',
            booking: {
              booking_id: payment.payment.booking_id,
              business_name: payment.payment.proposal.business_name,
              service_name: payment.payment.proposal.service_name,
              slot_start: payment.payment.proposal.slot_start,
              slot_end: payment.payment.proposal.slot_end,
              price_cents: payment.payment.proposal.price_cents,
            },
          };
          return [...prev.slice(0, idx + 1), insertion, ...prev.slice(idx + 1)];
        });
      }
    },
    [updateMessage]
  );

  const onPaymentExpired = useCallback(
    (paymentId: string) => {
      updateMessage(paymentId, (m) =>
        m.kind === 'payment'
          ? { ...m, payment: { ...m.payment, status: 'expired' } }
          : m
      );
    },
    [updateMessage]
  );

  const onPaymentRetry = useCallback(() => {
    void send('Let me try a different time');
  }, [send]);

  const onNewChat = useCallback(() => {
    if (busy) return;
    clearActiveConversation();
    conversationIdRef.current = getOrCreateConversationId();
    setMessages([]);
    setInput('');
    setShowResumeNote(false);
  }, [busy]);

  const hasMessages = messages.length > 0;
  const inputDisabled =
    busy || (inputDisabledUntil > 0 && Date.now() < inputDisabledUntil);

  return (
    <div className="relative flex flex-col min-h-[calc(100dvh-120px)]">
      {/* Header row with New chat affordance — only shown once a conversation exists */}
      {hasMessages && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          {showResumeNote ? (
            <p className="text-[12px] text-white/60 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Welcome back — ready when you are.
            </p>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label="New chat"
            onClick={onNewChat}
            disabled={busy}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.08] hover:border-white/20 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="w-4 h-4 text-white/75" />
          </button>
        </div>
      )}

      {/* Hero / empty state */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-48">
          <div
            className="relative w-[108px] h-[108px] rounded-full flex items-center justify-center shadow-[0_20px_60px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]"
            style={{
              background:
                'radial-gradient(circle at 30% 25%, #F4D57A 0%, #D4AF37 45%, #8B6428 100%)',
            }}
          >
            <Sparkles className="w-12 h-12 text-black/80" strokeWidth={2} />
            <div
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: 'inset 0 -8px 20px rgba(0,0,0,0.25)' }}
            />
          </div>

          <p className="mt-6 text-[11px] font-semibold tracking-[0.22em] text-[#D4AF37] uppercase">
            OpenBook Assistant
          </p>

          <h1 className="mt-4 text-[26px] font-bold tracking-tight text-center leading-[1.2] max-w-[320px] font-serif">
            Ask anything about
            <br />
            local businesses
          </h1>

          <p className="mt-3 text-[15px] text-white/55 text-center max-w-[320px] leading-snug">
            Book a trainer, find a sauna, reserve a barber.
            <br />
            Answered instantly.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-2.5 w-full max-w-[320px]">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.q)}
                className="h-11 px-4 rounded-full text-[13.5px] font-medium bg-white/[0.04] border border-white/[0.08] hover:border-white/20 active:scale-95 transition-all text-white/85"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation surface */}
      {hasMessages && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pt-3 pb-[180px] space-y-3"
        >
          {messages.map((m) => (
            <MessageRow
              key={m.id}
              msg={m}
              conversationId={conversationIdRef.current}
              onConfirmProposal={() => onConfirmProposal(m.id)}
              onCancelProposal={() => onCancelProposal(m.id)}
              onPickSlot={onPickSlot}
              onPaymentStatusChange={(next) => onPaymentStatus(m.id, next)}
              onPaymentExpired={() => onPaymentExpired(m.id)}
              onPaymentRetry={onPaymentRetry}
              cardsDisabled={busy}
            />
          ))}
          {streamPending && activeTextIdRef.current === null && (
            <TypingDots />
          )}
        </div>
      )}

      {/* Input bar — pinned just above tab bar */}
      <div
        className="fixed left-0 right-0 z-40 px-4 pb-[110px] bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent pt-6"
        style={{ bottom: 0 }}
      >
        <p className="text-center text-[11px] text-white/35 mb-2">
          Powered by AI · Information for reference only
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 h-[52px] pl-5 pr-2 rounded-full bg-white/[0.05] border border-white/[0.10] focus-within:border-white/25 transition shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any business…"
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-white/35 text-white"
            disabled={inputDisabled}
          />
          <button
            type="submit"
            disabled={!input.trim() || inputDisabled}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#D4AF37] text-black disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition shadow-[0_4px_12px_rgba(212,175,55,0.4)]"
            aria-label="Send"
          >
            <ArrowUp className="w-5 h-5" strokeWidth={2.6} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function MessageRow({
  msg,
  conversationId,
  onConfirmProposal,
  onCancelProposal,
  onPickSlot,
  onPaymentStatusChange,
  onPaymentExpired,
  onPaymentRetry,
  cardsDisabled,
}: {
  msg: Message;
  conversationId: string;
  onConfirmProposal: () => void;
  onCancelProposal: () => void;
  onPickSlot: (slotIso: string) => void;
  onPaymentStatusChange: (next: any) => void;
  onPaymentExpired: () => void;
  onPaymentRetry: () => void;
  cardsDisabled: boolean;
}) {
  switch (msg.kind) {
    case 'user':
      return (
        <div className="flex justify-end">
          <div className="max-w-[82%] px-4 py-2.5 rounded-[20px] rounded-br-md bg-[#D4AF37] text-black text-[15px] leading-snug font-medium">
            {msg.content}
          </div>
        </div>
      );

    case 'assistant_text':
      if (!msg.content) return null;
      return (
        <div className="flex">
          <div className="max-w-[86%] px-4 py-3 rounded-[20px] rounded-bl-md bg-white/[0.05] border border-white/[0.08] text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap">
            {msg.content}
          </div>
        </div>
      );

    case 'tool_call':
      return (
        <div>
          <ToolPill label={TOOL_LABELS[msg.tool] ?? `Working on ${msg.tool}…`} />
        </div>
      );

    case 'business_chips':
      return <BusinessChips businesses={msg.businesses} />;

    case 'availability_slots':
      return (
        <AvailabilitySlots
          slots={msg.slots}
          onPick={(s) => onPickSlot(s.slot_start)}
          disabled={cardsDisabled}
        />
      );

    case 'proposal':
      return (
        <ProposalCard
          proposal={msg.proposal}
          onConfirm={onConfirmProposal}
          onCancel={onCancelProposal}
        />
      );

    case 'payment':
      return (
        <PaymentCard
          payment={msg.payment}
          onStatusChange={onPaymentStatusChange}
          onExpired={onPaymentExpired}
          onRetry={onPaymentRetry}
        />
      );

    case 'confirmed':
      return <ConfirmedCard booking={msg.booking} />;

    case 'auth_gate':
      return (
        <AuthGateCard gate={msg.gate} conversationId={conversationId} />
      );

    case 'error':
      return <ErrorPill message={msg.message} />;

    default:
      return null;
  }
}
