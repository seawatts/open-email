import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    NEXT_PUBLIC_SUPABASE_URL: z.string(),
  },
  extends: [vercel()],

  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
  },

  server: {
    POSTGRES_URL: z.string().url(),
  },

  skipValidation:
    !!process.env.CI ||
    process.env.npm_lifecycle_event === 'lint' ||
    process.env.npm_lifecycle_event === 'knip',
});
