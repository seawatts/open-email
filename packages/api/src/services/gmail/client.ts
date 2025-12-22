import { and, eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import { Accounts } from '@seawatts/db/schema';
import { debug } from '@seawatts/logger';
import type { OAuth2Client } from 'google-auth-library';
import type { gmail_v1 } from 'googleapis';
import { google } from 'googleapis';

const log = debug('seawatts:gmail');

// Get environment variables
function getGoogleClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth configuration in environment');
  }

  return { clientId, clientSecret };
}

/**
 * Create a new OAuth2 client
 */
export function createOAuth2Client(): OAuth2Client {
  const config = getGoogleClientConfig();
  return new google.auth.OAuth2(config.clientId, config.clientSecret);
}

/**
 * Get an authenticated Gmail client for a specific account
 * Uses the better-auth Accounts table which stores Google OAuth tokens
 */
export async function getAuthenticatedClient(account: {
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  id: string;
  refreshToken: string | null;
}): Promise<{
  client: OAuth2Client;
  gmail: gmail_v1.Gmail;
}> {
  if (!account.accessToken || !account.refreshToken) {
    throw new Error(`Account ${account.id} missing OAuth tokens`);
  }

  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    expiry_date: account.accessTokenExpiresAt?.getTime(),
    refresh_token: account.refreshToken,
  });

  // Check if token needs refresh (5 minutes buffer)
  const tokenExpiry = account.accessTokenExpiresAt?.getTime() ?? 0;
  if (tokenExpiry < Date.now() + 5 * 60 * 1000) {
    log('Refreshing expired token for account %s', account.id);
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.access_token) {
      // Update stored tokens in better-auth Accounts table
      await db
        .update(Accounts)
        .set({
          accessToken: credentials.access_token,
          accessTokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
          refreshToken: credentials.refresh_token ?? account.refreshToken,
        })
        .where(eq(Accounts.id, account.id));
    }
  }

  const gmail = google.gmail({ auth: oauth2Client, version: 'v1' });

  return { client: oauth2Client, gmail };
}

/**
 * Get Gmail client for an account ID
 * Looks up the account in the better-auth Accounts table
 */
export async function getGmailClient(accountId: string): Promise<gmail_v1.Gmail> {
  const account = await db.query.Accounts.findFirst({
    where: eq(Accounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const { gmail } = await getAuthenticatedClient(account);
  return gmail;
}

/**
 * Get Gmail client for a user by their user ID
 * Finds the Google OAuth account for the user
 */
export async function getGmailClientForUser(
  userId: string,
): Promise<{ accountId: string; gmail: gmail_v1.Gmail }> {
  const account = await db.query.Accounts.findFirst({
    where: and(eq(Accounts.userId, userId), eq(Accounts.providerId, 'google')),
  });

  if (!account) {
    throw new Error(`No Google account found for user: ${userId}`);
  }

  const { gmail } = await getAuthenticatedClient(account);
  return { accountId: account.id, gmail };
}

// ============================================================================
// GMAIL WATCH FUNCTIONS - Pub/Sub notifications
// ============================================================================

/**
 * Get Google Pub/Sub topic for Gmail notifications
 */
function getGmailPubSubTopic(): string {
  const topic = process.env.GOOGLE_PUBSUB_TOPIC;
  if (!topic) {
    throw new Error('Missing GOOGLE_PUBSUB_TOPIC environment variable');
  }
  return topic;
}

export interface GmailWatchResult {
  historyId: string;
  expiration: Date;
}

/**
 * Setup Gmail push notifications via Pub/Sub
 * Gmail watches expire after 7 days and must be renewed
 *
 * @param accountId Account ID from better-auth Accounts table
 * @returns Watch result with historyId and expiration
 */
export async function setupGmailWatch(
  accountId: string,
): Promise<GmailWatchResult> {
  const account = await db.query.Accounts.findFirst({
    where: eq(Accounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const { gmail } = await getAuthenticatedClient(account);
  const topic = getGmailPubSubTopic();

  log('Setting up Gmail watch for account %s with topic %s', accountId, topic);

  const response = await gmail.users.watch({
    requestBody: {
      labelFilterBehavior: 'include',
      labelIds: ['INBOX', 'SENT'],
      topicName: topic,
    },
    userId: 'me',
  });

  if (!response.data.historyId || !response.data.expiration) {
    throw new Error(
      'Failed to setup Gmail watch: missing historyId or expiration',
    );
  }

  const expiration = new Date(Number(response.data.expiration));

  // Update database with watch info
  await db
    .update(Accounts)
    .set({
      watchExpiration: expiration,
      watchHistoryId: response.data.historyId,
    })
    .where(eq(Accounts.id, accountId));

  log(
    'Gmail watch setup complete for account %s, expires at %s',
    accountId,
    expiration.toISOString(),
  );

  return {
    expiration,
    historyId: response.data.historyId,
  };
}

/**
 * Stop Gmail push notifications for an account
 *
 * @param accountId Account ID from better-auth Accounts table
 */
export async function stopGmailWatch(accountId: string): Promise<void> {
  const account = await db.query.Accounts.findFirst({
    where: eq(Accounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const { gmail } = await getAuthenticatedClient(account);

  log('Stopping Gmail watch for account %s', accountId);

  await gmail.users.stop({
    userId: 'me',
  });

  // Clear watch info from database
  await db
    .update(Accounts)
    .set({
      watchExpiration: null,
      watchHistoryId: null,
    })
    .where(eq(Accounts.id, accountId));

  log('Gmail watch stopped for account %s', accountId);
}

/**
 * Renew Gmail watch before it expires
 * This is essentially the same as setupGmailWatch but explicitly named for clarity
 *
 * @param accountId Account ID from better-auth Accounts table
 * @returns Watch result with new historyId and expiration
 */
export async function renewGmailWatch(
  accountId: string,
): Promise<GmailWatchResult> {
  log('Renewing Gmail watch for account %s', accountId);
  return setupGmailWatch(accountId);
}

/**
 * Get user's email address from the Gmail account
 */
export async function getGmailUserEmail(accountId: string): Promise<string> {
  const gmail = await getGmailClient(accountId);
  const profile = await gmail.users.getProfile({ userId: 'me' });

  if (!profile.data.emailAddress) {
    throw new Error('Failed to get email address from Gmail');
  }

  return profile.data.emailAddress;
}
