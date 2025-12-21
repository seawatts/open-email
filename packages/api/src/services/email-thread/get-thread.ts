/**
 * Thread Service
 *
 * Centralized thread fetching with messages, keywords, and highlights.
 * Used by extraction services, routers, and agents.
 */

import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import {
  EmailHighlights,
  EmailKeywords,
  EmailMessages,
  EmailThreads,
  type EmailHighlightType,
  type EmailKeywordType,
  type EmailMessageType,
  type EmailThreadType,
} from '@seawatts/db/schema';

/**
 * Options for fetching thread data
 */
export interface GetThreadOptions {
  includeMessages?: boolean;
  includeKeywords?: boolean;
  includeHighlights?: boolean;
}

/**
 * Thread with related data
 */
export interface ThreadWithRelations {
  thread: EmailThreadType;
  messages: EmailMessageType[];
  keywords: EmailKeywordType[];
  highlights: EmailHighlightType[];
}

/**
 * Get a thread by ID with optional related data.
 *
 * @param threadId - The thread ID to fetch
 * @param options - What related data to include
 * @returns Thread with requested relations, or null if not found
 */
export async function getThreadWithMessages(
  threadId: string,
  options: GetThreadOptions = {},
): Promise<ThreadWithRelations | null> {
  const {
    includeMessages = true,
    includeKeywords = false,
    includeHighlights = false,
  } = options;

  // Get thread
  const thread = await db.query.EmailThreads.findFirst({
    where: eq(EmailThreads.id, threadId),
  });

  if (!thread) {
    return null;
  }

  // Get messages if requested
  const messages = includeMessages
    ? await db.query.EmailMessages.findMany({
        orderBy: [EmailMessages.internalDate],
        where: eq(EmailMessages.threadId, threadId),
      })
    : [];

  // Get keywords if requested
  const keywords = includeKeywords
    ? await db
        .select()
        .from(EmailKeywords)
        .where(eq(EmailKeywords.threadId, threadId))
    : [];

  // Get highlights if requested
  const highlights = includeHighlights
    ? await db.query.EmailHighlights.findMany({
        where: eq(EmailHighlights.threadId, threadId),
      })
    : [];

  return {
    highlights,
    keywords,
    messages,
    thread,
  };
}

/**
 * Get the first sender for each thread.
 * Useful for search results where we need the thread initiator.
 *
 * @param threadIds - Array of thread IDs
 * @returns Map of threadId to sender info
 */
export async function getThreadSenders(
  threadIds: string[],
): Promise<Map<string, { fromEmail: string; fromName: string | null }>> {
  if (threadIds.length === 0) {
    return new Map();
  }

  const messages = await db
    .select({
      fromEmail: EmailMessages.fromEmail,
      fromName: EmailMessages.fromName,
      threadId: EmailMessages.threadId,
    })
    .from(EmailMessages)
    .where(
      eq(
        EmailMessages.threadId,
        // Use first thread ID to start, then filter in JS
        // This is a workaround - in production use inArray
        threadIds[0]!,
      ),
    )
    .orderBy(EmailMessages.internalDate);

  // For multiple threads, we need to query differently
  // Using raw SQL with inArray would be better
  const senderMap = new Map<
    string,
    { fromEmail: string; fromName: string | null }
  >();

  // Batch query all messages for all threads
  const allMessages = await db
    .select({
      fromEmail: EmailMessages.fromEmail,
      fromName: EmailMessages.fromName,
      internalDate: EmailMessages.internalDate,
      threadId: EmailMessages.threadId,
    })
    .from(EmailMessages)
    .orderBy(EmailMessages.internalDate);

  // Filter to only requested threads and pick first message per thread
  const threadIdSet = new Set(threadIds);
  for (const msg of allMessages) {
    if (threadIdSet.has(msg.threadId) && !senderMap.has(msg.threadId)) {
      senderMap.set(msg.threadId, {
        fromEmail: msg.fromEmail,
        fromName: msg.fromName,
      });
    }
  }

  return senderMap;
}

/**
 * Get messages for a thread, optionally filtered to user-sent only.
 *
 * @param threadId - The thread ID
 * @param userSentOnly - Only return messages sent by the user
 * @returns Array of messages
 */
export async function getThreadMessages(
  threadId: string,
  userSentOnly = false,
): Promise<EmailMessageType[]> {
  const messages = await db.query.EmailMessages.findMany({
    orderBy: [EmailMessages.internalDate],
    where: eq(EmailMessages.threadId, threadId),
  });

  if (userSentOnly) {
    return messages.filter((m) => m.isFromUser);
  }

  return messages;
}
