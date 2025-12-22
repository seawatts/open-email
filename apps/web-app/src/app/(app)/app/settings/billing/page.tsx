import { getQueryClient, HydrationBoundary, trpc } from '@seawatts/api/server';
import { BillingSettings } from './_components/billing-settings';

// Dynamic because it uses session-dependent data
export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const queryClient = getQueryClient();

  // Prefetch billing data
  void queryClient.prefetchQuery(
    trpc.billing.getSubscriptionStatus.queryOptions(),
  );
  void queryClient.prefetchQuery(
    trpc.billing.getSubscriptionDetails.queryOptions(),
  );
  void queryClient.prefetchQuery(trpc.billing.getInvoices.queryOptions({}));

  return (
    <HydrationBoundary>
      <BillingSettings />
    </HydrationBoundary>
  );
}
