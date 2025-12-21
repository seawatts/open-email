/**
 * Email Router Utilities
 */

/**
 * Helper function to map tool names to action types
 */
export function mapToolToActionType(
  toolName: string,
): 'send' | 'archive' | 'label' | 'snooze' | 'delete' | 'smart_action' {
  const map: Record<
    string,
    'send' | 'archive' | 'label' | 'snooze' | 'delete' | 'smart_action'
  > = {
    apply_labels: 'label',
    archive_email: 'archive',
    create_calendar_event: 'smart_action',
    create_task: 'smart_action',
    draft_reply: 'send',
    mark_read: 'smart_action',
    mark_unread: 'smart_action',
    schedule_send: 'send',
    send_draft: 'send',
  };
  return map[toolName] ?? 'smart_action';
}

/**
 * Map agent category to database category
 */
export const categoryMap: Record<string, string> = {
  ACTION_REQUIRED: 'needs_reply',
  FYI: 'fyi',
  NEWSLETTER: 'fyi',
  PERSONAL: 'needs_reply',
  RECEIPT: 'fyi',
  SPAM: 'spam_like',
  WAITING_ON_OTHER: 'awaiting_other',
};

/**
 * Map category to suggested action
 */
export const actionMap: Record<string, string> = {
  ACTION_REQUIRED: 'reply',
  FYI: 'archive',
  NEWSLETTER: 'archive',
  PERSONAL: 'reply',
  RECEIPT: 'label',
  SPAM: 'ignore',
  WAITING_ON_OTHER: 'follow_up',
};

export type DbCategory =
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

export type BundleTypeValue =
  | 'travel'
  | 'purchases'
  | 'finance'
  | 'social'
  | 'promos'
  | 'updates'
  | 'forums'
  | 'personal';
