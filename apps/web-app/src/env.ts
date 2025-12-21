import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    NEXT_PUBLIC_IS_SELF_HOSTED: z.boolean().optional().default(false),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    NEXT_PUBLIC_SUPABASE_URL: z.string(),
    NEXT_PUBLIC_WEBHOOK_BASE_URL: z.string().optional(),
  },
  extends: [vercel()],

  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_IS_SELF_HOSTED:
      process.env.NEXT_PUBLIC_IS_SELF_HOSTED === 'true',
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_WEBHOOK_BASE_URL: process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTHOG_KEY: process.env.POSTHOG_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },

  server: {
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    POSTGRES_URL: z.string(),
    POSTHOG_KEY: z.string(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
  },

  shared: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  },

  skipValidation:
    !!process.env.CI ||
    process.env.npm_lifecycle_event === 'lint' ||
    process.env.npm_lifecycle_event === 'knip',
});
