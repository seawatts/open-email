/**
 * TanStack AI Provider Adapters
 *
 * Provides unified configuration for AI providers (OpenAI, Anthropic)
 * with support for streaming, tool calling, and thinking/reasoning.
 */

import { openai as openaiAdapter } from '@tanstack/ai-openai';

/**
 * OpenAI adapter configuration for email agent
 */
export function createOpenAIAdapter() {
  // TanStack AI OpenAI adapter reads OPENAI_API_KEY from env automatically
  return openaiAdapter();
}

/**
 * Model configurations for different tasks
 */
export const models = {
  // Fast model for classification/triage
  classification: 'gpt-4o-mini' as const,

  // Standard model for planning and draft generation
  planning: 'gpt-4o' as const,

  // High-capability model for complex reasoning
  reasoning: 'gpt-4o' as const,
  chat: 'gpt-4o-mini' as const,
  draft: 'gpt-4o' as const,
};

export type ModelType = keyof typeof models;

/**
 * Get the appropriate model for a task type
 */
export function getModel(taskType: ModelType) {
  return models[taskType];
}

/**
 * Default adapter instance
 */
let defaultAdapter: ReturnType<typeof createOpenAIAdapter> | null = null;

/**
 * Get or create the default OpenAI adapter
 */
export function getDefaultAdapter() {
  if (!defaultAdapter) {
    defaultAdapter = createOpenAIAdapter();
  }
  return defaultAdapter;
}

// Re-export for convenience
export { openaiAdapter };
