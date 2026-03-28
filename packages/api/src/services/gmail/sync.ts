import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import type { EmailAttachmentMeta } from '@seawatts/db/schema';
import { Accounts, EmailMessages, EmailThreads } from '@seawatts/db/schema';
import { debug } from '@seawatts/logger';
import type { gmail_v1 } from 'googleapis';

import type { SyncResult } from '../../email/types';
import { getErrorMessage, parseGmailDate } from '../../utils';
import { uploadAttachment } from '../storage/email-storage';
import { getGmailClient } from './client';
import {
  createBodyPreview,
  extractAttachmentMeta,
  extractEmailBodies,
  getHeader,
  parseEmailAddress,
  redactPII,
} from './parser';

const log = debug('seawatts:gmail:sync');

// Gmail category type matching the database enum
type GmailCategory = 'primary' | 'social' | 'promotions' | 'updates' | 'forums';

/**
 * Extract Gmail category from label IDs
 * Maps Gmail's CATEGORY_* labels to our simplified category enum
 */
function extractGmailCategory(labels: string[]): GmailCategory {
  if (labels.includes('CATEGORY_SOCIAL')) return 'social';
  if (labels.includes('CATEGORY_PROMOTIONS')) return 'promotions';
  if (labels.includes('CATEGORY_UPDATES')) return 'updates';
  if (labels.includes('CATEGORY_FORUMS')) return 'forums';
  // CATEGORY_PERSONAL or no category = primary
  return 'primary';
}

/**
 * Check if a thread should be skipped (spam or trash)
 */
function isSpamOrTrash(labels: string[]): {
  isSpam: boolean;
  isTrash: boolean;
} {
  return {
    isSpam: labels.includes('SPAM'),
    isTrash: labels.includes('TRASH'),
  };
}

export interface SyncOptions {
  fullSync?: boolean;
}

/**
 * Sync a Gmail account - performs full or incremental sync
 */
