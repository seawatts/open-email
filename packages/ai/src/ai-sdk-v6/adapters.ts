/**
 * AI SDK v6 Provider Configuration
 *
 * Provides unified configuration for AI providers using AI SDK v6 beta.
 */

import { createOpenAI } from '@ai-sdk/openai';

/**
 * Create an OpenAI provider instance
 */
export function createOpenAIProvider() {
  // AI SDK reads OPENAI_API_KEY from env automatically
  return createOpenAI({});
}

/**
 * Model configurations for different tasks
 */
export const models = {
  // Fast model for classification/triage
  classification: 'gpt-4o-mini',

  // Standard model for chat and planning
  chat: 'gpt-4o-mini',

  // Model for drafting emails
  draft: 'gpt-4o',

  // Model for planning actions
  planning: 'gpt-4o',

  // High-capability model for complex reasoning
  reasoning: 'gpt-4o',
} as const;

export type ModelType = keyof typeof models;

/**
 * Get the appropriate model name for a task type
 */
export function getModel(taskType: ModelType): string {
  return models[taskType];
}

/**
 * Default provider instance
 */
let defaultProvider: ReturnType<typeof createOpenAIProvider> | null = null;

/**
 * Get or create the default OpenAI provider
 */
export function getDefaultProvider() {
  if (!defaultProvider) {
    defaultProvider = createOpenAIProvider();
  }
  return defaultProvider;
}

// Re-export createOpenAI for custom configurations
export { createOpenAI };
