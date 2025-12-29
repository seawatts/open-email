/**
 * Email Search Router
 *
 * Provides search procedures for the AI agent and UI to find emails
 * using full-text search and keyword matching.
 */

import { db } from '@seawatts/db/client';
import { EmailKeywords, EmailThreads } from '@seawatts/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { bundleTypeSchema } from '../../email/types';
import {
  buildKeywordsByThreadMap,
  listEmailsByCategory,
  searchEmails,
} from '../../services/email-search';
import { getThreadWithMessages } from '../../services/email-thread';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { parseDateRange } from '../../utils';

// ============================================================================
// Input Schemas
// ============================================================================

const searchInputSchema = z.object({
  filters: z
    .object({
      bundleTypes: z.array(bundleTypeSchema).optional(),
      dateRange: z
        .object({
          end: z.string().datetime().optional(),
          start: z.string().datetime().optional(),
        })
        .optional(),
      gmailAccountId: z.string().optional(),
      hasAttachments: z.boolean().optional(),
      senders: z.array(z.string()).optional(),
      unreadOnly: z.boolean().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  query: z.string().min(1).max(500),
});

const categoryInputSchema = z.object({
  category: bundleTypeSchema,
  dateRange: z
    .object({
      end: z.string().datetime().optional(),
      start: z.string().datetime().optional(),
    })
    .optional(),
  gmailAccountId: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const threadInputSchema = z.object({
  includeAttachments: z.boolean().default(false),
  includeHighlights: z.boolean().default(true),
  includeKeywords: z.boolean().default(true),
  threadId: z.string(),
});

// ============================================================================
// Router
// ============================================================================

export const searchRouter = createTRPCRouter({
  /**
   * List emails by category/bundle type
   * Used by AI agent's list_emails_by_category tool
   */
  byCategory: protectedProcedure
    .input(categoryInputSchema)
    .query(async ({ input }) => {
      return listEmailsByCategory({
        category: input.category,
        dateRange: parseDateRange(input.dateRange),
        gmailAccountId: input.gmailAccountId,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Get full thread content with all messages, keywords, and highlights
   * Used by AI agent's get_email_thread tool
   */
  getThread: protectedProcedure
    .input(threadInputSchema)
    .query(async ({ input }) => {
      const result = await getThreadWithMessages(input.threadId, {
        includeHighlights: input.includeHighlights,
        includeKeywords: input.includeKeywords,
        includeMessages: true,
      });

      if (!result) {
        return null;
      }

      return {
        ...result.thread,
        highlights: result.highlights,
        keywords: result.keywords.map((k) => ({
          confidence: k.confidence,
          keyword: k.keyword,
          keywordType: k.keywordType,
          originalText: k.originalText,
        })),
        messages: result.messages.map((msg) => ({
          ...msg,
          attachments: input.includeAttachments ? msg.attachmentMeta : [],
        })),
      };
    }),

  /**
   * Get keywords for multiple threads (for search result enrichment)
   */
  keywordsForThreads: protectedProcedure
    .input(z.object({ threadIds: z.array(z.string()) }))
    .query(async ({ input }) => {
      if (input.threadIds.length === 0) {
        return {};
      }

      const keywords = await db
        .select({
          keyword: EmailKeywords.keyword,
          keywordType: EmailKeywords.keywordType,
          threadId: EmailKeywords.threadId,
        })
        .from(EmailKeywords)
        .where(inArray(EmailKeywords.threadId, input.threadIds));

      // Use shared mapper
      const keywordMap = buildKeywordsByThreadMap(keywords);
      return Object.fromEntries(keywordMap);
    }),
  /**
   * Search emails by keywords, entities, or text
   * Used by AI agent's search_emails tool
   */
  search: protectedProcedure
    .input(searchInputSchema)
    .query(async ({ input }) => {
      const filters = input.filters
        ? {
            ...input.filters,
            dateRange: parseDateRange(input.filters.dateRange),
          }
        : undefined;

      return searchEmails({
        filters,
        limit: input.limit,
        offset: input.offset,
        query: input.query,
      });
    }),

  /**
   * Get suggested search terms based on recent keywords
   */
  suggestedTerms: protectedProcedure
    .input(
      z.object({ gmailAccountId: z.string(), limit: z.number().default(20) }),
    )
    .query(async ({ input }) => {
      // Get threads for this account
      const threads = await db
        .select({ id: EmailThreads.id })
        .from(EmailThreads)
        .where(eq(EmailThreads.gmailAccountId, input.gmailAccountId))
        .orderBy(desc(EmailThreads.lastMessageAt))
        .limit(100);

      if (threads.length === 0) {
        return [];
      }

      const threadIds = threads.map((t) => t.id);

      // Get most common keywords from recent threads
      const keywords = await db
        .select({
          count: EmailKeywords.id,
          keyword: EmailKeywords.keyword,
          keywordType: EmailKeywords.keywordType,
        })
        .from(EmailKeywords)
        .where(
          and(
            inArray(EmailKeywords.threadId, threadIds),
            // Focus on useful keyword types for suggestions
            inArray(EmailKeywords.keywordType, [
              'person',
              'company',
              'location',
              'topic',
              'product',
            ]),
          ),
        )
        .limit(input.limit);

      return keywords.map((k) => ({
        keyword: k.keyword,
        type: k.keywordType,
      }));
    }),
});
