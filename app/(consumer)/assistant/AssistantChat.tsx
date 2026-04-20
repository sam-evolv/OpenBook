'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUp, Sparkles, Loader2, Star } from 'lucide-react';

type BizRef = {
  slug: string;
  name: string;
  category: string;
  city: string;
  primary_colour: string;
  rating: number | null;
  cover_image_url: string | null;
};

type Msg =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; businesses?: BizRef[] };

const SUGGESTIONS = [
  { label: 'Personal trainers', q: 'Find me a personal trainer nearby' },
  { label: 'Saunas tonight', q: 'Any saunas available tonight?' },
  { label: 'Barbers open now', q: 'Show me barbers open now' },
  { label: 'Yoga this week', q: 'Book a yoga class this week' },
];

export function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Msg = { role: 'user', content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error('Assistant request failed');
      const data = (await res.json()) as {
        reply: string;
        businesses?: BizRef[];
      };

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          businesses: data.businesses,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry — something went wrong reaching the assistant. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex flex-col min-h-[calc(100dvh-120px)]">
      {/* Empty / hero state (matches OpenHouse Select screenshot) */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-48">
          <div
            className="
              relative w-[108px] h-[108px] rounded-full
              flex items-center justify-center
              shadow-[0_20px_60px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]
            "
            style={{
              background:
                'radial-gradient(circle at 30% 25%, #F4D57A 0%, #D4AF37 45%, #8B6428 100%)',
            }}
          >
            <Sparkles className="w-12 h-12 text-black/80" strokeWidth={2} />
            <div
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: 'inset 0 -8px 20px rgba(0,0,0,0.25)',
              }}
            />
          </div>

          <p className="mt-6 text-[11px] font-semibold tracking-[0.22em] text-[#D4AF37] uppercase">
            OpenBook Assistant
          </p>

          <h1 className="mt-4 text-[26px] font-bold tracking-tight text-center leading-[1.2] max-w-[320px]">
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
                className="
                  h-11 px-4 rounded-full text-[13.5px] font-medium
                  bg-white/[0.04] border border-white/[0.08]
                  hover:border-white/20 active:scale-95
                  transition-all text-white/85
                "
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      {hasMessages && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pt-4 pb-[180px] space-y-4"
        >
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-white/50 px-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">Thinking…</span>
            </div>
          )}
        </div>
      )}

      {/* Input bar — pinned just above tab bar */}
      <div
        className="
          fixed left-0 right-0 z-40
          px-4 pb-[110px]
          bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent
          pt-6
        "
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
          className="
            flex items-center gap-2 h-[52px] pl-5 pr-2
            rounded-full
            bg-white/[0.05] border border-white/[0.10]
            focus-within:border-white/25 transition
            shadow-[0_10px_30px_rgba(0,0,0,0.5)]
          "
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any business…"
            className="
              flex-1 bg-transparent outline-none text-[15px]
              placeholder:text-white/35 text-white
            "
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="
              w-10 h-10 rounded-full flex items-center justify-center
              bg-[#D4AF37] text-black
              disabled:opacity-40 disabled:pointer-events-none
              active:scale-95 transition
              shadow-[0_4px_12px_rgba(212,175,55,0.4)]
            "
            aria-label="Send"
          >
            <ArrowUp className="w-5 h-5" strokeWidth={2.6} />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="
            max-w-[82%] px-4 py-2.5 rounded-[20px] rounded-br-md
            bg-[#D4AF37] text-black text-[15px] leading-snug font-medium
          "
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="
          max-w-[86%] px-4 py-3 rounded-[20px] rounded-bl-md
          bg-white/[0.05] border border-white/[0.08]
          text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap
        "
      >
        {msg.content}
      </div>

      {msg.businesses && msg.businesses.length > 0 && (
        <div className="flex flex-col gap-2 max-w-[86%]">
          {msg.businesses.map((b) => (
            <Link
              key={b.slug}
              href={`/business/${b.slug}`}
              className="
                flex items-center gap-3 p-2.5 rounded-2xl
                bg-white/[0.04] border border-white/[0.08]
                hover:border-white/20 active:scale-[0.99] transition
              "
            >
              <div
                className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0"
                style={{
                  background: `linear-gradient(140deg, ${b.primary_colour} 0%, ${b.primary_colour}55 100%)`,
                }}
              >
                {b.cover_image_url && (
                  <Image
                    src={b.cover_image_url}
                    alt={b.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-white truncate">
                  {b.name}
                </p>
                <p className="text-[12px] text-white/55 truncate">
                  {b.category} · {b.city}
                </p>
              </div>
              <div className="flex items-center gap-1 pr-1">
                <Star
                  className="w-[12px] h-[12px]"
                  strokeWidth={0}
                  style={{ fill: b.primary_colour, color: b.primary_colour }}
                />
                <span className="text-[12px] font-medium text-white/80">
                  {(b.rating ?? 5).toFixed(1)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
