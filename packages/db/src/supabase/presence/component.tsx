'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect } from 'react';

import { usePresenceStore } from './store-provider';

export interface PresenceUser {
  id: string;
}

export interface PresenceProps {
  id: string;
  user: PresenceUser | null | undefined;
  supabaseClient: SupabaseClient;
}

export function Presence(props: PresenceProps) {
  const setOnlineUsers = usePresenceStore((store) => store.setOnlineUsers);
  const { user, supabaseClient: supabase, id } = props;

  useEffect(() => {
    if (!user || !id) return;

    const readingChannel = supabase
      .channel(`presence:${id}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const onlineUsers = new Set(
          Object.keys(readingChannel.presenceState()),
        );

        setOnlineUsers(onlineUsers);
      })
      .subscribe((status) => {
        if (
          status === 'SUBSCRIBED' &&
          !readingChannel.presenceState()[user.id]
        ) {
          void readingChannel.track({
            onlineAt: new Date().toISOString(),
            userId: user.id,
          });
        }
      });

    return () => {
      void supabase.removeChannel(readingChannel);
    };
  }, [user, id, setOnlineUsers, supabase]);
  return null;
}
