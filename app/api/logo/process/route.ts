import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const SIZE   = 512
const RADIUS = 92 // 18% of 512 — matches 18px on a 100px icon

/** SVG mask that punches rounded corners into the image via dest-in composite */
function makeRoundedMask(size: number, radius: number): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/>` +
    `</svg>`
  )
}

export async function POST(req: NextRequest) {
  let file:       File   | null = null
  let businessId: string | null = null
  let userId:     string | null = null

  try {
    const formData = await req.formData()
    file       = formData.get('file')       as File   | null
    businessId = formData.get('businessId') as string | null
    userId     = formData.get('userId')     as string | null
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!businessId && !userId) {
    return NextResponse.json({ error: 'businessId or userId required' }, { status: 400 })
  }

  // ── Process image with sharp ────────────────────────────────────────────────
  let processed: Buffer
  try {
    const bytes  = await file.arrayBuffer()
    const input  = Buffer.from(bytes)
    const mask   = makeRoundedMask(SIZE, RADIUS)

    processed = await sharp(input)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      // dest-in: keeps only the intersection of image and mask →  rounded corners
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer()
  } catch (err) {
    console.error('[logo/process] sharp error:', err)
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 })
  }

  // ── Upload processed PNG to Supabase Storage ────────────────────────────────
  const supabase = await createServiceClient()

  const storagePath = businessId
    ? `logos/${businessId}/processed.png`
    : `logos/temp/${userId}/processed.png`

  const { error: uploadErr } = await supabase.storage
    .from('business-assets')
    .upload(storagePath, processed, {
      contentType: 'image/png',
      upsert:      true,
    })

  if (uploadErr) {
    console.error('[logo/process] storage upload error:', uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('business-assets')
    .getPublicUrl(storagePath)

  // ── If businessId, update businesses.logo_url in DB ─────────────────────────
  if (businessId) {
    const { error: dbErr } = await supabase
      .from('businesses')
      .update({ logo_url: publicUrl })
      .eq('id', businessId)

    if (dbErr) {
      console.error('[logo/process] DB update error:', dbErr)
      // Non-fatal — image is uploaded, just return the URL
    }
  }

  return NextResponse.json({ logoUrl: publicUrl })
}
