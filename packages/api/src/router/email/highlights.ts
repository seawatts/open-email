/**
 * Email Highlights Router
 * Handles Inbox-style extracted information highlights
 */

import { EmailHighlights, type HighlightDataJson } from '@seawatts/db/schema';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const highlightsRouter = createTRPCRouter({
  /**
   * Get all highlights for a specific thread
   */
  byThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const highlights = await ctx.db.query.EmailHighlights.findMany({
        orderBy: [desc(EmailHighlights.createdAt)],
        where: eq(EmailHighlights.threadId, input.threadId),
      });

      return highlights;
    }),

  /**
   * Create highlights for a thread (usually from agent processing)
   */
  create: protectedProcedure
    .input(
      z.object({
        highlights: z.array(
          z.object({
            actionLabel: z.string().optional(),
            actionUrl: z.string().optional(),
            data: z.record(z.string(), z.unknown()),
            highlightType: z.enum([
              'flight',
              'hotel',
              'package_tracking',
              'payment',
              'event',
              'reservation',
              'action_item',
            ]),
            icon: z.string().optional(),
            messageId: z.string().optional(),
            subtitle: z.string().optional(),
            title: z.string(),
          }),
        ),
        threadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.highlights.length === 0) return [];

      const inserted = await ctx.db
        .insert(EmailHighlights)
        .values(
          input.highlights.map((h) => ({
            actionLabel: h.actionLabel,
            actionUrl: h.actionUrl,
            data: h.data as HighlightDataJson,
            highlightType: h.highlightType,
            icon: h.icon,
            messageId: h.messageId,
            subtitle: h.subtitle,
            threadId: input.threadId,
            title: h.title,
          })),
        )
        .returning();

      return inserted;
    }),

  /**
   * Delete highlights for a thread
   */
  deleteByThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(EmailHighlights)
        .where(eq(EmailHighlights.threadId, input.threadId));

      return { success: true };
    }),
});
