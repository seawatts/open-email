/**
 * Thread Service
 *
 * Centralized thread fetching with messages.
 * Used by extraction services, routers, and agents.
 */

import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import {
  EmailMessages,
  type EmailMessageType,
  EmailThreads,
  type EmailThreadType,
} from '@seawatts/db/schema';

/**
 * Options for fetching thread data
 */
export interface GetThreadOptions {
  includeMessages?: boolean;
}

/**
 * Thread with related data
 */
export interface ThreadWithRelations {
  thread: EmailThreadType;
  messages: EmailMessageType[];
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
  const { includeMessages = true } = options;

  const thread = await db.query.EmailThreads.findFirst({
    where: eq(EmailThreads.id, threadId),
  });

  if (!thread) {
    return null;
  }

  const messages = includeMessages
    ? await db.query.EmailMessages.findMany({
        orderBy: [EmailMessages.internalDate],
        where: eq(EmailMessages.threadId, threadId),
      })
    : [];

  return {
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

  const senderMap = new Map<
    string,
    { fromEmail: string; fromName: string | null }
  >();

  const singleThreadId = threadIds[0];
  if (threadIds.length === 1 && singleThreadId) {
    const messages = await db
      .select({
        fromEmail: EmailMessages.fromEmail,
        fromName: EmailMessages.fromName,
        threadId: EmailMessages.threadId,
      })
      .from(EmailMessages)
      .where(eq(EmailMessages.threadId, singleThreadId))
      .orderBy(EmailMessages.internalDate);

    const firstMessage = messages[0];
    if (firstMessage) {
      senderMap.set(firstMessage.threadId, {
        fromEmail: firstMessage.fromEmail,
        fromName: firstMessage.fromName,
      });
    }
    return senderMap;
  }

  // TODO: Use inArray for better performance in production
  const allMessages = await db
    .select({
      fromEmail: EmailMessages.fromEmail,
      fromName: EmailMessages.fromName,
      internalDate: EmailMessages.internalDate,
      threadId: EmailMessages.threadId,
    })
    .from(EmailMessages)
    .orderBy(EmailMessages.internalDate);

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
