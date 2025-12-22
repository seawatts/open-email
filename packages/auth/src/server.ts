import { db } from '@seawatts/db/client';
import {
  Accounts,
  Invitations,
  OrgMembers,
  Orgs,
  Sessions,
  Users,
  Verifications,
} from '@seawatts/db/schema';
import { createId } from '@seawatts/id';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { lastLoginMethod, organization } from 'better-auth/plugins';

import { env } from './env';

export const auth = betterAuth({
  advanced: {
    database: {
      generateId: ({ model }) => {
        const prefixMap: Record<string, string> = {
          account: 'acc',
          invitation: 'inv',
          member: 'member',
          organization: 'org',
          session: 'session',
          user: 'user',
          verification: 'ver',
        };
        const prefix = prefixMap[model] ?? model.slice(0, 3);
        return createId({ prefix });
      },
    },
  },
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      account: Accounts,
      invitation: Invitations,
      member: OrgMembers,
      organization: Orgs,
      session: Sessions,
      user: Users,
      verification: Verifications,
    },
  }),

  emailAndPassword: {
    enabled: false, // Only using Google OAuth
  },
  experimental: {
    joins: true,
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      membershipLimit: 50,
      organizationLimit: 10,
      sendInvitationEmail: async ({ email, organization, inviter }) => {
        // TODO: Implement email sending using @seawatts/email package
        console.log(
          'Sending invitation email to',
          email,
          'for organization',
          organization.name,
          'from',
          inviter.user.name,
        );
      },
    }),
    lastLoginMethod({
      storeInDatabase: true,
    }),
  ],

  secret: env.BETTER_AUTH_SECRET,

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },

  socialProviders: {
    google: {
      accessType: 'offline',
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: 'consent',
      scope: [
        // User identity (included by default but explicit for clarity)
        'openid',
        'email',
        'profile',
        // Gmail API
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.labels',
        // Calendar API
        'https://www.googleapis.com/auth/calendar.events',
        // Pub/Sub (for real-time notifications setup)
        'https://www.googleapis.com/auth/pubsub',
      ],
    },
  },

  trustedOrigins: [env.BETTER_AUTH_URL, 'http://localhost:3000'],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
