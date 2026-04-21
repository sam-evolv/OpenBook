import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTileColour } from '@/lib/tile-palette';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/upload-logo
 *
 * Form data:
 *   - businessId (required)
 *   - file (required on first upload)
 *   - background: 'auto' | 'black' | 'white' | 'primary' | '#<hex>'
 *     Defaults to 'auto' which uses smart contrast detection.
 *   - cachedLogoPath (optional) — when regenerating with a new bg,
 *     client passes the previously-uploaded logo path so we don't
 *     re-upload the same raw file.
 */

const FINAL_SIZE = 1024;
const LOGO_RATIO = 0.62;
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
  const file = formData.get('file') as File | null;
  const backgroundInput = (formData.get('background') as string) ?? 'auto';
  const cachedLogoPath = formData.get('cachedLogoPath') as string | null;

  if (!businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
  }

  const { data: business } = await sb
    .from('businesses')
    .select('id, owner_id, primary_colour')
    .eq('id', businessId)
    .maybeSingle();

  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  try {
    /* Get the raw logo buffer — either from new upload or from storage */
    let rawBuffer: Buffer;
    let logoPath: string;

    if (file) {
      rawBuffer = Buffer.from(await file.arrayBuffer());
      logoPath = `${business.id}/logo-${Date.now()}.png`;
    } else if (cachedLogoPath) {
      const { data: downloadedBuffer, error: dlErr } = await sb.storage
        .from('logos')
        .download(cachedLogoPath);
      if (dlErr || !downloadedBuffer) {
        return NextResponse.json(
          { error: 'Could not reload your logo. Please re-upload it.' },
          { status: 400 }
        );
      }
      rawBuffer = Buffer.from(await downloadedBuffer.arrayBuffer());
      logoPath = cachedLogoPath;
    } else {
      return NextResponse.json(
        { error: 'No file provided and no cached logo to recompose' },
        { status: 400 }
      );
    }

    /* 1. Strip near-white/transparent edges */
    const stripped = await stripBackground(rawBuffer);

    /* 2. Detect the logo's dominant colour (for smart contrast) */
    const logoColour = await detectBrandColour(stripped);

    /* 3. Resolve what background to use */
    const backgroundColour = resolveBackground({
      input: backgroundInput,
      logoColour,
      primaryColour: getTileColour(business.primary_colour).mid,
    });

    /* 4. Trim whitespace */
    const trimmed = await sharp(stripped).trim({ threshold: 5 }).toBuffer();

    /* 5. Scale logo to target proportions */
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

    /* 6. Build the background (radial gradient in chosen colour) */
    const bgSvg = makeBackgroundSvg(FINAL_SIZE, backgroundColour);
    const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

    /* 7. Drop shadow under logo */
    const alphaOnly = await sharp(scaledLogo).extractChannel('alpha').toBuffer();
    const shadowLayer = await sharp({
      create: {
        width: lw,
        height: lh,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: alphaOnly, blend: 'dest-in' }])
      .png()
      .toBuffer();

    const shadowBlurred = await sharp(shadowLayer)
      .blur(SHADOW_BLUR)
      .png()
      .toBuffer();

    /* 8. Top highlight arc */
    const highlightSvg = makeHighlightSvg(FINAL_SIZE);

    /* 9. Compose all */
    const composed = await sharp(bgBuffer)
      .composite([
        { input: shadowBlurred, left: lx + 2, top: ly + 6, blend: 'over' },
        { input: scaledLogo, left: lx, top: ly },
        { input: Buffer.from(highlightSvg), top: 0, left: 0 },
      ])
      .png()
      .toBuffer();

    /* 10. Apply squircle mask */
    const maskSvg = makeSquircleMaskSvg(FINAL_SIZE);
    const maskBuffer = await sharp(Buffer.from(maskSvg))
      .resize(FINAL_SIZE, FINAL_SIZE)
      .extractChannel('alpha')
      .toBuffer();

    const finalIcon = await sharp(composed)
      .joinChannel(maskBuffer)
      .png({ compressionLevel: 9, quality: 95 })
      .toBuffer();

    /* 11. Upload (raw logo only if first upload) */
    if (file) {
      const { error: logoErr } = await sb.storage
        .from('logos')
        .upload(logoPath, stripped, {
          contentType: 'image/png',
          upsert: true,
        });
      if (logoErr) throw logoErr;
    }

    const iconPath = `${business.id}/icon-${Date.now()}.png`;
    const { error: iconErr } = await sb.storage
      .from('icons')
      .upload(iconPath, finalIcon, {
        contentType: 'image/png',
        upsert: true,
      });
    if (iconErr) throw iconErr;

    const { data: logoUrlData } = sb.storage.from('logos').getPublicUrl(logoPath);
    const { data: iconUrlData } = sb.storage.from('icons').getPublicUrl(iconPath);

    return NextResponse.json({
      logoUrl: logoUrlData.publicUrl,
      iconUrl: iconUrlData.publicUrl,
      logoPath,
      iconPath,
      detectedLogoColour: logoColour,
      backgroundColour,
    });
  } catch (err: any) {
    console.error('[upload-logo] failed', err);
    return NextResponse.json(
      { error: err?.message ?? 'Logo processing failed' },
      { status: 500 }
    );
  }
}

/* ---------- Helpers ---------- */

/**
 * Resolve which background colour to use based on the picker selection.
 * Smart-default rule: when 'auto', pick whichever of black/white provides
 * the strongest contrast with the logo's dominant colour.
 */
function resolveBackground(args: {
  input: string;
  logoColour: string;
  primaryColour: string;
}): string {
  const { input, logoColour, primaryColour } = args;

  if (input === 'black') return '#080808';
  if (input === 'white') return '#FFFFFF';
  if (input === 'primary') return primaryColour;
  if (input.startsWith('#') && /^#[0-9a-fA-F]{6}$/.test(input)) return input;

  // 'auto' — smart contrast
  const { r, g, b } = hexToRgb(logoColour);
  const lum = relativeLuminance(r, g, b);
  // If logo is light, black bg gives contrast. If logo is dark, white bg gives contrast.
  return lum > 0.5 ? '#080808' : '#FFFFFF';
}

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

async function detectBrandColour(buffer: Buffer): Promise<string> {
  try {
    const { data } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let rSum = 0, gSum = 0, bSum = 0, total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const avg = (r + g + b) / 3;
      if (avg < 20 || avg > 235) continue;
      rSum += r;
      gSum += g;
      bSum += b;
      total += 1;
    }

    if (total < 100) return '#D4AF37';
    const r = Math.round(rSum / total);
    const g = Math.round(gSum / total);
    const b = Math.round(bSum / total);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return '#D4AF37';
  }
}

function makeBackgroundSvg(size: number, hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lum = relativeLuminance(r, g, b);
  const topFactor = lum > 0.5 ? 1.06 : 1.4;
  const bottomFactor = lum > 0.5 ? 0.82 : 0.85;
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

function makeHighlightSvg(size: number): string {
  const h = Math.floor(size * HIGHLIGHT_HEIGHT_RATIO);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="hl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="0.2" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${h}" fill="url(#hl)" />
    </svg>
  `.trim();
}

function makeSquircleMaskSvg(size: number): string {
  const s = size;
  const r = s * 0.234;
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
  return `#${[r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;
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
