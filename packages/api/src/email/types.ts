import type {
  AgentDecisionType,
  DraftReplyJson,
  EmailActionType,
  EmailMessageType,
  EmailThreadType,
  SmartActionJson,
} from '@seawatts/db/schema';
import { z } from 'zod';

// ============================================================================
// Core Email Types (re-exported from schema for convenience)
// ============================================================================

export type EmailCategory =
  | 'urgent'
  | 'needs_reply'
  | 'awaiting_other'
  | 'fyi'
  | 'spam_like';

export type SuggestedAction =
  | 'reply'
  | 'follow_up'
  | 'archive'
  | 'label'
  | 'ignore';

export type ActionType =
  | 'send'
  | 'archive'
  | 'label'
  | 'snooze'
  | 'delete'
  | 'smart_action';

export type ActionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed';

export type AgentMode = 'approval' | 'auto';

// ============================================================================
// Zod Schemas for LLM Output Validation
// ============================================================================

export const emailCategorySchema = z.enum([
  'urgent',
  'needs_reply',
  'awaiting_other',
  'fyi',
  'spam_like',
]);

export const suggestedActionSchema = z.enum([
  'reply',
  'follow_up',
  'archive',
  'label',
  'ignore',
]);

export const draftReplySchema = z.object({
  body: z.string(),
  id: z.string(),
  subject: z.string(),
  tone: z.string(),
});

export const smartActionSchema = z.object({
  confirmRequired: z.boolean().optional(),
  description: z.string(),
  estimatedTime: z.string().optional(),
  icon: z.string(),
  id: z.string(),
  label: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
  type: z.string(),
  url: z.string().optional(),
});

export const triageOutputSchema = z.object({
  category: emailCategorySchema,
  confidence: z.number().min(0).max(1),
  draftReplies: z.array(draftReplySchema).max(3),
  reasons: z.array(z.string()),
  smartActions: z.array(smartActionSchema).optional(),
  suggestedAction: suggestedActionSchema,
  suggestedLabels: z.array(z.string()),
  summary: z.string().nullable(),
});

export type TriageOutput = z.infer<typeof triageOutputSchema>;

// ============================================================================
// API Input Schemas
// ============================================================================

export const approveActionSchema = z.object({
  actionId: z.string(),
  approved: z.boolean(),
  editedPayload: z.record(z.string(), z.unknown()).optional(),
});

export const sendReplySchema = z.object({
  body: z.string(),
  cc: z.array(z.string().email()).optional(),
  draftReplyId: z.string().optional(),
  subject: z.string(),
  threadId: z.string(),
  to: z.array(z.string().email()),
});

export const createRuleSchema = z.object({
  actions: z.object({
    archive: z.boolean().optional(),
    labelId: z.string().optional(),
    requireApproval: z.boolean().optional(),
    toneProfile: z
      .object({
        customInstructions: z.string().optional(),
        maxLength: z.number().optional(),
        style: z.enum(['short', 'direct', 'friendly', 'formal', 'casual']),
      })
      .optional(),
  }),
  conditions: z.object({
    labelIds: z.array(z.string()).optional(),
    senderDomains: z.array(z.string()).optional(),
    senderEmails: z.array(z.string()).optional(),
    subjectContains: z.array(z.string()).optional(),
  }),
  isActive: z.boolean().default(true),
  ruleType: z.enum(['auto_archive', 'auto_label', 'always_ask', 'tone']),
});

export const syncRequestSchema = z.object({
  fullSync: z.boolean().default(false),
  gmailAccountId: z.string(),
});

export const toneProfileSchema = z.object({
  customInstructions: z.string().optional(),
  maxLength: z.number().optional(),
  style: z.enum(['short', 'direct', 'friendly', 'formal', 'casual']),
});

export const agentSettingsSchema = z.object({
  autoActionsAllowed: z.array(z.enum(['archive', 'label'])).default([]),
  mode: z.enum(['approval', 'auto']),
  requireApprovalFor: z.array(z.string()).default([]),
});

