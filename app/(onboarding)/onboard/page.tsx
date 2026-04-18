import { redirect } from 'next/navigation';
import { getCurrentOwner } from '@/lib/supabase-server';
import { WelcomeScreen } from './WelcomeScreen';

export const dynamic = 'force-dynamic';

export default async function OnboardPage() {
  const owner = await getCurrentOwner();

  if (owner?.onboarding_completed) {
    redirect('/dashboard');
  }

  // Already signed in, just mid-flow
  if (owner) {
    redirect(`/onboard/flow`);
  }

  return <WelcomeScreen />;
}
