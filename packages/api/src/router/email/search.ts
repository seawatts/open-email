/**
 * Email Search Router
 *
 * Provides search procedures for the AI agent and UI to find emails
 * using full-text search.
 */

import { z } from 'zod';

import { searchEmails } from '../../services/email-search';
import { getThreadWithMessages } from '../../services/email-thread';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { parseDateRange } from '../../utils';

// ============================================================================
// Input Schemas
// ============================================================================

const searchInputSchema = z.object({
  filters: z
    .object({
      accountId: z.string().optional(),
      dateRange: z
        .object({
          end: z.string().datetime().optional(),
          start: z.string().datetime().optional(),
        })
        .optional(),
      hasAttachments: z.boolean().optional(),
      senders: z.array(z.string()).optional(),
      unreadOnly: z.boolean().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  query: z.string().min(1).max(500),
});

const threadInputSchema = z.object({
  includeAttachments: z.boolean().default(false),
  threadId: z.string(),
});

// ============================================================================
// Router
// ============================================================================

export const searchRouter = createTRPCRouter({
  /**
   * Get full thread content with all messages
   * Used by AI agent's get_email_thread tool
   */
  getThread: protectedProcedure
    .input(threadInputSchema)
    .query(async ({ input }) => {
      const result = await getThreadWithMessages(input.threadId, {
        includeMessages: true,
      });

      if (!result) {
        return null;
      }

      return {
        ...result.thread,
        messages: result.messages.map((msg) => ({
          ...msg,
          attachments: input.includeAttachments ? msg.attachmentMeta : [],
        })),
      };
    }),

  /**
   * Search emails by text
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
});
