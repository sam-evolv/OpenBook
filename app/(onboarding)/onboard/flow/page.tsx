import { redirect } from 'next/navigation';
import { getCurrentOwner, createSupabaseServerClient } from '@/lib/supabase-server';
import { hasStripe } from '@/lib/integrations';
import { OnboardingFlow } from './OnboardingFlow';

export const dynamic = 'force-dynamic';

export default async function FlowPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');
  if (owner.onboarding_completed) redirect('/dashboard');

  // Fetch any existing draft business for this owner
  const sb = createSupabaseServerClient();
  const { data: existingBusiness } = await sb
    .from('businesses')
    .select('*')
    .eq('owner_id', owner.id)
    .maybeSingle();

  return (
    <OnboardingFlow
      owner={owner}
      initialBusiness={existingBusiness}
      startAt={owner.onboarding_step ?? 0}
      stripeAvailable={hasStripe()}
    />
  );
}
