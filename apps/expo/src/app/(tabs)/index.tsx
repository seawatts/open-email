import type { AppRouter } from '@seawatts/api/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import { format, isToday, isYesterday } from 'date-fns';
import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBadge } from '~/components/action-badge';
import { useTRPC } from '~/utils/api';
import { useSession } from '~/utils/auth';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Thread = RouterOutputs['email']['threads']['list'][number];

function formatThreadDate(date: Date): string {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function QuickReplyChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: 'hsl(327, 66%, 69%)',
        borderRadius: 12,
        marginRight: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SwipeAction({
  color,
  label,
  x,
}: {
  color: string;
  label: string;
  x: number;
}) {
  return (
    <Animated.View
      style={{
        alignItems: 'center',
        backgroundColor: color,
        justifyContent: 'center',
        width: x,
      }}
    >
      <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
    </Animated.View>
  );
}

function ThreadRow({
  onArchive,
  onSnooze,
  onQuickReply,
  thread,
}: {
  onArchive: (thread: Thread) => void;
  onSnooze: (thread: Thread) => void;
  onQuickReply: (thread: Thread, replyText: string) => void;
  thread: Thread;
}) {
  const router = useRouter();
  const swipeableRef = useRef<Swipeable>(null);
  const quickReplies = (thread.aiQuickReplies ?? []) as Array<{
    body: string;
    label: string;
  }>;

  const renderRightActions = useCallback(
    () => <SwipeAction color="#f59e0b" label="Snooze" x={80} />,
    [],
  );

  const renderLeftActions = useCallback(
    () => <SwipeAction color="#10b981" label="Archive" x={80} />,
    [],
  );

  const handleSwipeLeft = useCallback(() => {
    swipeableRef.current?.close();
    onSnooze(thread);
  }, [onSnooze, thread]);

  const handleSwipeRight = useCallback(() => {
    swipeableRef.current?.close();
    onArchive(thread);
  }, [onArchive, thread]);

  return (
    <Swipeable
      friction={2}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') handleSwipeRight();
        else handleSwipeLeft();
      }}
      overshootLeft={false}
      overshootRight={false}
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
    >
      <Pressable
        className="border-b border-border bg-background px-4 py-3"
        onPress={() => router.push(`/thread/${thread.id}`)}
      >
        <View className="flex-row items-center justify-between">
          <View className="mr-2 flex-1 flex-row items-center gap-2">
            {!thread.isRead && (
              <View
                style={{
                  backgroundColor: 'hsl(327, 66%, 69%)',
                  borderRadius: 4,
                  height: 8,
                  width: 8,
                }}
              />
            )}
            <Text
              className="flex-1 text-foreground"
              numberOfLines={1}
              style={{ fontWeight: thread.isRead ? '400' : '700' }}
            >
              {thread.participantEmails[0] ?? thread.subject}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            {formatThreadDate(new Date(thread.lastMessageAt))}
          </Text>
        </View>

        <Text
          className="mt-1 text-sm text-foreground"
          numberOfLines={1}
          style={{ fontWeight: thread.isRead ? '400' : '600' }}
        >
          {thread.subject}
        </Text>

        {thread.aiSummary ? (
          <Text
            className="mt-1 text-xs text-muted-foreground"
            numberOfLines={2}
          >
            {thread.aiSummary}
          </Text>
        ) : thread.snippet ? (
          <Text
            className="mt-1 text-xs text-muted-foreground"
            numberOfLines={2}
          >
            {thread.snippet}
          </Text>
        ) : null}

        <View className="mt-2 flex-row items-center">
          {thread.aiAction ? (
            <View className="mr-2">
              <ActionBadge action={thread.aiAction} />
            </View>
          ) : null}
          {quickReplies.slice(0, 2).map((qr) => (
            <QuickReplyChip
              key={qr.label}
              label={qr.label}
              onPress={() => onQuickReply(thread, qr.body)}
            />
          ))}
        </View>
      </Pressable>
    </Swipeable>
  );
}

export default function InboxScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const session = useSession();

  const { data: account, isLoading: isAccountLoading } = useQuery(
    trpc.email.gmail.account.queryOptions(),
  );

  const {
    data: threads,
    isLoading: isThreadsLoading,
    refetch,
    isRefetching,
  } = useQuery(
    trpc.email.threads.list.queryOptions(
      { accountId: account?.id ?? '', limit: 50 },
      { enabled: !!account?.id },
    ),
  );

  const archiveMutation = useMutation(
    trpc.email.threads.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.email.threads.list.queryFilter());
      },
    }),
  );

  const quickReplyMutation = useMutation(
    trpc.email.threads.quickReply.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.email.threads.list.queryFilter());
      },
    }),
  );

  const handleArchive = useCallback(
    (thread: Thread) => {
      archiveMutation.mutate({ status: 'archived', threadId: thread.id });
    },
    [archiveMutation],
  );

  const handleSnooze = useCallback(
    (thread: Thread) => {
      archiveMutation.mutate({ status: 'snoozed', threadId: thread.id });
    },
    [archiveMutation],
  );

  const handleQuickReply = useCallback(
    (thread: Thread, replyText: string) => {
      if (!account?.id) return;
      const recipient = thread.participantEmails[0];
      if (!recipient) {
        Alert.alert('Error', 'No recipient found for this thread.');
        return;
      }

      quickReplyMutation.mutate({
        accountId: account.id,
        gmailThreadId: thread.gmailThreadId,
        replyText,
        subject: `Re: ${thread.subject}`,
        threadId: thread.id,
        to: [recipient],
      });
    },
    [account?.id, quickReplyMutation],
  );

  const isLoading = isAccountLoading || isThreadsLoading;

  if (!session.data?.user) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-lg text-foreground">
            Sign in to view your inbox.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="border-b border-border px-4 py-3">
        <Text className="text-2xl font-bold text-foreground">Inbox</Text>
        {account?.email ? (
          <Text className="mt-1 text-xs text-muted-foreground">
            {account.email}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="hsl(327, 66%, 69%)" size="large" />
        </View>
      ) : !threads?.length ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-lg text-muted-foreground">
            No threads found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <ThreadRow
              onArchive={handleArchive}
              onQuickReply={handleQuickReply}
              onSnooze={handleSnooze}
              thread={item}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
