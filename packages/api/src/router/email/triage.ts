/**
 * Email Triage Router
 * Handles legacy (non-streaming) triage operations
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
  EmailMessages,
  EmailThreads,
  UserEmailSettings,
} from '@seawatts/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { defaultPolicy } from '../../email/types';
import { protectedProcedure } from '../../trpc';
import {
  actionMap,
  type BundleTypeValue,
  categoryMap,
  type DbCategory,
  type SuggestedAction,
} from './utils';

export const triageProcedure = protectedProcedure
  .input(
    z.object({
      retriage: z.boolean().default(false),
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

    // Build preferences from settings
    const preferences: UserPreferences = {
      autoActionsAllowed: settings?.autoActionsAllowed ?? [],
      customInstructions: settings?.toneProfile?.customInstructions,
      preferredTone:
        (settings?.toneProfile?.style as UserPreferences['preferredTone']) ??
        'friendly',
      requireApprovalDomains: settings?.requireApprovalDomains ?? [],
    };

    // Build policy
    const policy: Policy = {
      ...defaultPolicy,
      allowedDomainsForAutoActions:
        (settings?.requireApprovalDomains?.length ?? 0) > 0
          ? [] // If approval domains are set, don't auto-execute for any
          : defaultPolicy.allowedDomainsForAutoActions,
    };

    // Run the agent to get triage result
    let triageResult: {
      bundleConfidence: number;
      bundleType: string;
      category: string;
      confidence: number;
      intent: string;
      priority: string;
      sensitivity: string;
      suggestedNextSteps: string[];
    } | null = null;

    const events: AgentEvent[] = [];

    for await (const event of processEmail({
      executeAction: async () => {
        // No-op for triage-only mode
      },
      policy,
      preferences,
      thread: aiThread,
      userEmail: account.accountId, // accountId is the email for Google OAuth
    })) {
      events.push(event);
      if (event.type === 'triage_complete') {
        triageResult = event.triage;
      }
    }

    // Update thread with bundle type from triage
    if (triageResult?.bundleType) {
      await ctx.db
        .update(EmailThreads)
        .set({
          bundleType: triageResult.bundleType as BundleTypeValue,
        })
        .where(eq(EmailThreads.id, thread.id));
    }

    const dbCategory =
      (categoryMap[triageResult?.category ?? 'FYI'] as DbCategory) ?? 'fyi';

    // Map priority to urgency
    const isUrgent =
      triageResult?.priority === 'P0' || triageResult?.priority === 'P1';

    const suggestedAction =
      (actionMap[triageResult?.category ?? 'FYI'] as SuggestedAction) ??
      'archive';

    // Save decision to database
    const [decision] = await ctx.db
      .insert(AgentDecisions)
      .values({
        category: isUrgent ? 'urgent' : dbCategory,
        completionTokens: 0,
        confidence: triageResult?.confidence ?? 0.5,
        draftReplies: [],
        modelUsed: 'gpt-4o-mini',
        promptTokens: 0,
        rawOutput: JSON.stringify({ events, triageResult }),
        reasons: triageResult?.suggestedNextSteps ?? [
          'Email processed by AI agent',
        ],
        smartActions: [],
        suggestedAction,
        suggestedLabels: [],
        summary: triageResult?.intent ?? 'Email analyzed',
        threadId: thread.id,
      })
      .returning();

    return decision;
  });
