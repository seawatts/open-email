/**
 * Email Search Query Builder
 *
 * Builds and executes search queries that combine:
 * 1. PostgreSQL full-text search on thread content
 * 2. Keyword table lookups for entity matching
 * 3. Standard SQL filters for dates, senders, etc.
 */

import { db } from '@seawatts/db/client';
import { EmailKeywords, EmailThreads } from '@seawatts/db/schema';
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';

import {
  buildKeywordsByThreadMap,
  buildThreadSenderMap,
  mapThreadsToSearchResults,
  parseSearchQuery,
} from './mappers';
import type {
  EmailCategoryParams,
  EmailSearchParams,
  EmailSearchResponse,
} from './types';

// ============================================================================
// Main Search Function
// ============================================================================

export async function searchEmails(
  params: EmailSearchParams,
): Promise<EmailSearchResponse> {
  const startTime = performance.now();
  const { query, filters, limit = 20, offset = 0 } = params;

  // Parse the query into search terms
  const searchTerms = parseSearchQuery(query);

  // Build the search query
  const conditions: ReturnType<typeof and>[] = [];

  // Full-text search condition
  if (searchTerms.length > 0) {
    const tsQuery = searchTerms.join(' & ');
    conditions.push(
      sql`${EmailThreads.searchVector} @@ to_tsquery('english', ${tsQuery})`,
    );
  }

  // Date range filter
  if (filters?.dateRange?.start) {
    conditions.push(gte(EmailThreads.lastMessageAt, filters.dateRange.start));
  }
  if (filters?.dateRange?.end) {
    conditions.push(lte(EmailThreads.lastMessageAt, filters.dateRange.end));
  }

  // Bundle type filter
  if (filters?.bundleTypes && filters.bundleTypes.length > 0) {
    conditions.push(inArray(EmailThreads.bundleType, filters.bundleTypes));
  }

  // Has attachments filter - requires join to messages
  // Gmail account filter
  if (filters?.gmailAccountId) {
    conditions.push(eq(EmailThreads.gmailAccountId, filters.gmailAccountId));
  }

  // Unread only filter
  if (filters?.unreadOnly) {
    conditions.push(eq(EmailThreads.isRead, false));
  }

  // Execute the query
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get threads with relevance score
  const threads = await db
    .select({
      bundleType: EmailThreads.bundleType,
      gmailAccountId: EmailThreads.gmailAccountId,
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

  // Get matching keywords for each thread
  const threadIds = threads.map((t) => t.id);
  let keywordMatches: Array<{
    threadId: string;
    keyword: string;
    keywordType: string;
  }> = [];

  if (threadIds.length > 0 && searchTerms.length > 0) {
    // Find keywords that match search terms
    const keywordConditions = searchTerms.map((term) =>
      ilike(EmailKeywords.keyword, `%${term}%`),
    );

    keywordMatches = await db
      .select({
        keyword: EmailKeywords.keyword,
        keywordType: EmailKeywords.keywordType,
        threadId: EmailKeywords.threadId,
      })
      .from(EmailKeywords)
      .where(
        and(
          inArray(EmailKeywords.threadId, threadIds),
          or(...keywordConditions),
        ),
      );
  }

  // Build maps for efficient lookup
  const threadSenders = await buildThreadSenderMap(threadIds);
  const keywordsByThread = buildKeywordsByThreadMap(keywordMatches);

  // Map to search results
  const results = mapThreadsToSearchResults(
    threads,
    threadSenders,
    keywordsByThread,
  );

  // Get total count (for pagination)
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

// ============================================================================
// Category Listing
// ============================================================================

export async function listEmailsByCategory(
  params: EmailCategoryParams,
): Promise<EmailSearchResponse> {
  const startTime = performance.now();
  const {
    category,
    gmailAccountId,
    dateRange,
    limit = 20,
    offset = 0,
  } = params;

  const conditions: ReturnType<typeof and>[] = [
    eq(EmailThreads.bundleType, category),
  ];

  if (gmailAccountId) {
    conditions.push(eq(EmailThreads.gmailAccountId, gmailAccountId));
  }

  if (dateRange?.start) {
    conditions.push(gte(EmailThreads.lastMessageAt, dateRange.start));
  }

  if (dateRange?.end) {
    conditions.push(lte(EmailThreads.lastMessageAt, dateRange.end));
  }

  const whereClause = and(...conditions);

  const threads = await db
    .select({
      bundleType: EmailThreads.bundleType,
      id: EmailThreads.id,
      isRead: EmailThreads.isRead,
      lastMessageAt: EmailThreads.lastMessageAt,
      messageCount: EmailThreads.messageCount,
      snippet: EmailThreads.snippet,
      subject: EmailThreads.subject,
    })
    .from(EmailThreads)
    .where(whereClause)
    .orderBy(desc(EmailThreads.lastMessageAt))
    .limit(limit)
    .offset(offset);

  // Build sender map and results
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
    query: `category:${category}`,
    results,
    totalCount: countResult?.count ?? 0,
  };
}
