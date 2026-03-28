import { and, eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import { Accounts } from '@seawatts/db/schema';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const gmailPubSubMessageSchema = z.object({
  message: z.object({
    data: z.string(),
    messageId: z.string(),
    publishTime: z.string(),
  }),
  subscription: z.string(),
});

const gmailNotificationDataSchema = z.object({
  emailAddress: z.string().email(),
  historyId: z.coerce.string(),
});

export interface ThreadTriagePayload {
  accountId: string;
  gmailThreadId: string;
  userId: string;
}

/**
 * Gmail Pub/Sub Webhook Handler
 *
 * Lightweight fanout: decode notification -> Gmail History API -> discover
 * changed thread IDs -> send each to thread-triage queue with idempotency key.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parseResult = gmailPubSubMessageSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('Invalid Gmail Pub/Sub payload:', parseResult.error);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { message } = parseResult.data;
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    let notificationData: unknown;

    try {
      notificationData = JSON.parse(decodedData);
    } catch {
      console.error('Failed to parse notification data:', decodedData);
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const dataResult = gmailNotificationDataSchema.safeParse(notificationData);
    if (!dataResult.success) {
      console.error('Invalid notification schema:', dataResult.error);
      return NextResponse.json({ error: 'Invalid schema' }, { status: 400 });
    }

    const { emailAddress, historyId } = dataResult.data;
    console.log(`Gmail notification for ${emailAddress} historyId=${historyId}`);

    const account = await db.query.Accounts.findFirst({
      where: and(
        eq(Accounts.accountId, emailAddress),
        eq(Accounts.providerId, 'google'),
      ),
    });

    if (!account) {
      console.warn(`No Google account found for: ${emailAddress}`);
      return NextResponse.json({ received: true });
    }

    if (account.lastHistoryId) {
      const current = BigInt(account.lastHistoryId);
      const incoming = BigInt(historyId);
      if (incoming <= current) {
        console.log(`Skipping: historyId ${historyId} <= ${account.lastHistoryId}`);
        return NextResponse.json({ received: true });
      }
    }

    const { getGmailClient } = await import('@seawatts/api/services/gmail');
    const gmail = await getGmailClient(account.id);

    let threadIds: Set<string>;

    if (account.lastHistoryId) {
      const historyResponse = await gmail.users.history.list({
        historyTypes: ['messageAdded', 'labelAdded', 'labelRemoved'],
        startHistoryId: account.lastHistoryId,
        userId: 'me',
      });

      threadIds = new Set<string>();
      for (const record of historyResponse.data.history ?? []) {
        for (const msg of record.messagesAdded ?? []) {
          if (msg.message?.threadId) threadIds.add(msg.message.threadId);
        }
        for (const msg of record.labelsAdded ?? []) {
          if (msg.message?.threadId) threadIds.add(msg.message.threadId);
        }
        for (const msg of record.labelsRemoved ?? []) {
          if (msg.message?.threadId) threadIds.add(msg.message.threadId);
        }
      }

      await db
        .update(Accounts)
        .set({
          lastHistoryId: historyResponse.data.historyId ?? historyId,
          lastSyncAt: new Date(),
        })
        .where(eq(Accounts.id, account.id));
    } else {
      const threadsResponse = await gmail.users.threads.list({
        maxResults: 50,
        q: 'in:inbox',
        userId: 'me',
      });
      threadIds = new Set(
        (threadsResponse.data.threads ?? [])
          .map((t) => t.id)
          .filter((id): id is string => Boolean(id)),
      );

      const profile = await gmail.users.getProfile({ userId: 'me' });
      await db
        .update(Accounts)
        .set({
          lastHistoryId: profile.data.historyId ?? null,
          lastSyncAt: new Date(),
        })
        .where(eq(Accounts.id, account.id));
    }

    console.log(`Discovered ${threadIds.size} changed threads, fanning out`);

    const { send } = await import('@vercel/queue');
    for (const gmailThreadId of threadIds) {
      const payload: ThreadTriagePayload = {
        accountId: account.id,
        gmailThreadId,
        userId: account.userId,
      };
      await send('thread-triage', payload, {
        idempotencyKey: gmailThreadId,
      });
    }

    return NextResponse.json({ received: true, queued: threadIds.size });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    return NextResponse.json({ error: 'Processing failed', received: true });
  }
}

export async function GET() {
  return NextResponse.json({ service: 'gmail-webhook', status: 'ok' });
}
