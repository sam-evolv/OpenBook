import { redirect } from 'next/navigation';

/**
 * Deferred. Once the consumer booking flow is extracted into a shared
 * widget (planned follow-up PR), this route renders the slot picker
 * inline for the requested service. Until then, hand off to the
 * existing consumer booking flow on app.openbook.ie which is keyed
 * directly by service id.
 */
export default async function MarketingBookServicePage({
  params,
}: {
  params: Promise<{ slug: string; serviceId: string }>;
}) {
  const { serviceId } = await params;
  redirect(`https://app.openbook.ie/booking/${encodeURIComponent(serviceId)}`);
}