// ============================================================================
// Composite Types for API Responses
// ============================================================================

export type DraftReply = DraftReplyJson;

export type SmartAction = SmartActionJson;

// Thread with its latest decision and pending actions
export interface ThreadWithDecision extends EmailThreadType {
  latestDecision: AgentDecisionType | null;
  pendingActions: EmailActionType[];
  learnedPriority?: {
    adjustedCategory?: EmailCategory;
    reason: string;
    score: number;
  };
}

// Thread with full message history and all decisions/actions
export interface ThreadDetail extends EmailThreadType {
  accountEmail: string;
  actions: EmailActionType[];
  decisions: AgentDecisionType[];
  messages: EmailMessageType[];
}

// ============================================================================
// Triage Context for AI
// ============================================================================

export interface TriageContext {
  messages: Array<{
    bodyPreview: string | null;
    fromEmail: string;
    fromName: string | null;
    internalDate: Date;
    snippet: string | null;
    subject: string;
  }>;
  thread: {
    labels: string[];
    messageCount: number;
    participantEmails: string[];
    subject: string;
  };
  userEmail: string;
  userToneProfile?: {
    customInstructions?: string;
    maxLength?: number;
    style: string;
  } | null;
}

// ============================================================================
// Gmail OAuth Types
// ============================================================================

export interface GmailTokens {
  accessToken: string;
  email: string;
  expiry: Date;
  name: string | null;
  refreshToken: string;
}

export interface SyncResult {
  errors: string[];
  messagesProcessed: number;
  newHistoryId: string | null;
  threadsProcessed: number;
}

// ============================================================================
// Agentic Loop Types (TanStack AI)
// ============================================================================

// Priority levels for email triage
export const prioritySchema = z.enum(['P0', 'P1', 'P2', 'P3']);
export type Priority = z.infer<typeof prioritySchema>;

// Sensitivity classification for applying stricter guardrails
export const sensitivitySchema = z.enum(['NORMAL', 'SENSITIVE']);
export type Sensitivity = z.infer<typeof sensitivitySchema>;

// Enhanced category with more granular classification
export const agentCategorySchema = z.enum([
  'ACTION_REQUIRED',
  'WAITING_ON_OTHER',
  'FYI',
  'NEWSLETTER',
  'RECEIPT',
  'SPAM',
  'PERSONAL',
]);
export type AgentCategory = z.infer<typeof agentCategorySchema>;

// Address type for email participants
export const addressSchema = z.object({
  email: z.string().email(),
  name: z.string().nullable().optional(),
});
export type Address = z.infer<typeof addressSchema>;

// ============================================================================
// Action Types for Agentic Loop
// ============================================================================

export const applyLabelsActionSchema = z.object({
  add: z.array(z.string()),
  emailId: z.string(),
  kind: z.literal('APPLY_LABELS'),
  remove: z.array(z.string()),
});

export const archiveActionSchema = z.object({
  emailId: z.string(),
  kind: z.literal('ARCHIVE'),
});

export const markReadActionSchema = z.object({
  emailId: z.string(),
  kind: z.literal('MARK_READ'),
});

export const markUnreadActionSchema = z.object({
  emailId: z.string(),
  kind: z.literal('MARK_UNREAD'),
});

export const draftReplyActionSchema = z.object({
  body: z.string(),
  cc: z.array(addressSchema),
  kind: z.literal('DRAFT_REPLY'),
  subject: z.string(),
  threadId: z.string(),
  to: z.array(addressSchema),
});

export const sendReplyActionSchema = z.object({
  draftId: z.string(),
  kind: z.literal('SEND_REPLY'),
});

export const scheduleSendActionSchema = z.object({
  draftId: z.string(),
  kind: z.literal('SCHEDULE_SEND'),
  sendAt: z.string().datetime(),
});

