/**
 * @seawatts/ai - AI SDK v6
 *
 * Provides AI-powered email triage using AI SDK v6.
 *
 * Usage:
 *   import { quickTriage } from '@seawatts/ai/ai-sdk-v6';
 */

// Adapters
export {
  createOpenAI,
  createOpenAIProvider,
  getDefaultProvider,
  getModel,
  models,
  type ModelType,
} from './adapters';

// Quick Triage (single-call gpt-4o-mini)
export {
  quickTriage,
  type QuickTriageOptions,
  type TriageEmailContext,
} from './quick-triage';
export {
  quickReplyOptionSchema,
  quickTriageSchema,
  type QuickReplyOption,
  type QuickTriageResult,
} from './schemas';
