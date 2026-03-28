import { UserProfile, type UserPreferencesJson } from '@seawatts/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.userId) throw new Error('User ID is required');

    const profile = await ctx.db.query.UserProfile.findFirst({
      where: eq(UserProfile.userId, ctx.auth.userId),
    });

    return (
      profile ?? {
        memory: '',
        preferences: {} satisfies UserPreferencesJson,
        updatedAt: null,
        userId: ctx.auth.userId,
      }
    );
  }),

  update: protectedProcedure
    .input(
      z.object({
        memory: z.string().optional(),
        preferences: z
          .object({
            agentMode: z.enum(['approval', 'autopilot']).optional(),
            autoArchiveConfidence: z.number().min(0).max(1).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) throw new Error('User ID is required');

      const existing = await ctx.db.query.UserProfile.findFirst({
        where: eq(UserProfile.userId, ctx.auth.userId),
      });

      if (existing) {
        await ctx.db
          .update(UserProfile)
          .set({
            ...(input.memory !== undefined && { memory: input.memory }),
            ...(input.preferences !== undefined && {
              preferences: {
                ...existing.preferences,
                ...input.preferences,
              },
            }),
          })
          .where(eq(UserProfile.userId, ctx.auth.userId));
      } else {
        await ctx.db.insert(UserProfile).values({
          memory: input.memory ?? '',
          preferences: input.preferences ?? {},
          userId: ctx.auth.userId,
        });
      }

      return { success: true };
    }),

  toggleAutopilot: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) throw new Error('User ID is required');

      const agentMode = input.enabled ? 'autopilot' : 'approval';

      const existing = await ctx.db.query.UserProfile.findFirst({
        where: eq(UserProfile.userId, ctx.auth.userId),
      });

      if (existing) {
        await ctx.db
          .update(UserProfile)
          .set({
            preferences: { ...existing.preferences, agentMode },
          })
          .where(eq(UserProfile.userId, ctx.auth.userId));
      } else {
        await ctx.db.insert(UserProfile).values({
          memory: '',
          preferences: { agentMode },
          userId: ctx.auth.userId,
        });
      }

      return { agentMode } as const;
    }),
});
