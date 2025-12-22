import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import { Accounts, EmailMessages, EmailThreads } from '@seawatts/db/schema';
import { debug } from '@seawatts/logger';
import type { gmail_v1 } from 'googleapis';

import type { SyncResult } from '../../email/types';
import { getErrorMessage, parseGmailDate } from '../../utils';
import { getGmailClient } from './client';
import {
  extractAllForThread,
  extractAndStoreKeywords,
} from './extract-on-sync';
import {
  extractAttachmentMeta,
  extractPlainText,
  getHeader,
  parseEmailAddress,
  redactPII,
} from './parser';

const log = debug('seawatts:gmail:sync');

// Extended sync result with extraction info
export interface SyncResultWithExtraction extends SyncResult {
  threadsExtracted?: number;
  summariesGenerated?: number;
  userProfileUpdates?: number;
}

// Options for sync operation
export interface SyncOptions {
  fullSync?: boolean;
  extractKeywords?: boolean;
  extractSummaries?: boolean;
  extractUserProfile?: boolean;
  userId?: string; // Required for user profile extraction
}

/**
 * Sync a Gmail account - performs full or incremental sync
 *
 * @param accountId Gmail account ID
 * @param options Sync options (fullSync, extractKeywords)
 */
export async function syncGmailAccount(
  accountId: string,
  options: SyncOptions = {},
): Promise<SyncResultWithExtraction> {
  const {
    fullSync = false,
    extractKeywords = false,
    extractSummaries = false,
    extractUserProfile = false,
    userId,
  } = options;

  const account = await db.query.Accounts.findFirst({
    where: eq(Accounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const gmail = await getGmailClient(accountId);

  const result: SyncResultWithExtraction = {
    errors: [],
    messagesProcessed: 0,
    newHistoryId: null,
    summariesGenerated: 0,
    threadsExtracted: 0,
    threadsProcessed: 0,
    userProfileUpdates: 0,
  };

  // Track synced thread IDs for extraction
  const syncedThreadIds: string[] = [];

  try {
    if (fullSync || !account.lastHistoryId) {
      // Full sync - fetch recent threads
      await performFullSync(gmail, accountId, result, syncedThreadIds, account);
    } else {
      // Incremental sync using history API
      await performIncrementalSync(
        gmail,
        accountId,
        account.lastHistoryId,
        result,
        syncedThreadIds,
        account,
      );
    }

    // Update last history ID
    if (result.newHistoryId) {
      await db
        .update(Accounts)
        .set({
          lastHistoryId: result.newHistoryId,
          lastSyncAt: new Date(),
        })
        .where(eq(Accounts.id, accountId));
    }

    // Run extraction for synced threads
    const shouldExtract =
      extractKeywords || extractSummaries || extractUserProfile;

    if (shouldExtract && syncedThreadIds.length > 0) {
      log('Running extraction for %d synced threads', syncedThreadIds.length);

      for (const threadId of syncedThreadIds) {
        try {
          // If all extraction types are enabled and we have userId, use comprehensive extraction
          if (
            (extractKeywords || extractSummaries || extractUserProfile) &&
            userId
          ) {
            const extractResult = await extractAllForThread(threadId, userId, {
              extractKeywords,
              extractSummary: extractSummaries,
              extractUserProfile,
            });

            if (extractResult.keywords) {
              result.threadsExtracted = (result.threadsExtracted ?? 0) + 1;
            }
            if (extractResult.summary) {
              result.summariesGenerated = (result.summariesGenerated ?? 0) + 1;
            }
            if (extractResult.userProfileUpdated) {
              result.userProfileUpdates = (result.userProfileUpdates ?? 0) + 1;
            }
          } else if (extractKeywords) {
            // Just extract keywords
            const extractResult = await extractAndStoreKeywords(threadId);
            if (extractResult) {
              result.threadsExtracted = (result.threadsExtracted ?? 0) + 1;
            }
          }
        } catch (error) {
          log(
            'Failed to extract for thread %s: %s',
            threadId,
            getErrorMessage(error),
          );
        }
      }
    }

    log(
      'Gmail sync completed for account %s: %d threads, %d messages, %d keywords, %d summaries, %d profile updates',
      accountId,
      result.threadsProcessed,
      result.messagesProcessed,
      result.threadsExtracted ?? 0,
      result.summariesGenerated ?? 0,
      result.userProfileUpdates ?? 0,
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    log('Gmail sync failed for account %s: %s', accountId, errorMessage);
    result.errors.push(errorMessage);
  }

  return result;
}

/**
 * Perform a full sync - fetch recent threads
 */
async function performFullSync(
  gmail: gmail_v1.Gmail,
  accountId: string,
  result: SyncResult,
  syncedThreadIds: string[],
  account?: { accountId: string } | null,
): Promise<void> {
  log('Performing full Gmail sync for account %s', accountId);

  // Fetch recent threads (last 100)
  const threadsResponse = await gmail.users.threads.list({
    maxResults: 100,
    q: 'in:inbox OR in:sent',
    userId: 'me',
  });

  const threads = threadsResponse.data.threads ?? [];
  log('Found %d threads to sync', threads.length);

  // Get current history ID for future incremental syncs
  const profile = await gmail.users.getProfile({ userId: 'me' });
  result.newHistoryId = profile.data.historyId ?? null;

  // Process each thread
  for (const threadRef of threads) {
    if (!threadRef.id) continue;

    try {
      const dbThreadId = await syncThread(
        gmail,
        accountId,
        threadRef.id,
        result,
        account,
      );
      result.threadsProcessed++;
      if (dbThreadId) {
        syncedThreadIds.push(dbThreadId);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      log('Failed to sync thread %s: %s', threadRef.id, errorMessage);
      result.errors.push(`Thread ${threadRef.id}: ${errorMessage}`);
    }
  }
}

/**
 * Perform incremental sync using Gmail History API
 */
async function performIncrementalSync(
  gmail: gmail_v1.Gmail,
  accountId: string,
  lastHistoryId: string,
  result: SyncResult,
  syncedThreadIds: string[],
  account?: { accountId: string } | null,
): Promise<void> {
  log(
    'Performing incremental Gmail sync for account %s from history %s',
    accountId,
    lastHistoryId,
  );

  try {
    const historyResponse = await gmail.users.history.list({
      historyTypes: [
        'messageAdded',
        'messageDeleted',
        'labelAdded',
        'labelRemoved',
      ],
      startHistoryId: lastHistoryId,
      userId: 'me',
    });

    const history = historyResponse.data.history ?? [];
    result.newHistoryId = historyResponse.data.historyId ?? lastHistoryId;

    // Collect unique thread IDs that need updating
    const threadIds = new Set<string>();

    for (const record of history) {
      for (const msg of record.messagesAdded ?? []) {
        if (msg.message?.threadId) {
          threadIds.add(msg.message.threadId);
        }
      }
      for (const msg of record.labelsAdded ?? []) {
        if (msg.message?.threadId) {
          threadIds.add(msg.message.threadId);
        }
      }
      for (const msg of record.labelsRemoved ?? []) {
        if (msg.message?.threadId) {
          threadIds.add(msg.message.threadId);
        }
      }
    }

    log('Found %d threads to update', threadIds.size);

    // Sync each changed thread
    for (const threadId of threadIds) {
      try {
        const dbThreadId = await syncThread(
          gmail,
          accountId,
          threadId,
          result,
          account,
        );
        result.threadsProcessed++;
        if (dbThreadId) {
          syncedThreadIds.push(dbThreadId);
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        log('Failed to sync thread %s: %s', threadId, errorMessage);
        result.errors.push(`Thread ${threadId}: ${errorMessage}`);
      }
    }
  } catch (error) {
    // History ID might be invalid, fall back to full sync
    if ((error as { code?: number }).code === 404) {
      log('History ID invalid for account %s, performing full sync', accountId);
      await performFullSync(gmail, accountId, result, syncedThreadIds, account);
    } else {
      throw error;
    }
  }
}

/**
 * Sync a single thread and its messages
 * Returns the database thread ID on success
 */
async function syncThread(
  gmail: gmail_v1.Gmail,
  accountId: string,
  threadId: string,
  result: SyncResult,
  account?: { accountId: string } | null,
): Promise<string | null> {
  const threadResponse = await gmail.users.threads.get({
    format: 'full',
    id: threadId,
    userId: 'me',
  });

  const thread = threadResponse.data;
  if (!thread.messages || thread.messages.length === 0) {
    return null;
  }

  // Extract thread metadata from messages
  const messages = thread.messages;
  const lastMessage = messages.at(-1);
  const firstMessage = messages[0];

  if (!lastMessage || !firstMessage) return null;

  // Get subject from first message
  const subject =
    getHeader(firstMessage.payload?.headers, 'subject') || '(no subject)';

  // Collect participant emails
  const participants = new Set<string>();
  for (const msg of messages) {
    const headers = msg.payload?.headers ?? [];
    for (const header of headers) {
      if (['from', 'to', 'cc'].includes(header.name?.toLowerCase() ?? '')) {
        const addresses = parseEmailAddress(header.value ?? '');
        for (const addr of addresses) {
          participants.add(addr.email);
        }
      }
    }
  }

  // Determine read status and labels
  const labels = lastMessage.labelIds ?? [];
  const isRead = !labels.includes('UNREAD');

  // Create redacted snippet
  const snippet = redactPII(thread.snippet ?? '');

  // Upsert thread
  const lastMessageAt = parseGmailDate(lastMessage.internalDate);

  const [dbThread] = await db
    .insert(EmailThreads)
    .values({
      accountId,
      gmailThreadId: threadId,
      isRead,
      labels,
      lastMessageAt,
      messageCount: messages.length,
      participantEmails: Array.from(participants),
      snippet,
      subject: redactPII(subject),
    })
    .onConflictDoUpdate({
      set: {
        isRead,
        labels,
        lastMessageAt,
        messageCount: messages.length,
        participantEmails: Array.from(participants),
        snippet,
        subject: redactPII(subject),
      },
      target: [EmailThreads.accountId, EmailThreads.gmailThreadId],
    })
    .returning();

  if (!dbThread) return null;

  // Sync individual messages
  for (const msg of messages) {
    await syncMessage(dbThread.id, msg, result, account?.accountId);
  }

  return dbThread.id;
}

/**
 * Sync a single message
 */
async function syncMessage(
  threadId: string,
  message: gmail_v1.Schema$Message,
  result: SyncResult,
  userEmail?: string,
): Promise<void> {
  if (!message.id) return;

  const headers = message.payload?.headers ?? [];

  const fromParsed = parseEmailAddress(getHeader(headers, 'From'))[0] ?? {
    email: 'unknown',
    name: null,
  };
  const toAddresses = parseEmailAddress(getHeader(headers, 'To'));
  const ccAddresses = parseEmailAddress(getHeader(headers, 'Cc'));
  const subject = getHeader(headers, 'Subject') || '(no subject)';

  // Extract plain text body
  const bodyText = extractPlainText(message.payload);
  const bodyPreview = bodyText ? redactPII(bodyText.slice(0, 500)) : null;

  // Check for attachments
  const attachments = extractAttachmentMeta(message.payload);

  // Check if this message is from the user (for writing style extraction)
  const isFromUser = userEmail
    ? fromParsed.email.toLowerCase() === userEmail.toLowerCase()
    : (message.labelIds ?? []).includes('SENT');

  const internalDate = parseGmailDate(message.internalDate);

  await db
    .insert(EmailMessages)
    .values({
      attachmentMeta: attachments,
      bodyPreview,
      ccEmails: ccAddresses.map((a) => a.email),
      fromEmail: fromParsed.email,
      fromName: fromParsed.name,
      gmailMessageId: message.id,
      hasAttachments: attachments.length > 0,
      internalDate,
      isFromUser,
      snippet: redactPII(message.snippet ?? ''),
      subject: redactPII(subject),
      threadId,
      toEmails: toAddresses.map((a) => a.email),
    })
    .onConflictDoUpdate({
      set: {
        attachmentMeta: attachments,
        bodyPreview,
        ccEmails: ccAddresses.map((a) => a.email),
        fromEmail: fromParsed.email,
        fromName: fromParsed.name,
        hasAttachments: attachments.length > 0,
        isFromUser,
        snippet: redactPII(message.snippet ?? ''),
        subject: redactPII(subject),
        toEmails: toAddresses.map((a) => a.email),
      },
      target: [EmailMessages.gmailMessageId],
    })
    .returning();

  result.messagesProcessed++;
}
