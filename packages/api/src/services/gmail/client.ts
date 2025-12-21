import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import { GmailAccounts } from '@seawatts/db/schema';
import { debug } from '@seawatts/logger';
import type { OAuth2Client } from 'google-auth-library';
import type { gmail_v1 } from 'googleapis';
import { google } from 'googleapis';

import type { GmailTokens } from '../../email/types';

const log = debug('seawatts:gmail');

// Get environment variables
function getGoogleClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth configuration in environment');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Create a new OAuth2 client
 */
export function createOAuth2Client(): OAuth2Client {
  const config = getGoogleClientConfig();
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

/**
 * Generate OAuth URL for user authentication
 */
export function getAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<GmailTokens> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google');
  }

  oauth2Client.setCredentials(tokens);

  // Get user info
  const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
  const userInfo = await oauth2.userinfo.get();

  if (!userInfo.data.email) {
    throw new Error('Failed to get user email from Google');
  }

  return {
    accessToken: tokens.access_token,
    email: userInfo.data.email,
    expiry: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    name: userInfo.data.name ?? null,
    refreshToken: tokens.refresh_token,
  };
}

/**
 * Get an authenticated Gmail client for a specific account
 */
export async function getAuthenticatedClient(account: {
  accessToken: string;
  id: string;
  refreshToken: string;
  tokenExpiry: Date;
}): Promise<{
  client: OAuth2Client;
  gmail: gmail_v1.Gmail;
}> {
  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    expiry_date: account.tokenExpiry.getTime(),
    refresh_token: account.refreshToken,
  });

  // Check if token needs refresh (5 minutes buffer)
  if (account.tokenExpiry.getTime() < Date.now() + 5 * 60 * 1000) {
    log('Refreshing expired token for account %s', account.id);
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.access_token) {
      // Update stored tokens
      await updateGmailTokens(account.id, {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token ?? account.refreshToken,
        tokenExpiry: new Date(
          credentials.expiry_date ?? Date.now() + 3600 * 1000,
        ),
      });
    }
  }

  const gmail = google.gmail({ auth: oauth2Client, version: 'v1' });

  return { client: oauth2Client, gmail };
}

/**
 * Update Gmail account tokens in the database
 */
async function updateGmailTokens(
  accountId: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Date;
  },
): Promise<void> {
  await db
    .update(GmailAccounts)
    .set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.tokenExpiry,
    })
    .where(eq(GmailAccounts.id, accountId));
}

/**
 * Get Gmail client for an account ID
 */
export async function getGmailClient(
  accountId: string,
): Promise<gmail_v1.Gmail> {
  const account = await db.query.GmailAccounts.findFirst({
    where: eq(GmailAccounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Gmail account not found: ${accountId}`);
  }

  const { gmail } = await getAuthenticatedClient(account);
  return gmail;
}
