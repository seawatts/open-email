export const AI_ACTION_BADGE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  archive: {
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    label: 'Archive',
  },
  reply: {
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    label: 'Reply',
  },
  snooze: {
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    label: 'Snooze',
  },
};
