import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { ProfileEditForm } from './ProfileEditForm';

export const dynamic = 'force-dynamic';

async function getCustomer() {
  const customerId = (await cookies()).get('ob_customer_id')?.value;
  if (!customerId) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('customers')
    .select('full_name, email, phone')
    .eq('id', customerId)
    .maybeSingle();
  return data;
}

export default async function EditProfilePage() {
  const customer = await getCustomer();
  if (!customer) redirect('/me');

  return (
    <ProfileEditForm
      initial={{
        full_name: customer.full_name ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
      }}
    />
  );
}
