import { db as dbClient } from '@seawatts/db/client';
import { Accounts, EmailMessages, EmailThreads } from '@seawatts/db/schema';
import { debug } from '@seawatts/logger';
import { and, desc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';

import { archiveThread, sendReply } from '../../services/gmail/actions';
import {
  type ActionLogEntry,
  updateUserMemory,
} from '../../services/memory/update-memory';
import { checkForRuleSuggestion } from '../../services/rules/suggest-rules';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

const log = debug('seawatts:router:threads');

/**
 * Build recent action entries from recently acted threads for pattern detection.
 */
async function getRecentActionEntries(
  accountId: string,
): Promise<ActionLogEntry[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentThreads = await dbClient.query.EmailThreads.findMany({
    limit: 50,
    orderBy: [desc(EmailThreads.lastMessageAt)],
    where: and(
      eq(EmailThreads.accountId, accountId),
      eq(EmailThreads.status, 'acted'),
      gte(EmailThreads.lastMessageAt, oneDayAgo),
    ),
  });

  return recentThreads
    .filter((t): t is typeof t & { aiAction: string } => t.aiAction !== null)
    .map((t) => ({
      aiSuggested: t.aiAction,
      sender: t.participantEmails[0] ?? 'unknown',
      subject: t.subject,
      userDid: 'archive',
    }));
}

/**
 * Fire a memory update when the user's action disagrees with the AI suggestion.
 * Never awaited — runs in the background.
 */
function maybeUpdateMemory(
  userId: string,
  thread: {
    aiAction: string | null;
    subject: string;
    participantEmails: string[];
  },
  userAction: string,
  replyText?: string,
): void {
  if (!thread.aiAction) return;
  if (thread.aiAction === userAction) return;

  const entry: ActionLogEntry = {
    aiSuggested: thread.aiAction,
    replyText,
    sender: thread.participantEmails[0] ?? 'unknown',
    subject: thread.subject,
    userDid: userAction,
  };

  void updateUserMemory(userId, [entry]).catch((error: unknown) => {
    log(
      'Background memory update failed for user %s: %s',
      userId,
      error instanceof Error ? error.message : String(error),
    );
  });
}

export const threadsRouter = createTRPCRouter({
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await ctx.db.query.EmailThreads.findFirst({
        where: eq(EmailThreads.id, input.id),
      });

      if (!thread) return null;

      const messages = await ctx.db.query.EmailMessages.findMany({
        orderBy: [EmailMessages.internalDate],
        where: eq(EmailMessages.threadId, thread.id),
      });

      const account = await ctx.db.query.Accounts.findFirst({
        where: eq(Accounts.id, thread.accountId),
      });

      return {
        ...thread,
        accountEmail: account?.accountId ?? '',
        messages,
      };
    }),

  list: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const threads = await ctx.db.query.EmailThreads.findMany({
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(EmailThreads.lastMessageAt)],
        where: and(
          eq(EmailThreads.accountId, input.accountId),
          eq(EmailThreads.isSpam, false),
          eq(EmailThreads.isTrash, false),
        ),
      });

      if (input.status) {
        return threads.filter((t) => t.status === input.status);
      }

      return threads;
    }),

  needingTriage: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const threads = await ctx.db.query.EmailThreads.findMany({
        limit: input.limit,
        orderBy: [desc(EmailThreads.lastMessageAt)],
        where: and(
          eq(EmailThreads.accountId, input.accountId),
          eq(EmailThreads.status, 'untriaged'),
          eq(EmailThreads.isSpam, false),
          eq(EmailThreads.isTrash, false),
        ),
      });

      return threads;
    }),

  quickReply: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        gmailThreadId: z.string(),
        replyText: z.string(),
        subject: z.string(),
        threadId: z.string(),
        to: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.db.query.EmailThreads.findFirst({
        where: eq(EmailThreads.id, input.threadId),
      });

      await sendReply(input.accountId, input.gmailThreadId, {
        body: input.replyText,
        subject: input.subject,
        to: input.to,
      });

      await archiveThread(input.accountId, input.gmailThreadId);

      await ctx.db
        .update(EmailThreads)
        .set({ status: 'acted' })
        .where(eq(EmailThreads.id, input.threadId));

      if (thread && ctx.auth.userId) {
        maybeUpdateMemory(ctx.auth.userId, thread, 'reply', input.replyText);
      }

      let ruleSuggestion: string | null = null;
      try {
        const recentActions = await getRecentActionEntries(input.accountId);
        ruleSuggestion = checkForRuleSuggestion(recentActions);
      } catch {
        log(
          'Rule suggestion check failed for quickReply on thread %s',
          input.threadId,
        );
      }

      return { ruleSuggestion, success: true } as const;
    }),

  star: protectedProcedure
    .input(
      z.object({
        starred: z.boolean(),
        threadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.db.query.EmailThreads.findFirst({
        where: eq(EmailThreads.id, input.threadId),
      });

      const [updated] = await ctx.db
        .update(EmailThreads)
        .set({ isStarred: input.starred })
        .where(eq(EmailThreads.id, input.threadId))
        .returning();

      if (thread && ctx.auth.userId) {
        maybeUpdateMemory(
          ctx.auth.userId,
          thread,
          input.starred ? 'star' : 'unstar',
        );
      }

      return updated;
    }),

  starred: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ ctx, input }) => {
      const threads = await ctx.db.query.EmailThreads.findMany({
        orderBy: [desc(EmailThreads.lastMessageAt)],
        where: and(
          eq(EmailThreads.accountId, input.accountId),
          eq(EmailThreads.isStarred, true),
          eq(EmailThreads.isSpam, false),
          eq(EmailThreads.isTrash, false),
        ),
      });

      return threads;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        status: z.string(),
        threadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.db.query.EmailThreads.findFirst({
        where: eq(EmailThreads.id, input.threadId),
      });

      const [updated] = await ctx.db
        .update(EmailThreads)
        .set({ status: input.status })
        .where(eq(EmailThreads.id, input.threadId))
        .returning();

      if (thread && ctx.auth.userId) {
        maybeUpdateMemory(ctx.auth.userId, thread, input.status);
      }

      let ruleSuggestion: string | null = null;
      if (thread) {
        try {
          const recentActions = await getRecentActionEntries(thread.accountId);
          ruleSuggestion = checkForRuleSuggestion(recentActions);
        } catch {
          log('Rule suggestion check failed for thread %s', input.threadId);
        }
      }

      return { ...updated, ruleSuggestion };
    }),
});
