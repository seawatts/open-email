import { receive } from '@vercel/queue';
import { NextResponse } from 'next/server';

import type { ThreadTriagePayload } from '../../webhooks/gmail/route';

async function getServices() {
  const [{ syncThread }, { triageThread }] = await Promise.all([
    import('@seawatts/api/services/gmail'),
    import('@seawatts/api/services/gmail'),
  ]);
  return { syncThread, triageThread };
}

/**
 * Thread Triage Queue Consumer
 *
 * Receives one message per thread. For each:
 * 1. syncThread: fetch from Gmail, upsert messages in DB
 * 2. triageThread: run quickTriage, write ai* columns
 *
 * POST /api/queues/triage-thread
 */
async function processThreadTriage(
  payload: ThreadTriagePayload,
): Promise<void> {
  const { accountId, gmailThreadId, userId } = payload;

  console.log(`Processing triage-thread for ${gmailThreadId}`);

  const { syncThread, triageThread } = await getServices();
  const { getGmailClient } = await import('@seawatts/api/services/gmail');

  const gmail = await getGmailClient(accountId);
  const result = {
    errors: [] as string[],
    messagesProcessed: 0,
    newHistoryId: null,
    threadsProcessed: 0,
  };

  const dbThreadId = await syncThread(gmail, accountId, gmailThreadId, result);

  if (!dbThreadId) {
    console.log(`Thread ${gmailThreadId} skipped (spam/trash/empty)`);
    return;
  }

  await triageThread(dbThreadId, userId);

  console.log(
    `Thread ${gmailThreadId} synced (${result.messagesProcessed} msgs) and triaged`,
  );
}

export async function POST() {
  return receive<ThreadTriagePayload>(
    'triage-thread',
    'triage-consumer',
    processThreadTriage,
  );
}

export async function GET() {
  return NextResponse.json({ service: 'triage-thread-consumer', status: 'ok' });
}
