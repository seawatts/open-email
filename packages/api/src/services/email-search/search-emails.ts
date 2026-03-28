/**
 * Email Search Query Builder
 *
 * Builds and executes search queries that combine:
 * 1. PostgreSQL full-text search on thread content
 * 2. Standard SQL filters for dates, senders, etc.
 */

import { db } from '@seawatts/db/client';
import { EmailThreads } from '@seawatts/db/schema';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import {
  buildThreadSenderMap,
  mapThreadsToSearchResults,
  parseSearchQuery,
} from './mappers';
import type { EmailSearchParams, EmailSearchResponse } from './types';

// ============================================================================
// Main Search Function
// ============================================================================

export async function searchEmails(
  params: EmailSearchParams,
): Promise<EmailSearchResponse> {
  const startTime = performance.now();
  const { query, filters, limit = 20, offset = 0 } = params;

  const searchTerms = parseSearchQuery(query);

  const conditions: ReturnType<typeof and>[] = [];

  conditions.push(eq(EmailThreads.isSpam, false));
  conditions.push(eq(EmailThreads.isTrash, false));

  if (searchTerms.length > 0) {
    const tsQuery = searchTerms.join(' & ');
    conditions.push(
      sql`${EmailThreads.searchVector} @@ to_tsquery('english', ${tsQuery})`,
    );
  }

  if (filters?.dateRange?.start) {
    conditions.push(gte(EmailThreads.lastMessageAt, filters.dateRange.start));
  }
  if (filters?.dateRange?.end) {
    conditions.push(lte(EmailThreads.lastMessageAt, filters.dateRange.end));
  }

  if (filters?.accountId) {
    conditions.push(eq(EmailThreads.accountId, filters.accountId));
  }

  if (filters?.unreadOnly) {
    conditions.push(eq(EmailThreads.isRead, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const threads = await db
    .select({
      accountId: EmailThreads.accountId,
      id: EmailThreads.id,
      isRead: EmailThreads.isRead,
      lastMessageAt: EmailThreads.lastMessageAt,
      messageCount: EmailThreads.messageCount,
      participantEmails: EmailThreads.participantEmails,
      relevanceScore:
        searchTerms.length > 0
          ? sql<number>`ts_rank(${EmailThreads.searchVector}, to_tsquery('english', ${searchTerms.join(' & ')}))`
          : sql<number>`1`,
      snippet: EmailThreads.snippet,
      subject: EmailThreads.subject,
    })
    .from(EmailThreads)
    .where(whereClause)
    .orderBy(
      searchTerms.length > 0
        ? desc(
            sql`ts_rank(${EmailThreads.searchVector}, to_tsquery('english', ${searchTerms.join(' & ')}))`,
          )
        : desc(EmailThreads.lastMessageAt),
    )
    .limit(limit)
    .offset(offset);

  const threadIds = threads.map((t) => t.id);
  const threadSenders = await buildThreadSenderMap(threadIds);

  const results = mapThreadsToSearchResults(threads, threadSenders);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(EmailThreads)
    .where(whereClause);

  const processingTimeMs = performance.now() - startTime;

  return {
    processingTimeMs,
    query,
    results,
    totalCount: countResult?.count ?? 0,
  };
}
