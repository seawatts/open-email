'use client';

/**
 * Clerk compatibility layer for Better-Auth migration
 * Provides the same API as Clerk but uses Better-Auth under the hood
 */

import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  signOut as authSignOut,
  organization as orgClient,
  useActiveOrganization,
  useSession as useBetterAuthSession,
  useListOrganizations,
} from './client';

// useSession for Clerk compatibility - provides session with getToken
export function useSession() {
  const { data: sessionData, isPending } = useBetterAuthSession();
  const [tokenCache] = useState<string | null>(null);

  // getToken fetches a JWT from the server
  const getToken = useCallback(
    async (_options?: { template?: string }) => {
      if (!sessionData?.user?.id || !sessionData?.session?.id) {
        return null;
      }

      // For now, return null - client-side JWT generation will be handled by API calls
      // The actual token will be fetched via the verifySessionToken tRPC endpoint
      // This is a limitation during migration - client components needing tokens
      // should use the useClient hook which handles this internally
      console.warn(
        'Client-side getToken called - tokens should be fetched via API',
      );
      return tokenCache;
    },
    [sessionData, tokenCache],
  );

  const session = useMemo(() => {
    if (!sessionData?.user) return null;
    return {
      getToken,
      id: sessionData.session?.id,
      lastActiveOrganizationId: sessionData.session?.activeOrganizationId,
      status: 'active' as const,
      userId: sessionData.user.id,
    };
  }, [sessionData, getToken]);

  return {
    isLoaded: !isPending,
    isSignedIn: !!sessionData?.user,
    session,
  };
}

// useUser -> useSession mapping
export function useUser() {
  const { data: session, isPending } = useBetterAuthSession();

  return {
    isLoaded: !isPending,
    isSignedIn: !!session?.user,
    user: session?.user
      ? {
          email: session.user.email,
          emailAddresses: [{ emailAddress: session.user.email }],
          emailVerified: session.user.emailVerified,
          firstName: session.user.name?.split(' ')[0],
          fullName: session.user.name,
          getOrganizationMemberships: () =>
            Promise.resolve({ data: [] as unknown[] }),
          id: session.user.id,
          imageUrl: session.user.image || undefined,
          lastName: session.user.name?.split(' ').slice(1).join(' '),
          primaryEmailAddress: { emailAddress: session.user.email },
        }
      : null,
  };
}

// useOrganization mapping
export function useOrganization(_options?: {
  invitations?: boolean;
  memberships?: boolean;
}) {
  const { data: activeOrg, isPending } = useActiveOrganization();

  return {
    invitations: {
      data: [] as unknown[],
      isLoading: false,
      revalidate: () => Promise.resolve(),
    },
    isLoaded: !isPending,
    membership: activeOrg ? { role: 'admin' } : null,
    memberships: { data: [] as unknown[], isLoading: false },
    organization: activeOrg
      ? {
          ...activeOrg,
          invitations: [],
          inviteMember: async (_data: unknown) => {
            throw new Error('Use inviteMemberAction instead');
          },
          members: [],
          memberships: () => Promise.resolve([]),
          reload: async () => {},
          update: async (_data: { name: string }) => {},
        }
      : null,
  };
}

// useOrganizationList mapping
export function useOrganizationList({
  userMemberships,
}: {
  userMemberships?: boolean;
} = {}) {
  const { data: orgs, isPending } = useListOrganizations();

  return {
    createOrganization: async ({ name }: { name: string }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      return await orgClient.create({ name, slug });
    },
    isLoaded: !isPending,
    organizationList: orgs || [],
    setActive: async ({ organization }: { organization: string }) => {
      await orgClient.setActive({ organizationId: organization });
    },
    userMemberships: userMemberships
      ? {
          data:
            orgs?.map((org) => ({
              organization: org,
              role: 'admin',
            })) || [],
          isLoading: isPending,
          revalidate: () => Promise.resolve(),
        }
      : undefined,
  };
}

// useClerk mapping
export function useClerk() {
  return {
    openOrganizationProfile: () => {
      // Navigate to org settings page
      window.location.href = '/app/settings/organization';
    },
    signOut: authSignOut,
  };
}

// useAuth mapping
export function useAuth() {
  const { data: session, isPending } = useBetterAuthSession();
  const { data: activeOrg } = useActiveOrganization();

  return {
    isLoaded: !isPending,
    isSignedIn: !!session?.user,
    orgId: activeOrg?.id,
    signOut: authSignOut,
    userId: session?.user?.id,
  };
}

// SignedIn component
export function SignedIn({ children }: { children: ReactNode }) {
  const { data: session } = useBetterAuthSession();
  return session?.user ? children : null;
}

// SignedOut component
export function SignedOut({ children }: { children: ReactNode }) {
  const { data: session } = useBetterAuthSession();
  return !session?.user ? children : null;
}

// SignOutButton component
export function SignOutButton({ children }: { children?: ReactNode }) {
  return (
    <button onClick={() => authSignOut()} type="button">
      {children || 'Sign Out'}
    </button>
  );
}
