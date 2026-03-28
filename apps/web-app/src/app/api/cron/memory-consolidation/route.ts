import { getDefaultProvider, models } from '@seawatts/ai/ai-sdk-v6';
import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import { UserProfile } from '@seawatts/db/schema';
import { generateObject } from 'ai';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Memory Consolidation Cron Job
 *
 * Runs hourly to consolidate and refine each user's memory profile.
 * Re-evaluates the memory text to prune stale entries and strengthen
 * recurring patterns.
 *
 * GET /api/cron/memory-consolidation
 *
 * Configured in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/memory-consolidation",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

const consolidatedMemorySchema = z.object({
  memory: z
    .string()
    .describe('The consolidated memory profile, max 15 lines, plain text'),
});

const CONSOLIDATION_SYSTEM_PROMPT = `You maintain a concise memory profile for an email assistant.
Your job is to consolidate and refine the existing memory.

Rules:
- Maximum 15 lines total.
- Remove stale or redundant entries.
- Merge similar observations into single lines.
- Keep the section format: PREFERENCES, CONTACTS, PATTERNS.
- If memory is nearly empty, return it unchanged.
- Be concise — one line per observation.
- Output only the updated memory text.`;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Starting memory consolidation cron job');

  try {
    const profiles = await db.query.UserProfile.findMany();

    const results = {
      consolidated: 0,
      errors: [] as string[],
      failed: 0,
      skipped: 0,
      total: profiles.length,
    };

    const provider = getDefaultProvider();

    for (const profile of profiles) {
      if (!profile.memory || profile.memory.trim().length === 0) {
        results.skipped++;
        continue;
      }

      try {
        const { object } = await generateObject({
          model: provider(models.classification),
          prompt: `Current memory to consolidate:\n\n${profile.memory}`,
          schema: consolidatedMemorySchema,
          system: CONSOLIDATION_SYSTEM_PROMPT,
        });

        await db
          .update(UserProfile)
          .set({ memory: object.memory })
          .where(eq(UserProfile.userId, profile.userId));

        results.consolidated++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to consolidate memory for user ${profile.userId}:`,
          errorMessage,
        );
        results.failed++;
        results.errors.push(`${profile.userId}: ${errorMessage}`);
      }
    }

    console.log(
      `Memory consolidation complete: ${results.consolidated} consolidated, ${results.skipped} skipped, ${results.failed} failed`,
    );

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Memory consolidation cron job failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 },
    );
  }
}
