import { eq } from '@seawatts/db';
import { EmailRules } from '@seawatts/db/schema';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const rulesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().default(true),
        prompt: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) throw new Error('User ID is required');

      const [rule] = await ctx.db
        .insert(EmailRules)
        .values({
          isActive: input.isActive,
          prompt: input.prompt,
          userId: ctx.auth.userId,
        })
        .returning();

      return rule;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.userId) throw new Error('User ID is required');

    return ctx.db.query.EmailRules.findMany({
      where: eq(EmailRules.userId, ctx.auth.userId),
      orderBy: (rules, { desc }) => [desc(rules.createdAt)],
    });
  }),
});
