import posthog from 'posthog-js/dist/module.full.no-external';
import { useEffect } from 'react';

export function PostHogPageView() {
  useEffect(() => {
    posthog.register({
      domain: globalThis.location.hostname,
      full_url: globalThis.location.href,
    });
  }, []);

  return null;
}

export function PostHogIdentifyUser({
  userId,
  email,
}: {
  userId?: string;
  email?: string;
}) {
  useEffect(() => {
    if (userId) {
      posthog.identify(userId, {
        email,
      });
    }
  }, [userId, email]);

  return null;
}

posthog.init(process.env.PLASMO_PUBLIC_POSTHOG_KEY || '', {
  api_host: 'https://app.posthog.com',
  autocapture: true,
  capture_pageview: true,
  disable_session_recording: false,
  loaded: (posthog) => {
    posthog.register({
      domain: globalThis.location.hostname,
      full_url: globalThis.location.href,
    });
  },
  persistence: 'localStorage',
});

export { default as posthog } from 'posthog-js/dist/module.full.no-external';
