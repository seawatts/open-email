/**
 * Server-side Clerk compatibility layer for Better-Auth migration
 */

import { headers } from 'next/headers';
import { auth as betterAuthInstance } from './server';

// Get auth from request headers (Better-Auth equivalent of Clerk's auth())
export async function auth() {
  const headersList = await headers();
  const session = await betterAuthInstance.api.getSession({
    headers: headersList,
  });

  return {
    orgId: session?.session?.activeOrganizationId || null,
    session: session?.session || null,
    sessionClaims: session?.user || null,
    sessionId: session?.session?.id || null,
    userId: session?.user?.id || null,
  };
}

// Get current user (Better-Auth equivalent of currentUser())
export async function currentUser() {
  const headersList = await headers();
  const session = await betterAuthInstance.api.getSession({
    headers: headersList,
  });

  if (!session?.user) return null;

  return {
    email: session.user.email,
    emailAddresses: [{ emailAddress: session.user.email }],
    emailVerified: session.user.emailVerified,
    firstName: session.user.name?.split(' ')[0],
    fullName: session.user.name,
    id: session.user.id,
    imageUrl: session.user.image,
    lastName: session.user.name?.split(' ').slice(1).join(' '),
    // Clerk compat fields
    primaryEmailAddress: { emailAddress: session.user.email },
  };
}

// Type exports for compatibility
export type Organization = any; // TODO: Define proper type
export type User = any; // TODO: Define proper type

// clerkClient equivalent - not a full replacement but covers common use cases
export const clerkClient = () => ({
  organizations: {
    createOrganization: async (data: any) => {
      // TODO: Implement with Better-Auth organization plugin
      console.warn(
        'clerkClient.organizations.createOrganization not implemented',
      );
      return null;
    },
    createOrganizationInvitation: async (data: any) => {
      // TODO: Implement with Better-Auth organization plugin
      console.warn(
        'clerkClient.organizations.createOrganizationInvitation not implemented',
      );
      return null;
    },
    deleteOrganization: async (orgId: string) => {
      // TODO: Implement with Better-Auth organization plugin
      console.warn(
        'clerkClient.organizations.deleteOrganization not implemented',
      );
      return null;
    },
    deleteOrganizationMembership: async (data: any) => {
      // TODO: Implement with Better-Auth organization plugin
      console.warn(
        'clerkClient.organizations.deleteOrganizationMembership not implemented',
      );
      return null;
    },
    getOrganization: async (orgId: string) => {
      // Would need to query DB directly
      return null;
    },
    updateOrganization: async (orgId: string, data: any) => {
      // TODO: Implement with Better-Auth organization plugin
      console.warn(
        'clerkClient.organizations.updateOrganization not implemented',
      );
      return null;
    },
    updateOrganizationMembership: async (data: any) => {
      // TODO: Implement with Better-Auth organization plugin
      console.warn(
        'clerkClient.organizations.updateOrganizationMembership not implemented',
      );
      return null;
    },
  },
  sessions: {
    getToken: async (sessionId: string, template: string) => {
      // Clerk uses JWT templates, Better-Auth doesn't support this
      // This is a major difference - callers will need to be rewritten
      throw new Error(
        'Clerk session templates not supported in Better-Auth - rewrite needed',
      );
    },
  },
  users: {
    getUser: async (userId: string) => {
      // Would need to query DB directly or use Better-Auth admin API
      // For now, return a stub that won't break existing code
      return null;
    },
  },
});
