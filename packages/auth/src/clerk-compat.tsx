'use client';

/**
 * Clerk compatibility layer for Better-Auth migration
 * Provides the same API as Clerk but uses Better-Auth under the hood
 */

import type { ReactNode } from 'react';
import {
  signOut as authSignOut,
  organization as orgClient,
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from './client';

// useUser -> useSession mapping
export function useUser() {
  const { data: session, isPending } = useSession();

  return {
    isLoaded: !isPending,
    isSignedIn: !!session?.user,
    user: session?.user
      ? {
          email: session.user.email,
          emailAddresses: [{ emailAddress: session.user.email }], // Clerk compat
          emailVerified: session.user.emailVerified,
          firstName: session.user.name?.split(' ')[0],
          fullName: session.user.name,
          id: session.user.id,
          imageUrl: session.user.image, // Clerk compat
          lastName: session.user.name?.split(' ').slice(1).join(' '),
          primaryEmailAddress: { emailAddress: session.user.email }, // Clerk compat
        }
      : null,
  };
}

// useOrganization mapping
export function useOrganization() {
  const { data: activeOrg, isPending } = useActiveOrganization();

  return {
    isLoaded: !isPending,
    membership: activeOrg ? { role: 'admin' } : null, // TODO: Get actual member role
    organization: activeOrg
      ? {
          ...activeOrg,
          reload: async () => {
            // Better-Auth doesn't need explicit reload
          },
          update: async ({ name }: { name: string }) => {
            // TODO: Better-Auth organization.update API
            console.warn(
              'Organization update not yet implemented for Better-Auth',
            );
          },
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
              role: 'admin', // TODO: Get actual role from organization membership
            })) || [],
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
  const { data: session, isPending } = useSession();
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
  const { data: session } = useSession();
  return session?.user ? <>{children}</> : null;
}

// SignedOut component
export function SignedOut({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  return !session?.user ? <>{children}</> : null;
}

// SignOutButton component
export function SignOutButton({ children }: { children?: ReactNode }) {
  return (
    <button onClick={() => authSignOut()} type="button">
      {children || 'Sign Out'}
    </button>
  );
}
