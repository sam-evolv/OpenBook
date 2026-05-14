import Link from 'next/link';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { ChevronLeft } from 'lucide-react';

interface LegalDocProps {
  title: string;
  body: string;
}

export function LegalDoc({ title, body }: LegalDocProps) {
  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(700px 380px at 50% -10%, rgba(212,175,55,0.08), transparent 55%),' +
            'linear-gradient(180deg, #050505 0%, #020202 100%)',
        }}
      />

      <header className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-2 flex items-center gap-3">
        <Link
          href="/me"
          aria-label="Back"
          className="h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-xl active:scale-90 transition-transform"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.1)',
          }}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <p className="text-[12px] font-semibold tracking-[0.18em] text-white/55 uppercase">
          {title}
        </p>
      </header>

      <div className="mx-auto max-w-prose px-5 pt-4 with-dock">
        <article className="ob-legal-prose">
          <Markdown rehypePlugins={[rehypeSanitize]}>{body}</Markdown>
        </article>
      </div>

      <style>{`
        .ob-legal-prose {
          font-family: var(--font-geist-sans), system-ui, sans-serif;
          font-size: 15.5px;
          line-height: 1.65;
          color: rgba(255,255,255,0.82);
        }
        .ob-legal-prose h1 {
          font-family: var(--font-fraunces), Georgia, serif;
          font-weight: 600;
          font-size: 32px;
          letter-spacing: -0.02em;
          line-height: 1.12;
          color: #ffffff;
          margin: 0 0 8px;
        }
        .ob-legal-prose h2 {
          font-family: var(--font-fraunces), Georgia, serif;
          font-weight: 600;
          font-size: 20px;
          letter-spacing: -0.01em;
          color: #ffffff;
          margin: 32px 0 10px;
        }
        .ob-legal-prose p { margin: 0 0 14px; }
        .ob-legal-prose strong { color: #ffffff; font-weight: 600; }
        .ob-legal-prose em { color: rgba(255,255,255,0.55); font-style: normal; font-size: 13px; letter-spacing: 0.02em; display: block; margin-bottom: 16px; }
        .ob-legal-prose a { color: #D4AF37; text-decoration: underline; text-underline-offset: 2px; }
        .ob-legal-prose ul, .ob-legal-prose ol { margin: 0 0 14px 1.4em; padding: 0; }
        .ob-legal-prose li { margin: 0 0 6px; }
        .ob-legal-prose hr { border: none; border-top: 0.5px solid rgba(255,255,255,0.08); margin: 24px 0; }
      `}</style>
    </main>
  );
}
