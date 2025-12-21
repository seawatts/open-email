import type { AppRouter } from '@seawatts/api';
import type { inferRouterOutputs } from '@trpc/server';

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type Thread = NonNullable<RouterOutputs['email']['threads']['byId']>;
export type ThreadMessage = Thread['messages'][number];
export type ThreadDecision = Thread['decisions'][number];
export type ThreadAction = Thread['actions'][number];

export type EmailCategory =
  | 'urgent'
  | 'needs_reply'
  | 'awaiting_other'
  | 'fyi'
  | 'spam_like';

export interface AgentEvent {
  type: string;
  content?: string;
  triage?: {
    category: string;
    priority: string;
    confidence: number;
    intent: string;
    suggestedNextSteps: string[];
  };
  draft?: {
    draftId: string;
    subject: string;
    body: string;
    tone: string;
  };
  action?: {
    toolName: string;
    params: Record<string, unknown>;
    requiresApproval: boolean;
  };
  error?: string;
}

export interface AgentProcessingState {
  agentEvents: AgentEvent[];
  streamingDraft: string;
  thinkingContent: string;
  isProcessing: boolean;
}

export interface FormattedHighlight {
  id: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionUrl?: string;
  data: { type: string; [key: string]: unknown };
}

