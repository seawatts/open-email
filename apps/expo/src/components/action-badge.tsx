import { Text, View } from 'react-native';

const DEFAULT_ACTION_COLOR = { bg: '#9ca3af', text: '#ffffff' } as const;

const ACTION_COLORS = {
  archive: { bg: '#6b7280', text: '#ffffff' },
  reply: { bg: '#3b82f6', text: '#ffffff' },
  snooze: { bg: '#f59e0b', text: '#ffffff' },
} as const;

export function getActionColor(action: string): { bg: string; text: string } {
  if (action in ACTION_COLORS) {
    return ACTION_COLORS[action as keyof typeof ACTION_COLORS];
  }
  return DEFAULT_ACTION_COLOR;
}

export function ActionBadge({ action }: { action: string }) {
  const colors = getActionColor(action);
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
        {action.toUpperCase()}
      </Text>
    </View>
  );
}
