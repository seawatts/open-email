/**
 * Email Actions Router
 * Handles action approval, creation, and pending action queries
 */

import { EmailActions, EmailThreads } from '@seawatts/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { approveActionSchema } from '../../email/types';
import { executeAction } from '../../services/gmail';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const actionsRouter = createTRPCRouter({
  approve: protectedProcedure
    .input(approveActionSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) throw new Error('User ID is required');

      const action = await ctx.db.query.EmailActions.findFirst({
        where: eq(EmailActions.id, input.actionId),
      });

      if (!action) throw new Error('Action not found');

      if (input.approved) {
        // Update action status to approved
        await ctx.db
          .update(EmailActions)
          .set({
            approvedAt: new Date(),
            approvedBy: ctx.auth.userId,
            payload: input.editedPayload ?? action.payload,
            status: 'approved',
          })
          .where(eq(EmailActions.id, input.actionId));

        // Execute the action
        const updatedAction = await ctx.db.query.EmailActions.findFirst({
          where: eq(EmailActions.id, input.actionId),
        });

        if (updatedAction) {
          await executeAction(updatedAction);
        }
      } else {
        // Reject the action
        await ctx.db
          .update(EmailActions)
          .set({
            status: 'rejected',
          })
          .where(eq(EmailActions.id, input.actionId));
      }

      return { success: true };
    }),

  create: protectedProcedure
    .input(
      z.object({
        actionType: z.enum([
          'send',
          'archive',
          'label',
          'snooze',
          'delete',
          'smart_action',
        ]),
        agentDecisionId: z.string().optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
        threadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [action] = await ctx.db
        .insert(EmailActions)
        .values({
          actionType: input.actionType,
          agentDecisionId: input.agentDecisionId,
          payload: input.payload ?? {},
          status: 'pending',
          threadId: input.threadId,
        })
        .returning();

      return action;
    }),

  pending: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ ctx, input }) => {
      const threads = await ctx.db.query.EmailThreads.findMany({
        where: eq(EmailThreads.accountId, input.accountId),
      });

      const threadIds = threads.map((t) => t.id);

      if (threadIds.length === 0) return [];

      const pendingActions = await ctx.db.query.EmailActions.findMany({
        orderBy: [desc(EmailActions.createdAt)],
        where: and(
          eq(EmailActions.status, 'pending'),
          // Note: We'd need a proper "in" query here, simplified for now
        ),
      });

      return pendingActions.filter((a) => threadIds.includes(a.threadId));
    }),
});
