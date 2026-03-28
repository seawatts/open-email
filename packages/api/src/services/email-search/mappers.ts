/**
 * Search Result Mappers
 *
 * Shared mapping functions for transforming database records
 * into search result format.
 */

import { db } from '@seawatts/db/client';
import { EmailMessages } from '@seawatts/db/schema';
import { inArray } from 'drizzle-orm';

import type { EmailSearchResult } from './types';

/**
 * Thread data from database query
 */
export interface ThreadRow {
  id: string;
  subject: string;
  snippet: string | null;
  isRead: boolean;
  lastMessageAt: Date;
  messageCount: number;
  relevanceScore?: number;
}

/**
 * Sender info from first message
 */
export interface SenderInfo {
  fromEmail: string;
  fromName: string | null;
}

/**
 * Build a map of thread IDs to their first message sender.
 * Queries the database for first messages of each thread.
 *
 * @param threadIds - Array of thread IDs to look up
 * @returns Map of threadId to sender info
 */
export async function buildThreadSenderMap(
  threadIds: string[],
): Promise<Map<string, SenderInfo>> {
  const senderMap = new Map<string, SenderInfo>();

  if (threadIds.length === 0) {
    return senderMap;
  }

  const firstMessages = await db
    .select({
      fromEmail: EmailMessages.fromEmail,
      fromName: EmailMessages.fromName,
      threadId: EmailMessages.threadId,
    })
    .from(EmailMessages)
    .where(inArray(EmailMessages.threadId, threadIds))
    .orderBy(EmailMessages.internalDate);

  for (const msg of firstMessages) {
    if (!senderMap.has(msg.threadId)) {
      senderMap.set(msg.threadId, {
        fromEmail: msg.fromEmail,
        fromName: msg.fromName,
      });
    }
  }

  return senderMap;
}

/**
 * Map a thread row to a search result.
 */
export function mapThreadToSearchResult(
  thread: ThreadRow,
  senderMap: Map<string, SenderInfo>,
): EmailSearchResult {
  const sender = senderMap.get(thread.id) ?? {
    fromEmail: 'unknown',
    fromName: null,
  };

  return {
    fromEmail: sender.fromEmail,
    fromName: sender.fromName,
    isRead: thread.isRead,
    lastMessageAt: thread.lastMessageAt,
    messageCount: thread.messageCount,
    relevanceScore: thread.relevanceScore ?? 1.0,
    snippet: thread.snippet,
    subject: thread.subject,
    threadId: thread.id,
  };
}

/**
 * Map multiple threads to search results.
 */
export function mapThreadsToSearchResults(
  threads: ThreadRow[],
  senderMap: Map<string, SenderInfo>,
): EmailSearchResult[] {
  return threads.map((thread) => mapThreadToSearchResult(thread, senderMap));
}

/**
 * Common stop words for search query parsing.
 */
export const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'been',
  'be',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'also',
  'now',
  'my',
  'me',
  'i',
  'you',
  'your',
  'we',
  'our',
  'they',
  'their',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
]);

/**
 * Parse a search query into cleaned search terms.
 *
 * @param query - Raw search query string
 * @returns Array of search terms with prefix matching
 */
export function parseSearchQuery(query: string): string[] {
  const cleaned = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter((word) => {
    if (word.length < 2) return false;
    return !STOP_WORDS.has(word);
  });

  return words.map((word) => `${word}:*`);
}
