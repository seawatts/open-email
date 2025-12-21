import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  extends: [vercel()],

  runtimeEnv: {
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  },

  server: {
    EMAIL_FROM: z.string().default('noreply@seawatts.sh'),
    EMAIL_REPLY_TO: z.string().default('noreply@seawatts.sh'),
    RESEND_API_KEY: z.string(),
  },

  shared: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  },

  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === 'lint',
});
