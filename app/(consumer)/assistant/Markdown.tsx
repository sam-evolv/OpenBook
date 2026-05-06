'use client';

/**
 * Lightweight markdown renderer for assistant chat bubbles.
 *
 * Handles the small subset the model produces in practice:
 *   - **bold** / __bold__
 *   - *italic* / _italic_  (only when wrapped, never on stray underscores)
 *   - `inline code`
 *   - [label](https://url)
 *   - paragraph + line breaks
 *   - "- " bullet lines
 *
 * No third-party dep, no dangerouslySetInnerHTML, link hrefs are
 * filtered to http(s)/mailto/tel only.
 */

import { Fragment, type ReactNode } from 'react';

type Token =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; label: string; href: string };

const SAFE_HREF = /^(https?:|mailto:|tel:|\/)/i;

function tokenizeInline(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const pushText = (s: string) => {
    if (!s) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === 'text') last.value += s;
    else tokens.push({ type: 'text', value: s });
  };

  while (i < input.length) {
    const ch = input[i];

    // `code`
    if (ch === '`') {
      const end = input.indexOf('`', i + 1);
      if (end !== -1) {
        tokens.push({ type: 'code', value: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // **bold** or __bold__
    if ((ch === '*' || ch === '_') && input[i + 1] === ch) {
      const marker = ch + ch;
      const end = input.indexOf(marker, i + 2);
      if (end !== -1 && end > i + 2) {
        tokens.push({ type: 'bold', value: input.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // *italic* / _italic_  — only when the closing marker exists and the
    // wrapped span is non-empty + does not start/end with whitespace.
    if (ch === '*' || ch === '_') {
      const end = input.indexOf(ch, i + 1);
      if (
        end !== -1 &&
        end > i + 1 &&
        !/\s/.test(input[i + 1] ?? '') &&
        !/\s/.test(input[end - 1] ?? '')
      ) {
        tokens.push({ type: 'italic', value: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // [label](href)
    if (ch === '[') {
      const labelEnd = input.indexOf(']', i + 1);
      if (
        labelEnd !== -1 &&
        input[labelEnd + 1] === '('
      ) {
        const hrefEnd = input.indexOf(')', labelEnd + 2);
        if (hrefEnd !== -1) {
          const label = input.slice(i + 1, labelEnd);
          const href = input.slice(labelEnd + 2, hrefEnd).trim();
          if (SAFE_HREF.test(href)) {
            tokens.push({ type: 'link', label, href });
            i = hrefEnd + 1;
            continue;
          }
        }
      }
    }

    pushText(ch ?? '');
    i++;
  }

  return tokens;
}

function renderInline(input: string, keyPrefix: string): ReactNode[] {
  const tokens = tokenizeInline(input);
  return tokens.map((t, idx) => {
    const k = `${keyPrefix}-${idx}`;
    switch (t.type) {
      case 'bold':
        return (
          <strong key={k} className="font-semibold text-white">
            {t.value}
          </strong>
        );
      case 'italic':
        return (
          <em key={k} className="italic">
            {t.value}
          </em>
        );
      case 'code':
        return (
          <code
            key={k}
            className="px-1.5 py-0.5 rounded-md bg-white/[0.07] border border-white/[0.08] text-[13px] font-mono"
          >
            {t.value}
          </code>
        );
      case 'link':
        return (
          <a
            key={k}
            href={t.href}
            target={t.href.startsWith('/') ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="underline decoration-[#D4AF37]/50 underline-offset-2 hover:decoration-[#D4AF37]"
          >
            {t.label}
          </a>
        );
      case 'text':
      default:
        return <Fragment key={k}>{t.value}</Fragment>;
    }
  });
}

interface Block {
  kind: 'paragraph' | 'list';
  lines: string[];
}

function blockify(src: string): Block[] {
  const blocks: Block[] = [];
  const rawBlocks = src.replace(/\r\n/g, '\n').split(/\n{2,}/);

  for (const raw of rawBlocks) {
    const trimmed = raw.replace(/^\n+|\n+$/g, '');
    if (!trimmed) continue;

    const lines = trimmed.split('\n');
    const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
    if (isList) {
      blocks.push({
        kind: 'list',
        lines: lines.map((l) => l.replace(/^\s*[-*]\s+/, '')),
      });
    } else {
      blocks.push({ kind: 'paragraph', lines });
    }
  }
  return blocks;
}

export function Markdown({ children }: { children: string }) {
  if (!children) return null;
  const blocks = blockify(children);

  return (
    <>
      {blocks.map((b, bi) => {
        if (b.kind === 'list') {
          return (
            <ul key={`b-${bi}`} className="list-disc pl-5 my-1.5 space-y-0.5">
              {b.lines.map((line, li) => (
                <li key={`b-${bi}-${li}`}>
                  {renderInline(line, `b-${bi}-${li}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={`b-${bi}`}
            className={bi > 0 ? 'mt-2' : undefined}
          >
            {b.lines.map((line, li) => (
              <Fragment key={`b-${bi}-${li}`}>
                {li > 0 && <br />}
                {renderInline(line, `b-${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
