/**
 * Email Settings Router
 * Handles user email settings management
 */

import { UserEmailSettings } from '@seawatts/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.userId) throw new Error('User ID is required');

    const settings = await ctx.db.query.UserEmailSettings.findFirst({
      where: eq(UserEmailSettings.userId, ctx.auth.userId),
    });

    return (
      settings ?? {
        agentMode: 'approval' as const,
        autoActionsAllowed: [],
        requireApprovalDomains: [],
        toneProfile: null,
      }
    );
  }),

  update: protectedProcedure
    .input(
      z.object({
        agentMode: z.enum(['approval', 'auto']).optional(),
        autoActionsAllowed: z.array(z.string()).optional(),
        requireApprovalDomains: z.array(z.string()).optional(),
        toneProfile: z
          .object({
            customInstructions: z.string().optional(),
            maxLength: z.number().optional(),
            style: z.enum(['short', 'direct', 'friendly', 'formal', 'casual']),
          })
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) throw new Error('User ID is required');

      const existing = await ctx.db.query.UserEmailSettings.findFirst({
        where: eq(UserEmailSettings.userId, ctx.auth.userId),
      });

      if (existing) {
        await ctx.db
          .update(UserEmailSettings)
          .set(input)
          .where(eq(UserEmailSettings.userId, ctx.auth.userId));
      } else {
        await ctx.db.insert(UserEmailSettings).values({
          ...input,
          agentMode: input.agentMode ?? 'approval',
          autoActionsAllowed: input.autoActionsAllowed ?? [],
          requireApprovalDomains: input.requireApprovalDomains ?? [],
          userId: ctx.auth.userId,
        });
      }

      return { success: true };
    }),
});
