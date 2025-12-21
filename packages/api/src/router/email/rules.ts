/**
 * Email Rules Router
 * Handles email rule management
 */

import { EmailActions } from '@seawatts/db/schema';

import { createRuleSchema } from '../../email/types';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const rulesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createRuleSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) throw new Error('User ID is required');

      const [rule] = await ctx.db
        .insert(EmailActions)
        .values({
          ...input,
          actionType: 'smart_action',
          payload: { rule: input },
          status: 'pending',
          threadId: '', // Rules don't belong to a thread
        })
        .returning();

      return rule;
    }),
});
