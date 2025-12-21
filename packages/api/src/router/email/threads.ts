/**
 * Email Threads Router
 * Handles email thread management
 */

import {
  AgentDecisions,
  EmailActions,
  EmailMessages,
  EmailThreads,
  GmailAccounts,
} from '@seawatts/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { bundleTypeSchema } from '../../email/types';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const threadsRouter = createTRPCRouter({
  /**
   * Get bundle counts for an account
   */
  bundleCounts: protectedProcedure
    .input(z.object({ gmailAccountId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get all threads for the account
      const threads = await ctx.db.query.EmailThreads.findMany({
        columns: { bundleType: true, isRead: true },
        where: eq(EmailThreads.gmailAccountId, input.gmailAccountId),
      });

      // Count by bundle type
      const counts: Record<string, { total: number; unread: number }> = {};

      for (const thread of threads) {
        const bundle = thread.bundleType ?? 'personal';
        if (!counts[bundle]) {
          counts[bundle] = { total: 0, unread: 0 };
        }
        counts[bundle].total++;
        if (!thread.isRead) {
          counts[bundle].unread++;
        }
      }

      return counts;
    }),

  /**
   * Get threads grouped by bundle type
   */
  byBundle: protectedProcedure
    .input(
      z.object({
        bundleType: bundleTypeSchema,
        gmailAccountId: z.string(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const threads = await ctx.db.query.EmailThreads.findMany({
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(EmailThreads.lastMessageAt)],
        where: and(
          eq(EmailThreads.gmailAccountId, input.gmailAccountId),
          eq(EmailThreads.bundleType, input.bundleType),
        ),
        with: {
          emailHighlights: true,
        },
      });

      return threads;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await ctx.db.query.EmailThreads.findFirst({
        where: eq(EmailThreads.id, input.id),
      });

      if (!thread) return null;

      // Get messages
      const messages = await ctx.db.query.EmailMessages.findMany({
        orderBy: [EmailMessages.internalDate],
        where: eq(EmailMessages.threadId, thread.id),
      });

      // Get decisions
      const decisions = await ctx.db.query.AgentDecisions.findMany({
        orderBy: [desc(AgentDecisions.createdAt)],
        where: eq(AgentDecisions.threadId, thread.id),
      });

      // Get actions
      const actions = await ctx.db.query.EmailActions.findMany({
        orderBy: [desc(EmailActions.createdAt)],
        where: eq(EmailActions.threadId, thread.id),
      });

      // Get account email
      const account = await ctx.db.query.GmailAccounts.findFirst({
        where: eq(GmailAccounts.id, thread.gmailAccountId),
      });

      return {
        ...thread,
        accountEmail: account?.email ?? '',
        actions,
        decisions,
        messages,
      };
    }),

  list: protectedProcedure
    .input(
      z.object({
        category: z
          .enum(['urgent', 'needs_reply', 'awaiting_other', 'fyi', 'spam_like'])
          .optional(),
        gmailAccountId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get threads
      const threads = await ctx.db.query.EmailThreads.findMany({
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(EmailThreads.lastMessageAt)],
        where: eq(EmailThreads.gmailAccountId, input.gmailAccountId),
      });

      // For each thread, get the latest decision and pending actions
      const threadsWithDecisions = await Promise.all(
        threads.map(async (thread) => {
          const latestDecision = await ctx.db.query.AgentDecisions.findFirst({
            orderBy: [desc(AgentDecisions.createdAt)],
            where: eq(AgentDecisions.threadId, thread.id),
          });

          const pendingActions = await ctx.db.query.EmailActions.findMany({
            where: and(
              eq(EmailActions.threadId, thread.id),
              eq(EmailActions.status, 'pending'),
            ),
          });

          return {
            ...thread,
            latestDecision: latestDecision ?? null,
            pendingActions,
          };
        }),
      );

      // Filter by category if specified
      if (input.category) {
        return threadsWithDecisions.filter(
          (t) => t.latestDecision?.category === input.category,
        );
      }

      return threadsWithDecisions;
    }),

  needingTriage: protectedProcedure
    .input(
      z.object({
        gmailAccountId: z.string(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get threads that don't have any decisions yet
      const threads = await ctx.db.query.EmailThreads.findMany({
        limit: input.limit,
        orderBy: [desc(EmailThreads.lastMessageAt)],
        where: eq(EmailThreads.gmailAccountId, input.gmailAccountId),
      });

      // Filter to only those without decisions
      const threadsNeedingTriage = [];
      for (const thread of threads) {
        const decision = await ctx.db.query.AgentDecisions.findFirst({
          where: eq(AgentDecisions.threadId, thread.id),
        });
        if (!decision) {
          threadsNeedingTriage.push(thread);
        }
      }

      return threadsNeedingTriage;
    }),

  /**
   * Pin or unpin a thread
   */
  pin: protectedProcedure
    .input(
      z.object({
        pinned: z.boolean(),
        threadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(EmailThreads)
        .set({ isPinned: input.pinned })
        .where(eq(EmailThreads.id, input.threadId))
        .returning();

      return updated;
    }),

  /**
   * Get pinned threads
   */
  pinned: protectedProcedure
    .input(z.object({ gmailAccountId: z.string() }))
    .query(async ({ ctx, input }) => {
      const threads = await ctx.db.query.EmailThreads.findMany({
        orderBy: [desc(EmailThreads.lastMessageAt)],
        where: and(
          eq(EmailThreads.gmailAccountId, input.gmailAccountId),
          eq(EmailThreads.isPinned, true),
        ),
        with: {
          emailHighlights: true,
        },
      });

      return threads;
    }),

  /**
   * Update bundle type for a thread
   */
  updateBundle: protectedProcedure
    .input(
      z.object({
        bundleType: bundleTypeSchema,
        threadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(EmailThreads)
        .set({ bundleType: input.bundleType })
        .where(eq(EmailThreads.id, input.threadId))
        .returning();

      return updated;
    }),
});
