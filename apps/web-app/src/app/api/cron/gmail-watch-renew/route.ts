import { and, eq, isNotNull, lt, or } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import { Accounts } from '@seawatts/db/schema';
import { type NextRequest, NextResponse } from 'next/server';

// Import watch function dynamically to avoid issues
async function getRenewFunction() {
  const { renewGmailWatch } = await import('@seawatts/api/services/gmail');
  return renewGmailWatch;
}

/**
 * Gmail Watch Renewal Cron Job
 *
 * Runs daily to renew Gmail watches that are expiring within 24 hours.
 * Gmail watches expire after 7 days and must be renewed to continue
 * receiving Pub/Sub notifications.
 *
 * GET /api/cron/gmail-watch-renew
 *
 * Configured in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/gmail-watch-renew",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Starting Gmail watch renewal cron job');

  // Calculate threshold: 24 hours from now
  const renewalThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    // Find Google accounts with watches expiring within 24 hours or with no watch set up
    const accountsToRenew = await db.query.Accounts.findMany({
      columns: {
        accountId: true, // This is the email for Google OAuth
        id: true,
        watchExpiration: true,
      },
      where: and(
        eq(Accounts.providerId, 'google'),
        or(
          // Watch is expiring soon
          and(
            isNotNull(Accounts.watchExpiration),
            lt(Accounts.watchExpiration, renewalThreshold),
          ),
          // Watch was never set up (no expiration but has tokens)
          and(
            isNotNull(Accounts.accessToken),
            or(
              // Never had a watch
              lt(Accounts.watchExpiration, new Date(0)),
            ),
          ),
        ),
      ),
    });

    console.log(
      `Found ${accountsToRenew.length} accounts needing watch renewal`,
    );

    const results = {
      errors: [] as string[],
      failed: 0,
      renewed: 0,
      total: accountsToRenew.length,
    };

    const renewGmailWatch = await getRenewFunction();

    for (const account of accountsToRenew) {
      try {
        console.log(`Renewing watch for account ${account.accountId}`);

        const watchResult = await renewGmailWatch(account.id);

        console.log(
          `Watch renewed for ${account.accountId}, expires at ${watchResult.expiration.toISOString()}`,
        );

        results.renewed++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to renew watch for ${account.accountId}:`,
          errorMessage,
        );
        results.failed++;
        results.errors.push(`${account.accountId}: ${errorMessage}`);
      }
    }

    console.log(
      `Gmail watch renewal complete: ${results.renewed} renewed, ${results.failed} failed`,
    );

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Gmail watch renewal cron job failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 },
    );
  }
}
