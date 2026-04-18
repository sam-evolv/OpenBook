import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload-logo
 *
 * Accepts a business logo and produces two artefacts:
 *  1. The raw logo — stored at `logos/{slug}.png`
 *  2. A processed iOS-style app icon — stored at `icons/{slug}.png`
 *
 * The processed icon is 512×512, with:
 *  - Background: radial gradient built from the logo's dominant colour
 *  - Logo centred at 60% of the canvas with transparent padding
 *  - Squircle mask (iOS superellipse)
 *  - Specular highlight layer on top
 *
 * This means any business — even one with a scrappy logo — gets an
 * App Store-quality icon automatically. No designer required.
 *
 * Body: multipart/form-data { businessId, file }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const businessId = formData.get('businessId') as string | null;
    const file = formData.get('file') as File | null;

    if (!businessId || !file) {
      return NextResponse.json(
        { error: 'businessId and file are required' },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();

    // Look up business for slug + brand colour hint
    const { data: business } = await sb
      .from('businesses')
      .select('slug, primary_colour')
      .eq('id', businessId)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Normalise the raw logo — trim transparent borders, resize to max 512
    const normalisedLogo = await sharp(buffer)
      .trim()
      .resize(512, 512, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();

    // 2. Extract dominant colour — used for fallback gradient
    const stats = await sharp(normalisedLogo).stats();
    const dominant = stats.dominant;
    const hexDominant = rgbToHex(dominant.r, dominant.g, dominant.b);

    // If business.primary_colour is default gold, use extracted colour
    const iconColour =
      !business.primary_colour ||
      business.primary_colour.toLowerCase() === '#d4af37'
        ? hexDominant
        : business.primary_colour;

    // 3. Build the processed icon composition (512×512)
    const processedIcon = await buildAppStoreIcon({
      logoBuffer: normalisedLogo,
      baseColour: iconColour,
    });

    // 4. Upload both to storage
    const [logoUpload, iconUpload] = await Promise.all([
      sb.storage
        .from('logos')
        .upload(`${business.slug}.png`, normalisedLogo, {
          upsert: true,
          contentType: 'image/png',
        }),
      sb.storage
        .from('icons')
        .upload(`${business.slug}.png`, processedIcon, {
          upsert: true,
          contentType: 'image/png',
        }),
    ]);

    if (logoUpload.error) {
      return NextResponse.json({ error: logoUpload.error.message }, { status: 500 });
    }
    if (iconUpload.error) {
      return NextResponse.json({ error: iconUpload.error.message }, { status: 500 });
    }

    const logoUrl = sb.storage.from('logos').getPublicUrl(`${business.slug}.png`)
      .data.publicUrl;
    const iconUrl = sb.storage.from('icons').getPublicUrl(`${business.slug}.png`)
      .data.publicUrl;

    // 5. Update business record
    const { error: updateErr } = await sb
      .from('businesses')
      .update({
        logo_url: logoUrl,
        processed_icon_url: iconUrl,
        primary_colour: iconColour,
      })
      .eq('id', businessId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      logoUrl,
      iconUrl,
      detectedColour: iconColour,
    });
  } catch (err: any) {
    console.error('[upload-logo]', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Compose a 512×512 iOS-style app icon from a logo and base colour.
 */
async function buildAppStoreIcon({
  logoBuffer,
  baseColour,
}: {
  logoBuffer: Buffer;
  baseColour: string;
}): Promise<Buffer> {
  const SIZE = 512;
  const { r, g, b } = hexToRgb(baseColour);

  // Build a gradient background as SVG (radial, three-stop)
  const bgSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
      <defs>
        <radialGradient id="g" cx="30%" cy="20%" r="85%">
          <stop offset="0%" stop-color="${lighten(r, g, b, 30)}" />
          <stop offset="45%" stop-color="rgb(${r}, ${g}, ${b})" />
          <stop offset="100%" stop-color="${darken(r, g, b, 50)}" />
        </radialGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#g)" />
      <!-- specular sheen -->
      <rect width="${SIZE}" height="${SIZE}" fill="url(#s)" />
      <defs>
        <linearGradient id="s" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.3)" />
          <stop offset="22%" stop-color="rgba(255,255,255,0.06)" />
          <stop offset="50%" stop-color="transparent" />
        </linearGradient>
      </defs>
    </svg>
  `;

  // Logo inset — 60% of canvas, centred
  const logoSize = Math.round(SIZE * 0.6);
  const resizedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: 'inside' })
    .toBuffer();

  // Squircle mask — superellipse n≈4
  const maskSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
      <path d="
        M 0,256
        C 0,56 56,0 256,0
        C 456,0 512,56 512,256
        C 512,456 456,512 256,512
        C 56,512 0,456 0,256
        Z
      " fill="white" />
    </svg>
  `;

  // Compose: background → logo → clip with squircle mask
  const composed = await sharp(Buffer.from(bgSvg))
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toBuffer();

  const masked = await sharp(composed)
    .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();

  return masked;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
function lighten(r: number, g: number, b: number, percent: number): string {
  const f = percent / 100;
  return `rgb(${Math.min(255, r + (255 - r) * f)}, ${Math.min(255, g + (255 - g) * f)}, ${Math.min(255, b + (255 - b) * f)})`;
}
function darken(r: number, g: number, b: number, percent: number): string {
  const f = 1 - percent / 100;
  return `rgb(${Math.floor(r * f)}, ${Math.floor(g * f)}, ${Math.floor(b * f)})`;
}
