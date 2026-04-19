'use client';

import { Reveal, RevealItem } from './shared/Reveal';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How fast can I really be live?',
    a: 'Most businesses are taking bookings within 15 minutes. You add your services and hours, drop in your logo and primary colour, connect Stripe once (takes about 4 minutes), and your booking page is live at openbook.ie/yourname. If you want a custom domain, that takes an extra 10 minutes with a DNS change.',
  },
  {
    q: 'Do you take a cut of my bookings?',
    a: 'No platform commission. On Growth we charge 2% on top of Stripe\'s card fee — no flat monthly. On Pro you pay €39/month flat and there are zero transaction fees on every booking. Your customers are never charged a booking fee.',
  },
  {
    q: 'What does "AI distribution" actually mean?',
    a: 'Every OpenBook business is published to a live MCP server at mcp.openbook.ie that ChatGPT, Claude and Gemini can query. When a customer asks their assistant for a personal trainer in Dublin or a sauna in Cork tonight, the assistant can see your availability and offer your business as an answer — with a direct booking link. No other booking platform in Ireland does this.',
  },
  {
    q: 'Can my customers book without creating an account?',
    a: 'Yes. Bookings are guest-first: name, email, card, done. We optionally save their card and preferences so rebooking is two taps next time — but only if they want.',
  },
  {
    q: 'What if I already have a website?',
    a: 'Keep it. Most businesses embed an OpenBook booking button or link their existing "Book Now" button to their openbook.ie page. You can also point a subdomain like book.yourbusiness.ie at OpenBook and keep everything else as-is.',
  },
  {
    q: 'How does the WhatsApp booking bot work?',
    a: 'Customers message your business WhatsApp number the way they already do. Our AI reads the message, finds available slots from your calendar, confirms and takes payment through a secure link. You see the booking land in your OpenBook dashboard. Requires Pro.',
  },
  {
    q: 'Is my data safe? Where is it stored?',
    a: 'All data lives on Supabase in the EU (Frankfurt region). We never sell customer data, never share it with third parties for advertising, and you can export or delete your entire business at any time.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. One-click from the dashboard, no phone call required, no notice period. If you cancel, we keep your data for 30 days in case you change your mind, then it\'s permanently deleted.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-28 md:py-40 border-t border-white/[0.04]">
      <Reveal className="mx-auto max-w-3xl px-6 text-center" stagger={0.08}>
        <RevealItem>
          <span className="eyebrow text-paper/55">Questions</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-5 display text-[clamp(34px,5.6vw,58px)] text-paper">
            The <em>honest answers.</em>
          </h2>
        </RevealItem>
      </Reveal>

      <Reveal className="mx-auto mt-14 max-w-3xl px-6" stagger={0.05} amount={0.1}>
        <ul className="flex flex-col gap-2">
          {FAQS.map((f, i) => (
            <RevealItem key={i}>
              <details className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] open:bg-white/[0.03] open:border-white/[0.1] transition-colors">
                <summary className="list-none cursor-pointer px-6 py-5 flex items-center gap-4">
                  <span className="flex-1 text-[16px] md:text-[17px] text-paper font-medium tracking-tight">
                    {f.q}
                  </span>
                  <span
                    aria-hidden
                    className="faq-mark shrink-0 text-gold text-[22px] leading-none select-none"
                  >
                    +
                  </span>
                </summary>
                <div className="px-6 pb-6 text-[14.5px] leading-[1.7] text-paper/70">{f.a}</div>
              </details>
            </RevealItem>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
