import posthog from 'posthog-js';
import { env } from './env.client';

if (env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24',
  });
}