export async function syncGmailAccount(
  accountId: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const { fullSync = false } = options;

  const account = await db.query.Accounts.findFirst({
    where: eq(Accounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const gmail = await getGmailClient(accountId);

  const result: SyncResult = {
    errors: [],
    messagesProcessed: 0,
    newHistoryId: null,
    threadsProcessed: 0,
  };

  const syncedThreadIds: string[] = [];

  try {
    if (fullSync || !account.lastHistoryId) {
      await performFullSync(gmail, accountId, result, syncedThreadIds, account);
    } else {
      await performIncrementalSync(
        gmail,
        accountId,
        account.lastHistoryId,
        result,
        syncedThreadIds,
        account,
      );
    }

    if (result.newHistoryId) {
      await db
        .update(Accounts)
        .set({
          lastHistoryId: result.newHistoryId,
          lastSyncAt: new Date(),
        })
        .where(eq(Accounts.id, accountId));
    }

    log(
      'Gmail sync completed for account %s: %d threads, %d messages',
      accountId,
      result.threadsProcessed,
      result.messagesProcessed,
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
export async function syncThread(
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

  // Check for spam/trash and extract Gmail category
  const { isSpam, isTrash } = isSpamOrTrash(labels);
  const gmailCategory = extractGmailCategory(labels);

  // Skip spam and trash threads entirely - don't store or process them
  if (isSpam || isTrash) {
    log('Skipping %s thread %s', isSpam ? 'spam' : 'trash', threadId);
    return null;
  }

  const lastMessageAt = parseGmailDate(lastMessage.internalDate);

  const [dbThread] = await db
    .insert(EmailThreads)
    .values({
      accountId,
      gmailCategory,
      gmailThreadId: threadId,
      isRead,
      isSpam,
      isStarred: labels.includes('STARRED'),
      isTrash,
      labels,
      lastMessageAt,
      messageCount: messages.length,
      participantEmails: Array.from(participants),
      snippet: redactPII(thread.snippet ?? ''),
      subject: redactPII(subject),
    })
    .onConflictDoUpdate({
      set: {
        gmailCategory,
        isRead,
        isSpam,
        isStarred: labels.includes('STARRED'),
        isTrash,
        labels,
        lastMessageAt,
        messageCount: messages.length,
        participantEmails: Array.from(participants),
        snippet: redactPII(thread.snippet ?? ''),
        subject: redactPII(subject),
      },
      target: [EmailThreads.accountId, EmailThreads.gmailThreadId],
    })
    .returning();

  if (!dbThread) return null;

  // Sync individual messages
  for (const msg of messages) {
    await syncMessage(
      gmail,
      accountId,
      dbThread.id,
      msg,
      result,
      account?.accountId,
    );
  }

  return dbThread.id;
}

/**
 * Sync a single message
 */
async function syncMessage(
  gmail: gmail_v1.Gmail,
  accountId: string,
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

  const messageIdHeader = getHeader(headers, 'Message-ID') || null;
  const inReplyTo = getHeader(headers, 'In-Reply-To') || null;

  const bodies = extractEmailBodies(message.payload);

  const bodyPreview = bodies.text
    ? redactPII(createBodyPreview(bodies.text, 500) ?? '')
    : null;

  // Extract attachment metadata and upload attachments to storage
  const attachmentsMeta = extractAttachmentMeta(message.payload);
  const attachments: EmailAttachmentMeta[] = [];

  for (const att of attachmentsMeta) {
    // Get the attachment ID from the payload
    const attachmentId = findAttachmentId(message.payload, att.filename);

    if (attachmentId) {
      try {
        // Fetch attachment content from Gmail
        const attachmentResponse = await gmail.users.messages.attachments.get({
          id: attachmentId,
          messageId: message.id,
          userId: 'me',
        });

        const attachmentData = attachmentResponse.data.data;
        if (attachmentData) {
          // Decode base64url content
          const content = Buffer.from(attachmentData, 'base64url');

          // Upload to storage
          const uploadResult = await uploadAttachment(accountId, message.id, {
            content,
            filename: att.filename,
            mimeType: att.mimeType,
          });

          if (uploadResult) {
            attachments.push({
              cid: att.cid,
              filename: att.filename,
              id: uploadResult.id,
              mimeType: att.mimeType,
              size: att.size,
              storagePath: uploadResult.storagePath,
            });
          } else {
            // Store metadata without storage path
            attachments.push({
              cid: att.cid,
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size,
            });
          }
        }
      } catch (error) {
        log(
          'Failed to upload attachment %s for %s: %s',
          att.filename,
          message.id,
          getErrorMessage(error),
        );
        // Store metadata without storage path
        attachments.push({
          cid: att.cid,
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
        });
      }
    } else {
      // No attachment ID, just store metadata
      attachments.push({
        cid: att.cid,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
      });
    }
  }

  // Check if this message is from the user (for writing style extraction)
  const isFromUser = userEmail
    ? fromParsed.email.toLowerCase() === userEmail.toLowerCase()
    : (message.labelIds ?? []).includes('SENT');

  const internalDate = parseGmailDate(message.internalDate);

  await db
    .insert(EmailMessages)
    .values({
      attachmentMeta: attachments,
      bodyHtml: bodies.html ?? null,
      bodyPreview,
      bodyText: bodies.text ?? null,
      ccEmails: ccAddresses.map((a) => a.email),
      fromEmail: fromParsed.email,
      fromName: fromParsed.name,
      gmailMessageId: message.id,
      hasAttachments: attachments.length > 0,
      inReplyTo,
      internalDate,
      isFromUser,
      messageIdHeader,
      subject: redactPII(subject),
      threadId,
      toEmails: toAddresses.map((a) => a.email),
    })
    .onConflictDoUpdate({
      set: {
        attachmentMeta: attachments,
        bodyHtml: bodies.html ?? null,
        bodyPreview,
        bodyText: bodies.text ?? null,
        ccEmails: ccAddresses.map((a) => a.email),
        fromEmail: fromParsed.email,
        fromName: fromParsed.name,
        hasAttachments: attachments.length > 0,
        inReplyTo,
        isFromUser,
        messageIdHeader,
        subject: redactPII(subject),
        toEmails: toAddresses.map((a) => a.email),
      },
      target: [EmailMessages.gmailMessageId],
    })
    .returning();

  result.messagesProcessed++;
}

/**
 * Find attachment ID in message payload by filename
 */
function findAttachmentId(
  payload: gmail_v1.Schema$MessagePart | undefined,
  filename: string,
): string | null {
  if (!payload) return null;

  if (payload.filename === filename && payload.body?.attachmentId) {
    return payload.body.attachmentId;
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const found = findAttachmentId(part, filename);
      if (found) return found;
    }
  }

  return null;
}
