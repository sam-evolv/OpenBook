/**
 * GET /api/booking/[id]/share-image
 *
 * Renders the booking confirmation card as a 1080×1920 PNG (Instagram
 * Stories native ratio). Used both by the in-app Share modal as the
 * payload for navigator.share() and as the backgroundImage on the
 * Instagram Stories deep link.
 *
 * Caches immutably for a year — booking data is fixed once the row is
 * created, so the image is content-addressed by booking id.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { supabaseAdmin, type BookingWithDetails } from '@/lib/supabase';
import { getTileColour } from '@/lib/tile-palette';
import { formatConfirmationDateTimeDublin } from '@/lib/dublin-time';

// next/og works on both edge and nodejs runtimes; we pick nodejs because
// the Supabase admin client and font-fetch fallbacks are more predictable
// here, and the route is hit at most once per unique booking thanks to
// the immutable cache header.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GOLD = '#D4AF37';
const CARD_BG = '#080808';

const FRAUNCES_URL =
  'https://raw.githubusercontent.com/undercasetype/Fraunces/main/fonts/static/Fraunces/Fraunces-Medium.ttf';
const FRAUNCES_ITALIC_URL =
  'https://raw.githubusercontent.com/undercasetype/Fraunces/main/fonts/static/Fraunces/Fraunces-MediumItalic.ttf';

let cachedFraunces: ArrayBuffer | null = null;
let cachedFrauncesItalic: ArrayBuffer | null = null;

async function loadFont(url: string, cache: 'fraunces' | 'frauncesItalic'): Promise<ArrayBuffer | null> {
  if (cache === 'fraunces' && cachedFraunces) return cachedFraunces;
  if (cache === 'frauncesItalic' && cachedFrauncesItalic) return cachedFrauncesItalic;
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (cache === 'fraunces') cachedFraunces = buf;
    else cachedFrauncesItalic = buf;
    return buf;
  } catch (err) {
    console.warn('[share-image] font fetch failed', err);
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return new Response('not found', { status: 404 });

  const sb = supabaseAdmin();
  const { data } = await sb
    .from('bookings')
    .select(
      `
      id, starts_at, status,
      businesses (slug, name, primary_colour, category, processed_icon_url, logo_url),
      services (name)
    `,
    )
    .eq('id', id)
    .maybeSingle();

  const booking = data as unknown as BookingWithDetails | null;
  if (!booking) return new Response('not found', { status: 404 });

  const tile = getTileColour(booking.businesses.primary_colour);
  const startAt = new Date(booking.starts_at);
  const dateTimeLabel = formatConfirmationDateTimeDublin(startAt);
  const logo = booking.businesses.processed_icon_url ?? booking.businesses.logo_url ?? null;
  const initials = booking.businesses.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [fraunces, frauncesItalic] = await Promise.all([
    loadFont(FRAUNCES_URL, 'fraunces'),
    loadFont(FRAUNCES_ITALIC_URL, 'frauncesItalic'),
  ]);

  const fonts: { name: string; data: ArrayBuffer; weight: 500; style: 'normal' | 'italic' }[] = [];
  if (fraunces) fonts.push({ name: 'Fraunces', data: fraunces, weight: 500, style: 'normal' });
  if (frauncesItalic) {
    fonts.push({ name: 'Fraunces', data: frauncesItalic, weight: 500, style: 'italic' });
  }

  const headerBackground = `radial-gradient(140% 80% at 50% 0%, ${tile.mid}99 0%, ${tile.mid}33 35%, ${CARD_BG} 75%), ${CARD_BG}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          background: CARD_BG,
          color: '#ffffff',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 720,
            background: headerBackground,
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: 480,
            paddingLeft: 64,
            paddingRight: 64,
            flex: 1,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <LogoBlock
            logo={logo}
            initials={initials}
            colour={tile.mid}
          />

          <div
            style={{
              marginTop: 64,
              fontFamily: 'Fraunces, serif',
              fontWeight: 500,
              fontSize: 96,
              letterSpacing: '-2px',
              lineHeight: 1.05,
              color: GOLD,
              maxWidth: 880,
              display: 'flex',
              textAlign: 'center',
            }}
          >
            {booking.services.name}
          </div>

          <div
            style={{
              marginTop: 32,
              fontSize: 48,
              fontWeight: 500,
              letterSpacing: '-0.5px',
              color: 'rgba(255,255,255,0.92)',
              display: 'flex',
            }}
          >
            {dateTimeLabel}
          </div>

          <div
            style={{
              marginTop: 80,
              marginBottom: 80,
              color: GOLD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DiamondMark size={64} />
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div
            style={{
              fontSize: 36,
              color: 'rgba(255,255,255,0.7)',
              display: 'flex',
            }}
          >
            {booking.businesses.name}
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: 'monospace',
              fontSize: 28,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.5px',
              display: 'flex',
            }}
          >
            openbook.ie/{booking.businesses.slug}
          </div>

          <div
            style={{
              marginTop: 80,
              marginBottom: 110,
              fontFamily: 'Fraunces, serif',
              fontStyle: 'italic',
              fontSize: 44,
              color: 'rgba(255,255,255,0.6)',
              display: 'flex',
            }}
          >
            See you there.
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 56,
            bottom: 56,
            display: 'flex',
            alignItems: 'center',
            color: GOLD,
            opacity: 0.5,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '2px',
          }}
        >
          <DiamondMark size={22} />
          <span style={{ marginLeft: 10 }}>OPENBOOK</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: fonts.length ? fonts : undefined,
      headers: [
        ['Cache-Control', 'public, max-age=31536000, immutable'],
        ['Content-Type', 'image/png'],
      ],
    },
  );
}

function LogoBlock({
  logo,
  initials,
  colour,
}: {
  logo: string | null;
  initials: string;
  colour: string;
}) {
  const size = 240;
  const radius = Math.round(size * 0.28);
  if (logo) {
    return (
      <div
        style={{
          display: 'flex',
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
          background: '#1a1a1a',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(155deg, ${lighten(colour, 36)} 0%, ${colour} 50%, ${darken(colour, 28)} 100%)`,
        color: '#ffffff',
        fontFamily: 'Fraunces, serif',
        fontWeight: 700,
        fontSize: 96,
        letterSpacing: '-2px',
      }}
    >
      {initials}
    </div>
  );
}

function DiamondMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M12 2.6 L21.4 12 L12 21.4 L2.6 12 Z" />
      <path d="M12 7.5 L16.5 12 L12 16.5 L7.5 12 Z" />
    </svg>
  );
}

function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
