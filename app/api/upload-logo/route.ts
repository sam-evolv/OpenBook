import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/upload-logo
 * Form data: { businessId, file }
 *
 * The Apple-standard icon pipeline.
 *
 * Pipeline stages:
 *   1. Read uploaded image buffer
 *   2. Auto-trim near-white/transparent edges (threshold-based alpha)
 *   3. Detect dominant brand colour from the logo (the colour the user's
 *      brand actually uses — not the background they happened to upload on)
 *   4. Scale logo to 62% of canvas (Apple's visual-centre ratio)
 *   5. Compose on radial-gradient background in the chosen primary colour
 *   6. Add drop shadow under the logo
 *   7. Add subtle top highlight arc for 3D feel
 *   8. Apply squircle mask (Apple super-ellipse n=5)
 *   9. Output 1024x1024 processed icon + keep the stripped logo PNG
 *  10. Upload both to Supabase Storage
 *  11. Return URLs + detected colour
 */

const FINAL_SIZE = 1024;
const LOGO_RATIO = 0.62;  // logo fills 62% of canvas
const WHITE_THRESHOLD = 240;
const SHADOW_BLUR = 16;
const HIGHLIGHT_HEIGHT_RATIO = 0.15;

export async function POST(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const formData = await req.formData();
  const businessId = formData.get('businessId') as string;
  const file = formData.get('file') as File;

  if (!businessId || !file) {
    return NextResponse.json({ error: 'Missing businessId or file' }, { status: 400 });
  }

  // Verify ownership
  const { data: business } = await sb
    .from('businesses')
    .select('id, owner_id, primary_colour')
    .eq('id', businessId)
    .maybeSingle();

  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    // --- 1. Strip near-white/transparent edges ---
    const stripped = await stripBackground(buffer);

    // --- 2. Detect dominant brand colour from the logo ---
    const detectedColour = await detectBrandColour(stripped);
    const backgroundColour = business.primary_colour ?? detectedColour ?? '#D4AF37';

    // --- 3. Trim to content (no extra whitespace) ---
    const trimmed = await sharp(stripped).trim({ threshold: 5 }).toBuffer();

    // --- 4. Scale logo to target proportions ---
    const targetBox = Math.floor(FINAL_SIZE * LOGO_RATIO);
    const scaledLogo = await sharp(trimmed)
      .resize(targetBox, targetBox, {
        fit: 'inside',
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();

    const scaledMeta = await sharp(scaledLogo).metadata();
    const lw = scaledMeta.width ?? targetBox;
    const lh = scaledMeta.height ?? targetBox;
    const lx = Math.floor((FINAL_SIZE - lw) / 2);
    const ly = Math.floor((FINAL_SIZE - lh) / 2);

    // --- 5. Build the radial gradient background ---
    const bgSvg = makeBackgroundSvg(FINAL_SIZE, backgroundColour);
    const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

    // --- 6. Build drop shadow under the logo ---
    const shadowLogo = await sharp(scaledLogo)
      .tint({ r: 0, g: 0, b: 0 })  // convert logo to pure black
      .modulate({ brightness: 0.001 })  // force near-black
      .blur(SHADOW_BLUR)
      .composite([
        {
          input: Buffer.from([0, 0, 0, Math.floor(255 * 0.35)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'in', // keep shape, replace colour
        },
      ])
      .png()
      .toBuffer();

    // --- 7. Build top highlight as SVG ---
    const highlightSvg = makeHighlightSvg(FINAL_SIZE);

    // --- 8. Compose all layers on the background ---
    const composed = await sharp(bgBuffer)
      .composite([
        // Drop shadow (offset down-right)
        { input: shadowLogo, left: lx + 2, top: ly + 6 },
        // Main logo
        { input: scaledLogo, left: lx, top: ly },
        // Top highlight
        { input: Buffer.from(highlightSvg), top: 0, left: 0 },
      ])
      .png()
      .toBuffer();

    // --- 9. Apply squircle mask ---
    const maskSvg = makeSquircleMaskSvg(FINAL_SIZE);
    const maskBuffer = await sharp(Buffer.from(maskSvg))
      .resize(FINAL_SIZE, FINAL_SIZE)
      .toColourspace('b-w')  // just the alpha
      .toBuffer();

    const finalIcon = await sharp(composed)
      .joinChannel(maskBuffer)
      .png({ compressionLevel: 9, quality: 95 })
      .toBuffer();

    // --- 10. Upload both to Supabase Storage ---
    const logoPath = `${business.id}/logo-${Date.now()}.png`;
    const iconPath = `${business.id}/icon-${Date.now()}.png`;

    const { error: logoErr } = await sb.storage
      .from('logos')
      .upload(logoPath, stripped, {
        contentType: 'image/png',
        upsert: true,
      });
    if (logoErr) throw logoErr;

    const { error: iconErr } = await sb.storage
      .from('icons')
      .upload(iconPath, finalIcon, {
        contentType: 'image/png',
        upsert: true,
      });
    if (iconErr) throw iconErr;

    const { data: logoUrlData } = sb.storage.from('logos').getPublicUrl(logoPath);
    const { data: iconUrlData } = sb.storage.from('icons').getPublicUrl(iconPath);

    // --- 11. Return ---
    return NextResponse.json({
      logoUrl: logoUrlData.publicUrl,
      iconUrl: iconUrlData.publicUrl,
      detectedColour,
    });
  } catch (err: any) {
    console.error('[upload-logo] failed', err);
    return NextResponse.json(
      { error: err?.message ?? 'Logo processing failed' },
      { status: 500 }
    );
  }
}

// -------- Helper functions --------

/**
 * Strip near-white pixels to transparent.
 * We detect any pixel where R, G, B are all above the threshold
 * and set its alpha to 0.
 */
async function stripBackground(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      pixels[i + 3] = 0;
    }
  }

  return sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer();
}

/**
 * Detect the dominant non-transparent colour of the logo.
 * Averages all non-transparent pixels weighted by saturation.
 */
async function detectBrandColour(buffer: Buffer): Promise<string> {
  try {
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let rSum = 0, gSum = 0, bSum = 0, total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;  // skip transparent
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Skip near-black and near-white (usually outline/bg noise)
      const avg = (r + g + b) / 3;
      if (avg < 20 || avg > 235) continue;
      rSum += r;
      gSum += g;
      bSum += b;
      total += 1;
    }

    if (total < 100) return '#D4AF37';  // fallback gold

    const r = Math.round(rSum / total);
    const g = Math.round(gSum / total);
    const b = Math.round(bSum / total);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return '#D4AF37';
  }
}

/**
 * Radial gradient background in the brand colour.
 * Brighter at top-left, darker at bottom-right.
 * Adjusts factor based on luminance so light colours darken more.
 */
function makeBackgroundSvg(size: number, hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lum = relativeLuminance(r, g, b);

  const topFactor = lum > 0.5 ? 1.15 : 1.45;
  const bottomFactor = lum > 0.5 ? 0.65 : 0.85;

  const top = rgbToHex(adjust(r, topFactor), adjust(g, topFactor), adjust(b, topFactor));
  const bottom = rgbToHex(adjust(r, bottomFactor), adjust(g, bottomFactor), adjust(b, bottomFactor));

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="bg" cx="0" cy="0" r="1.4" gradientUnits="objectBoundingBox">
          <stop offset="0%" stop-color="${top}" />
          <stop offset="100%" stop-color="${bottom}" />
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#bg)" />
    </svg>
  `.trim();
}

/**
 * Subtle top highlight for 3D feel.
 */
function makeHighlightSvg(size: number): string {
  const h = Math.floor(size * HIGHLIGHT_HEIGHT_RATIO);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="hl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="0.25" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${h}" fill="url(#hl)" />
    </svg>
  `.trim();
}

/**
 * Apple squircle mask. Uses a super-ellipse approximation
 * via SVG path with quadratic bezier curves. Visually identical
 * to iOS app icon shape.
 */
function makeSquircleMaskSvg(size: number): string {
  const s = size;
  // Apple squircle path approximation
  const r = s * 0.234;  // Apple's icon corner radius as fraction of size
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <path d="
        M ${r} 0
        C ${r * 0.3} 0, 0 ${r * 0.3}, 0 ${r}
        L 0 ${s - r}
        C 0 ${s - r * 0.3}, ${r * 0.3} ${s}, ${r} ${s}
        L ${s - r} ${s}
        C ${s - r * 0.3} ${s}, ${s} ${s - r * 0.3}, ${s} ${s - r}
        L ${s} ${r}
        C ${s} ${r * 0.3}, ${s - r * 0.3} 0, ${s - r} 0
        Z
      " fill="white" />
    </svg>
  `.trim();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function adjust(c: number, factor: number): number {
  return Math.max(0, Math.min(255, Math.round(c * factor)));
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}
