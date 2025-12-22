'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { EntitlementKey, EntitlementsRecord } from './entitlement-types';
import { getEntitlementsAction } from './entitlements-actions';
import { getSubscriptionInfoAction } from './subscription-actions';

// Combined context type
interface StripeContextType {
  // Subscription info
  subscriptionInfo: {
    status: string | null;
    customerId: string | null;
    isActive: boolean;
    isPastDue: boolean;
    isCanceled: boolean;
    isTrialing: boolean;
    isPaid: boolean;
    hasAny: boolean;
  };
  // Entitlements info
  entitlements: EntitlementsRecord;
  loading: boolean;
  checkEntitlement: (entitlement: EntitlementKey) => boolean;
}

const defaultSubscriptionInfo: StripeContextType['subscriptionInfo'] = {
  customerId: null,
  hasAny: false,
  isActive: false,
  isCanceled: false,
  isPaid: false,
  isPastDue: false,
  isTrialing: false,
  status: null,
};

export const StripeContext = createContext<StripeContextType | undefined>(
  undefined,
);

// Provider component
interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<
    StripeContextType['subscriptionInfo']
  >(defaultSubscriptionInfo);
  const [entitlements, setEntitlements] = useState<EntitlementsRecord>(
    {} as EntitlementsRecord,
  );
  const [loading, setLoading] = useState(true);

  // Track mount state to avoid SSR issues with auth hooks
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch stripe data after mount
  useEffect(() => {
    if (!isMounted) return;

    // Dynamically import auth to avoid SSR context issues
    const fetchStripeData = async () => {
      try {
        // Import auth client dynamically after mount
        const { authClient } = await import('@seawatts/auth/client');
        const orgResult = await authClient.organization.getFullOrganization();
        const organization = orgResult.data;

        if (!organization) {
          setSubscriptionInfo(defaultSubscriptionInfo);
          setEntitlements({} as EntitlementsRecord);
          setLoading(false);
          return;
        }

        // Check both subscription and entitlements
        const [subscriptionResult, entitlementsResult] = await Promise.all([
          getSubscriptionInfoAction(),
          getEntitlementsAction(),
        ]);

        // Update subscription info
        if (subscriptionResult.data?.subscriptionInfo) {
          setSubscriptionInfo(subscriptionResult.data.subscriptionInfo);
        } else {
          setSubscriptionInfo(defaultSubscriptionInfo);
        }

        // Update entitlements
        if (entitlementsResult.data?.entitlements) {
          setEntitlements(
            entitlementsResult.data.entitlements as EntitlementsRecord,
          );
        } else {
          setEntitlements({} as EntitlementsRecord);
        }
      } catch (error) {
        console.error('Error checking Stripe data:', error);
        setSubscriptionInfo(defaultSubscriptionInfo);
        setEntitlements({} as EntitlementsRecord);
      } finally {
        setLoading(false);
      }
    };

    fetchStripeData();
  }, [isMounted]);

  const checkEntitlement = (entitlement: EntitlementKey): boolean => {
    return entitlements[entitlement] || false;
  };

  return (
    <StripeContext.Provider
      value={{
        checkEntitlement,
        entitlements,
        loading,
        subscriptionInfo,
      }}
    >
      {children}
    </StripeContext.Provider>
  );
}

// Hook to use the Stripe context
export function useStripe() {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
}
