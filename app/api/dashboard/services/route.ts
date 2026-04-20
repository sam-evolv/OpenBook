import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function verifyOwnership(sb: any, userId: string, businessId: string) {
  const { data } = await sb
    .from('businesses')
    .select('id, owner_id')
    .eq('id', businessId)
    .maybeSingle();
  return data && data.owner_id === userId;
}

export async function POST(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { businessId, service } = await req.json();
  if (!businessId || !service?.name?.trim()) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  if (!(await verifyOwnership(sb, user.id, businessId))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const { data, error } = await sb
    .from('services')
    .insert({
      business_id: businessId,
      name: service.name.trim(),
      description: service.description?.trim() || null,
      duration_minutes: service.duration_minutes || 60,
      price_cents: service.price_cents || 0,
      is_active: service.is_active ?? true,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { businessId, service } = await req.json();
  if (!businessId || !service?.id) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  if (!(await verifyOwnership(sb, user.id, businessId))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const patch: any = {};
  if (typeof service.name === 'string') patch.name = service.name.trim();
  if (typeof service.description === 'string' || service.description === null)
    patch.description = service.description?.trim() || null;
  if (typeof service.duration_minutes === 'number')
    patch.duration_minutes = service.duration_minutes;
  if (typeof service.price_cents === 'number') patch.price_cents = service.price_cents;
  if (typeof service.is_active === 'boolean') patch.is_active = service.is_active;

  const { error } = await sb
    .from('services')
    .update(patch)
    .eq('id', service.id)
    .eq('business_id', businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const businessId = searchParams.get('businessId');
  if (!id || !businessId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  if (!(await verifyOwnership(sb, user.id, businessId))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const { error } = await sb
    .from('services')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