export const createTaskActionSchema = z.object({
  due: z.string().datetime().optional(),
  kind: z.literal('CREATE_TASK'),
  note: z.string().optional(),
  title: z.string(),
});

export const createCalEventActionSchema = z.object({
  attendees: z.array(addressSchema),
  end: z.string().datetime(),
  kind: z.literal('CREATE_CAL_EVENT'),
  start: z.string().datetime(),
  title: z.string(),
});

export const askUserActionSchema = z.object({
  contextEmailIds: z.array(z.string()),
  kind: z.literal('ASK_USER'),
  question: z.string(),
});

// Union of all action types
export const agentActionSchema = z.discriminatedUnion('kind', [
  applyLabelsActionSchema,
  archiveActionSchema,
  markReadActionSchema,
  markUnreadActionSchema,
  draftReplyActionSchema,
  sendReplyActionSchema,
  scheduleSendActionSchema,
  createTaskActionSchema,
  createCalEventActionSchema,
  askUserActionSchema,
]);

export type AgentAction = z.infer<typeof agentActionSchema>;

// ============================================================================
// Triage Result Type
// ============================================================================

export const triageResultSchema = z.object({
  category: agentCategorySchema,
  confidence: z.number().min(0).max(1),
  intent: z.string(),
  priority: prioritySchema,
  sensitivity: sensitivitySchema,
  suggestedNextSteps: z.array(z.string()),
});

export type TriageResult = z.infer<typeof triageResultSchema>;

// ============================================================================
// Policy Configuration
// ============================================================================

export const rulePredicate = z.object({
  field: z.enum(['from', 'to', 'subject', 'labels', 'domain']),
  operator: z.enum(['contains', 'equals', 'matches', 'in']),
  value: z.union([z.string(), z.array(z.string())]),
});

export const automationRuleSchema = z.object({
  actions: z.array(agentActionSchema),
  id: z.string(),
  name: z.string(),
  when: z.array(rulePredicate),
});

export type AutomationRule = z.infer<typeof automationRuleSchema>;

export const policySchema = z.object({
  // Allowed domains for automatic actions (e.g., internal company domains)
  allowedDomainsForAutoActions: z.array(z.string()),

  // Auto-archive newsletters when detected
  autoArchiveNewsletters: z.boolean(),

  // Rule-based automations
  autoLabelRules: z.array(automationRuleSchema),

  // Hard gates - require explicit user approval
  requireApprovalForCalendar: z.boolean(),
  requireApprovalForExternalShare: z.boolean(),
  requireApprovalForSend: z.boolean(),
});

export type Policy = z.infer<typeof policySchema>;

// Default policy configuration
export const defaultPolicy: Policy = {
  allowedDomainsForAutoActions: [],
  autoArchiveNewsletters: false,
  autoLabelRules: [],
  requireApprovalForCalendar: true,
  requireApprovalForExternalShare: true,
  requireApprovalForSend: true,
};

// ============================================================================
// Agent Loop Event Types (for streaming)
// ============================================================================

export const agentEventSchema = z.discriminatedUnion('type', [
  z.object({
    content: z.string(),
    type: z.literal('thinking'),
  }),
  z.object({
    triage: triageResultSchema,
    type: z.literal('triage_complete'),
  }),
  z.object({
    actions: z.array(agentActionSchema),
    type: z.literal('actions_planned'),
  }),
  z.object({
    action: agentActionSchema,
    type: z.literal('action_executed'),
  }),
  z.object({
    action: agentActionSchema,
    type: z.literal('action_queued'),
  }),
  z.object({
    content: z.string(),
    draftId: z.string(),
    type: z.literal('draft_chunk'),
  }),
  z.object({
    body: z.string(),
    draftId: z.string(),
    subject: z.string(),
    tone: z.string(),
    type: z.literal('draft_complete'),
  }),
  z.object({
    question: z.string(),
    suggestedActions: z.array(agentActionSchema),
    triage: triageResultSchema,
    type: z.literal('needs_review'),
  }),
  z.object({
    autoExecuted: z.array(agentActionSchema),
    needsApproval: z.array(agentActionSchema),
    triage: triageResultSchema,
    type: z.literal('complete'),
  }),
  z.object({
    error: z.string(),
    type: z.literal('error'),
  }),
]);

