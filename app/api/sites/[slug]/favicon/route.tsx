/**
 * GET /api/sites/[slug]/favicon
 *
 * Fallback favicon for a business marketing site when the business
 * hasn't uploaded a logo_url. Renders a 192×192 PNG of the business's
 * initials on a solid block of their primary tile colour — so the
 * browser tab on [slug].openbook.ie never inherits OpenBook's OB
 * monogram.
 *
 * 192×192 is the PWA-installable size; browsers downscale to 16/32 for
 * the tab. The image is deterministic from the slug + business row, so
 * we cache aggressively at the edge (24h fresh, 7d stale-while-
 * revalidate). When a business uploads a logo, generateMetadata in
 * app/sites/[slug]/page.tsx routes the icon to logo_url directly and
 * this route stops being hit.
 */
import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase';
import { getTileColour, tileTextColour } from '@/lib/tile-palette';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIZE = 192;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug) return new Response('Not found', { status: 404 });

  const { data: business } = await supabaseAdmin()
    .from('businesses')
    .select('name, primary_colour, website_is_published')
    .eq('slug', slug)
    .maybeSingle();

  if (!business || !business.website_is_published) {
    return new Response('Not found', { status: 404 });
  }

  const tile = getTileColour(business.primary_colour);
  const initials = getInitials(business.name);
  const textColour = tileTextColour(tile);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tile.mid,
          color: textColour,
          fontSize: 96,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {initials}
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      headers: [
        ['Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800'],
        ['Content-Type', 'image/png'],
      ],
    },
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0]!.toUpperCase();
  return (words[0][0]! + words[words.length - 1][0]!).toUpperCase();
}
