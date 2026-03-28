import { debug } from '@seawatts/logger';

import { getGmailClient } from './client';

const log = debug('seawatts:gmail:actions');

/**
 * Archive a thread (remove from inbox)
 */
export async function archiveThread(
  accountId: string,
  gmailThreadId: string,
): Promise<void> {
  const gmail = await getGmailClient(accountId);
  await gmail.users.threads.modify({
    id: gmailThreadId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
    userId: 'me',
  });
  log('Thread %s archived', gmailThreadId);
}

/**
 * Add labels to a thread
 */
export async function labelThread(
  accountId: string,
  gmailThreadId: string,
  labelIds: string[],
): Promise<void> {
  const gmail = await getGmailClient(accountId);
  await gmail.users.threads.modify({
    id: gmailThreadId,
    requestBody: {
      addLabelIds: labelIds,
    },
    userId: 'me',
  });
  log('Thread %s labeled with %o', gmailThreadId, labelIds);
}

export interface SendReplyPayload {
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
export async function sendReply(
  accountId: string,
  gmailThreadId: string,
  payload: SendReplyPayload,
): Promise<void> {
  const gmail = await getGmailClient(accountId);
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
      threadId: gmailThreadId,
    },
    userId: 'me',
  });
  log('Reply sent to thread %s', gmailThreadId);
}

/**
 * Snooze a thread (add SNOOZED label and remove from inbox)
 */
export async function snoozeThread(
  accountId: string,
  gmailThreadId: string,
  until: string,
): Promise<void> {
  const gmail = await getGmailClient(accountId);
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
      id: gmailThreadId,
      requestBody: {
        addLabelIds: [snoozeLabel.id],
        removeLabelIds: ['INBOX'],
      },
      userId: 'me',
    });
  }

  log('Thread %s snoozed until %s', gmailThreadId, until);
}

/**
 * Delete (trash) a thread
 */
export async function trashThread(
  accountId: string,
  gmailThreadId: string,
): Promise<void> {
  const gmail = await getGmailClient(accountId);
  await gmail.users.threads.trash({
    id: gmailThreadId,
    userId: 'me',
  });
  log('Thread %s trashed', gmailThreadId);
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
