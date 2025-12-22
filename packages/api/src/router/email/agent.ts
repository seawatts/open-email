/**
 * Email Agent Router
 * Handles AI agent processing with TanStack AI
 */

import {
  type AgentEvent,
  type EmailThread as AIEmailThread,
  type Policy,
  processEmail,
  type UserPreferences,
} from '@seawatts/ai';
import {
  Accounts,
  AgentDecisions,
  EmailActions,
  EmailHighlights,
  EmailMessages,
  EmailThreads,
  type HighlightDataJson,
  UserEmailSettings,
} from '@seawatts/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { defaultPolicy } from '../../email/types';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import {
  actionMap,
  type BundleTypeValue,
  categoryMap,
  type DbCategory,
  mapToolToActionType,
  type SuggestedAction,
} from './utils';

export const agentRouter = createTRPCRouter({
  /**
   * Get the status of pending actions for a thread
   */
  pendingActions: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const actions = await ctx.db.query.EmailActions.findMany({
        orderBy: [desc(EmailActions.createdAt)],
        where: and(
          eq(EmailActions.threadId, input.threadId),
          eq(EmailActions.status, 'pending'),
        ),
      });

      return actions;
    }),

  /**
   * Process a thread with the AI agent (streaming)
   * Returns a stream of agent events for real-time UI updates
   */
  processThread: protectedProcedure
    .input(
      z.object({
        autoExecute: z.boolean().default(false),
        threadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth.userId) throw new Error('User ID is required');

      // Get thread with messages
      const thread = await ctx.db.query.EmailThreads.findFirst({
        where: eq(EmailThreads.id, input.threadId),
      });

      if (!thread) throw new Error('Thread not found');

      const messages = await ctx.db.query.EmailMessages.findMany({
        orderBy: [EmailMessages.internalDate],
        where: eq(EmailMessages.threadId, thread.id),
      });

      // Get account (Google OAuth account from better-auth)
      const account = await ctx.db.query.Accounts.findFirst({
        where: eq(Accounts.id, thread.accountId),
      });

      if (!account) throw new Error('Account not found');

      // Get user settings
      const settings = await ctx.db.query.UserEmailSettings.findFirst({
        where: eq(UserEmailSettings.userId, ctx.auth.userId),
      });

      // Build AI thread context
      const aiThread: AIEmailThread = {
        id: thread.id,
        labels: thread.labels,
        messages: messages.map((m) => ({
          bodyPreview: m.bodyPreview,
          date: m.internalDate,
          from: { email: m.fromEmail, name: m.fromName },
          id: m.id,
          snippet: m.snippet,
          subject: m.subject,
        })),
        participantEmails: thread.participantEmails,
        subject: thread.subject,
      };

      // Build preferences
      const preferences: UserPreferences = {
        autoActionsAllowed: settings?.autoActionsAllowed ?? [],
        customInstructions: settings?.toneProfile?.customInstructions,
        preferredTone:
          (settings?.toneProfile?.style as UserPreferences['preferredTone']) ??
          'friendly',
        requireApprovalDomains: settings?.requireApprovalDomains ?? [],
      };

      // Build policy based on auto-execute setting
      const policy: Policy = {
        ...defaultPolicy,
        allowedDomainsForAutoActions: input.autoExecute
          ? [] // Will auto-execute safe actions
          : [], // No auto-execute
        requireApprovalForCalendar: true,
        requireApprovalForExternalShare: true,
        requireApprovalForSend: true,
      };

      // Collect all events
      const events: AgentEvent[] = [];
      let finalTriage: AgentEvent | null = null;

      for await (const event of processEmail({
        executeAction: async (action) => {
          if (input.autoExecute) {
            // Create and execute the action
            await ctx.db.insert(EmailActions).values({
              actionType: mapToolToActionType(action.toolName),
              executedAt: new Date(),
              payload: action.params,
              status: 'executed',
              threadId: thread.id,
            });
          } else {
            // Queue for approval
            await ctx.db.insert(EmailActions).values({
              actionType: mapToolToActionType(action.toolName),
              payload: action.params,
              status: 'pending',
              threadId: thread.id,
            });
          }
        },
        policy,
        preferences,
        thread: aiThread,
        userEmail: account.accountId, // accountId is the email for Google OAuth
      })) {
        events.push(event);

        // Capture the final triage for saving
        if (
          event.type === 'complete' ||
          event.type === 'needs_review' ||
          event.type === 'triage_complete'
        ) {
          finalTriage = event;
        }
      }

      // Save decision to database if we got a triage result
      if (finalTriage && 'triage' in finalTriage) {
        const triage = finalTriage.triage;

        const dbCategory =
          (categoryMap[triage.category] as DbCategory) ?? 'fyi';
        const isUrgent = triage.priority === 'P0' || triage.priority === 'P1';
        const suggestedAction =
          (actionMap[triage.category] as SuggestedAction) ?? 'archive';

        await ctx.db.insert(AgentDecisions).values({
          category: isUrgent ? 'urgent' : dbCategory,
          completionTokens: 0,
          confidence: triage.confidence,
          draftReplies: [],
          modelUsed: 'gpt-4o',
          promptTokens: 0,
          rawOutput: JSON.stringify({ events }),
          reasons: triage.suggestedNextSteps,
          smartActions: [],
          suggestedAction,
          suggestedLabels: [],
          summary: triage.intent,
          threadId: thread.id,
        });

        // Update thread with bundle type
        if (triage.bundleType) {
          await ctx.db
            .update(EmailThreads)
            .set({
              bundleType: triage.bundleType as BundleTypeValue,
            })
            .where(eq(EmailThreads.id, thread.id));
        }
      }

      // Save highlights if the complete event contains them
      const completeEvent = events.find((e) => e.type === 'complete');
      if (
        completeEvent &&
        completeEvent.type === 'complete' &&
        completeEvent.highlights &&
        completeEvent.highlights.length > 0
      ) {
        // Delete existing highlights for this thread
        await ctx.db
          .delete(EmailHighlights)
          .where(eq(EmailHighlights.threadId, thread.id));

        // Insert new highlights
        await ctx.db.insert(EmailHighlights).values(
          completeEvent.highlights.map((h) => ({
            actionLabel: h.actionLabel,
            actionUrl: h.actionUrl,
            data: h.data as HighlightDataJson,
            highlightType: h.data.type as
              | 'flight'
              | 'hotel'
              | 'package_tracking'
              | 'payment'
              | 'event'
              | 'reservation'
              | 'action_item',
            subtitle: h.subtitle,
            threadId: thread.id,
            title: h.title,
          })),
        );
      }

      return { events, threadId: thread.id };
    }),
});
