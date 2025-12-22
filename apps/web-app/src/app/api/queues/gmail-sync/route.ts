import { and, eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import { Accounts } from '@seawatts/db/schema';
import { receive } from '@vercel/queue';
import { NextResponse } from 'next/server';

import type { GmailSyncPayload } from '../../webhooks/gmail/route';

// Import sync function - this will be resolved at runtime
// Using dynamic import to avoid circular dependencies
async function getSyncFunction() {
  const { syncGmailAccount } = await import('@seawatts/api/services/gmail');
  return syncGmailAccount;
}

/**
 * Process a Gmail sync message from the queue
 */
async function processGmailSync(message: GmailSyncPayload): Promise<void> {
  const { emailAddress, historyId, receivedAt } = message;

  console.log(
    `Processing Gmail sync for ${emailAddress} (historyId: ${historyId}, received: ${receivedAt})`,
  );

  // Look up Google account by accountId (email for Google OAuth)
  const account = await db.query.Accounts.findFirst({
    where: and(
      eq(Accounts.accountId, emailAddress),
      eq(Accounts.providerId, 'google'),
    ),
  });

  if (!account) {
    console.warn(`No Google account found for email: ${emailAddress}`);
    // Don't throw - this is not a retryable error
    return;
  }

  // Check if the historyId is newer than what we have
  // If not, skip the sync as we already have this data
  if (account.lastHistoryId) {
    const currentHistoryId = BigInt(account.lastHistoryId);
    const newHistoryId = BigInt(historyId);

    if (newHistoryId <= currentHistoryId) {
      console.log(
        `Skipping sync for ${emailAddress}: historyId ${historyId} <= current ${account.lastHistoryId}`,
      );
      return;
    }
  }

  try {
    const syncGmailAccount = await getSyncFunction();

    // Perform incremental sync
    const result = await syncGmailAccount(account.id, {
      extractKeywords: true,
      fullSync: false,
      userId: account.userId,
    });

    console.log(
      `Gmail sync completed for ${emailAddress}: ${result.threadsProcessed} threads, ${result.messagesProcessed} messages`,
    );

    if (result.errors.length > 0) {
      console.warn(
        `Gmail sync had ${result.errors.length} errors:`,
        result.errors,
      );
    }
  } catch (error) {
    console.error(`Gmail sync failed for ${emailAddress}:`, error);
    // Re-throw to trigger queue retry
    throw error;
  }
}

/**
 * Gmail Sync Queue Consumer
 *
 * Processes sync jobs from the gmail-sync queue.
 * Looks up the Google account by email and performs incremental sync.
 *
 * POST /api/queues/gmail-sync
 */
export async function POST() {
  return receive<GmailSyncPayload>(
    'gmail-sync',
    'sync-consumer',
    processGmailSync,
  );
}

/**
 * Health check for queue consumer
 */
export async function GET() {
  return NextResponse.json({ service: 'gmail-sync-consumer', status: 'ok' });
}
