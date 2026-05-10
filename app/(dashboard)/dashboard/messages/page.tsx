import { Suspense } from 'react';
import { requireCurrentBusiness } from '@/lib/queries/business';
import { MessagesSection } from './_sections/MessagesSection';
import { MessagesSkeleton } from '@/components/dashboard-v2/messages/skeletons';

export const dynamic = 'force-dynamic';

export default async function MessagesV2Page({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const { business } = await requireCurrentBusiness<{ id: string; slug: string }>(
    'id, slug',
  );

  const activeConversationId = sp.conversation ?? null;
  const tab = sp.tab === 'ai' ? 'ai' : 'whatsapp';

  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesSection
        businessId={business.id}
        businessSlug={business.slug}
        activeConversationId={activeConversationId}
        tab={tab}
      />
    </Suspense>
  );
}
