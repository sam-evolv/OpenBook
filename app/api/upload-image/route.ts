import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/upload-image
 *
 * Form data:
 *   - businessId (required)
 *   - kind: 'hero' | 'gallery' (required)
 *   - file (required)
 *
 * Hero: single image, overwrites previous. Landscape 16:9 (1600x900).
 * Gallery: appended to array, max 6 total. Square 1:1 (1200x1200).
 *
 * DELETE /api/upload-image
 *
 * Query params or form data:
 *   - businessId, kind, index (for gallery, 0-based)
 */

const GALLERY_LIMIT = 6;
const HERO_MAX_SIZE = 8 * 1024 * 1024;   // 8MB
const GALLERY_MAX_SIZE = 5 * 1024 * 1024; // 5MB

function polishImage(input: Buffer, kind: 'hero' | 'gallery') {
  const base = sharp(input, { failOn: 'none' })
    .rotate()
    .normalise()
    .modulate({ brightness: 1.01, saturation: 1.04 })
    .sharpen({ sigma: 0.7, m1: 0.8, m2: 1.4, x1: 2, y2: 10, y3: 20 });

  if (kind === 'hero') {
    return base
      .resize(1800, 1100, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 88, progressive: true, mozjpeg: true })
      .toBuffer();
  }

  return base
    .resize(1200, 1200, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 88, progressive: true, mozjpeg: true })
    .toBuffer();
}

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
  const kind = formData.get('kind') as 'hero' | 'gallery';
  const file = formData.get('file') as File | null;

  if (!businessId || !kind || !file) {
    return NextResponse.json(
      { error: 'Missing businessId, kind, or file' },
      { status: 400 }
    );
  }

  if (!['hero', 'gallery'].includes(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  const maxSize = kind === 'hero' ? HERO_MAX_SIZE : GALLERY_MAX_SIZE;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Max ${maxSize / 1024 / 1024}MB.` },
      { status: 400 }
    );
  }

  /* Verify ownership */
  const { data: business } = await sb
    .from('businesses')
    .select('id, owner_id, gallery_urls')
    .eq('id', businessId)
    .maybeSingle();

  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  /* Gallery limit check */
  if (kind === 'gallery') {
    const current = business.gallery_urls ?? [];
    if (current.length >= GALLERY_LIMIT) {
      return NextResponse.json(
        { error: `Gallery limit is ${GALLERY_LIMIT} images` },
        { status: 400 }
      );
    }
  }

  try {
    const raw = Buffer.from(await file.arrayBuffer());

    /* Universal storefront treatment: auto-orient, smart-crop, gently lift
       colour/detail, and compress to a dependable app-ready JPEG. */
    const processed = await polishImage(raw, kind);

    const bucket = kind === 'hero' ? 'hero-images' : 'gallery-images';
    const path = `${business.id}/${Date.now()}.jpg`;

    const { error: uploadErr } = await sb.storage
      .from(bucket)
      .upload(path, processed, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(path);
    const url = urlData.publicUrl;

    /* Update business row */
    if (kind === 'hero') {
      const { error } = await sb
        .from('businesses')
        .update({ hero_image_url: url })
        .eq('id', businessId);
      if (error) throw error;
    } else {
      const nextGallery = [...(business.gallery_urls ?? []), url];
      const { error } = await sb
        .from('businesses')
        .update({ gallery_urls: nextGallery })
        .eq('id', businessId);
      if (error) throw error;
    }

    return NextResponse.json({ url, kind });
  } catch (err: any) {
    console.error('[upload-image] failed', err);
    return NextResponse.json(
      { error: err?.message ?? 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId');
  const kind = searchParams.get('kind') as 'hero' | 'gallery';
  const indexStr = searchParams.get('index');

  if (!businessId || !kind) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const { data: business } = await sb
    .from('businesses')
    .select('id, owner_id, hero_image_url, gallery_urls')
    .eq('id', businessId)
    .maybeSingle();

  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  try {
    if (kind === 'hero') {
      if (business.hero_image_url) {
        const pathMatch = business.hero_image_url.match(/hero-images\/(.+)$/);
        if (pathMatch) {
          await sb.storage.from('hero-images').remove([pathMatch[1]]);
        }
      }
      await sb.from('businesses').update({ hero_image_url: null }).eq('id', businessId);
    } else {
      const index = indexStr ? parseInt(indexStr, 10) : -1;
      const gallery = business.gallery_urls ?? [];
      if (index < 0 || index >= gallery.length) {
        return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
      }
      const removedUrl = gallery[index];
      const pathMatch = removedUrl.match(/gallery-images\/(.+)$/);
      if (pathMatch) {
        await sb.storage.from('gallery-images').remove([pathMatch[1]]);
      }
      const nextGallery = gallery.filter((_: string, i: number) => i !== index);
      await sb.from('businesses').update({ gallery_urls: nextGallery }).eq('id', businessId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[upload-image] delete failed', err);
    return NextResponse.json({ error: err?.message ?? 'Delete failed' }, { status: 500 });
  }
}