export type AgentEvent = z.infer<typeof agentEventSchema>;

// ============================================================================
// Email Context for AI Processing
// ============================================================================

export interface EmailForAgent {
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
  }>;
  bcc: Address[];
  bodyHtml: string | null;
  bodyText: string | null;
  cc: Address[];
  date: Date;
  from: Address;
  headers: Record<string, string>;
  id: string;
  labels: string[];
  snippet: string;
  subject: string;
  threadId: string;
  to: Address[];
}

export interface ThreadForAgent {
  emails: EmailForAgent[];
  id: string;
  subject: string;
}

export interface UserPreferences {
  autoActionsAllowed: string[];
  customInstructions?: string;
  preferredTone: 'short' | 'direct' | 'friendly' | 'formal' | 'casual';
  requireApprovalDomains: string[];
}

// ============================================================================
// Guardrail Helper Types
// ============================================================================

// Actions that are considered safe for automatic execution
export const SAFE_AUTO_ACTIONS: AgentAction['kind'][] = [
  'APPLY_LABELS',
  'MARK_READ',
  'ARCHIVE',
];

// Actions that always require user approval
export const APPROVAL_REQUIRED_ACTIONS: AgentAction['kind'][] = [
  'SEND_REPLY',
  'SCHEDULE_SEND',
  'CREATE_CAL_EVENT',
];

// Confidence threshold below which user review is requested
export const CONFIDENCE_THRESHOLD = 0.65;

// ============================================================================
// Inbox-Style Bundle Types
// ============================================================================

export const bundleTypeSchema = z.enum([
  'travel', // Flights, hotels, car rentals, trip confirmations
  'purchases', // Order confirmations, shipping updates, receipts
  'finance', // Bank statements, bills, invoices, payments
  'social', // Social network notifications
  'promos', // Marketing, deals, newsletters
  'updates', // Automated updates, notifications, alerts
  'forums', // Mailing lists, group discussions
  'personal', // Personal correspondence (default)
]);

export type BundleType = z.infer<typeof bundleTypeSchema>;

// Bundle metadata for UI display
export const BUNDLE_CONFIG: Record<
  BundleType,
  { color: string; description: string; icon: string; label: string }
> = {
  finance: {
    color: 'emerald',
    description: 'Bank statements, bills, invoices',
    icon: 'Landmark',
    label: 'Finance',
  },
  forums: {
    color: 'slate',
    description: 'Mailing lists, group discussions',
    icon: 'Users',
    label: 'Forums',
  },
  personal: {
    color: 'blue',
    description: 'Personal correspondence',
    icon: 'User',
    label: 'Personal',
  },
  promos: {
    color: 'pink',
    description: 'Marketing, deals, coupons',
    icon: 'Tag',
    label: 'Promos',
  },
  purchases: {
    color: 'orange',
    description: 'Orders, shipping, receipts',
    icon: 'ShoppingBag',
    label: 'Purchases',
  },
  social: {
    color: 'violet',
    description: 'Social network notifications',
    icon: 'Share2',
    label: 'Social',
  },
  travel: {
    color: 'cyan',
    description: 'Flights, hotels, trip info',
    icon: 'Plane',
    label: 'Travel',
  },
  updates: {
    color: 'amber',
    description: 'Notifications, alerts',
    icon: 'Bell',
    label: 'Updates',
  },
};

// ============================================================================
// Highlight Types (Extracted Key Information)
// ============================================================================

export const highlightTypeSchema = z.enum([
  'flight',
  'hotel',
  'package_tracking',
  'payment',
  'event',
  'reservation',
  'action_item',
]);

