'use client';

import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { useEffect, useState } from 'react';

export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

// Export action functions directly (these don't use React context)
export const { signIn, signOut, signUp, getSession } = authClient;

// Organization actions
export const { organization } = authClient;

// Re-export hooks directly from authClient
// These hooks are safe to use in client components that are only rendered after mount
export const { useSession, useActiveOrganization, useListOrganizations } =
  authClient;

/**
 * SSR-safe hook that tracks whether the component has mounted.
 * Use this in components that need to conditionally render based on auth state
 * to avoid hydration mismatches.
 */
export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}

// Helper hook for conditional rendering
export function useIsAuthenticated() {
  const { data: session, isPending } = useSession();
  return {
    isAuthenticated: !!session?.user,
    isPending,
    session,
    user: session?.user,
  };
}

// Sign in with Google helper
export function signInWithGoogle(options?: { callbackURL?: string }) {
  return signIn.social({
    callbackURL: options?.callbackURL ?? '/app',
    provider: 'google',
  });
}
