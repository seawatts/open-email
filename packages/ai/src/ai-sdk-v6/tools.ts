/**
 * Email Agent Tools for AI SDK v6
 *
 * Type-safe tool definitions with needsApproval for human-in-the-loop workflows.
 */

import { tool } from 'ai';
import { z } from 'zod';

// ============================================================================
// Tool Parameter Schemas
// ============================================================================

export const applyLabelsParams = z.object({
  add: z.array(z.string()).describe('Label IDs to add'),
  emailId: z.string().describe('The email ID to modify'),
  remove: z.array(z.string()).describe('Label IDs to remove'),
});

export const archiveParams = z.object({
  emailId: z.string().describe('The email ID to archive'),
});

export const markReadParams = z.object({
  emailId: z.string().describe('The email ID to mark as read'),
});

export const markUnreadParams = z.object({
  emailId: z.string().describe('The email ID to mark as unread'),
});

export const draftReplyParams = z.object({
  cc: z.array(z.string().email()).optional().describe('CC email addresses'),
  threadId: z.string().describe('The thread ID to reply to'),
  to: z.array(z.string().email()).describe('Recipient email addresses'),
  tone: z
    .enum(['short', 'friendly', 'formal', 'detailed'])
    .describe('The tone of the reply'),
});

export const sendDraftParams = z.object({
  draftId: z.string().describe('The draft ID to send'),
});

export const scheduleSendParams = z.object({
  draftId: z.string().describe('The draft ID to schedule'),
  sendAt: z.string().datetime().describe('ISO datetime to send at'),
});

export const createTaskParams = z.object({
  due: z.string().datetime().optional().describe('Due date in ISO format'),
  note: z.string().optional().describe('Additional notes for the task'),
  title: z.string().describe('Task title'),
});

export const createCalEventParams = z.object({
  attendees: z.array(z.string().email()).describe('Attendee email addresses'),
  end: z.string().datetime().describe('End time in ISO format'),
  start: z.string().datetime().describe('Start time in ISO format'),
  title: z.string().describe('Event title'),
});

