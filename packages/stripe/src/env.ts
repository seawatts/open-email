import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  runtimeEnv: {
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },

  server: {
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
  },

  skipValidation:
    !!process.env.CI ||
    process.env.npm_lifecycle_event === 'lint' ||
    process.env.npm_lifecycle_event === 'typecheck',
});
