import { redirect } from 'next/navigation';

/**
 * Deferred. Once the consumer booking flow is extracted into a shared
 * widget (planned follow-up PR), this route renders it scoped to the
 * subdomain's business. Until then, send visitors to the existing
 * consumer business page on app.openbook.ie which already drives the
 * full booking flow.
 */
export default async function MarketingBookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`https://app.openbook.ie/business/${encodeURIComponent(slug)}?tab=book`);
}
