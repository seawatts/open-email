import { generateObject } from 'ai';

import { getDefaultProvider, models } from './adapters';
import { type QuickTriageResult, quickTriageSchema } from './schemas';

// ============================================================================
// Triage Context
// ============================================================================

export interface TriageEmailContext {
  subject: string;
  fromName: string | null;
  fromEmail: string;
  toEmails: string[];
  date: Date;
  messages: Array<{
    isFromUser: boolean;
    fromName: string | null;
    bodyPreview: string | null;
    attachmentText: string | null;
  }>;
  participantEmails: string[];
}

// ============================================================================
// System Prompt
// ============================================================================

function buildSystemPrompt(memoryText: string, rulePrompts?: string[]): string {
  const rulesSection =
    rulePrompts && rulePrompts.length > 0
      ? `\n\n<rules>
The user has defined these rules. If a rule matches the email, apply it:
${rulePrompts.map((r, i) => `${i + 1}. ${r}`).join('\n')}
</rules>`
      : '';

  return `You are an email triage assistant. You know this user:

<memory>
${memoryText || 'New user, no history yet.'}
</memory>${rulesSection}

Analyze the email and decide what to do.
Actions: REPLY, ARCHIVE, SNOOZE
- REPLY: The email needs a response from the user.
- ARCHIVE: The email is done, informational, no action needed, junk, or automated notifications.
- SNOOZE: Not urgent, revisit later.

For REPLY actions, generate quickReplies: each with a short button label and full draft body matching the user's writing style (if known from memory). The first quickReply is the primary suggested draft.

If the thread shows an ongoing back-and-forth conversation (the user has replied and is waiting for a response), note it in the summary. For example: "Waiting for Alex on PR #123 review". These notes help maintain conversational context in memory updates.

Keep summaries under 100 characters. Be concise.`;
}

function buildUserMessage(context: TriageEmailContext): string {
  const lines: string[] = [
    `Subject: ${context.subject}`,
    `From: ${context.fromName ?? ''} <${context.fromEmail}>`,
    `To: ${context.toEmails.join(', ')}`,
    `Date: ${context.date.toISOString()}`,
    '',
    'Messages (newest first):',
  ];

  const recentMessages = context.messages.slice(0, 3);
  for (const msg of recentMessages) {
    const sender = msg.isFromUser ? '[SENT] Me' : `[RECEIVED] ${msg.fromName ?? 'Unknown'}`;
    lines.push('---');
    lines.push(`${sender}: ${msg.bodyPreview ?? '(empty)'}`);
    if (msg.attachmentText) {
      lines.push(`Attachments: ${msg.attachmentText}`);
    }
  }

  return lines.join('\n');
}

// ============================================================================
// Quick Triage Function
// ============================================================================

export interface QuickTriageOptions {
  context: TriageEmailContext;
  memoryText: string;
  rulePrompts?: string[];
}

export async function quickTriage(
  context: TriageEmailContext,
  memoryText: string,
  rulePrompts?: string[],
): Promise<QuickTriageResult> {
  const provider = getDefaultProvider();

  const { object } = await generateObject({
    model: provider(models.classification),
    schema: quickTriageSchema,
    system: buildSystemPrompt(memoryText, rulePrompts),
    prompt: buildUserMessage(context),
  });

  return object;
}
