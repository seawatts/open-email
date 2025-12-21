// Test file for no-template-string-in-logs.grit rule
// This file should trigger warnings for template strings in logging helpers

// @ts-expect-error: Test file
import { eLog, iLog, wLog } from '@openrouter-monorepo/instrumentation/logger';

const userId = 'user-123';
const item = {
  id: 1,
  name: 'test',
};
const errorMessage = 'Something went wrong';

// ✅ Should trigger: Template string in iLog
iLog(`User ${userId} logged in`);

// ✅ Should trigger: Template string in eLog
eLog(`Failed to process ${item}`);

// ✅ Should trigger: Template string in wLog
wLog(`Warning: ${errorMessage}`);

// ✅ Should trigger: Template string with multiple variables
iLog(`User ${userId} performed action on ${item.name}`);

// ✅ Should trigger: Template string with expression
eLog(`Error count: ${1 + 2}`);

// ❌ Should NOT trigger: Constant string with context object (the preferred way)
iLog('user-logged-in', {
  user_id: userId,
});

// ❌ Should NOT trigger: Constant string with structured data
eLog('failed-to-process', {
  item,
});

// ❌ Should NOT trigger: Simple constant string
wLog('warning-occurred', {
  message: errorMessage,
});

// ❌ Should NOT trigger: Just a constant string
iLog('simple-event');

// ❌ Should NOT trigger: Regular function call with template string (not a log helper)
const format = (s: string) => s;
format(`User ${userId}`);
