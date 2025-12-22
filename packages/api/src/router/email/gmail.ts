/**
 * Gmail Router
 * Handles Gmail sync operations using better-auth's Google OAuth tokens
 */

import { Accounts } from '@seawatts/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { syncRequestSchema } from '../../email/types';
import {
  createGmailLabel,
  getGmailLabels,
  getGmailUserEmail,
  setupGmailWatch,
  syncGmailAccount,
} from '../../services/gmail';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const gmailRouter = createTRPCRouter({
  /**
   * Get the user's Google account (from better-auth)
   * This replaces the old GmailAccounts table
   */
  account: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.userId) throw new Error('User ID is required');

    const account = await ctx.db.query.Accounts.findFirst({
      where: and(
        eq(Accounts.userId, ctx.auth.userId),
        eq(Accounts.providerId, 'google'),
      ),
    });

    if (!account) {
      return null;
    }

    // Get email from Gmail API if not stored
    let email = account.accountId; // accountId is usually the email for Google
    try {
      email = await getGmailUserEmail(account.id);
    } catch {
      // Fall back to accountId
    }

    // Don't return tokens to client
    return {
      createdAt: account.createdAt,
      email,
      id: account.id,
      lastSyncAt: account.lastSyncAt,
      watchExpiration: account.watchExpiration,
    };
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

  /**
   * Setup Gmail watch for push notifications
   * Call this after the user signs in to enable real-time sync
   */
  setupWatch: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.auth.userId) throw new Error('User ID is required');

    const account = await ctx.db.query.Accounts.findFirst({
      where: and(
        eq(Accounts.userId, ctx.auth.userId),
        eq(Accounts.providerId, 'google'),
      ),
    });

    if (!account) {
      throw new Error('No Google account found. Please sign in with Google.');
    }

    const result = await setupGmailWatch(account.id);
    return {
      expiration: result.expiration,
      historyId: result.historyId,
    };
  }),

  sync: protectedProcedure
    .input(syncRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // If no accountId provided, use the user's Google account
      let accountId = input.gmailAccountId;

      if (!accountId && ctx.auth.userId) {
        const account = await ctx.db.query.Accounts.findFirst({
          where: and(
            eq(Accounts.userId, ctx.auth.userId),
            eq(Accounts.providerId, 'google'),
          ),
        });

        if (!account) {
          throw new Error(
            'No Google account found. Please sign in with Google.',
          );
        }

        accountId = account.id;
      }

      if (!accountId) {
        throw new Error('Account ID is required');
      }

      const result = await syncGmailAccount(accountId, {
        fullSync: input.fullSync,
      });
      return result;
    }),
});
