import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import type { EmailActionType } from '@seawatts/db/schema';
import { EmailActions, EmailThreads } from '@seawatts/db/schema';
import { debug } from '@seawatts/logger';
import type { gmail_v1 } from 'googleapis';

import { getGmailClient } from './client';

const log = debug('seawatts:gmail:actions');

/**
 * Execute an email action
 */
export async function executeAction(action: EmailActionType): Promise<void> {
  const thread = await db.query.EmailThreads.findFirst({
    where: eq(EmailThreads.id, action.threadId),
  });

  if (!thread) {
    throw new Error(`Thread not found: ${action.threadId}`);
  }

  const gmail = await getGmailClient(thread.accountId);

  log(
    'Executing action %s of type %s for thread %s',
    action.id,
    action.actionType,
    action.threadId,
  );

  try {
    switch (action.actionType) {
      case 'archive':
        await archiveThread(gmail, thread.gmailThreadId);
        break;
      case 'label':
        await labelThread(
          gmail,
          thread.gmailThreadId,
          action.payload as { labelIds: string[] },
        );
        break;
      case 'send':
        await sendReply(
          gmail,
          thread.gmailThreadId,
          action.payload as unknown as SendReplyPayload,
        );
        break;
      case 'snooze':
        await snoozeThread(
          gmail,
          thread.gmailThreadId,
          action.payload as { until: string },
        );
        break;
      case 'delete':
        await deleteThread(gmail, thread.gmailThreadId);
        break;
      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }

    await db
      .update(EmailActions)
      .set({
        executedAt: new Date(),
        status: 'executed',
      })
      .where(eq(EmailActions.id, action.id));

    log('Action %s executed successfully', action.id);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    await db
      .update(EmailActions)
      .set({
        error: errorMessage,
        status: 'failed',
      })
      .where(eq(EmailActions.id, action.id));

    log('Action %s failed: %s', action.id, errorMessage);
    throw error;
  }
}

/**
 * Archive a thread (remove from inbox)
 */
async function archiveThread(
  gmail: gmail_v1.Gmail,
  threadId: string,
): Promise<void> {
  await gmail.users.threads.modify({
    id: threadId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
    userId: 'me',
  });
}

/**
 * Add labels to a thread
 */
async function labelThread(
  gmail: gmail_v1.Gmail,
  threadId: string,
  payload: { labelIds: string[] },
): Promise<void> {
  await gmail.users.threads.modify({
    id: threadId,
    requestBody: {
      addLabelIds: payload.labelIds,
    },
    userId: 'me',
  });
}

interface SendReplyPayload {
  body: string;
  cc?: string[];
  inReplyTo?: string;
  references?: string;
  subject: string;
  to: string[];
}

/**
 * Send a reply to a thread
 */
async function sendReply(
  gmail: gmail_v1.Gmail,
  threadId: string,
  payload: SendReplyPayload,
): Promise<void> {
  // Construct raw email
  const headers = [
    `To: ${payload.to.join(', ')}`,
    payload.cc?.length ? `Cc: ${payload.cc.join(', ')}` : '',
    `Subject: ${payload.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    payload.inReplyTo ? `In-Reply-To: ${payload.inReplyTo}` : '',
    payload.references ? `References: ${payload.references}` : '',
  ]
    .filter(Boolean)
    .join('\r\n');

  const rawEmail = `${headers}\r\n\r\n${payload.body}`;
  const encodedEmail = Buffer.from(rawEmail).toString('base64url');

  await gmail.users.messages.send({
    requestBody: {
      raw: encodedEmail,
      threadId,
    },
    userId: 'me',
  });
}

/**
 * Snooze a thread (add SNOOZED label and remove from inbox)
 */
async function snoozeThread(
  gmail: gmail_v1.Gmail,
  threadId: string,
  payload: { until: string },
): Promise<void> {
  // For MVP, we just add a SNOOZED label
  // In production, you'd use a scheduled job to un-snooze
  const labels = await gmail.users.labels.list({ userId: 'me' });
  let snoozeLabel = labels.data.labels?.find((l) => l.name === 'SNOOZED');

  if (!snoozeLabel) {
    const newLabel = await gmail.users.labels.create({
      requestBody: {
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
        name: 'SNOOZED',
      },
      userId: 'me',
    });
    snoozeLabel = newLabel.data;
  }

  if (snoozeLabel?.id) {
    await gmail.users.threads.modify({
      id: threadId,
      requestBody: {
        addLabelIds: [snoozeLabel.id],
        removeLabelIds: ['INBOX'],
      },
      userId: 'me',
    });
  }

  log('Thread %s snoozed until %s', threadId, payload.until);
}

/**
 * Delete (trash) a thread
 */
async function deleteThread(
  gmail: gmail_v1.Gmail,
  threadId: string,
): Promise<void> {
  await gmail.users.threads.trash({
    id: threadId,
    userId: 'me',
  });
}

/**
 * Get available labels for an account
 */
export async function getGmailLabels(
  accountId: string,
): Promise<{ id: string; name: string }[]> {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.labels.list({ userId: 'me' });

  return (response.data.labels ?? [])
    .filter((label): label is { id: string; name: string } =>
      Boolean(label.id && label.name),
    )
    .map((label) => ({
      id: label.id,
      name: label.name,
    }));
}

/**
 * Create a new label
 */
export async function createGmailLabel(
  accountId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.labels.create({
    requestBody: {
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
      name,
    },
    userId: 'me',
  });

  if (!response.data.id || !response.data.name) {
    throw new Error('Gmail API returned label without id or name');
  }

  return {
    id: response.data.id,
    name: response.data.name,
  };
}
