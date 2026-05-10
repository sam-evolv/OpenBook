'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export interface CustomerProfilePayload {
  full_name: string;
  email: string;
  phone: string;
}

export async function saveCustomerProfile(payload: CustomerProfilePayload) {
  const customerId = cookies().get('ob_customer_id')?.value ?? null;
  if (!customerId) {
    return { ok: false as const, error: 'No customer profile found on this device.' };
  }

  const fullName = payload.full_name.trim();
  const email = payload.email.trim();
  const phone = payload.phone.trim();

  if (!fullName) {
    return { ok: false as const, error: 'Name is required.' };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: 'Enter a valid email address.' };
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from('customers')
    .update({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
    })
    .eq('id', customerId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath('/me');
  revalidatePath('/me/edit');
  revalidatePath('/consumer-bookings');
  return { ok: true as const };
}
