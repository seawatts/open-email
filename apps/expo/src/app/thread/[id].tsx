import type { AppRouter } from '@seawatts/api/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBadge } from '~/components/action-badge';
import { useTRPC } from '~/utils/api';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ThreadDetail = NonNullable<RouterOutputs['email']['threads']['byId']>;
type Message = ThreadDetail['messages'][number];

function TriageSummary({ thread }: { thread: ThreadDetail }) {
  if (!thread.aiSummary && !thread.aiAction) return null;

  return (
    <View className="mx-4 mb-3 rounded-lg bg-secondary p-3">
      <View className="flex-row items-center gap-2">
        <Text className="text-sm font-semibold text-foreground">AI Triage</Text>
        {thread.aiAction ? <ActionBadge action={thread.aiAction} /> : null}
        {thread.aiConfidence != null ? (
          <Text className="text-xs text-muted-foreground">
            {Math.round(thread.aiConfidence * 100)}% confidence
          </Text>
        ) : null}
      </View>
      {thread.aiSummary ? (
        <Text className="mt-2 text-sm text-muted-foreground">
          {thread.aiSummary}
        </Text>
      ) : null}
    </View>
  );
}

function MessageCard({ message }: { message: Message }) {
  const senderName = message.fromName ?? message.fromEmail;

  return (
    <View className="mx-4 mb-3 rounded-lg bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Text
          className="flex-1 text-sm font-semibold text-foreground"
          numberOfLines={1}
        >
          {senderName}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {format(new Date(message.internalDate), 'MMM d, h:mm a')}
        </Text>
      </View>
      {message.isFromUser ? (
        <Text className="mt-1 text-xs text-primary">You</Text>
      ) : null}
      <View className="mt-2">
        <Text className="text-sm leading-5 text-foreground">
          {message.bodyText ?? message.bodyPreview ?? '(no content)'}
        </Text>
      </View>
      {message.hasAttachments ? (
        <View className="mt-2 flex-row items-center">
          <Text className="text-xs text-muted-foreground">
            📎{' '}
            {
              ((message.attachmentMeta as Array<{ filename: string }>) ?? [])
                .length
            }{' '}
            attachment(s)
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function QuickReplyBar({
  onReply,
  quickReplies,
}: {
  onReply: (body: string) => void;
  quickReplies: Array<{ body: string; label: string }>;
}) {
  if (quickReplies.length === 0) return null;

  return (
    <SafeAreaView edges={['bottom']}>
      <View className="border-t border-border bg-background px-4 py-3">
        <Text className="mb-2 text-xs font-semibold text-muted-foreground">
          Quick Replies
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {quickReplies.map((qr) => (
            <Pressable
              key={qr.label}
              onPress={() => onReply(qr.body)}
              style={{
                backgroundColor: 'hsl(327, 66%, 69%)',
                borderRadius: 16,
                marginRight: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{ color: '#ffffff', fontSize: 13, fontWeight: '500' }}
              >
                {qr.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: thread, isLoading } = useQuery(
    trpc.email.threads.byId.queryOptions({ id: id ?? '' }, { enabled: !!id }),
  );

  const quickReplyMutation = useMutation(
    trpc.email.threads.quickReply.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.email.threads.list.queryFilter());
        queryClient.invalidateQueries(
          trpc.email.threads.byId.queryFilter({ id: id ?? '' }),
        );
      },
    }),
  );

  const handleQuickReply = useCallback(
    (body: string) => {
      if (!thread) return;
      const recipient = thread.participantEmails[0];
      if (!recipient) {
        Alert.alert('Error', 'No recipient found for this thread.');
        return;
      }

      quickReplyMutation.mutate({
        accountId: thread.accountId,
        gmailThreadId: thread.gmailThreadId,
        replyText: body,
        subject: `Re: ${thread.subject}`,
        threadId: thread.id,
        to: [recipient],
      });
    },
    [thread, quickReplyMutation],
  );

  const quickReplies = (thread?.aiQuickReplies ?? []) as Array<{
    body: string;
    label: string;
  }>;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ headerTitle: '' }} />
        <ActivityIndicator color="hsl(327, 66%, 69%)" size="large" />
      </View>
    );
  }

  if (!thread) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ headerTitle: 'Not Found' }} />
        <Text className="text-lg text-muted-foreground">Thread not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerTitle: thread.subject }} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 12 }}
      >
        <Text className="mx-4 mb-2 text-lg font-bold text-foreground">
          {thread.subject}
        </Text>
        <Text className="mx-4 mb-3 text-xs text-muted-foreground">
          {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''} ·{' '}
          {thread.participantEmails.join(', ')}
        </Text>

        <TriageSummary thread={thread} />

        {thread.messages.map((message) => (
          <MessageCard key={message.id} message={message} />
        ))}
      </ScrollView>

      <QuickReplyBar onReply={handleQuickReply} quickReplies={quickReplies} />
    </View>
  );
}
