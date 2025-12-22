import { and, eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import { Accounts } from '@seawatts/db/schema';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Feature flag: Set to true when Vercel Queues is out of beta
// TODO: Switch to true when Vercel Queues is generally available
const USE_VERCEL_QUEUE = process.env.USE_VERCEL_QUEUE === 'true';

// Schema for Gmail Pub/Sub notification payload
const gmailPubSubMessageSchema = z.object({
  message: z.object({
    data: z.string(), // base64 encoded
    messageId: z.string(),
    publishTime: z.string(),
  }),
  subscription: z.string(),
});

// Schema for decoded Gmail notification data
const gmailNotificationDataSchema = z.object({
  emailAddress: z.string().email(),
  historyId: z.coerce.string(),
});

// Queue message payload type
export interface GmailSyncPayload {
  emailAddress: string;
  historyId: string;
  receivedAt: string;
}

/**
 * Import sync function dynamically to avoid circular dependencies
 */
async function getSyncFunction() {
  const { syncGmailAccount } = await import('@seawatts/api/services/gmail');
  return syncGmailAccount;
}

/**
 * Process Gmail sync inline (used when queue is not available)
 */
async function processGmailSyncInline(
  emailAddress: string,
  historyId: string,
): Promise<void> {
  // Look up Google account by accountId (email for Google OAuth)
  // The accountId field in better-auth's Accounts table stores the Google account email
  const account = await db.query.Accounts.findFirst({
    where: and(
      eq(Accounts.accountId, emailAddress),
      eq(Accounts.providerId, 'google'),
    ),
  });

  if (!account) {
    console.warn(`No Google account found for email: ${emailAddress}`);
    return;
  }

  // Check if the historyId is newer than what we have
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
}

/**
 * Push to Vercel Queue for async processing
 * Only used when USE_VERCEL_QUEUE is true
 */
async function queueGmailSync(payload: GmailSyncPayload): Promise<void> {
  // Dynamic import to avoid loading @vercel/queue when not needed
  const { send } = await import('@vercel/queue');
  await send('gmail-sync', payload);
  console.log(`Queued Gmail sync job for ${payload.emailAddress}`);
}

/**
 * Gmail Pub/Sub Webhook Handler
 *
 * Receives push notifications from Google Pub/Sub when email changes occur.
 * Processes sync inline or queues for async processing based on feature flag.
 *
 * POST /api/webhooks/gmail
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Parse and validate the Pub/Sub message
    const parseResult = gmailPubSubMessageSchema.safeParse(body);

    if (!parseResult.success) {
      console.error('Invalid Gmail Pub/Sub payload:', parseResult.error);
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 },
      );
    }

    const { message } = parseResult.data;

    // Decode base64 message data
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    let notificationData: unknown;

    try {
      notificationData = JSON.parse(decodedData);
    } catch {
      console.error('Failed to parse Gmail notification data:', decodedData);
      return NextResponse.json(
        { error: 'Invalid notification data' },
        { status: 400 },
      );
    }

    // Validate the notification data
    const dataParseResult =
      gmailNotificationDataSchema.safeParse(notificationData);

    if (!dataParseResult.success) {
      console.error(
        'Invalid Gmail notification data schema:',
        dataParseResult.error,
      );
      return NextResponse.json(
        { error: 'Invalid notification data schema' },
        { status: 400 },
      );
    }

    const { emailAddress, historyId } = dataParseResult.data;

    console.log(
      `Received Gmail notification for ${emailAddress} with historyId ${historyId}`,
    );

    if (USE_VERCEL_QUEUE) {
      // Queue for async processing (when Vercel Queues is available)
      const payload: GmailSyncPayload = {
        emailAddress,
        historyId,
        receivedAt: new Date().toISOString(),
      };
      await queueGmailSync(payload);
    } else {
      // Process inline (current approach while queue is in beta)
      // Note: This runs synchronously but Google Pub/Sub allows up to 10s response time
      await processGmailSyncInline(emailAddress, historyId);
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    // Return 200 anyway to prevent Pub/Sub retries for unhandled errors
    return NextResponse.json({ error: 'Processing failed', received: true });
  }
}

/**
 * Health check endpoint for Gmail webhook
 * Google may send GET requests to verify the endpoint
 */
export async function GET() {
  return NextResponse.json({
    queueEnabled: USE_VERCEL_QUEUE,
    service: 'gmail-webhook',
    status: 'ok',
  });
}
