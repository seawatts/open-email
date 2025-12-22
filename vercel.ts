import type { VercelConfig } from '@vercel/config/v1';

/**
 * Vercel Configuration
 *
 * Using vercel.ts for type-safe, programmatic configuration
 * @see https://vercel.com/changelog/vercel-ts
 */
export const config: VercelConfig = {
  // Cron jobs for scheduled tasks
  crons: [
    {
      // Gmail watch renewal - runs daily at 2 AM UTC
      // Gmail watches expire after 7 days, this renews them proactively
      path: '/api/cron/gmail-watch-renew',
      schedule: '0 2 * * *',
    },
  ],
  // Skip deployment for version package commits
  ignoreCommand:
    "git log -1 --pretty=format:%s | grep -E '^chore: version packages' && exit 0 || exit 1",
};
