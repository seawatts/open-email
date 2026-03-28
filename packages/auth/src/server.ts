import { expo } from '@better-auth/expo';
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
import { lastLoginMethod, oAuthProxy, organization } from 'better-auth/plugins';

import { env } from './env';

const FALLBACK_PRODUCTION_URL = 'https://open-email-web-app.vercel.app';

const baseUrl =
  env.BETTER_AUTH_URL ??
  (env.VERCEL_ENV === 'production'
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : env.VERCEL_ENV === 'preview'
      ? `https://${env.VERCEL_URL}`
      : 'http://localhost:3000');

const developmentHosts = [
  'localhost:3000',
  'localhost:*',
  '192.168.*.*',
  '192.168.*.*:*',
  '*.sslip.io',
  '*.sslip.io:*',
  ...(env.BETTER_AUTH_EXPO_HOST ? [env.BETTER_AUTH_EXPO_HOST] : []),
];
const useDynamicBaseUrl =
  env.NODE_ENV === 'development' && developmentHosts.length > 0;

const productionUrl = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : FALLBACK_PRODUCTION_URL;

export const auth = betterAuth({
  advanced: {
    cookiePrefix: 'open-email',
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
    useSecureCookies: env.NODE_ENV === 'production',
  },
  baseURL: useDynamicBaseUrl
    ? {
        allowedHosts: developmentHosts,
        fallback: baseUrl,
        protocol: 'http',
      }
    : baseUrl,
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
    enabled: false,
  },

  onAPIError: {
    onError(error) {
      console.error('[BETTER AUTH ERROR]', error);
    },
  },

  plugins: [
    oAuthProxy({
      productionURL: productionUrl,
    }),
    expo(),
    lastLoginMethod({
      storeInDatabase: true,
    }),
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
  ],

  secret: env.BETTER_AUTH_SECRET,

  session: {
    // cookieCache disabled: with it enabled, auth.api.getSession({ headers }) returns null
    // when called from tRPC/API route despite valid cookies (better-auth#7008).
    cookieCache: {
      enabled: false,
      maxAge: 60 * 5,
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
  },

  socialProviders: {
    google: {
      accessType: 'offline',
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: 'consent',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/pubsub',
      ],
    },
  },

  trustedOrigins: [
    'openemail://',
    'openemail-development://',
    'openemail-preview://',

    'exp://',

    ...(process.env.NODE_ENV === 'development'
      ? ['http://192.168.', 'http://localhost:3000']
      : []),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