export type HighlightType = z.infer<typeof highlightTypeSchema>;

// Structured data schemas for each highlight type
export const flightHighlightDataSchema = z.object({
  airline: z.string(),
  arrival: z.string().describe('Destination airport code'),
  arrivalTime: z.string().describe('Arrival datetime ISO'),
  departure: z.string().describe('Departure airport code'),
  departureTime: z.string().describe('Departure datetime ISO'),
  flightNumber: z.string(),
  type: z.literal('flight'),
});

export const hotelHighlightDataSchema = z.object({
  checkIn: z.string().describe('Check-in date ISO'),
  checkOut: z.string().describe('Check-out date ISO'),
  confirmationNumber: z.string().optional(),
  hotelName: z.string(),
  type: z.literal('hotel'),
});

export const packageTrackingHighlightDataSchema = z.object({
  carrier: z.string().describe('Shipping carrier name'),
  estimatedDelivery: z.string().optional().describe('Estimated delivery date'),
  status: z.string().optional().describe('Current tracking status'),
  trackingNumber: z.string(),
  type: z.literal('package_tracking'),
});

export const paymentHighlightDataSchema = z.object({
  amount: z.string().describe('Payment amount'),
  currency: z.string().describe('Currency code'),
  dueDate: z.string().optional().describe('Due date ISO'),
  payee: z.string().optional().describe('Who to pay'),
  type: z.literal('payment'),
});

export const eventHighlightDataSchema = z.object({
  dateTime: z.string().describe('Event datetime ISO'),
  eventName: z.string(),
  location: z.string().optional(),
  type: z.literal('event'),
});

export const reservationHighlightDataSchema = z.object({
  confirmationNumber: z.string().optional(),
  dateTime: z.string().describe('Reservation datetime ISO'),
  partySize: z.number().optional(),
  type: z.literal('reservation'),
  venue: z.string(),
});

export const actionItemHighlightDataSchema = z.object({
  assignedBy: z.string().optional(),
  deadline: z.string().optional().describe('Deadline datetime ISO'),
  task: z.string(),
  type: z.literal('action_item'),
});

export const highlightDataSchema = z.discriminatedUnion('type', [
  flightHighlightDataSchema,
  hotelHighlightDataSchema,
  packageTrackingHighlightDataSchema,
  paymentHighlightDataSchema,
  eventHighlightDataSchema,
  reservationHighlightDataSchema,
  actionItemHighlightDataSchema,
]);

export type HighlightData = z.infer<typeof highlightDataSchema>;

// Full highlight schema for API responses
export const highlightSchema = z.object({
  actionLabel: z.string().optional(),
  actionUrl: z.string().url().optional(),
  data: highlightDataSchema,
  highlightType: highlightTypeSchema,
  icon: z.string().optional(),
  id: z.string(),
  messageId: z.string().optional(),
  subtitle: z.string().optional(),
  threadId: z.string(),
  title: z.string(),
});

export type Highlight = z.infer<typeof highlightSchema>;

// Highlight metadata for UI display
export const HIGHLIGHT_CONFIG: Record<
  HighlightType,
  { color: string; icon: string; label: string }
> = {
  action_item: {
    color: 'red',
    icon: 'CheckSquare',
    label: 'Action Item',
  },
  event: {
    color: 'violet',
    icon: 'Calendar',
    label: 'Event',
  },
  flight: {
    color: 'cyan',
    icon: 'Plane',
    label: 'Flight',
  },
  hotel: {
    color: 'amber',
    icon: 'Building',
    label: 'Hotel',
  },
  package_tracking: {
    color: 'orange',
    icon: 'Package',
    label: 'Package',
  },
  payment: {
    color: 'emerald',
    icon: 'DollarSign',
    label: 'Payment',
  },
  reservation: {
    color: 'pink',
    icon: 'Utensils',
    label: 'Reservation',
  },
};
