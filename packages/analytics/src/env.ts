import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_ENV: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_VERCEL_ENV: z.string().optional(),
  },
  extends: [vercel()],

  runtimeEnv: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    POSTHOG_HOST: process.env.POSTHOG_HOST,
    POSTHOG_KEY: process.env.POSTHOG_KEY,
  },

  server: {
    POSTHOG_HOST: z.string(),
    POSTHOG_KEY: z.string(),
  },

  shared: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  },

  skipValidation:
    !!process.env.CI ||
    process.env.npm_lifecycle_event === 'lint' ||
    process.env.npm_lifecycle_event === 'typecheck',
});
