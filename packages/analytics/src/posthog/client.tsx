'use client';

import posthog from 'posthog-js';
import { useEffect, useRef, useState } from 'react';

export function PostHogIdentifyUser() {
  const [isMounted, setIsMounted] = useState(false);
  const previousUserId = useRef<string | null>(null);

  // Track mount state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch session and identify user after mount
  useEffect(() => {
    if (!isMounted) return;

    const identifyUser = async () => {
      try {
        // Dynamically import auth client to avoid SSR context issues
        const { authClient } = await import('@seawatts/auth/client');
        const sessionResult = await authClient.getSession();
        const user = sessionResult.data?.user;

        if (user) {
          // Only identify if the user ID has changed
          if (previousUserId.current !== user.id) {
            posthog.identify(user.id, {
              email: user.email,
              name: user.name,
            });
            previousUserId.current = user.id;
          }
        } else if (previousUserId.current && !user) {
          // User was previously identified but is now undefined
          previousUserId.current = null;
        }
      } catch (error) {
        console.error('Error identifying user:', error);
      }
    };

    identifyUser();
  }, [isMounted]);

  return null;
}