export const triageParams = z.object({
  bundleConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in the bundle classification'),
  bundleType: z
    .enum([
      'travel',
      'purchases',
      'finance',
      'social',
      'promos',
      'updates',
      'forums',
      'personal',
    ])
    .describe('The Inbox-style bundle this email belongs to'),
  category: z
    .enum([
      'ACTION_REQUIRED',
      'WAITING_ON_OTHER',
      'FYI',
      'NEWSLETTER',
      'RECEIPT',
      'SPAM',
      'PERSONAL',
    ])
    .describe('Email category classification'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score for the classification'),
  intent: z.string().describe('Brief description of the email intent'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).describe('Priority level'),
  sensitivity: z
    .enum(['NORMAL', 'SENSITIVE'])
    .describe('Whether the email contains sensitive content'),
  suggestedNextSteps: z
    .array(z.string())
    .describe('Recommended next actions'),
});

// ============================================================================
// Tool Context Type
// ============================================================================

export interface EmailToolContext {
  db: unknown;
  accountId: string;
  policy: {
    allowedDomainsForAutoActions: string[];
    requireApprovalForCalendar: boolean;
    requireApprovalForSend: boolean;
  };
  threadId: string;
  userEmail: string;
}

// ============================================================================
// Tool Result Types
// ============================================================================

export interface ToolResult<T = unknown> {
  data?: T;
  error?: string;
  requiresApproval?: boolean;
  success: boolean;
}

// ============================================================================
// Highlight Extraction Schemas
// ============================================================================

export const highlightDataParams = z.discriminatedUnion('type', [
  z.object({
    airline: z.string(),
    arrival: z.string().describe('Destination airport code'),
    arrivalTime: z.string().describe('Arrival datetime ISO'),
    departure: z.string().describe('Departure airport code'),
    departureTime: z.string().describe('Departure datetime ISO'),
    flightNumber: z.string(),
    type: z.literal('flight'),
  }),
  z.object({
    checkIn: z.string().describe('Check-in date ISO'),
    checkOut: z.string().describe('Check-out date ISO'),
    confirmationNumber: z.string().optional(),
    hotelName: z.string(),
    type: z.literal('hotel'),
  }),
  z.object({
    carrier: z.string().describe('Shipping carrier name'),
    estimatedDelivery: z.string().optional().describe('Estimated delivery date'),
    status: z.string().optional().describe('Current tracking status'),
    trackingNumber: z.string(),
    type: z.literal('package_tracking'),
  }),
  z.object({
    amount: z.string().describe('Payment amount'),
    currency: z.string().describe('Currency code'),
    dueDate: z.string().optional().describe('Due date ISO'),
    payee: z.string().optional().describe('Who to pay'),
    type: z.literal('payment'),
  }),
  z.object({
    dateTime: z.string().describe('Event datetime ISO'),
    eventName: z.string(),
    location: z.string().optional(),
    type: z.literal('event'),
  }),
  z.object({
    confirmationNumber: z.string().optional(),
    dateTime: z.string().describe('Reservation datetime ISO'),
    partySize: z.number().optional(),
    type: z.literal('reservation'),
    venue: z.string(),
  }),
  z.object({
    assignedBy: z.string().optional(),
    deadline: z.string().optional().describe('Deadline datetime ISO'),
    task: z.string(),
    type: z.literal('action_item'),
  }),
]);

export const extractHighlightsParams = z.object({
  highlights: z.array(
    z.object({
      actionLabel: z.string().optional().describe('Label for action button'),
      actionUrl: z.string().optional().describe('URL for the action'),
      data: highlightDataParams,
      subtitle: z.string().optional().describe('Secondary info line'),
      title: z.string().describe('Main display title'),
    }),
  ),
});

// ============================================================================
// Tool Definitions (AI SDK v6 style with inputSchema)
// ============================================================================

/**
 * Tool to classify/triage an email thread
 */
export const triageTool = tool({
  description: `Classify an email thread to determine its priority, category, bundle type, and recommended actions.
Categories:
- ACTION_REQUIRED: Requires a response or action from the user
- WAITING_ON_OTHER: User has responded, waiting for others
- FYI: Informational, no action needed
- NEWSLETTER: Marketing or subscription content
- RECEIPT: Purchase confirmations or receipts
- SPAM: Unwanted or suspicious content
- PERSONAL: Personal correspondence

Priority levels:
- P0: Urgent, requires immediate attention
- P1: High priority, respond within hours
- P2: Medium priority, respond within days
- P3: Low priority, respond when convenient

Bundle Types (Google Inbox-style):
- travel: Flight, hotel, car rental bookings
- purchases: Order confirmations, shipping, receipts
- finance: Bank statements, bills, payments
- social: Social media notifications
- promos: Marketing, deals, newsletters
- updates: Automated notifications, alerts
- forums: Mailing lists, discussion groups
- personal: Direct human correspondence`,
  inputSchema: triageParams,
});

/**
 * Tool to apply or remove labels from an email
 */
export const applyLabelsTool = tool({
  description:
    'Add or remove labels from an email. Use this to organize emails into categories.',
  inputSchema: applyLabelsParams,
});

/**
 * Tool to archive an email (remove from inbox)
 */
export const archiveTool = tool({
  description:
    'Archive an email to remove it from the inbox. The email will still be searchable.',
  inputSchema: archiveParams,
});

/**
 * Tool to mark an email as read
 */
export const markReadTool = tool({
  description: 'Mark an email as read.',
  inputSchema: markReadParams,
});

/**
 * Tool to mark an email as unread
 */
export const markUnreadTool = tool({
  description: 'Mark an email as unread for later attention.',
  inputSchema: markUnreadParams,
});

/**
 * Tool to draft a reply (requires approval to send)
 */
export const draftReplyTool = tool({
  description: `Draft a reply to an email thread. The draft will be created but NOT sent - it requires user approval before sending.
Choose an appropriate tone:
- short: Brief, to-the-point response
- friendly: Warm and personable
- formal: Professional and business-like
- detailed: Comprehensive with full context`,
  inputSchema: draftReplyParams,
});

/**
 * Tool to send a draft (always requires approval)
 */
export const sendDraftTool = tool({
  description:
    'Send a previously created draft. This action ALWAYS requires user approval.',
  inputSchema: sendDraftParams,
  needsApproval: true,
});

/**
 * Tool to schedule a draft to be sent later (always requires approval)
 */
export const scheduleSendTool = tool({
  description:
    'Schedule a draft to be sent at a specific time. This action ALWAYS requires user approval.',
  inputSchema: scheduleSendParams,
  needsApproval: true,
});

/**
 * Tool to create a task from an email
 */
export const createTaskTool = tool({
  description:
    'Create a task or reminder based on email content. Extract action items and deadlines.',
  inputSchema: createTaskParams,
});

/**
 * Tool to create a calendar event (requires approval)
 */
export const createCalEventTool = tool({
  description:
    'Create a calendar event for meetings or deadlines mentioned in the email. This action requires user approval.',
  inputSchema: createCalEventParams,
  needsApproval: true,
});

/**
 * Tool to extract key information highlights from emails (like Google Inbox)
 */
export const extractHighlightsTool = tool({
  description: `Extract key information highlights from emails like Google Inbox did.
Look for and extract:
- Flight details: flight numbers, airlines, departure/arrival times and airports
- Hotel bookings: hotel names, check-in/out dates, confirmation numbers
- Package tracking: tracking numbers, carriers, estimated delivery dates
- Payment requests: amounts, due dates, payees
- Calendar events: event names, dates, times, locations
- Reservations: restaurants, appointments, confirmation numbers
- Action items: specific tasks or requests with deadlines

Only extract information that is clearly present in the email. Do not guess or infer missing details.`,
  inputSchema: extractHighlightsParams,
});

// ============================================================================
// Tool Collections
// ============================================================================

/**
 * All email tools for the agent
 */
export const emailTools = {
  apply_labels: applyLabelsTool,
  archive_email: archiveTool,
  create_calendar_event: createCalEventTool,
  create_task: createTaskTool,
  draft_reply: draftReplyTool,
  extract_highlights: extractHighlightsTool,
  mark_read: markReadTool,
  mark_unread: markUnreadTool,
  schedule_send: scheduleSendTool,
  send_draft: sendDraftTool,
  triage_email: triageTool,
};

/**
 * Tools that can be executed automatically without approval
 */
export const autoExecutableTools = {
  apply_labels: applyLabelsTool,
  archive_email: archiveTool,
  mark_read: markReadTool,
  mark_unread: markUnreadTool,
};

/**
 * Tools that always require user approval
 */
export const approvalRequiredTools = {
  create_calendar_event: createCalEventTool,
  schedule_send: scheduleSendTool,
  send_draft: sendDraftTool,
};

/**
 * Tools that may require approval based on policy
 */
export const conditionalApprovalTools = {
  create_task: createTaskTool,
  draft_reply: draftReplyTool,
};

// ============================================================================
// Tool Name Constants
// ============================================================================

export const TOOL_NAMES = {
  APPLY_LABELS: 'apply_labels',
  ARCHIVE: 'archive_email',
  CREATE_CALENDAR_EVENT: 'create_calendar_event',
  CREATE_TASK: 'create_task',
  DRAFT_REPLY: 'draft_reply',
  EXTRACT_HIGHLIGHTS: 'extract_highlights',
  MARK_READ: 'mark_read',
  MARK_UNREAD: 'mark_unread',
  SCHEDULE_SEND: 'schedule_send',
  SEND_DRAFT: 'send_draft',
  TRIAGE: 'triage_email',
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

// Tools that always require approval
const APPROVAL_REQUIRED_TOOL_NAMES: Set<string> = new Set([
  TOOL_NAMES.SEND_DRAFT,
  TOOL_NAMES.SCHEDULE_SEND,
  TOOL_NAMES.CREATE_CALENDAR_EVENT,
]);

// Tools that can be auto-executed
const AUTO_EXECUTABLE_TOOL_NAMES: Set<string> = new Set([
  TOOL_NAMES.APPLY_LABELS,
  TOOL_NAMES.ARCHIVE,
  TOOL_NAMES.MARK_READ,
  TOOL_NAMES.MARK_UNREAD,
]);

/**
 * Check if a tool requires approval
 */
export function requiresApproval(
  toolName: string,
  policy?: EmailToolContext['policy'],
): boolean {
  if (APPROVAL_REQUIRED_TOOL_NAMES.has(toolName)) {
    return true;
  }

  if (toolName === TOOL_NAMES.DRAFT_REPLY && policy?.requireApprovalForSend) {
    return true;
  }

  if (
    toolName === TOOL_NAMES.CREATE_CALENDAR_EVENT &&
    policy?.requireApprovalForCalendar
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a tool can be auto-executed for a given sender domain
 */
export function canAutoExecute(
  toolName: string,
  senderDomain: string,
  policy: EmailToolContext['policy'],
): boolean {
  if (!AUTO_EXECUTABLE_TOOL_NAMES.has(toolName)) {
    return false;
  }

  if (policy.allowedDomainsForAutoActions.length > 0) {
    return policy.allowedDomainsForAutoActions.includes(senderDomain);
  }

  return true;
}
