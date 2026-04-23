import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadFlashSales } from '@/lib/dashboard-v2/flash-sales-queries';
import { FlashSalesClient } from '@/components/dashboard-v2/flash-sales/FlashSalesClient';

interface FlashSalesSectionProps {
  businessId: string;
  businessName: string;
}

export async function FlashSalesSection({
  businessId,
  businessName,
}: FlashSalesSectionProps) {
  const sb = createSupabaseServerClient();
  const payload = await loadFlashSales(sb, businessId);

  return <FlashSalesClient payload={payload} businessName={businessName} />;
}
