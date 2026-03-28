import { quickTriage, type TriageEmailContext } from '@seawatts/ai/ai-sdk-v6';
import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import type { QuickReplyOption } from '@seawatts/db/schema';
import {
  EmailMessages,
  EmailRules,
  EmailThreads,
  UserProfile,
} from '@seawatts/db/schema';
import { debug } from '@seawatts/logger';

import { getErrorMessage } from '../../utils';
import { archiveThread } from './actions';

const log = debug('seawatts:gmail:triage');

const DEFAULT_AUTO_ARCHIVE_CONFIDENCE = 0.95;

/**
 * Triage a single thread: load messages, build context, run quickTriage,
 * write ai* columns back to the thread row.
 *
 * When autopilot is enabled and confidence is high enough, auto-archives
 * qualifying threads (never for unknown senders or reply actions).
 */
export async function triageThread(
  threadId: string,
  userId: string,
): Promise<void> {
  const thread = await db.query.EmailThreads.findFirst({
    where: eq(EmailThreads.id, threadId),
  });

  if (!thread) {
    log('Thread %s not found, skipping triage', threadId);
    return;
  }

  const messages = await db.query.EmailMessages.findMany({
    limit: 3,
    orderBy: (m, { desc }) => [desc(m.internalDate)],
    where: eq(EmailMessages.threadId, threadId),
  });

  if (messages.length === 0) {
    log('Thread %s has no messages, skipping triage', threadId);
    return;
  }

  const [profile, activeRules] = await Promise.all([
    db.query.UserProfile.findFirst({
      where: eq(UserProfile.userId, userId),
    }),
    db.query.EmailRules.findMany({
      where: eq(EmailRules.userId, userId),
    }),
  ]);

  const memoryText = profile?.memory ?? '';
  const rulePrompts = activeRules
    .filter((r) => r.isActive)
    .map((r) => r.prompt);

  const latestMsg = messages[0];
  if (!latestMsg) {
    return;
  }

  const context: TriageEmailContext = {
    date: thread.lastMessageAt,
    fromEmail: latestMsg.fromEmail,
    fromName: latestMsg.fromName,
    messages: messages.map((m) => ({
      attachmentText: m.attachmentText,
      bodyPreview: m.bodyPreview,
      fromName: m.fromName,
      isFromUser: m.isFromUser,
    })),
    participantEmails: thread.participantEmails,
    subject: thread.subject,
    toEmails: latestMsg.toEmails,
  };

  try {
    const result = await quickTriage(context, memoryText, rulePrompts);

    let status = 'triaged';

    const agentMode = profile?.preferences?.agentMode;
    const autoArchiveConfidence =
      profile?.preferences?.autoArchiveConfidence ??
      DEFAULT_AUTO_ARCHIVE_CONFIDENCE;

    const isKnownSender = thread.participantEmails.length > 0;
    const shouldAutopilot =
      agentMode === 'autopilot' &&
      result.action === 'archive' &&
      result.confidence >= autoArchiveConfidence &&
      isKnownSender;

    if (shouldAutopilot) {
      try {
        await archiveThread(thread.accountId, thread.gmailThreadId);
        status = 'acted';
        log(
          'Thread %s auto-archived (confidence=%.2f)',
          threadId,
          result.confidence,
        );
      } catch (archiveError) {
        log(
          'Autopilot archive failed for thread %s: %s',
          threadId,
          getErrorMessage(archiveError),
        );
      }
    }

    await db
      .update(EmailThreads)
      .set({
        aiAction: result.action,
        aiConfidence: result.confidence,
        aiModelUsed: 'gpt-4o-mini',
        aiQuickReplies: result.quickReplies as QuickReplyOption[],
        aiSummary: result.summary,
        aiTriagedAt: new Date(),
        status,
      })
      .where(eq(EmailThreads.id, threadId));

    log(
      'Thread %s triaged: action=%s confidence=%.2f status=%s',
      threadId,
      result.action,
      result.confidence,
      status,
    );
  } catch (error) {
    log('Failed to triage thread %s: %s', threadId, getErrorMessage(error));
  }
}
