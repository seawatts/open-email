import type { ActionLogEntry } from '../memory/update-memory';

const MIN_REPEATED_ACTIONS = 3;

/**
 * Detects repeated user actions on the same sender/domain and suggests a rule.
 * Returns a human-readable suggestion string, or null if no pattern is found.
 */
export function checkForRuleSuggestion(
  recentActions: ActionLogEntry[],
): string | null {
  if (recentActions.length < MIN_REPEATED_ACTIONS) return null;

  const senderActionCounts = new Map<string, Map<string, number>>();

  for (const action of recentActions) {
    const sender = action.sender.toLowerCase();
    const domain = sender.split('@')[1] ?? sender;

    for (const key of [sender, domain]) {
      const actionMap = senderActionCounts.get(key) ?? new Map<string, number>();
      actionMap.set(action.userDid, (actionMap.get(action.userDid) ?? 0) + 1);
      senderActionCounts.set(key, actionMap);
    }
  }

  let bestMatch: { key: string; action: string; count: number } | undefined;

  for (const [key, actionMap] of senderActionCounts) {
    for (const [action, count] of actionMap) {
      if (
        count >= MIN_REPEATED_ACTIONS &&
        (!bestMatch || count > bestMatch.count)
      ) {
        bestMatch = { action, count, key };
      }
    }
  }

  if (!bestMatch) return null;

  const actionLabel = bestMatch.action === 'archive'
    ? 'archived'
    : bestMatch.action === 'snooze'
      ? 'snoozed'
      : `marked as ${bestMatch.action}`;

  const isEmail = bestMatch.key.includes('@');
  const target = isEmail ? bestMatch.key : `*@${bestMatch.key}`;

  return `You've ${actionLabel} ${bestMatch.count} emails from ${target}. Create a rule?`;
}
