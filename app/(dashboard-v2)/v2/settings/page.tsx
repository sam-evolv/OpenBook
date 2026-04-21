import { requireCurrentBusiness } from '@/lib/queries/business';
import { SettingsForm, type SettingsInitial } from '@/components/dashboard-v2/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsV2Page() {
  const { business } = await requireCurrentBusiness<SettingsInitial & { id: string }>(
    'id, name, tagline, about_long, founder_name, phone, website, address_line, city, socials, automations',
  );
  return <SettingsForm initial={business} />;
}
