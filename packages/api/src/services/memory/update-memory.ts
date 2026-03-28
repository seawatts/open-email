import { getDefaultProvider, models } from '@seawatts/ai/ai-sdk-v6';
import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import { UserProfile } from '@seawatts/db/schema';
import { debug } from '@seawatts/logger';
import { generateObject } from 'ai';
import { z } from 'zod';

const log = debug('seawatts:memory:update');

export interface ActionLogEntry {
  sender: string;
  subject: string;
  aiSuggested: string;
  userDid: string;
  replyText?: string;
}

const memoryOutputSchema = z.object({
  memory: z
    .string()
    .describe('The updated memory profile, max 15 lines, plain text'),
});

function buildSystemPrompt(currentMemory: string): string {
  return `You maintain a concise memory profile for an email assistant.

<current_memory>
${currentMemory || '(empty — new user)'}
</current_memory>

Rules:
- Maximum 15 lines total.
- Only add a pattern if you have seen it 2 or more times in the action log.
- Remove any line that is contradicted by recent actions.
- Keep the section format: PREFERENCES, CONTACTS, PATTERNS, WAITING_ON.
- The WAITING_ON section tracks ongoing conversations (e.g., "Waiting for Alex on PR #123 review"). Remove entries that are resolved by new actions.
- Be concise — one line per observation.
- Output only the updated memory text, nothing else.`;
}

function buildUserMessage(actionLog: ActionLogEntry[]): string {
  const lines = actionLog.map(
    (a) =>
      `• ${a.sender} | "${a.subject}" → AI suggested: ${a.aiSuggested}, User did: ${a.userDid}${a.replyText ? ` (reply: "${a.replyText}")` : ''}`,
  );
  return `Recent actions:\n${lines.join('\n')}`;
}

/**
 * Rewrites the user's memory profile based on a log of recent actions.
 * Run async — never in the user's critical path.
 */
export async function updateUserMemory(
  userId: string,
  actionLog: ActionLogEntry[],
): Promise<void> {
  if (actionLog.length === 0) return;

  const profile = await db.query.UserProfile.findFirst({
    where: eq(UserProfile.userId, userId),
  });

  const currentMemory = profile?.memory ?? '';
  const provider = getDefaultProvider();

  try {
    const { object } = await generateObject({
      model: provider(models.classification),
      prompt: buildUserMessage(actionLog),
      schema: memoryOutputSchema,
      system: buildSystemPrompt(currentMemory),
    });

    if (profile) {
      await db
        .update(UserProfile)
        .set({ memory: object.memory })
        .where(eq(UserProfile.userId, userId));
    } else {
      await db.insert(UserProfile).values({
        memory: object.memory,
        preferences: {},
        userId,
      });
    }

    log('Memory updated for user %s (%d actions)', userId, actionLog.length);
  } catch (error) {
    log(
      'Failed to update memory for user %s: %s',
      userId,
      error instanceof Error ? error.message : String(error),
    );
  }
}
