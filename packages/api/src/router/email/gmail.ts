/**
 * Gmail Router
 * Handles Gmail OAuth and sync operations
 */

import { GmailAccounts } from '@seawatts/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { syncRequestSchema } from '../../email/types';
import {
  createGmailLabel,
  exchangeCodeForTokens,
  getAuthUrl,
  getGmailLabels,
  syncGmailAccount,
} from '../../services/gmail';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const gmailRouter = createTRPCRouter({
  accounts: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.userId) throw new Error('User ID is required');

    const accounts = await ctx.db.query.GmailAccounts.findMany({
      where: eq(GmailAccounts.userId, ctx.auth.userId),
    });

    // Don't return tokens to client
    return accounts.map((a) => ({
      createdAt: a.createdAt,
      email: a.email,
      id: a.id,
      lastSyncAt: a.lastSyncAt,
    }));
  }),

  callback: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) throw new Error('User ID is required');

      const tokens = await exchangeCodeForTokens(input.code);

      // Check if account already exists
      const existing = await ctx.db.query.GmailAccounts.findFirst({
        where: and(
          eq(GmailAccounts.userId, ctx.auth.userId),
          eq(GmailAccounts.email, tokens.email),
        ),
      });

      if (existing) {
        // Update existing account
        await ctx.db
          .update(GmailAccounts)
          .set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiry: tokens.expiry,
          })
          .where(eq(GmailAccounts.id, existing.id));

        return { accountId: existing.id, email: tokens.email };
      }

      // Create new account
      const [account] = await ctx.db
        .insert(GmailAccounts)
        .values({
          accessToken: tokens.accessToken,
          email: tokens.email,
          refreshToken: tokens.refreshToken,
          tokenExpiry: tokens.expiry,
          userId: ctx.auth.userId,
        })
        .returning();

      return { accountId: account?.id, email: tokens.email };
    }),

  connect: protectedProcedure.query(() => {
    const authUrl = getAuthUrl();
    return { authUrl };
  }),

  createLabel: protectedProcedure
    .input(z.object({ accountId: z.string(), name: z.string() }))
    .mutation(async ({ input }) => {
      return createGmailLabel(input.accountId, input.name);
    }),

  labels: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input }) => {
      return getGmailLabels(input.accountId);
    }),

  sync: protectedProcedure
    .input(syncRequestSchema)
    .mutation(async ({ input }) => {
      const result = await syncGmailAccount(input.gmailAccountId, {
        fullSync: input.fullSync,
      });
      return result;
    }),
});
